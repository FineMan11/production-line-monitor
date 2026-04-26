"""
Troubleshooting Service
-----------------------
Business logic for troubleshooting session CRUD.
Called by route handlers. Callers are responsible for db.session.commit().
"""
from collections import Counter
from datetime import datetime, timezone, timedelta
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
    result: str,
    user_id: Optional[int],
    action: Optional[str] = None,
    action_tags: Optional[str] = None,
    plan: Optional[str] = None,
    pin_number: Optional[str] = None,
    hb_observed: Optional[str] = None,
    sb_observed: Optional[str] = None,
    failure_description: Optional[str] = None,
    measured_value: Optional[str] = None,
    upper_limit: Optional[str] = None,
    lower_limit: Optional[str] = None,
    site_count: Optional[int] = None,
    site_number: Optional[str] = None,
    site_failures: Optional[str] = None,
) -> TroubleshootingStep:
    """
    Append an action→result step to an open session.
    PC failure observation fields are all optional.
    At least one of action_tags or action must be provided.
    Does NOT commit — caller must call db.session.commit().
    """
    session = TroubleshootingSession.query.get(session_id)
    if not session:
        abort(404, description=f"Troubleshooting session {session_id} not found.")
    if not session.is_open:
        abort(400, description="Cannot add steps to a closed session.")

    if not (action_tags and action_tags.strip()) and not (action and action.strip()):
        abort(400, description="At least one action must be selected or a description provided.")

    def _s(v: Optional[str]) -> Optional[str]:
        return v.strip() if v and v.strip() else None

    step = TroubleshootingStep(
        session_id=session_id,
        action_tags=_s(action_tags),
        action=_s(action),
        result=result.strip(),
        plan=_s(plan),
        pin_number=_s(pin_number),
        hb_observed=_s(hb_observed),
        sb_observed=_s(sb_observed),
        failure_description=_s(failure_description),
        measured_value=_s(measured_value),
        upper_limit=_s(upper_limit),
        lower_limit=_s(lower_limit),
        site_count=site_count,
        site_number=_s(site_number),
        site_failures=site_failures,
    )
    db.session.add(step)

    log_action(
        user_id=user_id,
        action="add_troubleshooting_step",
        resource=f"troubleshooting_session:{session_id}",
        details={"action": (action or "")[:80], "result": result[:80]},
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
    since_dt: Optional[datetime] = None,
    until_dt: Optional[datetime] = None,
) -> list:
    """
    Return sessions with optional filters, newest first.
    date_str format: "YYYY-MM-DD"
    since_dt / until_dt: datetime bounds on started_at (inclusive / exclusive)
    """
    query = TroubleshootingSession.query

    if tester_id is not None:
        query = query.filter(TroubleshootingSession.tester_id == tester_id)

    if open_only:
        query = query.filter(TroubleshootingSession.resolved_at.is_(None))

    if session_type:
        query = query.filter(TroubleshootingSession.session_type == session_type)

    if since_dt is not None:
        query = query.filter(TroubleshootingSession.started_at >= since_dt)

    if until_dt is not None:
        query = query.filter(TroubleshootingSession.started_at < until_dt)

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
    action_tags: Optional[str] = None,
    result: Optional[str] = None,
    plan: Optional[str] = None,
    pin_number: Optional[str] = None,
    hb_observed: Optional[str] = None,
    sb_observed: Optional[str] = None,
    failure_description: Optional[str] = None,
    measured_value: Optional[str] = None,
    upper_limit: Optional[str] = None,
    lower_limit: Optional[str] = None,
    site_count: Optional[int] = None,
    site_number: Optional[str] = None,
    site_failures: Optional[str] = None,
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

    if action_tags       is not None: step.action_tags        = _s(action_tags)
    if action            is not None: step.action             = _s(action)
    if result            is not None: step.result             = result.strip()
    if plan              is not None: step.plan               = _s(plan)
    if pin_number        is not None: step.pin_number         = _s(pin_number)
    if hb_observed       is not None: step.hb_observed        = _s(hb_observed)
    if sb_observed       is not None: step.sb_observed        = _s(sb_observed)
    if failure_description is not None: step.failure_description = _s(failure_description)
    if measured_value    is not None: step.measured_value     = _s(measured_value)
    if upper_limit       is not None: step.upper_limit        = _s(upper_limit)
    if lower_limit       is not None: step.lower_limit        = _s(lower_limit)
    if site_count        is not None: step.site_count         = site_count
    if site_number       is not None: step.site_number        = _s(site_number)
    if site_failures     is not None: step.site_failures      = site_failures

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


def get_tester_analytics(tester_id: int) -> dict:
    """
    Aggregate troubleshooting stats for a single tester.
    Returns summary counts, sessions-by-month (last 12), top action tags,
    hard bin frequency, and the 20 most recent sessions with steps.
    """
    sessions = (
        TroubleshootingSession.query
        .filter_by(tester_id=tester_id)
        .order_by(TroubleshootingSession.started_at.desc())
        .all()
    )

    # --- summary ---
    upchuck = [s for s in sessions if s.session_type == "upchuck"]
    jamming  = [s for s in sessions if s.session_type == "jamming"]
    closed   = [s for s in sessions if not s.is_open]
    solved   = [s for s in closed   if s.solved is True]
    unsolved = [s for s in closed   if s.solved is False]
    open_s   = [s for s in sessions if s.is_open]

    summary = {
        "total_sessions":    len(sessions),
        "upchuck_sessions":  len(upchuck),
        "jamming_sessions":  len(jamming),
        "solved_sessions":   len(solved),
        "unsolved_sessions": len(unsolved),
        "open_sessions":     len(open_s),
    }

    # --- sessions by month (last 12 months) ---
    now = datetime.now(timezone.utc)
    months: dict[str, dict] = {}
    for i in range(11, -1, -1):
        raw = now.month - 1 - i          # zero-based month offset, may be negative
        month = raw % 12 + 1             # wrap into 1–12
        year  = now.year + raw // 12     # adjust year (Python // floors correctly)
        key = f"{year:04d}-{month:02d}"
        months[key] = {"month": key, "upchuck": 0, "jamming": 0}

    for s in sessions:
        key = s.started_at.strftime("%Y-%m")
        if key in months:
            months[key][s.session_type] += 1

    sessions_by_month = list(months.values())

    # --- top action tags (all steps across all sessions) ---
    tag_counter: Counter = Counter()
    all_steps = TroubleshootingStep.query.filter(
        TroubleshootingStep.session_id.in_([s.id for s in sessions])
    ).all() if sessions else []

    for step in all_steps:
        if step.action_tags:
            for tag in step.action_tags.split(","):
                tag = tag.strip()
                if tag:
                    tag_counter[tag] += 1

    top_action_tags = [{"tag": tag, "count": cnt} for tag, cnt in tag_counter.most_common(10)]

    # --- hard bin frequency (upchuck sessions only) ---
    hb_counter: Counter = Counter()
    for s in upchuck:
        if s.hard_bin:
            hb_counter[s.hard_bin] += 1

    hard_bin_frequency = [{"hard_bin": hb, "count": cnt} for hb, cnt in sorted(hb_counter.items())]

    # --- 20 most recent sessions with steps ---
    recent_sessions = [s.to_dict(include_steps=True) for s in sessions[:20]]

    return {
        "summary": summary,
        "sessions_by_month": sessions_by_month,
        "top_action_tags": top_action_tags,
        "hard_bin_frequency": hard_bin_frequency,
        "recent_sessions": recent_sessions,
    }


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
