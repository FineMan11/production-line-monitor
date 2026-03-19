"""
Admin API
---------
Full CRUD for testers and handlers. Admin only.

GET  /api/admin/testers          — All testers (including inactive)
POST /api/admin/testers          — Create a new tester
GET  /api/admin/handlers         — All handlers (including inactive)
POST /api/admin/handlers         — Create a new handler
PATCH /api/admin/handlers/<id>   — Edit handler (name, type, active, tester assignment)
DELETE /api/admin/handlers/<id>  — Soft delete (sets is_active=False)
DELETE /api/admin/testers/<id>   — Soft delete (sets is_active=False)
"""
from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app.extensions import db
from app.models import Tester, Handler, Status
from app.utils.audit import log_action

admin_bp = Blueprint("admin", __name__)


def _require_admin():
    claims = get_jwt()
    if claims.get("role") != "admin":
        abort(403, description="Admin access required.")


# ── Testers ────────────────────────────────────────────────────────────────── #

@admin_bp.route("/testers", methods=["GET"])
@jwt_required()
def list_testers():
    """Return ALL testers including inactive, ordered by plant + station_number."""
    _require_admin()
    testers = (
        Tester.query
        .order_by(Tester.plant.asc(), Tester.station_number.asc())
        .all()
    )
    return jsonify([t.to_dict(include_handler=True) for t in testers])


@admin_bp.route("/testers", methods=["POST"])
@jwt_required()
def create_tester():
    """
    Create a new tester station.
    Body:
      name         str  required  — e.g. "ETS500-01"
      tester_type  str  required  — free text, e.g. "INVTG", "ETS500"
      plant        int  required  — 1 or 2
      station_number int optional — auto-assigned if omitted (next in plant)
    """
    _require_admin()
    data = request.get_json(silent=True) or {}

    name        = (data.get("name") or "").strip()
    tester_type = (data.get("tester_type") or "").strip().upper()
    plant       = data.get("plant")

    if not name:
        abort(400, description="'name' is required.")
    if not tester_type:
        abort(400, description="'tester_type' is required.")
    if plant not in (1, 2):
        abort(400, description="'plant' must be 1 or 2.")

    if Tester.query.filter_by(name=name).first():
        abort(400, description=f"A tester named '{name}' already exists.")

    # Auto-assign station_number if not provided
    station_number = data.get("station_number")
    if not station_number:
        last = (
            Tester.query
            .filter_by(plant=plant)
            .order_by(Tester.station_number.desc())
            .first()
        )
        station_number = (last.station_number + 1) if last else 1

    running_status = Status.query.filter_by(name="Running").first()
    if not running_status:
        abort(500, description="Status table not seeded. Run 'flask seed' first.")

    tester = Tester(
        name=name,
        tester_type=tester_type,
        plant=int(plant),
        station_number=int(station_number),
        current_status=running_status,
        is_active=True,
    )
    db.session.add(tester)

    log_action(
        user_id=get_jwt_identity(),
        action="create_tester",
        resource="tester",
        details={"name": name, "tester_type": tester_type, "plant": plant},
    )
    db.session.commit()
    return jsonify(tester.to_dict(include_handler=True)), 201


@admin_bp.route("/testers/<int:tester_id>", methods=["DELETE"])
@jwt_required()
def remove_tester(tester_id: int):
    """Soft delete — sets is_active=False. Does not delete data."""
    _require_admin()
    tester = Tester.query.get(tester_id)
    if not tester:
        abort(404, description=f"Tester {tester_id} not found.")

    tester.is_active = False

    # Unassign any handler docked to this tester
    for h in Handler.query.filter_by(current_tester_id=tester_id).all():
        h.current_tester_id = None

    log_action(
        user_id=get_jwt_identity(),
        action="remove_tester",
        resource=f"tester:{tester_id}",
        details={"name": tester.name},
    )
    db.session.commit()
    return jsonify({"message": f"Tester '{tester.name}' has been deactivated."})


@admin_bp.route("/testers/<int:tester_id>/restore", methods=["PATCH"])
@jwt_required()
def restore_tester(tester_id: int):
    """Re-enable a previously deactivated tester."""
    _require_admin()
    tester = Tester.query.get(tester_id)
    if not tester:
        abort(404, description=f"Tester {tester_id} not found.")

    tester.is_active = True
    log_action(
        user_id=get_jwt_identity(),
        action="restore_tester",
        resource=f"tester:{tester_id}",
        details={"name": tester.name},
    )
    db.session.commit()
    return jsonify(tester.to_dict(include_handler=True))


# ── Handlers ───────────────────────────────────────────────────────────────── #

@admin_bp.route("/handlers", methods=["GET"])
@jwt_required()
def list_handlers():
    """Return ALL handlers including inactive."""
    _require_admin()
    handlers = Handler.query.order_by(Handler.handler_type.asc(), Handler.name.asc()).all()
    return jsonify([h.to_dict() for h in handlers])


@admin_bp.route("/handlers", methods=["POST"])
@jwt_required()
def create_handler():
    """
    Create a new handler.
    Body:
      name          str  required  — e.g. "JHT-11" or "ROBOT-01"
      handler_type  str  required  — free text, e.g. "JHT", "MT", "ROBOT"
    """
    _require_admin()
    data = request.get_json(silent=True) or {}

    name         = (data.get("name") or "").strip()
    handler_type = (data.get("handler_type") or "").strip().upper()

    if not name:
        abort(400, description="'name' is required.")
    if not handler_type:
        abort(400, description="'handler_type' is required.")

    if Handler.query.filter_by(name=name).first():
        abort(400, description=f"A handler named '{name}' already exists.")

    handler = Handler(name=name, handler_type=handler_type, is_active=True)
    db.session.add(handler)

    log_action(
        user_id=get_jwt_identity(),
        action="create_handler",
        resource="handler",
        details={"name": name, "handler_type": handler_type},
    )
    db.session.commit()
    return jsonify(handler.to_dict()), 201


@admin_bp.route("/handlers/<int:handler_id>", methods=["PATCH"])
@jwt_required()
def edit_handler(handler_id: int):
    """
    Edit a handler's name, type, or active state.
    Body (all optional): name, handler_type, is_active
    """
    _require_admin()
    handler = Handler.query.get(handler_id)
    if not handler:
        abort(404, description=f"Handler {handler_id} not found.")

    data    = request.get_json(silent=True) or {}
    changed = {}

    if "name" in data:
        new_name = data["name"].strip()
        if not new_name:
            abort(400, description="'name' cannot be empty.")
        existing = Handler.query.filter(Handler.name == new_name, Handler.id != handler_id).first()
        if existing:
            abort(400, description=f"Handler name '{new_name}' is already in use.")
        handler.name = new_name
        changed["name"] = new_name

    if "handler_type" in data:
        handler.handler_type = data["handler_type"].strip().upper()
        changed["handler_type"] = handler.handler_type

    if "is_active" in data:
        handler.is_active = bool(data["is_active"])
        if not handler.is_active:
            handler.current_tester_id = None  # unassign on deactivate
        changed["is_active"] = handler.is_active

    log_action(
        user_id=get_jwt_identity(),
        action="edit_handler",
        resource=f"handler:{handler_id}",
        details=changed,
    )
    db.session.commit()
    return jsonify(handler.to_dict())


@admin_bp.route("/handlers/<int:handler_id>", methods=["DELETE"])
@jwt_required()
def remove_handler(handler_id: int):
    """Soft delete — sets is_active=False and unassigns from any tester."""
    _require_admin()
    handler = Handler.query.get(handler_id)
    if not handler:
        abort(404, description=f"Handler {handler_id} not found.")

    handler.is_active          = False
    handler.current_tester_id  = None

    log_action(
        user_id=get_jwt_identity(),
        action="remove_handler",
        resource=f"handler:{handler_id}",
        details={"name": handler.name},
    )
    db.session.commit()
    return jsonify({"message": f"Handler '{handler.name}' has been deactivated."})


@admin_bp.route("/handlers/<int:handler_id>/restore", methods=["PATCH"])
@jwt_required()
def restore_handler(handler_id: int):
    """Re-enable a previously deactivated handler."""
    _require_admin()
    handler = Handler.query.get(handler_id)
    if not handler:
        abort(404, description=f"Handler {handler_id} not found.")

    handler.is_active = True
    log_action(
        user_id=get_jwt_identity(),
        action="restore_handler",
        resource=f"handler:{handler_id}",
        details={"name": handler.name},
    )
    db.session.commit()
    return jsonify(handler.to_dict())
