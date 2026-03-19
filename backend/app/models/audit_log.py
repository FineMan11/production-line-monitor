from datetime import datetime, timezone
from app.extensions import db


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    # Nullable so we can log pre-auth failures (no user yet)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    # e.g. "user.login", "user.logout", "user.login_failed", "status.update"
    action = db.Column(db.String(100), nullable=False)
    # e.g. "user:5", "station:12" — what was affected
    resource = db.Column(db.String(100), nullable=True)
    # Any extra context (JSON object)
    details = db.Column(db.JSON, nullable=True)
    # Supports both IPv4 and IPv6
    ip_address = db.Column(db.String(45), nullable=True)
    timestamp = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    user = db.relationship("User", backref="audit_logs")

    def __repr__(self):
        return f"<AuditLog {self.action} by user_id={self.user_id}>"
