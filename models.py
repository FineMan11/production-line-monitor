from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime, timezone

def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

db = SQLAlchemy()


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='operator')  # operator, admin
    created_at = db.Column(db.DateTime, default=_utcnow)


class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    order = db.Column(db.Integer, default=0)
    testers = db.relationship('Tester', backref='location', lazy=True)


class Status(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    color = db.Column(db.String(20), nullable=False, default='#6c757d')
    is_active = db.Column(db.Boolean, default=True)
    order = db.Column(db.Integer, default=0)


class Tester(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)   # e.g. INVTG-01
    tester_type = db.Column(db.String(20), nullable=False)         # INVTG, ETS364, J750
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'), nullable=True)
    current_status_id = db.Column(db.Integer, db.ForeignKey('status.id'), nullable=True)
    status_since = db.Column(db.DateTime, nullable=True)
    is_offline = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=_utcnow)

    current_status = db.relationship('Status', foreign_keys=[current_status_id])
    handler = db.relationship('Handler', backref='tester', uselist=False)
    history = db.relationship(
        'StatusHistory', backref='tester', lazy=True,
        order_by='StatusHistory.changed_at.desc()'
    )


class Handler(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)   # e.g. JHT-01
    handler_type = db.Column(db.String(20), nullable=False)        # JHT, MT, CAS
    tester_id = db.Column(db.Integer, db.ForeignKey('tester.id'), nullable=True)
    is_offline = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=_utcnow)


class StatusHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tester_id = db.Column(db.Integer, db.ForeignKey('tester.id'), nullable=False)
    old_status_id = db.Column(db.Integer, db.ForeignKey('status.id'), nullable=True)
    new_status_id = db.Column(db.Integer, db.ForeignKey('status.id'), nullable=False)
    changed_by = db.Column(db.String(100), default='Operator')
    changed_at = db.Column(db.DateTime, default=_utcnow)
    duration_minutes = db.Column(db.Integer, nullable=True)  # how long the OLD status lasted
    notes = db.Column(db.Text, nullable=True)

    old_status = db.relationship('Status', foreign_keys=[old_status_id])
    new_status = db.relationship('Status', foreign_keys=[new_status_id])


# ── JOB SHEET ─────────────────────────────────────────────────────────────────

class JobSheet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tester_id = db.Column(db.Integer, db.ForeignKey('tester.id'), nullable=False)
    shift = db.Column(db.String(10), nullable=False)       # 'morning' or 'night'
    date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=_utcnow)
    closed_at = db.Column(db.DateTime, nullable=True)
    is_completed = db.Column(db.Boolean, default=False)

    tester = db.relationship('Tester', backref='job_sheets')
    rio_entries = db.relationship(
        'RioDailyEntry', backref='job_sheet', lazy=True,
        order_by='RioDailyEntry.entry_time'
    )
    unproductive_entries = db.relationship(
        'UnproductiveEntry', backref='job_sheet', lazy=True,
        order_by='UnproductiveEntry.from_time'
    )


class RioDailyEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_sheet_id = db.Column(db.Integer, db.ForeignKey('job_sheet.id'), nullable=False)
    entry_time = db.Column(db.String(4), nullable=False)   # e.g. '1000', '1300'
    flow = db.Column(db.String(30), nullable=True)
    site = db.Column(db.String(10), nullable=True)         # e.g. '8', '16'
    total = db.Column(db.String(20), nullable=True)
    untested = db.Column(db.Integer, nullable=True)
    total_good = db.Column(db.Integer, nullable=True)
    total_tested = db.Column(db.Integer, nullable=True)
    device_size = db.Column(db.String(20), nullable=True)  # e.g. '4x4'
    submitted_by = db.Column(db.String(100), nullable=True)
    submitted_at = db.Column(db.DateTime, default=_utcnow)


class UnproductiveEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_sheet_id = db.Column(db.Integer, db.ForeignKey('job_sheet.id'), nullable=False)
    from_time = db.Column(db.String(4), nullable=False)    # e.g. '1202'
    to_time = db.Column(db.String(4), nullable=True)
    details = db.Column(db.Text, nullable=True)
    action_taken = db.Column(db.Text, nullable=True)
    resp_tech = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow)

    @property
    def total_time(self):
        """Auto-calculate duration in minutes from from_time and to_time."""
        if not self.from_time or not self.to_time:
            return None
        try:
            f = self.from_time.zfill(4)
            t = self.to_time.zfill(4)
            from_min = int(f[:2]) * 60 + int(f[2:])
            to_min   = int(t[:2]) * 60 + int(t[2:])
            diff = to_min - from_min
            # handle overnight
            if diff < 0:
                diff += 24 * 60
            return diff
        except Exception:
            return None

    @property
    def total_time_str(self):
        mins = self.total_time
        if mins is None:
            return '—'
        h, m = divmod(mins, 60)
        if h:
            return f'{h}h {m}m'
        return f'{m}m'
