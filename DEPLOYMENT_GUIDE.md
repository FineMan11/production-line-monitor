# Production Line Monitor — Deployment Guide

Step-by-step guide for setting up the system in a new environment.

---

## Prerequisites

Install these on the host machine before starting:

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Docker | 24.0+ | `docker --version` |
| Docker Compose | 2.20+ | `docker compose version` |
| Git | 2.0+ | `git --version` |

> The system is self-contained. No internet is required after the initial image build.

---

## First-Time Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd Production-Monitoring
```

---

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in every value. See the [Environment Variables](#environment-variables) section below.

Minimum required values:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `DATABASE_URL` (must match the Postgres values above)
- `SECRET_KEY` (64+ random characters)
- `JWT_SECRET_KEY` (64+ random characters, different from SECRET_KEY)
- `ADMIN_DEFAULT_PASSWORD`

Generate secure keys:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

### 3. Build and start all services

```bash
docker compose up --build
```

First build takes 3–5 minutes (downloads base images and installs dependencies).

---

### 4. Initialise the database (first time only)

In a second terminal:

```bash
# Run all migrations
docker compose exec backend flask db upgrade

# Seed initial data (roles, admin user, statuses, testers)
docker compose exec backend flask seed
```

---

### 5. Verify the system is running

```bash
docker compose ps
```

All services should show `Up`:

| Service | Expected Status |
|---------|----------------|
| nginx | Up, port 80 bound |
| backend | Up |
| frontend | Up |
| postgres | Up (healthy) |
| redis | Up |

Open `http://localhost` in a browser. The login page should appear.

**Default admin credentials:**
- Username: `admin`
- Password: value of `ADMIN_DEFAULT_PASSWORD` in your `.env`

> Change the admin password immediately after first login.

---

## Subsequent Starts

```bash
# Start (no rebuild needed)
docker compose up

# Start in background
docker compose up -d

# Stop
docker compose down
```

---

## Applying Database Migrations

After pulling code that includes new migration files:

```bash
docker compose exec backend flask db upgrade
```

Check migration status:
```bash
docker compose exec backend flask db current
docker compose exec backend flask db history
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_USER` | Yes | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `POSTGRES_DB` | Yes | PostgreSQL database name |
| `DATABASE_URL` | Yes | Full connection string: `postgresql://user:pass@postgres:5432/dbname` |
| `SECRET_KEY` | Yes | Flask session secret (64+ chars) |
| `JWT_SECRET_KEY` | Yes | JWT signing key (64+ chars, different from SECRET_KEY) |
| `JWT_ACCESS_TOKEN_EXPIRES_HOURS` | No | Access token lifetime in hours (default: 24) |
| `FLASK_ENV` | No | `development` or `production` (default: production) |
| `ADMIN_DEFAULT_PASSWORD` | Yes | Password for the seeded admin account |
| `ANTHROPIC_API_KEY` | Phase 7 | Claude API key for AI root cause analysis |
| `ALERT_EMAIL_ENABLED` | Backlog | `true` to enable email alerts |
| `SMTP_HOST` | Backlog | SMTP server hostname |
| `SMTP_PORT` | Backlog | SMTP port (usually 587) |
| `SMTP_FROM` | Backlog | Sender address for alert emails |

---

## Services and Ports

| Service | Internal Port | External Port | Notes |
|---------|--------------|---------------|-------|
| nginx | 80 | **80** | Only service exposed to the host network |
| backend | 5000 | — | Reached via nginx `/api` proxy |
| frontend | 5173 | — | Reached via nginx `/` proxy |
| postgres | 5432 | — | Internal only |
| redis | 6379 | — | Internal only |

**Only port 80 should be open on the host firewall.**

---

## Nginx Routing

| Request | Routed to |
|---------|-----------|
| `/api/*` | Flask backend (port 5000) |
| `/socket.io/*` | Flask backend (WebSocket) |
| `/*` | React frontend (port 5173) |

Config: [nginx/nginx.conf](nginx/nginx.conf)

---

## Rebuilding After Code Changes

```bash
# Rebuild a specific service
docker compose up --build backend
docker compose up --build frontend

# Rebuild everything
docker compose up --build
```

---

## Viewing Logs

```bash
# All services
docker compose logs -f

# Single service
docker compose logs -f backend
docker compose logs -f nginx

# Application error log (written inside backend container)
docker compose exec backend cat logs/errors.log
```

---

## Opening a Shell

```bash
# Flask Python shell (with app context)
docker compose exec backend flask shell

# Raw bash in backend container
docker compose exec backend bash

# PostgreSQL prompt
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

---

## Resetting the Database

> **WARNING: This permanently deletes all data.**

```bash
docker compose down -v          # Stop all containers AND delete volumes
docker compose up --build       # Rebuild
docker compose exec backend flask db upgrade
docker compose exec backend flask seed
```

---

## Upgrading the System

```bash
# 1. Pull latest code
git pull

# 2. Rebuild images
docker compose up --build -d

# 3. Apply any new migrations
docker compose exec backend flask db upgrade
```

---

## Troubleshooting

**Backend container exits immediately:**
```bash
docker compose logs backend
```
Usually a missing `.env` variable or database connection error.

**`flask db upgrade` fails:**
- Check `DATABASE_URL` in `.env` matches the Postgres container credentials
- Check the Postgres container is healthy: `docker compose ps`

**Dashboard shows no stations:**
- Run `docker compose exec backend flask seed` — the initial station data may not be loaded

**WebSocket not connecting (status updates not live):**
- Ensure Nginx is proxying `/socket.io/` — check `nginx/nginx.conf`
- Ensure Gunicorn is using the eventlet worker (check `run.py` or `Dockerfile`)

**Port 80 already in use:**
- Another service (IIS, Apache, another Docker container) is using port 80
- Stop the conflicting service or change the external port in `docker-compose.yml`
