# Production Line Monitor

A full-stack, real-time web application that digitises production floor tracking for a semiconductor/electronics testing facility at **KESM Industries Berhad**. Replaces paper-based job sheets (form K-MF0105) and manual status boards with a live dashboard accessible to any device on the local network.

---

## Problem

On a typical testing production floor:

- **52 tester stations** across Plant 1 and Plant 3 (3 bays), each with its own handler and status
- Station status (running, down, maintenance) was tracked on whiteboards or by word of mouth
- Job sheets (form K-MF0105) were filled in on paper every shift — easy to lose, hard to audit
- Supervisors had no quick way to see overall line health at a glance
- Downtime durations were estimated, not measured

## Solution

A self-hosted web app that gives the entire floor a **single source of truth** — live station status, digital job sheets, and a clear view of what's running, what's down, and for how long.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, Flask 3.0+ |
| Database | PostgreSQL 14+ |
| ORM | Flask-SQLAlchemy, Flask-Migrate |
| Auth | Flask-JWT-Extended (JWT with role-based access) |
| Real-Time | Flask-SocketIO + Socket.IO client |
| Background Tasks | Celery + Redis |
| Frontend | React 18+, Vite, Tailwind CSS v3 |
| HTTP Client | Axios (with JWT interceptors) |
| Infrastructure | Docker, Docker Compose, Nginx |

---

## Key Features

### Real-Time Dashboard
- 52 station cards organised by **Plant 1** (10 stations) and **Plant 3 Bay 1/2/3** (42 stations) — matching the actual factory floor layout
- Colour-coded statuses: Running (green), Maintenance (orange), Engineering (blue), Down (red)
- Status changes pushed instantly to all connected browsers via WebSocket — no polling
- Configurable slot grid layout per section (admin-only)

### Digital Job Sheets (Replacing Paper Form K-MF0105)
- Auto-created per tester per shift (Morning 07:00–19:00, Night 19:00–07:00)
- RIO daily entries with time, flow, site, totals, and submitted-by fields
- Unproductive time tracking with auto-calculated durations
- Append-only design — sheets are closed, never deleted

### Maintenance Logging
- Log start/end times, notes, and responsible technician
- Linked to tester and shift records for full traceability

### Troubleshooting Sessions
- Log upchuck/jamming incidents per tester station
- Record steps taken, PC failure observations, site counts, and site failures
- Full session history per tester for pattern analysis

### Role-Based Access Control

| Role | Permissions |
|------|------------|
| `operator` | View dashboard, update status |
| `line_technician` | Above + log maintenance |
| `supervisor` | Above + manage stations, view audit logs |
| `admin` | Full access + layout configuration |

### Audit Trail
- Every user action is logged (who, what, when, from which IP)
- Status history is append-only — full change history preserved indefinitely

---

## Deployment

This app runs on a **self-hosted Proxmox VM** on the factory LAN:

| Component | Detail |
|-----------|--------|
| Hypervisor | Proxmox VE 9.1 (Intel i5-3550, 8GB RAM) |
| VM | Ubuntu 22.04 LTS — IP: 192.168.50.211 |
| Access (local) | `http://192.168.50.211` |
| Access (remote) | Tailscale VPN — no port forwarding needed |
| Containers | Docker Compose — nginx, backend, frontend, postgres |

---

## Architecture

```
Production-Monitoring/
├── backend/             # Flask API, services, models, migrations
├── frontend/            # React app (Vite + Tailwind)
├── nginx/               # Reverse proxy config
├── docker-compose.yml
└── logs/                # Error, audit, and performance logs
```

All status changes flow through WebSocket → dashboard update → job sheet → analytics → audit log. No module is standalone.

---

## How to Run

**Prerequisites:** Docker and Docker Compose installed.

```bash
# 1. Clone the repo
git clone https://github.com/FineMan11/production-line-monitor.git
cd production-line-monitor

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and secret keys

# 3. Build and start all services
docker compose up --build

# 4. First-time database setup (run once)
docker compose exec backend flask db upgrade
docker compose exec backend flask seed

# 5. Open in browser
http://localhost
```

---

## Services

| Service | Description |
|---------|-------------|
| `nginx` | Entry point — routes `/api` → Flask, `/` → React |
| `backend` | Flask API with WebSocket support |
| `frontend` | React app (Vite dev server) |
| `postgres` | Primary database (internal only) |
| `redis` | Celery broker (internal only) |

---

## Roadmap

| Phase | Description | Status |
|-------|------------|--------|
| Phase 1 | Production line dashboard with live status tracking | ✅ Complete |
| Phase 2 | Digital job sheet (K-MF0105 replacement) | ✅ Complete |
| Phase 3 | Full-stack rebuild — React, PostgreSQL, Docker, JWT, Troubleshooting Sessions | ✅ Complete |
| Phase 3.x | Plant/Bay layout system — dashboard matches real factory floor | ✅ Complete |
| Phase 4 | JHT handler real-time monitoring via network | 🔜 Planned |
| Phase 5 | Auto job sheet data entry from tester log files | 🔜 Planned |
| Phase 6 | Knowledge base / searchable troubleshooting solutions | 🔜 Planned |
| Phase 7 | AI root cause analysis (Claude API integration) | 🔜 Planned |

---

## Releases & Version History

All versions are tagged and available on [GitHub Releases](https://github.com/FineMan11/production-line-monitor/releases).

| Version | Description | Date |
|---------|-------------|------|
| [v0.1.0](https://github.com/FineMan11/production-line-monitor/releases/tag/v0.1.0) | Phase 1 — Dashboard (Flask/SQLite) | — |
| [v0.2.0](https://github.com/FineMan11/production-line-monitor/releases/tag/v0.2.0) | Phase 2 — Digital job sheets | — |
| [v0.3.0](https://github.com/FineMan11/production-line-monitor/releases/tag/v0.3.0) | Phase 3 — Full-stack rebuild + Troubleshooting Sessions | Apr 25, 2026 |
| [v0.3.1](https://github.com/FineMan11/production-line-monitor/releases/tag/v0.3.1) | Plant/Bay layout system, dashboard floor reorganisation | **Current** |
| v0.4.0 | Phase 4 — JHT handler monitoring | Planned |
| v1.0.0 | Official production launch | Planned |

### Rolling back to a previous version
```bash
git checkout v0.3.0           # switch to any version tag
docker-compose up -d --build  # rebuild containers for that version
docker-compose exec backend flask db upgrade
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [ECOSYSTEM_SPECIFICATION.md](ECOSYSTEM_SPECIFICATION.md) | Full feature and business requirements |
| [ROADMAP.md](ROADMAP.md) | Detailed phase-by-phase development plan |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | All endpoints, request/response formats |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Step-by-step setup for new environments |
| [USER_GUIDE.md](USER_GUIDE.md) | How operators, technicians, and supervisors use the system |

---

## Built With

Python · Flask · PostgreSQL · SQLAlchemy · React · Tailwind CSS · Socket.IO · Docker · Nginx
