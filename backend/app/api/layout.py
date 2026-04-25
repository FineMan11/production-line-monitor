"""
Layout API
----------
GET /api/layout/<section_key>  — Get the ordered slot layout for a section
PUT /api/layout/<section_key>  — Save a new layout (admin only)

Section keys: plant1, plant3_bay1, plant3_bay2, plant3_bay3
Layout value: JSON array of tester IDs (int) and nulls for empty slots
              e.g. [5, null, 3, null, 7, 2]
"""
from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app.extensions import db
from app.models import Tester, LayoutConfig
from app.utils.audit import log_action

layout_bp = Blueprint("layout", __name__)

# Maps a section key to the tester filter (plant + bay) for auto-initialisation
SECTION_FILTERS = {
    "plant1":      {"plant": 1, "bay": None},
    "plant3_bay1": {"plant": 3, "bay": 1},
    "plant3_bay2": {"plant": 3, "bay": 2},
    "plant3_bay3": {"plant": 3, "bay": 3},
}


def _auto_init_layout(section_key: str) -> list:
    """Return a default layout built from the current tester order for this section."""
    filters = SECTION_FILTERS[section_key]
    query = Tester.query.filter_by(is_active=True, plant=filters["plant"])
    if filters["bay"] is not None:
        query = query.filter_by(bay=filters["bay"])
    else:
        query = query.filter(Tester.bay.is_(None))
    testers = query.order_by(Tester.station_number.asc()).all()
    return [t.id for t in testers]


@layout_bp.route("/<section_key>", methods=["GET"])
@jwt_required()
def get_layout(section_key: str):
    if section_key not in SECTION_FILTERS:
        abort(404, description=f"Unknown section key: '{section_key}'")

    config = LayoutConfig.query.filter_by(section_key=section_key).first()
    if not config:
        layout = _auto_init_layout(section_key)
        config = LayoutConfig(section_key=section_key)
        config.set_layout(layout)
        db.session.add(config)
        db.session.commit()

    return jsonify({"section_key": section_key, "layout": config.get_layout()})


@layout_bp.route("/<section_key>", methods=["PUT"])
@jwt_required()
def save_layout(section_key: str):
    claims = get_jwt()
    if claims.get("role") != "admin":
        abort(403, description="Only admins can modify the layout.")

    if section_key not in SECTION_FILTERS:
        abort(404, description=f"Unknown section key: '{section_key}'")

    data = request.get_json(silent=True) or {}
    layout = data.get("layout")
    if not isinstance(layout, list):
        abort(400, description="'layout' must be a list.")

    # Validate all non-null entries are real tester IDs
    tester_ids = [x for x in layout if x is not None]
    if tester_ids:
        valid_ids = {t.id for t in Tester.query.filter(Tester.id.in_(tester_ids)).all()}
        invalid = set(tester_ids) - valid_ids
        if invalid:
            abort(400, description=f"Invalid tester IDs in layout: {sorted(invalid)}")

    config = LayoutConfig.query.filter_by(section_key=section_key).first()
    if not config:
        config = LayoutConfig(section_key=section_key)
        db.session.add(config)

    config.set_layout(layout)
    log_action(
        user_id=get_jwt_identity(),
        action="save_layout",
        resource=f"layout:{section_key}",
        details={"length": len(layout)},
    )
    db.session.commit()

    return jsonify({"section_key": section_key, "layout": config.get_layout()})
