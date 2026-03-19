"""
Maintenance API
---------------
GET   /api/maintenance/              — List logs (with optional filters)
POST  /api/maintenance/              — Create a new log
PATCH /api/maintenance/<id>/close    — Close an open log
GET   /api/maintenance/<id>/open     — Get the open log for a tester (or null)
"""
from datetime import datetime
from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app.extensions import db
from app.services import maintenance_service

maintenance_bp = Blueprint("maintenance", __name__)

_WRITE_ROLES  = {"line_technician", "supervisor", "admin"}
_DELETE_ROLES = {"supervisor", "admin"}


def _require_write_role():
    claims = get_jwt()
    if claims.get("role", "") not in _WRITE_ROLES:
        abort(403, description="Only line technicians, supervisors, and admins can modify maintenance logs.")


def _require_delete_role():
    claims = get_jwt()
    if claims.get("role", "") not in _DELETE_ROLES:
        abort(403, description="Only supervisors and admins can delete maintenance logs.")


@maintenance_bp.route("/", methods=["GET"])
@jwt_required()
def list_logs():
    """
    Query params:
      tester_id  (int, optional)
      date       (YYYY-MM-DD, optional)
      open_only  (bool as string "true"/"1", optional)
    """
    tester_id = request.args.get("tester_id", type=int)
    date_str  = request.args.get("date")
    open_only = request.args.get("open_only", "").lower() in ("true", "1")

    logs = maintenance_service.get_maintenance_logs(
        tester_id=tester_id,
        date_str=date_str,
        open_only=open_only,
    )
    return jsonify(logs)


@maintenance_bp.route("/", methods=["POST"])
@jwt_required()
def create_log():
    """
    Body (JSON):
      tester_id         int      required
      technician        str      required
      start_time        str      required  ISO 8601 datetime
      fault_code        str      optional
      fault_description str      optional
      parts_replaced    str      optional
      issue_type        str      required  "tester" or "handler"
      notes             str      optional
    """
    _require_write_role()

    data = request.get_json(silent=True) or {}

    tester_id  = data.get("tester_id")
    technician = data.get("technician", "").strip()
    start_str  = data.get("start_time", "").strip()
    issue_type = data.get("issue_type", "tester").strip()

    if not tester_id:
        abort(400, description="'tester_id' is required.")
    if not technician:
        abort(400, description="'technician' is required.")
    if not start_str:
        abort(400, description="'start_time' is required.")

    try:
        start_time = datetime.fromisoformat(start_str)
    except ValueError:
        abort(400, description="Invalid 'start_time'. Use ISO 8601 format: 2026-03-19T08:00:00")

    log = maintenance_service.create_maintenance_log(
        tester_id=tester_id,
        technician=technician,
        start_time=start_time,
        fault_code=data.get("fault_code"),
        fault_description=data.get("fault_description"),
        parts_replaced=data.get("parts_replaced"),
        issue_type=issue_type,
        notes=data.get("notes"),
        created_by_user_id=get_jwt_identity(),
    )
    db.session.commit()
    return jsonify(log.to_dict()), 201


@maintenance_bp.route("/<int:log_id>/close", methods=["PATCH"])
@jwt_required()
def close_log(log_id: int):
    """Close an open maintenance log."""
    _require_write_role()

    log = maintenance_service.close_maintenance_log(
        log_id=log_id,
        closed_by_user_id=get_jwt_identity(),
    )
    db.session.commit()
    return jsonify(log.to_dict())


@maintenance_bp.route("/<int:log_id>", methods=["DELETE"])
@jwt_required()
def delete_log(log_id: int):
    """Permanently delete a maintenance log. Supervisor/admin only."""
    _require_delete_role()
    maintenance_service.delete_maintenance_log(log_id, user_id=get_jwt_identity())
    db.session.commit()
    return jsonify({"message": "Log deleted."})


@maintenance_bp.route("/<int:tester_id>/open", methods=["GET"])
@jwt_required()
def get_open_log(tester_id: int):
    """
    Returns the currently open maintenance log for a tester.
    Response: { "log": { ...dict... } }  or  { "log": null }
    Used by TesterCard to toggle Start/Close Maintenance.
    """
    log = maintenance_service.get_open_log_for_tester(tester_id=tester_id)
    return jsonify({"log": log.to_dict() if log else None})
