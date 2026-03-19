"""
Troubleshooting Service
-----------------------
Business logic for troubleshooting session CRUD.
Called by route handlers. Callers are responsible for db.session.commit().
"""
from datetime import datetime, timezone
from typing import Optional

from flask import abort
from app.extensions import db
from app.models import Tester
from app.models.troubleshooting import TroubleshootingSession, TroubleshootingStep, VALID_HARD_BINS, VALID_SESSION_TYPES
from app.utils.audit import log_action


def create_session(
    tester_id: int,
    technician: str,
    created_by_user_id: Optional[int],
    session_type: str = "upchuck",
    hard_bin: Optional[str] = None,
    description: Optional[str] = None,
) -> TroubleshootingSession:
    """
    Start a new troubleshooting session.
    session_type: "upchuck" (requires hard_bin) | "jamming" (no hard_bin)
    Does NOT commit — caller must call db.session.commit().
    """
    tester = Tester.query.filter_by(id=tester_id, is_active=True).first()
    if not tester:
        abort(404, description=f"Tester {tester_id} not found.")

    if session_type not in VALID_SESSION_TYPES:
        abort(400, description=f"Invalid session_type '{session_type}'. Must be one of {sorted(VALID_SESSION_TYPES)}.")

    if session_type == "upchuck":
        if not hard_bin:
            abort(400, description="'hard_bin' is required for upchuck sessions.")
        if hard_bin not in VALID_HARD_BINS:
            abort(400, description=f"Invalid hard_bin '{hard_bin}'. Must be one of {sorted(VALID_HARD_BINS)}.")
    elif session_type == "jamming":
        if not description or not description.strip():
            abort(400, description="'description' is required for jamming sessions.")

    # Prevent duplicate open sessions on the same tester
    existing = get_open_session_for_tester(tester_id)
    if existing:
        abort(409, description=f"Tester {tester_id} already has an open troubleshooting session (id={existing.id}).")

    session = TroubleshootingSession(
        tester_id=tester_id,
        session_type=session_type,
        hard_bin=hard_bin if session_type == "upchuck" else None,
        description=description.strip() if description else None,
        technician=technician.strip(),
        created_by=created_by_user_id,
    )
    db.session.add(session)

    log_action(
        user_id=created_by_user_id,
        action="start_troubleshooting_session",
        resource=f"tester:{tester_id}",
        details={"session_type": session_type, "hard_bin": hard_bin, "technician": technician},
    )

    return session


def add_step(
    session_id: int,
    action: str,
    result: str,
    user_id: Optional[int],
    plan: Optional[str] = None,
    pin_number: Optional[str] = None,
    hb_observed: Optional[str] = None,
    sb_observed: Optional[str] = None,
    failure_description: Optional[str] = None,
    measured_value: Optional[str] = None,
    upper_limit: Optional[str] = None,
    lower_limit: Optional[str] = None,
) -> TroubleshootingStep:
    """
    Append an action→result step to an open session.
    PC failure observation fields are all optional.
    Does NOT commit — caller must call db.session.commit().
    """
    session = TroubleshootingSession.query.get(session_id)
    if not session:
        abort(404, description=f"Troubleshooting session {session_id} not found.")
    if not session.is_open:
        abort(400, description="Cannot add steps to a closed session.")

    def _s(v: Optional[str]) -> Optional[str]:
        return v.strip() if v and v.strip() else None

    step = TroubleshootingStep(
        session_id=session_id,
        action=action.strip(),
        result=result.strip(),
        plan=_s(plan),
        pin_number=_s(pin_number),
        hb_observed=_s(hb_observed),
        sb_observed=_s(sb_observed),
        failure_description=_s(failure_description),
        measured_value=_s(measured_value),
        upper_limit=_s(upper_limit),
        lower_limit=_s(lower_limit),
    )
    db.session.add(step)

    log_action(
        user_id=user_id,
        action="add_troubleshooting_step",
        resource=f"troubleshooting_session:{session_id}",
        details={"action": action[:80], "result": result[:80]},
    )

    return step


def close_session(
    session_id: int,
    solved: bool,
    user_id: Optional[int],
) -> TroubleshootingSession:
    """
    Close an open session, marking whether it was solved.
    Does NOT commit — caller must call db.session.commit().
    """
    session = TroubleshootingSession.query.get(session_id)
    if not session:
        abort(404, description=f"Troubleshooting session {session_id} not found.")
    if not session.is_open:
        abort(400, description="This troubleshooting session is already closed.")

    session.resolved_at = datetime.now(timezone.utc)
    session.solved = solved

    log_action(
        user_id=user_id,
        action="close_troubleshooting_session",
        resource=f"troubleshooting_session:{session_id}",
        details={"tester_id": session.tester_id, "solved": solved},
    )

    return session


def get_sessions(
    tester_id: Optional[int] = None,
    open_only: bool = False,
    date_str: Optional[str] = None,
    session_type: Optional[str] = None,
) -> list:
    """
    Return sessions with optional filters, newest first.
    date_str format: "YYYY-MM-DD"
    """
    query = TroubleshootingSession.query

    if tester_id is not None:
        query = query.filter(TroubleshootingSession.tester_id == tester_id)

    if open_only:
        query = query.filter(TroubleshootingSession.resolved_at.is_(None))

    if session_type:
        query = query.filter(TroubleshootingSession.session_type == session_type)

    if date_str:
        try:
            day = datetime.strptime(date_str, "%Y-%m-%d")
            next_day = datetime(day.year, day.month, day.day + 1 if day.day < 28 else 1,
                                tzinfo=timezone.utc)
            query = query.filter(
                TroubleshootingSession.started_at >= day,
                TroubleshootingSession.started_at < next_day,
            )
        except ValueError:
            abort(400, description="Invalid date format. Use YYYY-MM-DD.")

    rows = query.order_by(TroubleshootingSession.started_at.desc()).all()
    return [row.to_dict() for row in rows]


def get_session(session_id: int) -> dict:
    """
    Return a single session with all steps included.
    """
    session = TroubleshootingSession.query.get(session_id)
    if not session:
        abort(404, description=f"Troubleshooting session {session_id} not found.")
    return session.to_dict(include_steps=True)


def update_step(
    step_id: int,
    user_id: Optional[int],
    action: Optional[str] = None,
    result: Optional[str] = None,
    plan: Optional[str] = None,
    pin_number: Optional[str] = None,
    hb_observed: Optional[str] = None,
    sb_observed: Optional[str] = None,
    failure_description: Optional[str] = None,
    measured_value: Optional[str] = None,
    upper_limit: Optional[str] = None,
    lower_limit: Optional[str] = None,
) -> TroubleshootingStep:
    """
    Update editable fields on an existing step.
    Only provided (non-None) fields are changed.
    Does NOT commit — caller must call db.session.commit().
    """
    step = TroubleshootingStep.query.get(step_id)
    if not step:
        abort(404, description=f"Troubleshooting step {step_id} not found.")

    def _s(v: Optional[str]) -> Optional[str]:
        return v.strip() if v and v.strip() else None

    if action            is not None: step.action             = action.strip()
    if result            is not None: step.result             = result.strip()
    if plan              is not None: step.plan               = _s(plan)
    if pin_number        is not None: step.pin_number         = _s(pin_number)
    if hb_observed       is not None: step.hb_observed        = _s(hb_observed)
    if sb_observed       is not None: step.sb_observed        = _s(sb_observed)
    if failure_description is not None: step.failure_description = _s(failure_description)
    if measured_value    is not None: step.measured_value     = _s(measured_value)
    if upper_limit       is not None: step.upper_limit        = _s(upper_limit)
    if lower_limit       is not None: step.lower_limit        = _s(lower_limit)

    log_action(
        user_id=user_id,
        action="update_troubleshooting_step",
        resource=f"troubleshooting_step:{step_id}",
        details={"session_id": step.session_id},
    )
    return step


def delete_session(session_id: int, user_id: Optional[int]) -> None:
    """
    Permanently delete a troubleshooting session and all its steps.
    Does NOT commit — caller must call db.session.commit().
    """
    session = TroubleshootingSession.query.get(session_id)
    if not session:
        abort(404, description=f"Troubleshooting session {session_id} not found.")

    # Delete steps first (cascade may handle this but be explicit)
    TroubleshootingStep.query.filter_by(session_id=session_id).delete()
    db.session.delete(session)

    log_action(
        user_id=user_id,
        action="delete_troubleshooting_session",
        resource=f"troubleshooting_session:{session_id}",
        details={"tester_id": session.tester_id, "hard_bin": session.hard_bin},
    )


def get_open_session_for_tester(tester_id: int) -> Optional[TroubleshootingSession]:
    """
    Return the currently open session for a tester, or None.
    """
    return (
        TroubleshootingSession.query
        .filter_by(tester_id=tester_id)
        .filter(TroubleshootingSession.resolved_at.is_(None))
        .first()
    )
