"""
Database seeder — run with: flask seed

Creates:
  - 6 permissions
  - 4 roles with appropriate permissions
  - 4 statuses (Running, Maintenance, Engineering, Down)
  - 1 default admin user
  - 1 shared line_technician user
  - 52 testers (10 in Plant 1, 42 in Plant 2)
  - 24 handlers (JHT×10, MT×8, CAS×6) — all start in Offline Area
  - Initial StatusHistory row for every tester

This function is idempotent — safe to run multiple times.

IMPORTANT: Verify tester names, types, and handler counts with the production
supervisor before the first `flask seed` run on a real environment.
"""
import os
import random
from datetime import datetime, timezone
from app.extensions import db
from app.models import User, Role, Permission, Status, Tester, StatusHistory, Handler


def seed_database():
    print("Seeding database...")
    seeded_anything = False

    # ------------------------------------------------------------------ #
    # Permissions + Roles + Users (skip if already exist)                  #
    # ------------------------------------------------------------------ #
    if Role.query.count() == 0:
        seeded_anything = True

        perm_view_dashboard = Permission(
            name="view_dashboard",
            description="View the main production dashboard",
        )
        perm_update_status = Permission(
            name="update_status",
            description="Change tester and handler status",
        )
        perm_manage_stations = Permission(
            name="manage_stations",
            description="Add, edit, or disable tester stations and handlers",
        )
        perm_manage_users = Permission(
            name="manage_users",
            description="Create, edit, and disable user accounts",
        )
        perm_log_maintenance = Permission(
            name="log_maintenance",
            description="Access the technician maintenance logging feature",
        )
        perm_view_audit_logs = Permission(
            name="view_audit_logs",
            description="View the full audit and error log history",
        )

        all_permissions = [
            perm_view_dashboard, perm_update_status, perm_log_maintenance,
            perm_manage_stations, perm_manage_users, perm_view_audit_logs,
        ]
        for p in all_permissions:
            db.session.add(p)

        operator_role = Role(
            name="operator",
            permissions=[perm_view_dashboard, perm_update_status],
        )
        line_technician_role = Role(
            name="line_technician",
            permissions=[perm_view_dashboard, perm_update_status, perm_log_maintenance],
        )
        supervisor_role = Role(
            name="supervisor",
            permissions=[
                perm_view_dashboard, perm_update_status, perm_log_maintenance,
                perm_manage_stations, perm_view_audit_logs,
            ],
        )
        admin_role = Role(name="admin", permissions=all_permissions)

        db.session.add_all([operator_role, line_technician_role, supervisor_role, admin_role])
        db.session.flush()

        admin_password = os.environ.get("ADMIN_DEFAULT_PASSWORD", "admin123")
        admin_user = User(username="admin", role=admin_role)
        admin_user.set_password(admin_password)
        db.session.add(admin_user)

        tech_password = os.environ.get("TECH_DEFAULT_PASSWORD", "tech123")
        tech_user = User(username="technician", role=line_technician_role)
        tech_user.set_password(tech_password)
        db.session.add(tech_user)

        db.session.flush()
        print("  Created roles, permissions, admin + technician users.")
    else:
        admin_password = os.environ.get("ADMIN_DEFAULT_PASSWORD", "admin123")
        tech_password  = os.environ.get("TECH_DEFAULT_PASSWORD",  "tech123")

        # Ensure technician user exists even if roles were seeded before this phase
        if not User.query.filter_by(username="technician").first():
            line_technician_role = Role.query.filter_by(name="line_technician").first()
            if line_technician_role:
                tech_user = User(username="technician", role=line_technician_role)
                tech_user.set_password(tech_password)
                db.session.add(tech_user)
                db.session.flush()
                seeded_anything = True
                print("  Created technician user.")

    # ------------------------------------------------------------------ #
    # Statuses + Testers + Handlers (skip if already exist)               #
    # ------------------------------------------------------------------ #
    if Status.query.count() == 0:
        seeded_anything = True

        status_running     = Status(name="Running",     color_code="green")
        status_maintenance = Status(name="Maintenance", color_code="orange")
        status_engineering = Status(name="Engineering", color_code="blue")
        status_down        = Status(name="Down",        color_code="red")

        db.session.add_all([status_running, status_maintenance, status_engineering, status_down])
        db.session.flush()

        # -- Plant 1: 10 stations ------------------------------------------
        # IMPORTANT: Update tester_type to match the actual floor layout
        plant1_types = ["INVTG"] * 10  # placeholder — adjust to real layout

        plant1_testers = []
        for i, ttype in enumerate(plant1_types, start=1):
            t = Tester(
                name=f"T1-{i:02d}",
                tester_type=ttype,
                plant=1,
                station_number=i,
                current_status=status_running,
            )
            db.session.add(t)
            plant1_testers.append(t)

        # -- Plant 3: 42 stations (3 bays × 14 stations) ------------------
        plant3_types = (
            ["INVTG"]  * 10 +
            ["ETS364"] * 20 +
            ["J750"]   * 12
        )  # total = 42 — adjust distribution to match real floor layout

        plant3_testers = []
        for i, ttype in enumerate(plant3_types, start=1):
            bay = 1 if i <= 14 else (2 if i <= 28 else 3)
            t = Tester(
                name=f"T3-{i:02d}",
                tester_type=ttype,
                plant=3,
                bay=bay,
                station_number=i,
                current_status=status_running,
            )
            db.session.add(t)
            plant3_testers.append(t)

        db.session.flush()

        # -- Initial StatusHistory (history is never empty) ----------------
        now = datetime.now(timezone.utc)
        for tester in plant1_testers + plant3_testers:
            sh = StatusHistory(
                tester_id=tester.id,
                status_id=status_running.id,
                changed_by=None,
                changed_at=now,
                note="Initial status — system seed",
            )
            db.session.add(sh)

        # -- Handlers (randomly assigned to testers) -----------------------
        handler_defs = (
            [("JHT", i) for i in range(1, 11)] +   # JHT-01 to JHT-10
            [("MT",  i) for i in range(1, 9)]  +   # MT-01 to MT-08
            [("CAS", i) for i in range(1, 7)]       # CAS-01 to CAS-06
        )
        all_testers = plant1_testers + plant3_testers
        # Shuffle testers so handler assignment is random
        tester_pool = random.sample(all_testers, len(all_testers))
        for idx, (htype, num) in enumerate(handler_defs):
            # Assign to a tester if one is available in the pool
            tester = tester_pool[idx] if idx < len(tester_pool) else None
            h = Handler(
                name=f"{htype}-{num:02d}",
                handler_type=htype,
                current_tester_id=tester.id if tester else None,
            )
            db.session.add(h)

        print("  Created 4 statuses, 52 testers (Plant 1 + Plant 3 w/ bays), 24 handlers.")

    db.session.commit()

    if seeded_anything:
        print("Done! Seeded successfully.")
        print("IMPORTANT: Change default passwords after first login.")
        print("IMPORTANT: Verify tester names/types against actual floor layout.")
    else:
        print("All sections already seeded — nothing to do.")
