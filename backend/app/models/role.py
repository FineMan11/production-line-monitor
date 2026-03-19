from app.extensions import db

# Association table for the many-to-many relationship between roles and permissions.
# No model class needed — SQLAlchemy manages this table automatically.
role_permissions = db.Table(
    "role_permissions",
    db.Column("role_id", db.Integer, db.ForeignKey("roles.id"), primary_key=True),
    db.Column("permission_id", db.Integer, db.ForeignKey("permissions.id"), primary_key=True),
)


class Permission(db.Model):
    __tablename__ = "permissions"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(200), nullable=True)

    def __repr__(self):
        return f"<Permission {self.name}>"


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # "operator", "supervisor", "admin"
    permissions = db.relationship(
        "Permission",
        secondary=role_permissions,
        lazy="subquery",
        backref=db.backref("roles", lazy=True),
    )

    def __repr__(self):
        return f"<Role {self.name}>"
