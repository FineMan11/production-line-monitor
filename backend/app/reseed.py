"""
Station Reset — run with: flask resetstations

Clears ALL testers, handlers, and their related records (status history,
maintenance logs, troubleshooting sessions/steps, layout configs) and
re-seeds with the real production floor layout.

Keeps: users, roles, permissions, statuses — nothing auth-related is touched.

DUPLICATE HANDLERS NOTED IN DATA (data entry errors on source sheet):
  JHT-03 was listed twice: ETS364-28 (Bay 1) AND ETS364-27 (Bay 3)
         → assigned to ETS364-28; ETS364-27 left without handler
  JHT-02 was listed twice: IFLEX-02 (Bay 1) AND ETS364-25 (Bay 3)
         → assigned to IFLEX-02; ETS364-25 left without handler
"""
from datetime import datetime, timezone
from app.extensions import db
from app.models import (
    Tester, Handler, StatusHistory, Status,
    MaintenanceLog, TroubleshootingSession, TroubleshootingStep,
    LayoutConfig,
)

# ---------------------------------------------------------------------------
# Floor layout data
# (name, tester_type, plant, bay, station_number, handler_name_or_None)
# station_number = position within this plant+bay section
# ---------------------------------------------------------------------------

PLANT1 = [
    ("MFLEX-04",  "FLEX",   1, None,  1, "JHT-34"),
    ("MFLEX-05",  "FLEX",   1, None,  2, "JHT-28"),
    ("MFLEX-06",  "FLEX",   1, None,  3, "JHT-53"),
    ("MFLEX-07",  "FLEX",   1, None,  4, "JHT-52"),
    ("STS-01",    "STS",    1, None,  5, None),
    ("ETS364-46", "ETS364", 1, None,  6, "JHT-15"),
    ("ETS364-36", "ETS364", 1, None,  7, "JHT-36"),
    ("ETS364-35", "ETS364", 1, None,  8, "JHT-40"),
    ("ETS364-52", "ETS364", 1, None,  9, "JHT-19"),
    ("ETS364-47", "ETS364", 1, None, 10, "JHT-05"),
    ("ETS364-51", "ETS364", 1, None, 11, "JHT-37"),
    ("ETS800",    "ETS800", 1, None, 12, "JHT-47"),
]

PLANT3_BAY1 = [
    ("IFLEX-01",  "FLEX",   3, 1,  1, "JHT-30"),
    ("IFLEX-02",  "FLEX",   3, 1,  2, "JHT-02"),   # JHT-02 assigned here (see note above)
    ("ETS364-11", "ETS364", 3, 1,  3, "JHT-51"),
    ("ETS364-34", "ETS364", 3, 1,  4, "JHT-21"),
    ("MFLEX-01",  "FLEX",   3, 1,  5, "MT-12"),
    ("ETS364-14", "ETS364", 3, 1,  6, "MT-16"),
    ("ETS364-15", "ETS364", 3, 1,  7, "JHT-32"),
    ("ETS364-33", "ETS364", 3, 1,  8, "HT-22"),
    ("ETS364-28", "ETS364", 3, 1,  9, "JHT-03"),   # JHT-03 assigned here (see note above)
    ("ETS364-50", "ETS364", 3, 1, 10, "MT-23"),
    ("ETS364-31", "ETS364", 3, 1, 11, "JHT-00"),
    ("ETS364-32", "ETS364", 3, 1, 12, "JHT-31"),
    ("ETS364-42", "ETS364", 3, 1, 13, "JHT-04"),
    ("ETS364-01", "ETS364", 3, 1, 14, "JHT-16"),
    ("ETS364-41", "ETS364", 3, 1, 15, "JHT-14"),
]

PLANT3_BAY2 = [
    ("INTVG01", "INTVG", 3, 2,  1, "JHT-43"),
    ("INTVG03", "INTVG", 3, 2,  2, "JHT-39"),
    ("INTVG05", "INTVG", 3, 2,  3, "JHT-23"),
    ("INTVG06", "INTVG", 3, 2,  4, "JHT-42"),
    ("INTVG02", "INTVG", 3, 2,  5, "JHT-41"),
    ("INTVG09", "INTVG", 3, 2,  6, "JHT-48"),
    ("INTVG08", "INTVG", 3, 2,  7, "JHT-44"),
    ("INTVG07", "INTVG", 3, 2,  8, "JHT-33"),
    ("INTVG11", "INTVG", 3, 2,  9, "JHT-45"),
    ("INTVG10", "INTVG", 3, 2, 10, "JHT-49"),
    ("INTVG12", "INTVG", 3, 2, 11, "JHT-46"),
    ("INTVG04", "INTVG", 3, 2, 12, "JHT-50"),
]

PLANT3_BAY3 = [
    ("ETS364-38", "ETS364", 3, 3,  1, "JHT-35"),
    ("ETS364-39", "ETS364", 3, 3,  2, "JHT-18"),
    ("ETS364-13", "ETS364", 3, 3,  3, "JHT-38"),
    ("ETS364-19", "ETS364", 3, 3,  4, "MT-08"),
    ("ETS364-16", "ETS364", 3, 3,  5, "JHT-27"),
    ("ETS364-27", "ETS364", 3, 3,  6, None),        # JHT-03 duplicate → no handler
    ("ETS364-17", "ETS364", 3, 3,  7, "MT93-02"),
    ("ETS364-30", "ETS364", 3, 3,  8, "JHT-26"),
    ("ETS364-53", "ETS364", 3, 3,  9, "JHT-24"),
    ("ETS364-26", "ETS364", 3, 3, 10, None),         # no handler
    ("J750",      "J750",   3, 3, 11, None),          # no handler
    ("ETS364-37", "ETS364", 3, 3, 12, "JHT-29"),
    ("ETS364-22", "ETS364", 3, 3, 13, "JHT-22"),
    ("ETS364-08", "ETS364", 3, 3, 14, "JHT-01"),
    ("ETS364-12", "ETS364", 3, 3, 15, "MT-13"),
    ("ETS364-25", "ETS364", 3, 3, 16, None),          # JHT-02 duplicate → no handler
]

ALL_SECTIONS = [
    ("plant1",      PLANT1),
    ("plant3_bay1", PLANT3_BAY1),
    ("plant3_bay2", PLANT3_BAY2),
    ("plant3_bay3", PLANT3_BAY3),
]

# All handlers — (name, type)
# JHT handlers
JHT_HANDLERS = [
    "JHT-00", "JHT-01", "JHT-02", "JHT-03", "JHT-04", "JHT-05",
    "JHT-14", "JHT-15", "JHT-16", "JHT-18", "JHT-19",
    "JHT-21", "JHT-22", "JHT-23", "JHT-24", "JHT-26", "JHT-27", "JHT-28", "JHT-29",
    "JHT-30", "JHT-31", "JHT-32", "JHT-33", "JHT-34", "JHT-35", "JHT-36", "JHT-37",
    "JHT-38", "JHT-39", "JHT-40", "JHT-41", "JHT-42", "JHT-43", "JHT-44", "JHT-45",
    "JHT-46", "JHT-47", "JHT-48", "JHT-49", "JHT-50", "JHT-51", "JHT-52", "JHT-53",
]
MT_HANDLERS  = ["MT-08", "MT-12", "MT-13", "MT-16", "MT-23", "MT93-02"]
HT_HANDLERS  = ["HT-22"]

ALL_HANDLERS = (
    [(n, "JHT") for n in JHT_HANDLERS] +
    [(n, "MT")  for n in MT_HANDLERS]  +
    [(n, "HT")  for n in HT_HANDLERS]
)


def reset_stations():
    print("Resetting all station data...")

    # ── 1. Clear dependent records ──────────────────────────────────────────
    print("  Deleting troubleshooting steps...")
    TroubleshootingStep.query.delete()

    print("  Deleting troubleshooting sessions...")
    TroubleshootingSession.query.delete()

    print("  Deleting maintenance logs...")
    MaintenanceLog.query.delete()

    print("  Deleting status history...")
    StatusHistory.query.delete()

    print("  Clearing layout configs...")
    LayoutConfig.query.delete()

    # ── 2. Unlink and delete handlers ──────────────────────────────────────
    print("  Deleting handlers...")
    Handler.query.delete()

    # ── 3. Delete testers ──────────────────────────────────────────────────
    print("  Deleting testers...")
    Tester.query.delete()

    db.session.flush()

    # ── 4. Create new testers ──────────────────────────────────────────────
    status_running = Status.query.filter_by(name="Running").first()
    if not status_running:
        print("ERROR: 'Running' status not found — run `flask seed` first.")
        return

    now = datetime.now(timezone.utc)
    tester_map = {}   # name → Tester instance

    for _key, section in ALL_SECTIONS:
        for (name, ttype, plant, bay, snum, _handler) in section:
            t = Tester(
                name=name,
                tester_type=ttype,
                plant=plant,
                bay=bay,
                station_number=snum,
                current_status=status_running,
            )
            db.session.add(t)
            tester_map[name] = t

    db.session.flush()  # assigns IDs

    # ── 5. Initial status history for every tester ─────────────────────────
    for t in tester_map.values():
        db.session.add(StatusHistory(
            tester_id=t.id,
            status_id=status_running.id,
            changed_by=None,
            changed_at=now,
            note="Initial status — station reset",
        ))

    # ── 6. Create handlers and assign to testers ───────────────────────────
    handler_map = {}  # name → Handler instance

    for (hname, htype) in ALL_HANDLERS:
        h = Handler(name=hname, handler_type=htype, current_tester_id=None)
        db.session.add(h)
        handler_map[hname] = h

    db.session.flush()

    assigned = set()
    for _key, section in ALL_SECTIONS:
        for (tname, _ttype, _plant, _bay, _snum, hname) in section:
            if hname is None:
                continue
            if hname in assigned:
                print(f"  WARNING: {hname} already assigned — skipping duplicate on {tname}")
                continue
            h = handler_map.get(hname)
            t = tester_map.get(tname)
            if h and t:
                h.current_tester_id = t.id
                assigned.add(hname)

    # ── 7. Seed layout configs ─────────────────────────────────────────────
    for key, section in ALL_SECTIONS:
        tester_ids = [tester_map[row[0]].id for row in section]
        lc = LayoutConfig(section_key=key)
        lc.set_layout(tester_ids)
        db.session.add(lc)

    db.session.commit()

    total_testers  = sum(len(s) for _, s in ALL_SECTIONS)
    total_handlers = len(ALL_HANDLERS)
    print(f"Done! Created {total_testers} testers and {total_handlers} handlers.")
    print("  Plant 1:       12 stations")
    print("  Plant 3 Bay 1: 15 stations")
    print("  Plant 3 Bay 2: 12 stations")
    print("  Plant 3 Bay 3: 16 stations")
