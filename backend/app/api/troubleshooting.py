"""
Troubleshooting API
--------------------
GET   /api/troubleshooting/                 — List sessions (optional: tester_id, open_only)
POST  /api/troubleshooting/                 — Start a session
GET   /api/troubleshooting/<id>             — Get session + all steps
POST  /api/troubleshooting/<id>/steps       — Add a step to an open session
PATCH /api/troubleshooting/<id>/close       — Close a session (body: {"solved": bool})
"""
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app.extensions import db
from app.services import troubleshooting_service

troubleshooting_bp = Blueprint("troubleshooting", __name__)

_WRITE_ROLES   = {"line_technician", "supervisor", "admin"}
_DELETE_ROLES  = {"supervisor", "admin"}


def _require_write_role():
    claims = get_jwt()
    if claims.get("role", "") not in _WRITE_ROLES:
        abort(403, description="Only line technicians, supervisors, and admins can modify troubleshooting sessions.")


def _require_delete_role():
    claims = get_jwt()
    if claims.get("role", "") not in _DELETE_ROLES:
        abort(403, description="Only supervisors and admins can delete troubleshooting sessions.")


@troubleshooting_bp.route("/", methods=["GET"])
@jwt_required()
def list_sessions():
    """
    Query params:
      tester_id  (int, optional)
      open_only  ("true"/"1", optional)
    """
    tester_id    = request.args.get("tester_id", type=int)
    open_only    = request.args.get("open_only", "").lower() in ("true", "1")
    date_str     = request.args.get("date") or None
    session_type = request.args.get("session_type") or None

    since_str = request.args.get("since") or None
    until_str = request.args.get("until") or None
    try:
        since_dt = datetime.fromisoformat(since_str) if since_str else None
        until_dt = datetime.fromisoformat(until_str) if until_str else None
    except ValueError:
        abort(400, description="'since' and 'until' must be ISO-8601 datetime strings.")

    sessions = troubleshooting_service.get_sessions(
        tester_id=tester_id,
        open_only=open_only,
        date_str=date_str,
        session_type=session_type,
        since_dt=since_dt,
        until_dt=until_dt,
    )
    return jsonify(sessions)


@troubleshooting_bp.route("/", methods=["POST"])
@jwt_required()
def start_session():
    """
    Body (JSON):
      tester_id   int   required
      hard_bin    str   required  "HB04" | "HB08" | "HB12"
      technician  str   required
    """
    _require_write_role()

    data         = request.get_json(silent=True) or {}
    tester_id    = data.get("tester_id")
    session_type = (data.get("session_type") or "upchuck").strip().lower()
    hard_bin     = (data.get("hard_bin") or "").strip().upper() or None
    technician   = (data.get("technician") or "").strip()
    description  = (data.get("description") or "").strip() or None

    if not tester_id:
        abort(400, description="'tester_id' is required.")
    if not technician:
        abort(400, description="'technician' is required.")

    session = troubleshooting_service.create_session(
        tester_id=tester_id,
        session_type=session_type,
        hard_bin=hard_bin,
        description=description,
        technician=technician,
        created_by_user_id=get_jwt_identity(),
    )
    db.session.commit()
    return jsonify(session.to_dict()), 201


@troubleshooting_bp.route("/<int:session_id>", methods=["GET"])
@jwt_required()
def get_session(session_id: int):
    """Return a session with all its steps."""
    data = troubleshooting_service.get_session(session_id)
    return jsonify(data)


@troubleshooting_bp.route("/<int:session_id>/steps", methods=["POST"])
@jwt_required()
def add_step(session_id: int):
    """
    Body (JSON):
      action               str   required
      result               str   required
      pin_number           str   optional  — e.g. "170.2"
      hb_observed          str   optional  — e.g. "HB12"
      sb_observed          str   optional  — e.g. "SB05"
      failure_description  str   optional
      measured_value       str   optional
      upper_limit          str   optional
      lower_limit          str   optional
    """
    _require_write_role()

    data   = request.get_json(silent=True) or {}
    result = (data.get("result") or "").strip()

    if not result:
        abort(400, description="'result' is required.")

    sf_raw = data.get("site_failures")
    site_failures = json.dumps(sf_raw) if sf_raw else None

    step = troubleshooting_service.add_step(
        session_id=session_id,
        result=result,
        user_id=get_jwt_identity(),
        action=data.get("action"),
        action_tags=data.get("action_tags"),
        plan=data.get("plan"),
        pin_number=data.get("pin_number"),
        hb_observed=data.get("hb_observed"),
        sb_observed=data.get("sb_observed"),
        failure_description=data.get("failure_description"),
        measured_value=data.get("measured_value"),
        upper_limit=data.get("upper_limit"),
        lower_limit=data.get("lower_limit"),
        site_count=data.get("site_count"),
        site_number=data.get("site_number"),
        site_failures=site_failures,
    )
    db.session.commit()
    return jsonify(step.to_dict()), 201


@troubleshooting_bp.route("/steps/<int:step_id>", methods=["PATCH"])
@jwt_required()
def update_step(step_id: int):
    """Update editable fields on a step. Any write-role user can edit."""
    _require_write_role()
    data = request.get_json(silent=True) or {}
    sf_raw = data.get("site_failures")
    site_failures = json.dumps(sf_raw) if sf_raw is not None else None

    step = troubleshooting_service.update_step(
        step_id=step_id,
        user_id=get_jwt_identity(),
        action=data.get("action"),
        action_tags=data.get("action_tags"),
        result=data.get("result"),
        plan=data.get("plan"),
        pin_number=data.get("pin_number"),
        hb_observed=data.get("hb_observed"),
        sb_observed=data.get("sb_observed"),
        failure_description=data.get("failure_description"),
        measured_value=data.get("measured_value"),
        upper_limit=data.get("upper_limit"),
        lower_limit=data.get("lower_limit"),
        site_count=data.get("site_count"),
        site_number=data.get("site_number"),
        site_failures=site_failures,
    )
    db.session.commit()
    return jsonify(step.to_dict())


@troubleshooting_bp.route("/<int:session_id>/close", methods=["PATCH"])
@jwt_required()
def close_session(session_id: int):
    """
    Body (JSON):
      solved  bool  required  — true if issue was resolved, false otherwise
    """
    _require_write_role()

    data = request.get_json(silent=True) or {}
    if "solved" not in data:
        abort(400, description="'solved' (boolean) is required.")

    session = troubleshooting_service.close_session(
        session_id=session_id,
        solved=bool(data["solved"]),
        user_id=get_jwt_identity(),
    )
    db.session.commit()
    return jsonify(session.to_dict(include_steps=False))


@troubleshooting_bp.route("/<int:session_id>", methods=["DELETE"])
@jwt_required()
def delete_session(session_id: int):
    """Permanently delete a troubleshooting session and all its steps. Supervisor/admin only."""
    _require_delete_role()
    troubleshooting_service.delete_session(session_id, user_id=get_jwt_identity())
    db.session.commit()
    return jsonify({"message": "Session deleted."})
