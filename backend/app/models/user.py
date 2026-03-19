from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    role = db.relationship("Role", backref="users")

    def set_password(self, password: str) -> None:
        """Hash and store the password. Never store plain text."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Return True if the password matches the stored hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        """Safe representation — never includes password_hash."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role.name,
            "is_active": self.is_active,
            "last_login": self.last_login.isoformat() + 'Z' if self.last_login else None,
        }

    def __repr__(self):
        return f"<User {self.username} ({self.role.name})>"
