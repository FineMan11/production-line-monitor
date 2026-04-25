import json
from app.extensions import db


class LayoutConfig(db.Model):
    __tablename__ = 'layout_configs'

    id          = db.Column(db.Integer, primary_key=True)
    section_key = db.Column(db.String(30), unique=True, nullable=False, index=True)
    layout      = db.Column(db.Text, nullable=False, default='[]')
    # layout: JSON array of tester IDs (int) and nulls, e.g. "[5, null, 3, null, 7]"

    def get_layout(self) -> list:
        return json.loads(self.layout)

    def set_layout(self, lst: list) -> None:
        self.layout = json.dumps(lst)

    def __repr__(self):
        return f"<LayoutConfig {self.section_key}>"
