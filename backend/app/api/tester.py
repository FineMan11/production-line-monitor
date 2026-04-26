"""
Tester API
----------
PATCH /api/testers/<id>/status  — Change a tester's status
GET   /api/testers/<id>/history — Status history for a tester
PATCH /api/testers/<id>         — Edit station details (admin only)
"""
from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app.extensions import db
from app.models import Tester, Handler
from app.services import status_service
from app.services.troubleshooting_service import get_tester_analytics
from app.utils.audit import log_action

VALID_TESTER_TYPES = {"INTVG", "ETS364", "J750", "ETS800", "FLEX", "STS"}

tester_bp = Blueprint("tester", __name__)


@tester_bp.route("/<int:tester_id>", methods=["GET"])
@jwt_required()
def get_tester(tester_id: int):
    """Return a single tester with its current handler."""
    tester = Tester.query.get_or_404(tester_id)
    return jsonify(tester.to_dict(include_handler=True))


@tester_bp.route("/<int:tester_id>/analytics", methods=["GET"])
@jwt_required()
def get_analytics(tester_id: int):
    """
    Return aggregated troubleshooting analytics for a tester.
    Includes summary counts, sessions by month, top action tags,
    hard bin frequency, and the 20 most recent sessions with steps.
    """
    tester = Tester.query.get_or_404(tester_id)
    analytics = get_tester_analytics(tester_id)
    return jsonify({"tester": tester.to_dict(include_handler=True), **analytics})


@tester_bp.route("/<int:tester_id>/status", methods=["PATCH"])
@jwt_required()
def update_status(tester_id: int):
    """
    Change the status of a tester station.
    Body: { "status": "Maintenance", "note": "optional context" }
    Emits WebSocket event "status_update" to all connected clients.
    """
    claims = get_jwt()
    role = claims.get("role", "")
    allowed_roles = {"operator", "line_technician", "supervisor", "admin"}
    if role not in allowed_roles:
        abort(403, description="You do not have permission to update station status.")

    data = request.get_json(silent=True) or {}
    new_status = data.get("status", "").strip()
    note = data.get("note", "").strip() or None

    if not new_status:
        abort(400, description="'status' field is required.")

    user_id = get_jwt_identity()
    result = status_service.update_tester_status(
        tester_id=tester_id,
        new_status_name=new_status,
        changed_by_user_id=user_id,
        note=note,
    )
    return jsonify(result)


@tester_bp.route("/<int:tester_id>", methods=["PATCH"])
@jwt_required()
def edit_tester(tester_id: int):
    """
    Edit station details. Admin only.
    Body (all fields optional):
      name         str   — station name, e.g. "INVTG-01"
      tester_type  str   — "INVTG" | "ETS364" | "J750"
      plant        int   — 1 or 2
      is_active    bool  — false = hidden from dashboard
      handler_id   int|null — assign handler (null = move handler to Offline Area)
    """
    claims = get_jwt()
    if claims.get("role") != "admin":
        abort(403, description="Only admins can edit station details.")

    tester = Tester.query.get(tester_id)
    if not tester:
        abort(404, description=f"Tester {tester_id} not found.")

    data = request.get_json(silent=True) or {}
    changed = {}

    if "name" in data:
        new_name = data["name"].strip()
        if not new_name:
            abort(400, description="'name' cannot be empty.")
        existing = Tester.query.filter(Tester.name == new_name, Tester.id != tester_id).first()
        if existing:
            abort(400, description=f"Station name '{new_name}' is already in use.")
        tester.name = new_name
        changed["name"] = new_name

    if "tester_type" in data:
        t = data["tester_type"].strip().upper()
        if t not in VALID_TESTER_TYPES:
            abort(400, description=f"Invalid tester_type. Must be one of: {', '.join(VALID_TESTER_TYPES)}")
        tester.tester_type = t
        changed["tester_type"] = t

    if "plant" in data:
        p = data["plant"]
        if p not in (1, 3):
            abort(400, description="'plant' must be 1 or 3.")
        tester.plant = p
        changed["plant"] = p

    if "bay" in data:
        b = data["bay"]
        if b is not None and b not in (1, 2, 3):
            abort(400, description="'bay' must be 1, 2, 3, or null.")
        tester.bay = b
        changed["bay"] = b

    if "station_number" in data:
        tester.station_number = int(data["station_number"])
        changed["station_number"] = tester.station_number

    if "is_active" in data:
        tester.is_active = bool(data["is_active"])
        changed["is_active"] = tester.is_active

    # Handler assignment — "handler_id": int assigns, null unassigns
    if "handler_id" in data:
        handler_id = data["handler_id"]

        # Unassign current handler from this tester (if any)
        current_handlers = Handler.query.filter_by(current_tester_id=tester_id).all()
        for h in current_handlers:
            h.current_tester_id = None

        if handler_id is not None:
            handler = Handler.query.get(handler_id)
            if not handler:
                abort(404, description=f"Handler {handler_id} not found.")
            # If this handler was docked elsewhere, undock it first
            handler.current_tester_id = tester_id
            changed["handler_id"] = handler_id
        else:
            changed["handler_id"] = None

    log_action(
        user_id=get_jwt_identity(),
        action="edit_tester",
        resource=f"tester:{tester_id}",
        details=changed,
    )
    db.session.commit()

    return jsonify(tester.to_dict(include_handler=True))


@tester_bp.route("/<int:tester_id>/device", methods=["PATCH"])
@jwt_required()
def update_device(tester_id: int):
    """
    Update the current device under test for a station.
    Any authenticated user can call this.
    Body (all optional — omit or pass null to clear):
      customer     str | null
      part_number  str | null
      lot_number   str | null
    """
    tester = Tester.query.get(tester_id)
    if not tester:
        abort(404, description=f"Tester {tester_id} not found.")

    data = request.get_json(silent=True) or {}

    def _s(val) -> None:
        """Strip and return None if blank."""
        return val.strip() if val and str(val).strip() else None

    if "customer" in data:
        tester.current_device_customer = _s(data["customer"])
    if "part_number" in data:
        tester.current_device_part_number = _s(data["part_number"])
    if "lot_number" in data:
        tester.current_device_lot_number = _s(data["lot_number"])

    log_action(
        user_id=get_jwt_identity(),
        action="update_device",
        resource=f"tester:{tester_id}",
        details={
            "customer": tester.current_device_customer,
            "part_number": tester.current_device_part_number,
            "lot_number": tester.current_device_lot_number,
        },
    )
    db.session.commit()
    return jsonify(tester.to_dict(include_handler=True))


@tester_bp.route("/<int:tester_id>/history", methods=["GET"])
@jwt_required()
def get_history(tester_id: int):
    """
    Return the status history for a tester, newest first.
    Query param: ?limit=50 (default 50, max 200)
    """
    try:
        limit = min(int(request.args.get("limit", 50)), 200)
    except ValueError:
        limit = 50

    history = status_service.get_tester_status_history(tester_id=tester_id, limit=limit)
    return jsonify(history)
