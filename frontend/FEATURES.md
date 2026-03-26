# Frontend — Feature Status & Planning

This file tracks what is built, what is in progress, and what is planned for the frontend layer.
For design system rules (colours, spacing, component patterns), see [DESIGN.md](DESIGN.md).
For full business requirements, see [ECOSYSTEM_SPECIFICATION.md](../ECOSYSTEM_SPECIFICATION.md).

---

## Currently Implemented

### Pages (`src/pages/`)
| Page | Route | Access | Status |
|------|-------|--------|--------|
| `LoginPage.jsx` | `/login` | Public | ✅ Complete |
| `DashboardPage.jsx` | `/` | All roles | ✅ Complete |
| `MaintenancePage.jsx` | `/maintenance` | line_technician+ | ✅ Complete |
| `AdminPage.jsx` | `/admin` | admin only | ✅ Complete |

### Components — Dashboard (`src/components/dashboard/`)
| Component | Purpose | Status |
|-----------|---------|--------|
| `TesterCard.jsx` | Single station card (status colour, timer, handler) | ✅ Complete |
| `StationActionModal.jsx` | Change station status | ✅ Complete |
| `StationEditModal.jsx` | Edit tester metadata (device, handler) | ✅ Complete |
| `StationHistoryModal.jsx` | View status change history for a tester | ✅ Complete |
| `TroubleshootingHistoryModal.jsx` | View past troubleshooting sessions for a tester | ✅ Complete |
| `statusColors.js` | Status → Tailwind class mapping | ✅ Complete |

### Components — Maintenance (`src/components/maintenance/`)
| Component | Purpose | Status |
|-----------|---------|--------|
| `MaintenanceForm.jsx` | Create / close a maintenance log | ✅ Complete |
| `MaintenanceList.jsx` | List view of maintenance logs | ✅ Complete |
| `TroubleshootingList.jsx` | History list of troubleshooting sessions | ✅ Complete |

### Shared Components (`src/components/`)
| Component | Purpose | Status |
|-----------|---------|--------|
| `Navbar.jsx` | Top navigation with role-aware links | ✅ Complete |
| `ProtectedRoute.jsx` | Redirect to login if unauthenticated or insufficient role | ✅ Complete |

### Services (`src/services/`)
| File | Purpose | Status |
|------|---------|--------|
| `authService.js` | login(), logout(), getMe() | ✅ Complete |
| `dashboardService.js` | getTesters(), getHandlers() | ✅ Complete |
| `maintenanceService.js` | getLogs(), createLog(), closeLog() | ✅ Complete |
| `adminService.js` | getUsers(), createUser(), updateUser(), getAuditLogs() | ✅ Complete |

### Infrastructure
| File | Purpose | Status |
|------|---------|--------|
| `api/axios.js` | Axios instance with JWT interceptor + 401 redirect | ✅ Complete |
| `context/AuthContext.jsx` | login(), logout(), user state | ✅ Complete |
| `App.jsx` | Router + AuthProvider + route definitions | ✅ Complete |

---

## In Progress (Phase 3)

### Troubleshooting Components (`src/components/dashboard/`)
| Component | Purpose | Status |
|-----------|---------|--------|
| `TroubleshootingModal.jsx` | Full session lifecycle UI (start → steps → close) | 🔄 Modified |
| `StepItem.jsx` | Single step display + inline editor | 🔄 Modified |

### Troubleshooting Services (`src/services/`)
| File | Purpose | Status |
|------|---------|--------|
| `troubleshootingService.js` | startSession, addStep, closeSession, getSession, updateStep, deleteSession, getSessions | 🔄 Modified |
| `troubleshootingConstants.js` | ACTION_GROUPS (preset action tags), SITE_COUNTS | 🔄 New file |

---

## Planned — Phase 6: Knowledge Base

### New Page
| Page | Route | Access |
|------|-------|--------|
| `KnowledgeBasePage.jsx` | `/knowledge` | line_technician+ |

### New Components (`src/components/knowledge/`)
| Component | Purpose |
|-----------|---------|
| `KnowledgeCard.jsx` | Display a single solution (title, tags, steps summary) |
| `KnowledgeFilters.jsx` | Filter bar: tester type, hard bin, session type, keyword search |
| `KnowledgePublishModal.jsx` | Supervisor form to publish a closed session as a solution |

### New Service
| File | Methods |
|------|---------|
| `src/services/knowledgeService.js` | getSolutions(params), getSolution(id), publishSolution(sessionId, body), updateSolution(id, body) |

### UX Detail
- "Similar past cases" panel inside `TroubleshootingModal` — shows 2–3 matching knowledge cards
- "Publish as Solution" button on closed session cards (supervisor only)

**See:** [../docs/feature-knowledge-base.md](../docs/feature-knowledge-base.md)

---

## Planned — Phase 7: AI Root Cause Analysis

### New Page
| Page | Route | Access |
|------|-------|--------|
| `AnalysisPage.jsx` | `/analysis` | supervisor+ |

### New Service
| File | Methods |
|------|---------|
| `src/services/analysisService.js` | getAnalysisSessions(params), analyseSession(id) |

### Modified Files
| File | Change |
|------|--------|
| `App.jsx` | Add `/analysis` route (ProtectedRoute requiredRole="supervisor") |
| `Navbar.jsx` | Add "Analysis" link for supervisor + admin |
| `MaintenancePage.jsx` | Add "Analysis →" button above TroubleshootingList |

**See:** [../ANALYSIS.md](../ANALYSIS.md) for full implementation plan including layout mockup

---

## Planned — Analytics Dashboard

### New Page
| Page | Route | Access |
|------|-------|--------|
| `AnalyticsPage.jsx` | `/analytics` | supervisor+ |

### New Components (`src/components/analytics/`)
| Component | Purpose |
|-----------|---------|
| `DowntimeChart.jsx` | Bar chart: downtime hours per tester |
| `ErrorFrequencyChart.jsx` | Bar chart: troubleshooting sessions per tester |
| `ResolutionRateChart.jsx` | Pie/donut: solved vs unsolved sessions |
| `TopActionsTable.jsx` | Table: most common action tags used |
| `AnalyticsFilters.jsx` | Date range + tester type filter bar |

**Library:** Recharts (already in tech stack plan)

**See:** [../docs/feature-analytics.md](../docs/feature-analytics.md)

---

## Planned — Job Sheets (Full UI)

### New Page
| Page | Route | Access |
|------|-------|--------|
| `JobSheetPage.jsx` | `/jobsheets` | All roles (scoped by tester for operators) |

### New Components (`src/components/jobsheet/`)
| Component | Purpose |
|-----------|---------|
| `JobSheetTable.jsx` | Display RIO daily entries in a table |
| `JobSheetEntryForm.jsx` | Add a new RIO entry |
| `UnproductiveTimeLog.jsx` | List + add unproductive time entries |
| `JobSheetHeader.jsx` | Display tester, shift, date, operator info |

### New Service
| File | Methods |
|------|---------|
| `src/services/jobsheetService.js` | getJobSheet(id), getActiveJobSheet(testerId), addEntry(sheetId, body), closeJobSheet(id) |

**See:** [../docs/feature-job-sheets.md](../docs/feature-job-sheets.md)

---

## Planned — Export (Excel / PDF)

### New Component
| Component | Purpose |
|-----------|---------|
| `ExportButton.jsx` | Generic export trigger (used on job sheet, maintenance, analysis pages) |

### New Service
| File | Methods |
|------|---------|
| `src/services/exportService.js` | exportJobSheet(id, format), exportMaintenanceLogs(params, format), exportAnalysis(params, format) |

**Approach:** Backend generates the file, frontend triggers a file download via blob response.

**See:** [../docs/feature-export.md](../docs/feature-export.md)

---

## Planned — Alerts Configuration UI

### New Component (in AdminPage)
| Component | Purpose |
|-----------|---------|
| `AlertSettingsForm.jsx` | Configure alert recipients, enable/disable email/SMS |

**See:** [../docs/feature-alerts.md](../docs/feature-alerts.md)

---

## UX Conventions (apply to all new work)

- **Tailwind CSS only** — no custom CSS files or inline styles
- **No polling** — use Socket.IO events for anything that needs to be live
- **Service layer** — API calls go in `src/services/`, never directly in components
- **Role gating** — use `useAuth()` hook + `ProtectedRoute` — never read localStorage directly
- **Error states** — every async action needs a loading state and an error state shown to the user
- **Modals** — use a consistent pattern: header, scrollable body, sticky footer with action buttons
- **Empty states** — every list or table needs a meaningful empty state message, not just a blank area
