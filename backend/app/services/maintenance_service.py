"""
Maintenance Service
-------------------
Business logic for maintenance log CRUD.
Called by route handlers. Callers are responsible for db.session.commit().
"""
from datetime import datetime, timezone
from typing import Optional

from flask import abort
from app.extensions import db
from app.models import MaintenanceLog, Tester
from app.utils.audit import log_action

VALID_ISSUE_TYPES = {"tester", "handler"}


def create_maintenance_log(
    tester_id: int,
    technician: str,
    start_time: datetime,
    fault_code: Optional[str],
    fault_description: Optional[str],
    parts_replaced: Optional[str],
    issue_type: str,
    notes: Optional[str],
    created_by_user_id: Optional[int],
) -> MaintenanceLog:
    """
    Create a new maintenance log entry.
    Does NOT commit — caller must call db.session.commit().
    """
    tester = Tester.query.filter_by(id=tester_id, is_active=True).first()
    if not tester:
        abort(404, description=f"Tester {tester_id} not found.")

    if issue_type not in VALID_ISSUE_TYPES:
        abort(400, description=f"Invalid issue_type '{issue_type}'. Must be 'tester' or 'handler'.")

    log = MaintenanceLog(
        tester_id=tester_id,
        technician=technician.strip(),
        fault_code=fault_code.strip() if fault_code else None,
        fault_description=fault_description.strip() if fault_description else None,
        parts_replaced=parts_replaced.strip() if parts_replaced else None,
        issue_type=issue_type,
        start_time=start_time,
        notes=notes.strip() if notes else None,
        created_by=created_by_user_id,
    )
    db.session.add(log)

    log_action(
        user_id=created_by_user_id,
        action="create_maintenance_log",
        resource=f"tester:{tester_id}",
        details={"technician": technician, "fault_code": fault_code, "issue_type": issue_type},
    )

    return log


def close_maintenance_log(
    log_id: int,
    closed_by_user_id: Optional[int],
) -> MaintenanceLog:
    """
    Close an open maintenance log by recording end_time = now.
    Does NOT commit — caller must call db.session.commit().
    Aborts 404 if not found, 400 if already closed.
    """
    log = MaintenanceLog.query.get(log_id)
    if not log:
        abort(404, description=f"Maintenance log {log_id} not found.")

    if not log.is_open:
        abort(400, description="This maintenance log is already closed.")

    log.end_time = datetime.now(timezone.utc)

    log_action(
        user_id=closed_by_user_id,
        action="close_maintenance_log",
        resource=f"maintenance_log:{log_id}",
        details={"tester_id": log.tester_id},
    )

    return log


def delete_maintenance_log(log_id: int, user_id: Optional[int]) -> None:
    """
    Permanently delete a maintenance log.
    Does NOT commit — caller must call db.session.commit().
    """
    log = MaintenanceLog.query.get(log_id)
    if not log:
        abort(404, description=f"Maintenance log {log_id} not found.")

    log_action(
        user_id=user_id,
        action="delete_maintenance_log",
        resource=f"maintenance_log:{log_id}",
        details={"tester_id": log.tester_id, "technician": log.technician},
    )
    db.session.delete(log)


def get_maintenance_logs(
    tester_id: Optional[int] = None,
    date_str: Optional[str] = None,
    open_only: bool = False,
) -> list:
    """
    Return maintenance logs with optional filters, newest first.
    date_str format: "YYYY-MM-DD"
    """
    query = MaintenanceLog.query

    if tester_id is not None:
        query = query.filter(MaintenanceLog.tester_id == tester_id)

    if open_only:
        query = query.filter(MaintenanceLog.end_time.is_(None))

    if date_str:
        try:
            day = datetime.strptime(date_str, "%Y-%m-%d")
            next_day = datetime(day.year, day.month, day.day + 1 if day.day < 28 else 1,
                                tzinfo=timezone.utc)
            query = query.filter(
                MaintenanceLog.start_time >= day,
                MaintenanceLog.start_time < next_day,
            )
        except ValueError:
            abort(400, description="Invalid date format. Use YYYY-MM-DD.")

    rows = query.order_by(MaintenanceLog.start_time.desc()).all()
    return [row.to_dict() for row in rows]


def get_open_log_for_tester(tester_id: int) -> Optional[MaintenanceLog]:
    """
    Return the currently open maintenance log for a tester, or None.
    """
    return (
        MaintenanceLog.query
        .filter_by(tester_id=tester_id)
        .filter(MaintenanceLog.end_time.is_(None))
        .first()
    )
