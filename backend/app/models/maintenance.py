from datetime import datetime, timezone
from app.extensions import db


class MaintenanceLog(db.Model):
    """
    APPEND-ONLY — close logs by setting end_time, never DELETE rows.
    Compliance requirement: all maintenance history must be preserved.
    """
    __tablename__ = "maintenance_logs"

    id                = db.Column(db.Integer, primary_key=True)
    tester_id         = db.Column(db.Integer, db.ForeignKey("testers.id"), nullable=False, index=True)
    technician        = db.Column(db.String(100), nullable=False)
    # Free-text name — not a FK to users, by design (shared technician login)
    fault_code        = db.Column(db.String(50), nullable=True)
    fault_description = db.Column(db.Text, nullable=True)
    parts_replaced    = db.Column(db.Text, nullable=True)
    issue_type        = db.Column(db.String(20), nullable=False, default="tester")
    # issue_type: "tester" or "handler"
    start_time        = db.Column(db.DateTime, nullable=False, index=True)
    end_time          = db.Column(db.DateTime, nullable=True)
    # end_time=None means the log is still open
    notes             = db.Column(db.Text, nullable=True)
    created_by        = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at        = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    tester  = db.relationship("Tester", back_populates="maintenance_logs")
    creator = db.relationship("User", backref="maintenance_logs")

    @property
    def is_open(self) -> bool:
        return self.end_time is None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "tester_id": self.tester_id,
            "tester_name": self.tester.name if self.tester else None,
            "technician": self.technician,
            "fault_code": self.fault_code,
            "fault_description": self.fault_description,
            "parts_replaced": self.parts_replaced,
            "issue_type": self.issue_type,
            "start_time": self.start_time.isoformat() + 'Z',
            "end_time": self.end_time.isoformat() + 'Z' if self.end_time else None,
            "notes": self.notes,
            "is_open": self.is_open,
        }

    def __repr__(self):
        state = "open" if self.is_open else "closed"
        return f"<MaintenanceLog tester={self.tester_id} {state}>"
