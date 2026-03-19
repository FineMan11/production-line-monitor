"""
Status Service
--------------
All tester status-change logic lives here.
Called by route handlers and (in later phases) Celery tasks.
Never call db.session.commit() inside a route — call it here after all changes.
"""
from datetime import datetime, timezone
from typing import Optional

from flask import abort
from app.extensions import db, socketio
from app.models import Tester, Status, StatusHistory
from app.utils.audit import log_action


def update_tester_status(
    tester_id: int,
    new_status_name: str,
    changed_by_user_id: Optional[int],
    note: Optional[str] = None,
) -> dict:
    """
    Change the status of a tester station.

    Steps:
      1. Load tester (404 if not found or inactive).
      2. Validate new_status_name (400 if unknown).
      3. Update tester.current_status_id.
      4. Append a new StatusHistory row (APPEND-ONLY — never update existing rows).
      5. Call log_action().
      6. Emit WebSocket event "status_update" to all connected clients.
      7. Commit the transaction.
      8. Return tester.to_dict() for the HTTP response.
    """
    tester = Tester.query.filter_by(id=tester_id, is_active=True).first()
    if not tester:
        abort(404, description=f"Tester {tester_id} not found.")

    new_status = Status.query.filter_by(name=new_status_name).first()
    if not new_status:
        abort(400, description=f"Invalid status '{new_status_name}'. "
              "Valid values: Running, Maintenance, Engineering, Down.")

    tester.current_status_id = new_status.id

    history_entry = StatusHistory(
        tester_id=tester_id,
        status_id=new_status.id,
        changed_by=changed_by_user_id,
        changed_at=datetime.now(timezone.utc),
        note=note,
    )
    db.session.add(history_entry)

    log_action(
        user_id=changed_by_user_id,
        action="update_tester_status",
        resource=f"tester:{tester_id}",
        details={"new_status": new_status_name, "note": note},
    )

    db.session.commit()

    socketio.emit("status_update", {
        "tester_id": tester.id,
        "tester_name": tester.name,
        "status": new_status.name,
        "status_color": new_status.color_code,
        "changed_at": datetime.now(timezone.utc).isoformat() + 'Z',
    })

    return tester.to_dict(include_handler=True)


def get_tester_status_history(tester_id: int, limit: int = 50) -> list:
    """
    Return the last `limit` StatusHistory rows for a tester, newest first.
    Aborts 404 if the tester does not exist.
    """
    tester = Tester.query.filter_by(id=tester_id, is_active=True).first()
    if not tester:
        abort(404, description=f"Tester {tester_id} not found.")

    rows = (
        StatusHistory.query
        .filter_by(tester_id=tester_id)
        .order_by(StatusHistory.changed_at.desc())
        .limit(limit)
        .all()
    )
    return [row.to_dict() for row in rows]
