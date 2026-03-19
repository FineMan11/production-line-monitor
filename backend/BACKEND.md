# Backend — Production Line Monitor

## Stack
- **Flask 3.0** — web framework
- **PostgreSQL 14** — database
- **SQLAlchemy** — ORM
- **Flask-JWT-Extended** — JWT authentication
- **Flask-SocketIO + eventlet** — WebSocket real-time updates
- **Flask-Migrate (Alembic)** — database migrations
- **Gunicorn** — production WSGI server

---

## Folder Structure

```
backend/
├── run.py                  # Entry point (used by Gunicorn)
├── requirements.txt
└── app/
    ├── __init__.py         # create_app() factory + blueprint registration
    ├── config.py           # DevelopmentConfig, ProductionConfig
    ├── extensions.py       # db, jwt, socketio, migrate instances
    ├── seed.py             # flask seed — creates roles, users, testers, handlers
    │
    ├── models/
    │   ├── user.py         # User
    │   ├── role.py         # Role, Permission
    │   ├── audit_log.py    # AuditLog
    │   ├── status.py       # Status (Running/Maintenance/Engineering/Down)
    │   ├── tester.py       # Tester, StatusHistory
    │   ├── handler.py      # Handler
    │   └── maintenance.py  # MaintenanceLog
    │
    ├── api/
    │   ├── dashboard.py    # GET /api/dashboard/testers|handlers|statuses
    │   ├── tester.py       # PATCH /api/testers/<id> and /status, GET /history
    │   └── maintenance.py  # GET/POST /api/maintenance/, PATCH /close, GET /open
    │
    ├── auth/
    │   └── routes.py       # POST /api/auth/login|refresh|logout, GET /me
    │
    ├── services/
    │   ├── status_service.py       # update_tester_status(), get history
    │   └── maintenance_service.py  # create/close/get maintenance logs
    │
    └── utils/
        ├── decorators.py   # @role_required("admin", "supervisor", ...)
        └── audit.py        # log_action() — writes to audit_logs table
```

---

## User Roles

| Role | What they can do |
|---|---|
| `operator` | View dashboard, change status |
| `line_technician` | Above + log maintenance |
| `supervisor` | Above + manage stations, view audit logs |
| `admin` | Everything + edit station details |

**Default users after seed:**
| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | admin |
| `technician` | `tech123` | line_technician |

---

## API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login, returns JWT tokens |
| GET | `/api/auth/me` | JWT | Current user info |
| POST | `/api/auth/logout` | JWT | Revoke token |
| GET | `/api/dashboard/testers` | JWT | All stations with status + handler |
| GET | `/api/dashboard/handlers` | JWT | All handlers |
| GET | `/api/dashboard/statuses` | JWT | 4 status options |
| PATCH | `/api/testers/<id>` | Admin | Edit station (name, type, plant, handler) |
| PATCH | `/api/testers/<id>/status` | All roles | Change station status |
| GET | `/api/testers/<id>/history` | JWT | Status change history |
| GET | `/api/maintenance/` | JWT | List logs (filter by tester, date, open) |
| POST | `/api/maintenance/` | Technician+ | Create maintenance log |
| PATCH | `/api/maintenance/<id>/close` | Technician+ | Close open log |
| GET | `/api/maintenance/<id>/open` | JWT | Get open log for a tester |

---

## Common Commands

```bash
# Start all services
docker compose up -d

# Rebuild after code changes
docker compose up --build -d backend

# Run database migration after model changes
docker compose exec backend flask db migrate -m "describe change"
docker compose exec backend flask db upgrade

# Seed initial data (roles, users, testers, handlers)
docker compose exec backend flask seed

# View backend logs
docker compose logs -f backend
```

---

## Data Rules

- **StatusHistory**, **MaintenanceLog**, **AuditLog** are **append-only** — never deleted or updated
- Every status change emits a WebSocket event `status_update` to all connected clients
- Passwords are hashed with Werkzeug — never stored in plain text
- All secrets come from environment variables (see `.env.example`)
