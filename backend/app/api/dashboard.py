"""
Dashboard API
-------------
GET /api/dashboard/testers  — All active testers with embedded handler
GET /api/dashboard/handlers — All active handlers (including unattached)
GET /api/dashboard/statuses — All valid status options
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from app.models import Tester, Handler, Status

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/testers", methods=["GET"])
@jwt_required()
def get_testers():
    """
    Returns all active testers ordered by plant then station_number.
    Each tester includes the handler currently docked to it (or null).
    """
    testers = (
        Tester.query
        .filter_by(is_active=True)
        .order_by(Tester.plant.asc(), Tester.station_number.asc())
        .all()
    )
    return jsonify([t.to_dict(include_handler=True) for t in testers])


@dashboard_bp.route("/handlers", methods=["GET"])
@jwt_required()
def get_handlers():
    """
    Returns all active handlers.
    Handlers with current_tester_id=None are in the Offline Area.
    """
    handlers = Handler.query.filter_by(is_active=True).all()
    return jsonify([h.to_dict() for h in handlers])


@dashboard_bp.route("/statuses", methods=["GET"])
@jwt_required()
def get_statuses():
    """
    Returns the four valid status options.
    Used by the 'Change Status' dropdown on TesterCard.
    """
    statuses = Status.query.order_by(Status.id.asc()).all()
    return jsonify([s.to_dict() for s in statuses])
