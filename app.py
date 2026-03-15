from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)
from models import db, User, Location, Status, Tester, Handler, StatusHistory, JobSheet, RioDailyEntry, UnproductiveEntry
import os
from datetime import date

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///production.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message = ''


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# ============================================================
# DASHBOARD
# ============================================================

@app.route('/')
def dashboard():
    locations = Location.query.order_by(Location.order).all()
    unassigned = Tester.query.filter_by(location_id=None, is_offline=False).all()
    offline_testers = Tester.query.filter_by(is_offline=True).all()
    offline_handlers = Handler.query.filter(
        (Handler.tester_id == None) | (Handler.is_offline == True)
    ).all()
    statuses = Status.query.filter_by(is_active=True).order_by(Status.order).all()
    now = utcnow()

    total_testers = Tester.query.count()
    total_online = Tester.query.filter_by(is_offline=False).count()
    total_offline = Tester.query.filter_by(is_offline=True).count()

    # Count testers per status
    status_counts = {}
    for s in statuses:
        status_counts[s.id] = Tester.query.filter_by(
            current_status_id=s.id, is_offline=False
        ).count()

    # Job sheet reminders — find testers with no entry in last 3 hours
    today = date.today()
    shift = current_shift()
    sheets = {s.tester_id: s for s in
              JobSheet.query.filter_by(date=today, shift=shift, is_completed=False).all()}
    reminder_tester_ids = set()
    for tester in Tester.query.filter_by(is_offline=False).all():
        sheet = sheets.get(tester.id)
        mins = minutes_since_last_entry(sheet)
        if mins is None or mins >= 180:
            reminder_tester_ids.add(tester.id)

    return render_template(
        'dashboard.html',
        locations=locations,
        unassigned=unassigned,
        offline_testers=offline_testers,
        offline_handlers=offline_handlers,
        statuses=statuses,
        now=now,
        total_testers=total_testers,
        total_online=total_online,
        total_offline=total_offline,
        status_counts=status_counts,
        reminder_tester_ids=reminder_tester_ids,
    )


# ============================================================
# STATUS UPDATE
# ============================================================

@app.route('/station/<int:tester_id>/update_status', methods=['POST'])
def update_status(tester_id):
    tester = Tester.query.get_or_404(tester_id)
    new_status_id = request.form.get('status_id', type=int)
    changed_by = (request.form.get('changed_by') or 'Operator').strip()
    notes = (request.form.get('notes') or '').strip()

    new_status = Status.query.get_or_404(new_status_id)

    # Calculate how long the previous status lasted
    duration = None
    if tester.status_since and tester.current_status_id:
        delta = utcnow() - tester.status_since
        duration = int(delta.total_seconds() / 60)

    history = StatusHistory(
        tester_id=tester.id,
        old_status_id=tester.current_status_id,
        new_status_id=new_status_id,
        changed_by=changed_by,
        changed_at=utcnow(),
        duration_minutes=duration,
        notes=notes
    )
    db.session.add(history)

    tester.current_status_id = new_status_id
    tester.status_since = utcnow()
    db.session.commit()

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({
            'success': True,
            'status_name': new_status.name,
            'status_color': new_status.color
        })

    flash(f'Status updated to {new_status.name}', 'success')
    return redirect(url_for('dashboard'))


# ============================================================
# STATION HISTORY
# ============================================================

@app.route('/station/<int:tester_id>')
def station_detail(tester_id):
    tester = Tester.query.get_or_404(tester_id)
    history = (
        StatusHistory.query
        .filter_by(tester_id=tester_id)
        .order_by(StatusHistory.changed_at.desc())
        .limit(100)
        .all()
    )
    statuses = Status.query.filter_by(is_active=True).order_by(Status.order).all()
    now = utcnow()
    return render_template('station.html', tester=tester, history=history, statuses=statuses, now=now)


# ============================================================
# AUTHENTICATION
# ============================================================

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('dashboard'))
        flash('Invalid username or password', 'danger')
    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('dashboard'))


# ============================================================
# ADMIN - GUARD
# ============================================================

def require_admin():
    """Returns True if current user is admin, False otherwise."""
    if not current_user.is_authenticated or current_user.role != 'admin':
        flash('Admin access required.', 'danger')
        return False
    return True


# ============================================================
# ADMIN - OVERVIEW
# ============================================================

@app.route('/admin')
@login_required
def admin_index():
    if not require_admin():
        return redirect(url_for('dashboard'))
    return render_template('admin/index.html')


# ============================================================
# ADMIN - STATIONS / TESTERS
# ============================================================

@app.route('/admin/stations')
@login_required
def admin_stations():
    if not require_admin():
        return redirect(url_for('dashboard'))
    testers = Tester.query.order_by(Tester.name).all()
    locations = Location.query.order_by(Location.order).all()
    return render_template('admin/stations.html', testers=testers, locations=locations)


@app.route('/admin/stations/add', methods=['POST'])
@login_required
def admin_add_station():
    if not require_admin():
        return redirect(url_for('dashboard'))
    name = request.form.get('name', '').strip().upper()
    tester_type = request.form.get('tester_type', '').strip()
    location_id = request.form.get('location_id', type=int)

    if not name or not tester_type:
        flash('Name and type are required.', 'danger')
        return redirect(url_for('admin_stations'))
    if Tester.query.filter_by(name=name).first():
        flash(f'Tester {name} already exists.', 'danger')
        return redirect(url_for('admin_stations'))

    tester = Tester(name=name, tester_type=tester_type, location_id=location_id or None)
    db.session.add(tester)
    db.session.commit()
    flash(f'Tester {name} added.', 'success')
    return redirect(url_for('admin_stations'))


@app.route('/admin/stations/<int:tester_id>/edit', methods=['POST'])
@login_required
def admin_edit_station(tester_id):
    if not require_admin():
        return redirect(url_for('dashboard'))
    tester = Tester.query.get_or_404(tester_id)
    tester.name = request.form.get('name', tester.name).strip().upper()
    tester.tester_type = request.form.get('tester_type', tester.tester_type).strip()
    location_id = request.form.get('location_id', type=int)
    tester.location_id = location_id or None
    tester.is_offline = 'is_offline' in request.form
    db.session.commit()
    flash('Station updated.', 'success')
    return redirect(url_for('admin_stations'))


@app.route('/admin/stations/<int:tester_id>/delete', methods=['POST'])
@login_required
def admin_delete_station(tester_id):
    if not require_admin():
        return redirect(url_for('dashboard'))
    tester = Tester.query.get_or_404(tester_id)
    if tester.handler:
        tester.handler.tester_id = None
    db.session.delete(tester)
    db.session.commit()
    flash('Station deleted.', 'success')
    return redirect(url_for('admin_stations'))


# ============================================================
# ADMIN - HANDLERS
# ============================================================

@app.route('/admin/handlers')
@login_required
def admin_handlers():
    if not require_admin():
        return redirect(url_for('dashboard'))
    handlers = Handler.query.order_by(Handler.name).all()
    testers = Tester.query.filter_by(is_offline=False).order_by(Tester.name).all()
    return render_template('admin/handlers.html', handlers=handlers, testers=testers)


@app.route('/admin/handlers/add', methods=['POST'])
@login_required
def admin_add_handler():
    if not require_admin():
        return redirect(url_for('dashboard'))
    name = request.form.get('name', '').strip().upper()
    handler_type = request.form.get('handler_type', '').strip()
    tester_id = request.form.get('tester_id', type=int)

    if not name or not handler_type:
        flash('Name and type are required.', 'danger')
        return redirect(url_for('admin_handlers'))
    if Handler.query.filter_by(name=name).first():
        flash(f'Handler {name} already exists.', 'danger')
        return redirect(url_for('admin_handlers'))

    handler = Handler(name=name, handler_type=handler_type, tester_id=tester_id or None)
    db.session.add(handler)
    db.session.commit()
    flash(f'Handler {name} added.', 'success')
    return redirect(url_for('admin_handlers'))


@app.route('/admin/handlers/<int:handler_id>/move', methods=['POST'])
@login_required
def admin_move_handler(handler_id):
    if not require_admin():
        return redirect(url_for('dashboard'))
    handler = Handler.query.get_or_404(handler_id)
    tester_id = request.form.get('tester_id', type=int)
    # Unassign from old tester automatically
    handler.tester_id = tester_id or None
    handler.is_offline = not bool(tester_id)
    db.session.commit()
    flash('Handler moved.', 'success')
    return redirect(url_for('admin_handlers'))


@app.route('/admin/handlers/<int:handler_id>/edit', methods=['POST'])
@login_required
def admin_edit_handler(handler_id):
    if not require_admin():
        return redirect(url_for('dashboard'))
    handler = Handler.query.get_or_404(handler_id)
    handler.name = request.form.get('name', handler.name).strip().upper()
    handler.handler_type = request.form.get('handler_type', handler.handler_type).strip()
    handler.is_offline = 'is_offline' in request.form
    db.session.commit()
    flash('Handler updated.', 'success')
    return redirect(url_for('admin_handlers'))


@app.route('/admin/handlers/<int:handler_id>/delete', methods=['POST'])
@login_required
def admin_delete_handler(handler_id):
    if not require_admin():
        return redirect(url_for('dashboard'))
    handler = Handler.query.get_or_404(handler_id)
    db.session.delete(handler)
    db.session.commit()
    flash('Handler deleted.', 'success')
    return redirect(url_for('admin_handlers'))


# ============================================================
# ADMIN - LOCATIONS
# ============================================================

@app.route('/admin/locations')
@login_required
def admin_locations():
    if not require_admin():
        return redirect(url_for('dashboard'))
    locations = Location.query.order_by(Location.order).all()
    return render_template('admin/locations.html', locations=locations)


@app.route('/admin/locations/add', methods=['POST'])
@login_required
def admin_add_location():
    if not require_admin():
        return redirect(url_for('dashboard'))
    name = request.form.get('name', '').strip()
    if not name:
        flash('Name required.', 'danger')
        return redirect(url_for('admin_locations'))
    if Location.query.filter_by(name=name).first():
        flash(f'Location "{name}" already exists.', 'danger')
        return redirect(url_for('admin_locations'))
    loc = Location(name=name, order=Location.query.count())
    db.session.add(loc)
    db.session.commit()
    flash(f'Location "{name}" added.', 'success')
    return redirect(url_for('admin_locations'))


@app.route('/admin/locations/<int:loc_id>/edit', methods=['POST'])
@login_required
def admin_edit_location(loc_id):
    if not require_admin():
        return redirect(url_for('dashboard'))
    loc = Location.query.get_or_404(loc_id)
    loc.name = request.form.get('name', loc.name).strip()
    db.session.commit()
    flash('Location updated.', 'success')
    return redirect(url_for('admin_locations'))


@app.route('/admin/locations/<int:loc_id>/delete', methods=['POST'])
@login_required
def admin_delete_location(loc_id):
    if not require_admin():
        return redirect(url_for('dashboard'))
    loc = Location.query.get_or_404(loc_id)
    for tester in loc.testers:
        tester.location_id = None
    db.session.delete(loc)
    db.session.commit()
    flash('Location deleted. Stations moved to Unassigned.', 'success')
    return redirect(url_for('admin_locations'))


# ============================================================
# ADMIN - STATUSES
# ============================================================

@app.route('/admin/statuses')
@login_required
def admin_statuses():
    if not require_admin():
        return redirect(url_for('dashboard'))
    statuses = Status.query.order_by(Status.order).all()
    return render_template('admin/statuses.html', statuses=statuses)


@app.route('/admin/statuses/add', methods=['POST'])
@login_required
def admin_add_status():
    if not require_admin():
        return redirect(url_for('dashboard'))
    name = request.form.get('name', '').strip()
    color = request.form.get('color', '#6c757d')
    if not name:
        flash('Name required.', 'danger')
        return redirect(url_for('admin_statuses'))
    if Status.query.filter_by(name=name).first():
        flash(f'Status "{name}" already exists.', 'danger')
        return redirect(url_for('admin_statuses'))
    status = Status(name=name, color=color, order=Status.query.count())
    db.session.add(status)
    db.session.commit()
    flash(f'Status "{name}" added.', 'success')
    return redirect(url_for('admin_statuses'))


@app.route('/admin/statuses/<int:status_id>/edit', methods=['POST'])
@login_required
def admin_edit_status(status_id):
    if not require_admin():
        return redirect(url_for('dashboard'))
    status = Status.query.get_or_404(status_id)
    status.name = request.form.get('name', status.name).strip()
    status.color = request.form.get('color', status.color)
    status.is_active = 'is_active' in request.form
    db.session.commit()
    flash('Status updated.', 'success')
    return redirect(url_for('admin_statuses'))


# ============================================================
# ADMIN - USERS
# ============================================================

@app.route('/admin/users')
@login_required
def admin_users():
    if not require_admin():
        return redirect(url_for('dashboard'))
    users = User.query.all()
    return render_template('admin/users.html', users=users)


@app.route('/admin/users/add', methods=['POST'])
@login_required
def admin_add_user():
    if not require_admin():
        return redirect(url_for('dashboard'))
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')
    role = request.form.get('role', 'operator')
    if not username or not password:
        flash('Username and password required.', 'danger')
        return redirect(url_for('admin_users'))
    if User.query.filter_by(username=username).first():
        flash('Username already exists.', 'danger')
        return redirect(url_for('admin_users'))
    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        role=role
    )
    db.session.add(user)
    db.session.commit()
    flash(f'User "{username}" created.', 'success')
    return redirect(url_for('admin_users'))


@app.route('/admin/users/<int:user_id>/delete', methods=['POST'])
@login_required
def admin_delete_user(user_id):
    if not require_admin():
        return redirect(url_for('dashboard'))
    if user_id == current_user.id:
        flash("You cannot delete your own account.", 'danger')
        return redirect(url_for('admin_users'))
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    flash('User deleted.', 'success')
    return redirect(url_for('admin_users'))


@app.route('/admin/users/<int:user_id>/change_password', methods=['POST'])
@login_required
def admin_change_password(user_id):
    if not require_admin():
        return redirect(url_for('dashboard'))
    user = User.query.get_or_404(user_id)
    new_password = request.form.get('new_password', '')
    if not new_password:
        flash('Password cannot be empty.', 'danger')
        return redirect(url_for('admin_users'))
    user.password_hash = generate_password_hash(new_password)
    db.session.commit()
    flash(f'Password changed for "{user.username}".', 'success')
    return redirect(url_for('admin_users'))


# ============================================================
# API - Live data for dashboard auto-refresh
# ============================================================

@app.route('/api/stations')
def api_stations():
    testers = Tester.query.all()
    now = utcnow()
    result = []
    for t in testers:
        duration_minutes = None
        if t.status_since:
            delta = now - t.status_since
            duration_minutes = int(delta.total_seconds() / 60)
        result.append({
            'id': t.id,
            'name': t.name,
            'handler': t.handler.name if t.handler and not t.handler.is_offline else None,
            'status_id': t.current_status_id,
            'status_name': t.current_status.name if t.current_status else None,
            'status_color': t.current_status.color if t.current_status else '#6c757d',
            'duration_minutes': duration_minutes,
            'is_offline': t.is_offline
        })
    return jsonify(result)


# ============================================================
# JOB SHEET HELPERS
# ============================================================

def current_shift():
    """Return 'morning' or 'night' based on current local time."""
    hour = datetime.now().hour
    return 'morning' if 7 <= hour < 19 else 'night'

def get_or_create_job_sheet(tester_id):
    """Get today's active job sheet for a tester, or create one."""
    today = date.today()
    shift = current_shift()
    sheet = JobSheet.query.filter_by(
        tester_id=tester_id, date=today, shift=shift, is_completed=False
    ).first()
    if not sheet:
        sheet = JobSheet(tester_id=tester_id, date=today, shift=shift)
        db.session.add(sheet)
        db.session.commit()
    return sheet

def minutes_since_last_entry(job_sheet):
    """Return minutes since last RIO entry, or None if no entries."""
    if not job_sheet or not job_sheet.rio_entries:
        return None
    last = max(job_sheet.rio_entries, key=lambda e: e.submitted_at)
    delta = utcnow() - last.submitted_at
    return int(delta.total_seconds() / 60)


# ============================================================
# JOB SHEET ROUTES
# ============================================================

@app.route('/jobsheet/<int:tester_id>')
def jobsheet(tester_id):
    tester = Tester.query.get_or_404(tester_id)
    sheet = get_or_create_job_sheet(tester_id)
    mins_since = minutes_since_last_entry(sheet)
    now = utcnow()
    return render_template('jobsheet.html', tester=tester, sheet=sheet,
                           mins_since=mins_since, now=now)


@app.route('/jobsheet/<int:sheet_id>/add_rio', methods=['POST'])
def add_rio_entry(sheet_id):
    sheet = JobSheet.query.get_or_404(sheet_id)
    entry = RioDailyEntry(
        job_sheet_id=sheet.id,
        entry_time=request.form.get('entry_time', '').strip(),
        flow=request.form.get('flow', '').strip() or None,
        site=request.form.get('site', '').strip() or None,
        total=request.form.get('total', '').strip() or None,
        untested=request.form.get('untested', type=int),
        total_good=request.form.get('total_good', type=int),
        total_tested=request.form.get('total_tested', type=int),
        device_size=request.form.get('device_size', '').strip() or None,
        submitted_by=request.form.get('submitted_by', '').strip() or 'Operator',
    )
    db.session.add(entry)
    db.session.commit()
    flash('Entry added.', 'success')
    return redirect(url_for('jobsheet', tester_id=sheet.tester_id))


@app.route('/jobsheet/<int:sheet_id>/delete_rio/<int:entry_id>', methods=['POST'])
def delete_rio_entry(sheet_id, entry_id):
    entry = RioDailyEntry.query.get_or_404(entry_id)
    sheet = JobSheet.query.get_or_404(sheet_id)
    db.session.delete(entry)
    db.session.commit()
    flash('Entry removed.', 'success')
    return redirect(url_for('jobsheet', tester_id=sheet.tester_id))


@app.route('/jobsheet/<int:sheet_id>/add_unproductive', methods=['POST'])
def add_unproductive(sheet_id):
    sheet = JobSheet.query.get_or_404(sheet_id)
    entry = UnproductiveEntry(
        job_sheet_id=sheet.id,
        from_time=request.form.get('from_time', '').strip(),
        to_time=request.form.get('to_time', '').strip() or None,
        details=request.form.get('details', '').strip() or None,
        action_taken=request.form.get('action_taken', '').strip() or None,
        resp_tech=request.form.get('resp_tech', '').strip() or None,
    )
    db.session.add(entry)
    db.session.commit()
    flash('Unproductive time added.', 'success')
    return redirect(url_for('jobsheet', tester_id=sheet.tester_id))


@app.route('/jobsheet/<int:sheet_id>/delete_unproductive/<int:entry_id>', methods=['POST'])
def delete_unproductive(sheet_id, entry_id):
    entry = UnproductiveEntry.query.get_or_404(entry_id)
    sheet = JobSheet.query.get_or_404(sheet_id)
    db.session.delete(entry)
    db.session.commit()
    flash('Entry removed.', 'success')
    return redirect(url_for('jobsheet', tester_id=sheet.tester_id))


@app.route('/jobsheet/<int:sheet_id>/close', methods=['POST'])
def close_jobsheet(sheet_id):
    sheet = JobSheet.query.get_or_404(sheet_id)
    sheet.is_completed = True
    sheet.closed_at = utcnow()
    db.session.commit()
    flash('Job sheet closed.', 'success')
    return redirect(url_for('jobsheet', tester_id=sheet.tester_id))


@app.route('/jobsheet/<int:sheet_id>/print')
def print_jobsheet(sheet_id):
    sheet = JobSheet.query.get_or_404(sheet_id)
    return render_template('jobsheet_print.html', sheet=sheet)


@app.route('/jobsheet/history/<int:tester_id>')
def jobsheet_history(tester_id):
    tester = Tester.query.get_or_404(tester_id)
    sheets = (JobSheet.query.filter_by(tester_id=tester_id)
              .order_by(JobSheet.date.desc(), JobSheet.created_at.desc())
              .all())
    return render_template('jobsheet_history.html', tester=tester, sheets=sheets)


# ============================================================
# DB INIT & STARTUP
# ============================================================

def init_db():
    with app.app_context():
        db.create_all()

        if not Status.query.first():
            default_statuses = [
                Status(name='Production Running', color='#28a745', order=0),
                Status(name='Maintenance Use',    color='#fd7e14', order=1),
                Status(name='Engineering Use',    color='#0d6efd', order=2),
                Status(name='Tester Down',        color='#dc3545', order=3),
                Status(name='Handler Down',       color='#ffc107', order=4),
            ]
            db.session.add_all(default_statuses)

        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                password_hash=generate_password_hash('admin123'),
                role='admin'
            )
            db.session.add(admin)

        db.session.commit()
        print("=" * 50)
        print("  Production Monitor - Ready!")
        print("=" * 50)
        print("  Open your browser and go to:")
        print("  http://localhost:5000")
        print()
        print("  Admin login:")
        print("  Username: admin")
        print("  Password: admin123")
        print()
        print("  Other computers on LAN can access via:")
        print("  http://<this-pc-ip-address>:5000")
        print("=" * 50)


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=False)
