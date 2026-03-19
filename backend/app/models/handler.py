from app.extensions import db


class Handler(db.Model):
    __tablename__ = "handlers"

    id                = db.Column(db.Integer, primary_key=True)
    name              = db.Column(db.String(50), unique=True, nullable=False, index=True)
    handler_type      = db.Column(db.String(20), nullable=False, index=True)
    # handler_type: "JHT", "MT", or "CAS"
    current_tester_id = db.Column(db.Integer, db.ForeignKey("testers.id"), nullable=True)
    # Null = handler is in the Offline Area (not docked to any station)
    is_active         = db.Column(db.Boolean, default=True, nullable=False)

    current_tester = db.relationship("Tester", backref="handlers")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "handler_type": self.handler_type,
            "current_tester_id": self.current_tester_id,
            "is_active": self.is_active,
        }

    def __repr__(self):
        return f"<Handler {self.name} ({self.handler_type})>"
