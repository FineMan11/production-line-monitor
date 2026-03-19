# Production Line Monitor — CLAUDE.md

This file is the source of truth for how this project is built and maintained.
Read this before writing any code. Update it when architecture changes.

---

## 1. Project Overview

A web-based production line monitoring system for a semiconductor/electronics testing facility.
Replaces paper-based tracking (form K-MF0105) with a real-time digital system.

**Core modules:**
- **Dashboard** — Live status of 52 tester stations and all handlers (JHT, MT, CAS)
- **Job Sheets** — Digital replacement for paper shift forms, auto-created at shift start
- **Maintenance Logging** — Track start/end times, notes, responsible technician
- **Status Tracking** — Real-time handler/tester status with full history
- **Analytics** — Downtime analysis, error frequency, productivity metrics
- **Admin Panel** — User management, audit logs, system settings

**Key principle: Everything integrates.**
Status changes → update dashboard instantly via WebSocket → appear on the active job sheet →
feed into analytics → stored in append-only audit trail. No module is standalone.

**Tester types:** INVTG, ETS364, J750
**Handler types:** JHT, MT, CAS
**Shifts:** Morning (07:00–19:00), Night (19:00–07:00)

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | Python 3.11+, Flask 3.0+ | Web framework |
| | Gunicorn + eventlet | WSGI server with WebSocket support |
| | Flask-SQLAlchemy | ORM (database access) |
| | Flask-JWT-Extended | JWT authentication |
| | Flask-SocketIO | WebSocket real-time updates |
| | Flask-Migrate (Alembic) | Database schema migrations |
| | Celery | Background tasks (e.g. auto-create job sheets) |
| | psycopg2-binary | PostgreSQL driver |
| **Frontend** | React 18+ | UI framework |
| | Vite | Build tool and dev server |
| | Tailwind CSS v3 | Styling (utility classes only — no custom CSS) |
| | Axios | HTTP client (with JWT interceptors) |
| | Socket.IO client | WebSocket real-time updates |
| | React Router v6 | Page navigation |
| | Redux Toolkit | Global state (phase 3+) |
| | Recharts or Chart.js | Analytics charts |
| **Infrastructure** | Docker + Docker Compose | Container orchestration |
| | Nginx | Reverse proxy, routes /api → Flask, / → React |
| | PostgreSQL 14+ | Primary database |
| | Redis | Celery task broker + JWT token blocklist (phase 3+) |

---

## 3. Architecture Principles

**Modular by Feature**
Each API endpoint is its own file inside `backend/app/api/`. Do not put all routes in one file.
```
api/auth.py       → /api/auth/*
api/dashboard.py  → /api/dashboard/*
api/jobsheet.py   → /api/jobsheets/*
```

**Services Layer**
Business logic lives in `backend/app/services/`, not in route handlers.
Route handlers only: validate input → call service → return JSON response.
Services are reusable by Celery tasks, other services, and tests.

**Real-Time via WebSocket**
Status changes are pushed to clients instantly via Socket.IO.
Never use polling (setInterval) to refresh data. The dashboard subscribes to events.

**Append-Only Data**
Job sheets and status history are never deleted or edited after creation.
Mark records as `closed` or `superseded` — never `DELETE` them.

---

## 4. Folder Structure

```
Production-Monitoring/
├── .env                          # Secrets — NEVER commit
├── .env.example                  # Template (commit this)
├── .gitignore
├── docker-compose.yml
├── CLAUDE.md                     # ← You are here
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── run.py                    # Entry point (used by Gunicorn)
│   └── app/
│       ├── __init__.py           # create_app() factory
│       ├── config.py             # DevelopmentConfig, ProductionConfig
│       ├── extensions.py         # db, jwt, socketio, migrate (unbound instances)
│       ├── seed.py               # Initial data (roles, permissions, admin user)
│       │
│       ├── api/                  # API route handlers (one file per feature)
│       │   ├── auth.py           # POST /api/auth/login, /refresh, /logout, /me
│       │   ├── dashboard.py      # GET /api/dashboard/testers, /handlers
│       │   ├── jobsheet.py       # GET/POST /api/jobsheets/*
│       │   ├── maintenance.py    # GET/POST /api/maintenance/*
│       │   ├── handler.py        # GET/PATCH /api/handlers/*
│       │   ├── tester.py         # GET/PATCH /api/testers/*
│       │   └── analysis.py       # GET /api/analysis/* (admin/supervisor only)
│       │
│       ├── models/               # SQLAlchemy models (one file per table group)
│       │   ├── __init__.py       # Exports all models
│       │   ├── user.py           # User
│       │   ├── role.py           # Role, Permission
│       │   ├── audit_log.py      # AuditLog
│       │   ├── tester.py         # Tester, StatusHistory
│       │   ├── handler.py        # Handler
│       │   ├── jobsheet.py       # JobSheet, JobSheetEntry
│       │   └── maintenance.py    # MaintenanceLog
│       │
│       ├── services/             # Business logic (called by routes AND Celery)
│       │   ├── auth_service.py
│       │   ├── status_service.py
│       │   ├── jobsheet_service.py
│       │   ├── maintenance_service.py
│       │   └── analysis_service.py
│       │
│       └── utils/
│           ├── decorators.py     # role_required() RBAC decorator
│           └── audit.py          # log_action() helper
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx               # Router + AuthProvider
│       ├── index.css             # Tailwind directives only
│       │
│       ├── api/
│       │   └── axios.js          # Axios instance with JWT interceptors
│       │
│       ├── context/
│       │   └── AuthContext.jsx   # login(), logout(), user state
│       │
│       ├── components/           # Reusable UI pieces
│       │   ├── ProtectedRoute.jsx
│       │   ├── dashboard/        # Station cards, handler list, timers
│       │   ├── jobsheet/         # Job sheet forms and tables
│       │   ├── maintenance/      # Maintenance log form
│       │   ├── analysis/         # Charts and report widgets
│       │   └── admin/            # User management, audit viewer
│       │
│       ├── pages/                # One file per page/route
│       │   ├── LoginPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── JobSheetPage.jsx
│       │   ├── MaintenancePage.jsx
│       │   ├── AnalyticsPage.jsx
│       │   └── AdminPage.jsx
│       │
│       └── services/             # API call functions (not components)
│           ├── authService.js
│           ├── dashboardService.js
│           ├── jobsheetService.js
│           └── maintenanceService.js
│
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
│
└── logs/                         # Written by the backend (not committed)
    ├── errors.log
    ├── audit.log
    └── performance.log
```

---

## 5. Database Rules

**Append-Only Design**
The following tables are immutable after creation — never `UPDATE` or `DELETE` rows:
- `status_history` — every status change is a new row
- `jobsheets` — closed, not deleted
- `jobsheet_entries` — corrections add a new row with a note
- `audit_logs` — permanent record of every user action

**Why:** Compliance requirement. Factory data must be preserved indefinitely for traceability.

**Key tables:**

| Table | Description |
|---|---|
| `users` | User accounts with hashed passwords and role FK |
| `roles` | operator, line_technician, supervisor, admin |
| `permissions` | Fine-grained actions (view_dashboard, update_status, etc.) |
| `role_permissions` | Many-to-many join table |
| `audit_logs` | Every user action: who, what, when, from which IP |
| `testers` | 52 test stations (INVTG, ETS364, J750) |
| `handlers` | JHT, MT, CAS units — move between testers |
| `statuses` | Lookup table: Running (green), Maintenance (orange), Engineering (blue), Down (red) |
| `status_history` | APPEND-ONLY log of every status change |
| `jobsheets` | One per tester per shift |
| `jobsheet_entries` | RIO daily entries within a job sheet |
| `maintenance_logs` | Start/end time, notes, responsible technician |

**Migration rule:** Always use Flask-Migrate. Never call `db.create_all()` in production code.
```bash
flask db migrate -m "describe the change"
flask db upgrade
```

---

## 6. Authentication & Authorization

**JWT Flow:**
1. User POSTs credentials to `POST /api/auth/login`
2. Backend validates, returns `access_token` (24hr) + `refresh_token`
3. Frontend stores both in `localStorage`
4. Every request includes `Authorization: Bearer <access_token>`
5. Axios interceptor attaches the token automatically (see `src/api/axios.js`)
6. On 401 response → Axios interceptor clears storage and redirects to `/login`
7. `POST /api/auth/logout` adds the token's JTI to the blocklist

**User Roles (in order of access):**

| Role | Permissions |
|---|---|
| `operator` | view_dashboard, update_status |
| `line_technician` | view_dashboard, update_status, **log_maintenance** (exclusive feature) |
| `supervisor` | view_dashboard, update_status, log_maintenance, manage_stations, view_audit_logs |
| `admin` | everything |

**Backend — protecting an endpoint:**
```python
from app.utils.decorators import role_required

@bp.route("/api/admin/users")
@role_required("admin")
def list_users():
    ...

@bp.route("/api/analytics")
@role_required("admin", "supervisor")
def analytics():
    ...
```

**Frontend — protecting a page:**
```jsx
<Route path="/admin" element={
  <ProtectedRoute requiredRole="admin">
    <AdminPage />
  </ProtectedRoute>
} />
```

**The role is embedded in the JWT claims at login** — no database call needed on every request.

---

## 7. Code Style & Guidelines

**Python (backend):**
- Follow PEP 8. Max line length: 100 characters.
- Use type hints on all function signatures.
- Use `from app.extensions import db` — never `from app import db`.
- Import routes at the bottom of blueprint `__init__.py` to avoid circular imports.
- No hardcoded secrets. All config from environment variables via `config.py`.
- Use `current_app.logger` for logging, not `print()`.
- Every route that modifies data must call `log_action()` and `db.session.commit()`.

**React (frontend):**
- Functional components and hooks only. No class components.
- Tailwind CSS only for styling. No inline styles, no separate CSS files (except `index.css`).
- API calls go in `src/services/` files, not directly inside components.
- Use `useAuth()` hook to access user state. Never read `localStorage` directly in components.
- Pages (`src/pages/`) compose components. Components (`src/components/`) are reusable pieces.

**Database:**
- Every model has a primary key `id` (Integer, auto-increment).
- Every foreign key column has a corresponding `db.relationship()`.
- Add `index=True` to columns used in `WHERE` clauses (e.g. `username`, `timestamp`).
- Use `db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))` for timestamps.

---

## 8. Real-Time Updates (WebSocket)

**Rule: Never use `setInterval` or polling to refresh dashboard data.**

**Server — emit an event when status changes:**
```python
from app.extensions import socketio

# Inside a route or service after a status update:
socketio.emit("status_update", {
    "tester_id": tester.id,
    "status": new_status.name,
    "color": new_status.color_code,
    "changed_at": datetime.now(timezone.utc).isoformat(),
})
```

**Client — subscribe to events in the dashboard component:**
```jsx
import { useEffect } from 'react'
import { io } from 'socket.io-client'

const socket = io('/')  // Nginx proxies /socket.io/ to backend

useEffect(() => {
  socket.on('status_update', (data) => {
    // Update the specific station card without re-fetching all data
    dispatch(updateTesterStatus(data))
  })
  return () => socket.off('status_update')
}, [])
```

**Gunicorn must use eventlet worker** for WebSocket support:
```
gunicorn --worker-class eventlet -w 1 run:app
```

---

## 9. Error Handling Strategy

**What users see:** A generic message + a unique error ID.
```json
{ "error": "Something went wrong. Reference: ERR-2024-001a3f" }
```

**What admins see:** Full stack trace in `logs/errors.log`, searchable by error ID.

**Logging rules:**
- Use `current_app.logger.error(...)` for unexpected errors (5xx).
- Use `current_app.logger.warning(...)` for auth failures, invalid input (4xx).
- Never log passwords, tokens, or personally identifiable data.
- Errors are written to `logs/errors.log` (separate file, not the database).
- The error ID is generated with `uuid.uuid4().hex[:8]` and returned to the user.

**Flask error handler pattern:**
```python
@app.errorhandler(500)
def internal_error(e):
    error_id = uuid.uuid4().hex[:8]
    current_app.logger.error(f"[{error_id}] Unhandled exception: {e}", exc_info=True)
    return jsonify({"error": f"An unexpected error occurred. Reference: ERR-{error_id}"}), 500
```

---

## 10. Deployment (Docker)

**Start the system:**
```bash
docker compose up --build       # First time (builds images)
docker compose up               # Subsequent starts
docker compose up -d            # Run in background
```

**Database setup (first time only):**
```bash
docker compose exec backend flask db init
docker compose exec backend flask db migrate -m "initial schema"
docker compose exec backend flask db upgrade
docker compose exec backend flask seed
```

**Services and ports:**

| Service | Internal port | External port | Description |
|---|---|---|---|
| nginx | 80 | 80 | Entry point — all browser traffic goes here |
| backend | 5000 | (none) | Flask API — only reachable via nginx |
| frontend | 5173 | (none) | Vite dev server — only reachable via nginx |
| postgres | 5432 | (none) | Database — internal only |
| redis | 6379 | (none) | Celery broker — internal only (phase 3+) |

**Access:** `http://localhost` (local network only — no internet required)

**Required environment variables** (copy `.env.example` → `.env`):
```
POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
DATABASE_URL
SECRET_KEY
JWT_SECRET_KEY
JWT_ACCESS_TOKEN_EXPIRES_HOURS
FLASK_ENV
ADMIN_DEFAULT_PASSWORD
```

---

## 11. Testing Requirements

**Unit tests** — test individual functions in `services/` and `utils/`:
```bash
docker compose exec backend python -m pytest tests/unit/
```

**Integration tests** — test API endpoints end-to-end with a real test database:
```bash
docker compose exec backend python -m pytest tests/integration/
```

**Load testing** — verify 50 concurrent users without degradation:
```bash
locust -f tests/load/locustfile.py --host=http://localhost
```

**Coverage goal: 80%+**
```bash
docker compose exec backend python -m pytest --cov=app tests/
```

**Rules:**
- Never mock the database in integration tests — use a real PostgreSQL test database.
- Every new API endpoint needs at least one integration test.
- Test all three roles (operator, supervisor, admin) for RBAC-protected endpoints.

---

## 12. Security Checklist

Before deploying or merging, verify:

- [ ] No hardcoded passwords, tokens, or secrets anywhere in the code
- [ ] `.env` is in `.gitignore` and was never committed
- [ ] All `SECRET_KEY` and `JWT_SECRET_KEY` values are 64+ character random strings
- [ ] Every API endpoint has `@jwt_required()` or `@role_required()` (except `/api/auth/login`)
- [ ] All user input is validated before hitting the database (prevent SQL injection via ORM)
- [ ] Passwords are hashed with Werkzeug (`generate_password_hash`) — never stored plain
- [ ] Error responses never include stack traces or database details
- [ ] Every user action is logged to `audit_logs`
- [ ] Nginx is the only service with an exposed host port
- [ ] JWT tokens expire in 24 hours (configurable via `JWT_ACCESS_TOKEN_EXPIRES_HOURS`)

---

## 13. When to Update This File

**DO update CLAUDE.md when:**
- The tech stack changes (new library added or removed)
- A new role is added or permissions change
- The folder structure changes
- A new architectural pattern is introduced
- Deployment process changes

**DO NOT update CLAUDE.md for:**
- Bug fixes
- Adding a new feature within existing patterns
- Adding a new React component or page
- Adding a new API endpoint that follows existing patterns

---

## 14. Important Documents

| Document | Location | Purpose |
|---|---|---|
| This file | `CLAUDE.md` | Architecture and developer guide |
| Ecosystem specification | `ECOSYSTEM_SPECIFICATION.md` | Full feature and business requirements |
| API documentation | `API_DOCUMENTATION.md` | All endpoints, request/response format |
| Deployment guide | `DEPLOYMENT_GUIDE.md` | Step-by-step setup for new environments |
| User guide | `USER_GUIDE.md` | How operators, technicians, and supervisors use the system |

---

## 15. Quick Commands

```bash
# Start everything
docker compose up --build

# View logs (all services)
docker compose logs -f

# View logs (one service)
docker compose logs -f backend

# Stop everything
docker compose down

# Stop and delete database volume (WARNING: deletes all data)
docker compose down -v

# Run database migrations after model changes
docker compose exec backend flask db migrate -m "your description"
docker compose exec backend flask db upgrade

# Open a Python shell with app context
docker compose exec backend flask shell

# Seed initial data (roles, admin user)
docker compose exec backend flask seed

# Run tests
docker compose exec backend python -m pytest

# Rebuild a single service after code changes
docker compose up --build backend
```

---

## 16. Key Contacts

| Area | Contact | Notes |
|---|---|---|
| Database / migrations | Database Admin | Any schema changes need sign-off |
| API / backend | Backend Developer | Flask, SQLAlchemy, JWT |
| UI / frontend | Frontend Developer | React, Tailwind, WebSocket client |
| Infrastructure | IT / DevOps | Docker, Nginx, server access |
| Business requirements | Production Supervisor | What the system must do |

---

## 17. Notes

**This is an integrated ecosystem, not a collection of separate tools.**
Every piece of data flows through the system: a status change on the floor updates the dashboard
in real time, appears on the shift's job sheet, and is stored permanently in the audit trail.

**Data is compliance-ready.**
Nothing is ever deleted. Status history, job sheets, and audit logs are append-only by design.
This satisfies traceability requirements without any extra configuration.

**Real-time = WebSocket.**
Socket.IO pushes changes to all connected browsers instantly.
Do not add polling as a fallback — fix the WebSocket if it breaks.

**Security = role-based access.**
Every endpoint checks the JWT and the user's role before returning data.
The role is embedded in the JWT at login — no per-request database lookup needed.
