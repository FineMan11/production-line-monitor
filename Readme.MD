# Production Line Monitor

A full-stack web application that digitises production floor tracking for a semiconductor/electronics testing facility. Replaces paper-based job sheets and manual status boards with a real-time dashboard accessible to any device on the local network.

> Built to solve a real operational problem — operators no longer walk to a whiteboard to check station status or fill in paper forms by hand.

---

## Problem

On a typical testing production floor:

- **52 tester stations** run across multiple zones, each with its own handler and status
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
| Backend | Python 3, Flask |
| Database | SQLite (Flask-SQLAlchemy) |
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Auth | Flask-Login, Werkzeug password hashing |
| Hosting | Windows PC or Raspberry Pi on LAN |

No external frameworks on the frontend — the app is lightweight enough to run on a Raspberry Pi and load instantly on factory floor terminals.

---

## Key Features

### Real-Time Dashboard

- 52 station cards in a responsive grid, each showing tester ID, handler ID, current status, and a **live running timer**
- Colour-coded statuses: Production Running (green), Tester Down (red), Maintenance Use (orange), Engineering Use (blue), Handler Down (yellow), Idle (grey)
- Summary bar with total online/offline counts and per-status breakdown
- Auto-refresh every 60 seconds
- Stations grouped by location/zone (Line A, Room 1, etc.)

### Digital Job Sheet (Replacing Paper Form K-MF0105)

- Auto-created per tester per shift (Morning 0700–1900, Night 1900–0700)
- **Table 1 — RIO Daily Job Sheet:** Time, Flow, Site, Total, Untested, Total Good, Total Tested, Submitted By
- **Table 2 — Total Unproductive Time:** From/To times with auto-calculated duration (handles overnight shifts correctly), downtime details, action taken, responsible technician
- Auto-summing totals row
- Print-ready view matching the original K-MF0105 layout

### 3-Hour Reminder System

- Green banner → recently updated, countdown to next due
- Yellow banner → update due within 30 minutes
- Red banner → overdue (3+ hours since last entry)
- Station card flashes red on the dashboard when its job sheet is overdue

### Admin Panel (Login Protected)

- Manage stations, handlers, locations, statuses, and users
- Column sorting and live search/filter on station tables
- All operations via modals — no page reloads
- Role-based access: operators update status without login, admins manage configuration

### Equipment Management

- Tester types: INVTG, ETS364, J750, IFLEX, MFLEX
- Handler types: JHT, MT, CAS (39 JHT handlers loaded)
- Handlers can be reassigned between stations
- Offline equipment appears in a separate section at the bottom

---

## Architecture

```
production-monitor/
├── app.py                  # Flask routes and application logic
├── models.py               # SQLAlchemy database models
├── requirements.txt        # Python dependencies
├── setup.bat               # Windows first-time setup script
├── instance/
│   └── production.db       # SQLite database (auto-created)
├── static/
│   ├── css/style.css       # Stylesheet
│   └── js/main.js          # Live timers, modals, auto-refresh
└── templates/
    ├── base.html            # Base layout with navbar
    ├── dashboard.html       # Main production line overview
    ├── station.html         # Station detail + status history
    ├── jobsheet.html        # Job sheet entry page
    ├── jobsheet_print.html  # Print-ready K-MF0105 format
    ├── jobsheet_history.html
    ├── login.html
    ├── partials/
    │   └── station_card.html
    └── admin/
        ├── index.html
        ├── stations.html
        ├── handlers.html
        ├── locations.html
        ├── statuses.html
        └── users.html
```

### Database Schema

9 tables: `User`, `Location`, `Status`, `Tester`, `Handler`, `StatusHistory`, `JobSheet`, `RioDailyEntry`, `UnproductiveEntry`

Data is append-only by design — job sheets are closed/completed, never deleted. Status history preserves a full audit trail of every change: who, when, from/to status, duration, and notes.

---

## How to Run

```bash
# Clone the repo
git clone https://github.com/FineMan11/production-line-monitor.git
cd production-line-monitor

# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py

# Access locally
http://localhost:5000

# Access from other devices on the same network
http://<host-pc-ip>:5000
```

Default admin login: `admin` / `admin123`

---

## Roadmap

| Phase | Description | Status |
|-------|------------|--------|
| Phase 1 | Production line dashboard with live status tracking | ✅ Complete |
| Phase 2 | Digital job sheet (K-MF0105 replacement) | ✅ Complete |
| Phase 3 | JHT handler real-time monitoring via network | 🔜 Planned |
| Phase 4 | Auto job sheet data entry from tester log files | 🔜 Planned |
| Phase 5 | Knowledge base / troubleshooting system for technicians | 🔜 Planned |
| — | Downtime analysis and productivity reporting | 🔜 Planned |
| — | UI redesign for factory floor square monitors | 🔜 Planned |

---

## Built With

Python · Flask · SQLite · SQLAlchemy · HTML · CSS · JavaScript
