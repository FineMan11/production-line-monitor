import json
from datetime import datetime, timezone
from app.extensions import db


VALID_HARD_BINS   = {"HB04", "HB08", "HB12"}
VALID_SESSION_TYPES = {"upchuck", "jamming"}


class TroubleshootingSession(db.Model):
    """
    APPEND-ONLY header for one troubleshooting incident.
    Closed by setting resolved_at — never DELETE.
    session_type: "upchuck" (HB-driven) | "jamming" (physical handler/tester jam)
    """
    __tablename__ = "troubleshooting_sessions"

    id           = db.Column(db.Integer, primary_key=True)
    tester_id    = db.Column(db.Integer, db.ForeignKey("testers.id"), nullable=False, index=True)
    session_type = db.Column(db.String(20), nullable=False, default="upchuck")
    hard_bin     = db.Column(db.String(10), nullable=True)
    # hard_bin: "HB04" | "HB08" | "HB12" — only set for upchuck sessions
    description  = db.Column(db.Text, nullable=True)
    # description: short summary of the jamming event — only set for jamming sessions
    technician   = db.Column(db.String(100), nullable=False)
    # Free-text name — not a FK to users (shared login by design)
    started_at  = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    resolved_at = db.Column(db.DateTime, nullable=True)
    # resolved_at=None means session is still open
    solved      = db.Column(db.Boolean, nullable=True)
    # True = solved, False = closed without solution, None = still open
    created_by  = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    steps   = db.relationship(
        "TroubleshootingStep",
        back_populates="session",
        order_by="TroubleshootingStep.created_at",
        lazy="dynamic",
    )
    tester  = db.relationship("Tester", back_populates="troubleshooting_sessions")
    creator = db.relationship("User", backref="troubleshooting_sessions")

    @property
    def is_open(self) -> bool:
        return self.resolved_at is None

    def to_dict(self, include_steps: bool = False) -> dict:
        data = {
            "id": self.id,
            "tester_id": self.tester_id,
            "tester_name": self.tester.name if self.tester else None,
            "session_type": self.session_type,
            "hard_bin": self.hard_bin,
            "description": self.description,
            "technician": self.technician,
            "started_at": self.started_at.isoformat() + 'Z',
            "resolved_at": self.resolved_at.isoformat() + 'Z' if self.resolved_at else None,
            "solved": self.solved,
            "is_open": self.is_open,
        }
        if include_steps:
            data["steps"] = [s.to_dict() for s in self.steps]
        return data

    def __repr__(self):
        state = "open" if self.is_open else "closed"
        return f"<TroubleshootingSession tester={self.tester_id} {self.hard_bin} {state}>"


class TroubleshootingStep(db.Model):
    """
    APPEND-ONLY — each action→result entry within a session.
    Never UPDATE or DELETE rows.
    """
    __tablename__ = "troubleshooting_steps"

    id         = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(
        db.Integer, db.ForeignKey("troubleshooting_sessions.id"), nullable=False, index=True
    )
    # ── Failure observation from tester PC (all optional) ──────────────
    pin_number          = db.Column(db.String(20),  nullable=True)   # e.g. "170.2"
    hb_observed         = db.Column(db.String(10),  nullable=True)   # e.g. "HB12"
    sb_observed         = db.Column(db.String(20),  nullable=True)   # e.g. "SB05"
    failure_description = db.Column(db.Text,        nullable=True)
    measured_value      = db.Column(db.String(30),  nullable=True)
    upper_limit         = db.Column(db.String(30),  nullable=True)
    lower_limit         = db.Column(db.String(30),  nullable=True)
    site_count          = db.Column(db.Integer,     nullable=True)   # 1 | 2 | 4 | 8 | 16
    site_number         = db.Column(db.String(50),  nullable=True)   # comma-separated e.g. "1,3,4"
    site_failures       = db.Column(db.Text,        nullable=True)   # JSON array of per-site failure objects
    # ───────────────────────────────────────────────────────────────────
    action_tags = db.Column(db.Text, nullable=True)  # comma-separated preset actions e.g. "Clean Socket,Swap Chuck"
    action     = db.Column(db.Text, nullable=True)   # free-text action description (optional)
    result     = db.Column(db.Text, nullable=False)
    plan       = db.Column(db.Text, nullable=True)   # next planned action — jamming only
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    session = db.relationship("TroubleshootingSession", back_populates="steps")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "pin_number": self.pin_number,
            "hb_observed": self.hb_observed,
            "sb_observed": self.sb_observed,
            "failure_description": self.failure_description,
            "measured_value": self.measured_value,
            "upper_limit": self.upper_limit,
            "lower_limit": self.lower_limit,
            "site_count": self.site_count,
            "site_number": self.site_number,
            "site_failures": json.loads(self.site_failures) if self.site_failures else None,
            "action_tags": self.action_tags,
            "action": self.action,
            "result": self.result,
            "plan": self.plan,
            "created_at": self.created_at.isoformat() + 'Z',
        }

    def __repr__(self):
        return f"<TroubleshootingStep session={self.session_id}>"
