"""
Audit logging helper.

Usage in any route:
    from app.utils.audit import log_action
    log_action(user_id=current_user_id, action="status.update", resource="station:12")
    db.session.commit()

The caller is responsible for calling db.session.commit().
This lets audit entries be part of the same transaction as the main operation.
"""
from flask import request
from app.extensions import db
from app.models import AuditLog


def log_action(
    user_id: int | None,
    action: str,
    resource: str | None = None,
    details: dict | None = None,
) -> AuditLog:
    """
    Create an audit log entry and add it to the current DB session.

    Args:
        user_id:  ID of the user performing the action. None for pre-auth events.
        action:   Dot-notation string, e.g. "user.login", "user.login_failed".
        resource: What was affected, e.g. "user:5", "station:12". Optional.
        details:  Any extra context as a dict (stored as JSON). Optional.

    Returns:
        The AuditLog instance (not yet committed).
    """
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        details=details,
        ip_address=request.remote_addr,
    )
    db.session.add(entry)
    return entry
