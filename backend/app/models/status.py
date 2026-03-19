from app.extensions import db


class Status(db.Model):
    __tablename__ = "statuses"

    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(50), unique=True, nullable=False)
    color_code = db.Column(db.String(20), nullable=False)
    # name / color_code pairs:
    #   Running     → green
    #   Maintenance → orange
    #   Engineering → blue
    #   Down        → red

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "color_code": self.color_code,
        }

    def __repr__(self):
        return f"<Status {self.name}>"
