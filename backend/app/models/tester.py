from datetime import datetime, timezone
from app.extensions import db


class Tester(db.Model):
    __tablename__ = "testers"

    id                = db.Column(db.Integer, primary_key=True)
    name              = db.Column(db.String(50), unique=True, nullable=False, index=True)
    tester_type       = db.Column(db.String(20), nullable=False, index=True)
    # tester_type: "INVTG", "ETS364", or "J750"
    plant             = db.Column(db.Integer, nullable=False)
    # plant: 1 (10 stations) or 3 (42 stations)
    bay               = db.Column(db.Integer, nullable=True)
    # bay: 1|2|3 for Plant 3, null for Plant 1
    station_number    = db.Column(db.Integer, nullable=False)
    # 1-based position within the plant — used for fixed-grid ordering
    current_status_id = db.Column(db.Integer, db.ForeignKey("statuses.id"), nullable=False)
    is_active         = db.Column(db.Boolean, default=True, nullable=False)
    # Current device under test (updated by any logged-in user)
    current_device_customer    = db.Column(db.String(100), nullable=True)
    current_device_part_number = db.Column(db.String(100), nullable=True)
    current_device_lot_number  = db.Column(db.String(100), nullable=True)

    current_status   = db.relationship("Status", backref="testers")
    status_history   = db.relationship("StatusHistory", back_populates="tester", lazy="dynamic")
    maintenance_logs          = db.relationship("MaintenanceLog", back_populates="tester", lazy="dynamic")
    troubleshooting_sessions  = db.relationship("TroubleshootingSession", back_populates="tester", lazy="dynamic")

    def to_dict(self, include_handler: bool = False) -> dict:
        data = {
            "id": self.id,
            "name": self.name,
            "tester_type": self.tester_type,
            "plant": self.plant,
            "bay": self.bay,
            "station_number": self.station_number,
            "status": self.current_status.name,
            "status_color": self.current_status.color_code,
            "is_active": self.is_active,
            "current_device_customer":    self.current_device_customer,
            "current_device_part_number": self.current_device_part_number,
            "current_device_lot_number":  self.current_device_lot_number,
        }
        if include_handler:
            active_handler = next(
                (h for h in self.handlers if h.is_active and h.current_tester_id == self.id),
                None,
            )
            data["handler"] = (
                {"id": active_handler.id,
                 "name": active_handler.name,
                 "handler_type": active_handler.handler_type}
                if active_handler else None
            )
        return data

    def __repr__(self):
        return f"<Tester {self.name} ({self.tester_type}) Plant {self.plant}>"


class StatusHistory(db.Model):
    """
    APPEND-ONLY — every status change creates a new row.
    Never UPDATE or DELETE existing rows. Compliance requirement.
    """
    __tablename__ = "status_history"

    id         = db.Column(db.Integer, primary_key=True)
    tester_id  = db.Column(db.Integer, db.ForeignKey("testers.id"), nullable=False, index=True)
    status_id  = db.Column(db.Integer, db.ForeignKey("statuses.id"), nullable=False)
    changed_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    # nullable: system/seed changes have no associated user
    changed_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    note       = db.Column(db.String(255), nullable=True)

    tester = db.relationship("Tester", back_populates="status_history")
    status = db.relationship("Status")
    user   = db.relationship("User", backref="status_changes")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "status": self.status.name,
            "status_color": self.status.color_code,
            "changed_by": self.user.username if self.user else "system",
            "changed_at": self.changed_at.isoformat() + 'Z',
            "note": self.note,
        }

    def __repr__(self):
        return f"<StatusHistory tester={self.tester_id} status={self.status_id}>"
