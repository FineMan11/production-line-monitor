# Feature: Technician Knowledge Base

## Status: Planned
## Phase: 6

---

## Problem Statement

When a recurring fault appears — same hard bin on the same tester type — technicians currently have no easy way to find what worked before. They may scroll through troubleshooting history manually, ask a colleague, or start from scratch. This leads to:
- Repeated troubleshooting of the same root cause
- Knowledge that lives only in individual technicians' heads
- Longer resolution times for known problems

---

## Proposed Solution

A searchable knowledge base built directly from solved troubleshooting sessions. Supervisors can "publish" a closed, solved session as a reusable solution. Technicians can search by tester type, hard bin, session type, or keywords. When a new troubleshooting session is opened, relevant past solutions are surfaced automatically inside the modal.

---

## User Stories

- **As a line technician**, when I open a new troubleshooting session, I want to see 2–3 similar past solutions so I can try the proven fix first.
- **As a supervisor**, I want to mark a solved session as a published solution so other technicians can find it.
- **As a line technician**, I want to search the knowledge base by tester type and hard bin to find what worked for a specific failure.
- **As a supervisor**, I want to tag solutions (e.g. "socket", "alignment", "handler-jam") so they are easier to categorise and find.
- **As an admin**, I want to edit or retract a published solution if the fix turns out to be wrong.

---

## Open Questions

- [ ] Who can publish a solution? Supervisor only, or also experienced line_technicians?
- [ ] Should unpublished sessions still be visible in the knowledge base as "unverified"?
- [ ] What happens if a solution becomes outdated (e.g. the tester was reconfigured)? Expiry / archive?
- [ ] Should "similar past cases" inside TroubleshootingModal pull from all sessions or only published ones?
- [ ] Is full-text search needed, or will filter-based search (type + bin + tags) be sufficient?
- [ ] Should solutions be versioned (track edits)?

---

## Technical Approach

### Backend

**New model:** `KnowledgeEntry` in `backend/app/models/knowledge.py`
```
id               Integer PK
session_id       FK → troubleshooting_sessions (nullable — allow standalone entries in future)
title            String(200)
tags             JSON (list of strings)
published_by     FK → users
published_at     DateTime
archived         Boolean (default False)
```

**New service:** `backend/app/services/knowledge_service.py`
- `publish_solution(session_id, title, tags, user_id)` — create KnowledgeEntry from session
- `search_solutions(tester_type, hard_bin, session_type, keyword)` — filtered query
- `get_similar(session)` — for "similar past cases": match on tester_type + hard_bin (or session_type for jamming)
- `archive_solution(id, user_id)` — mark as archived, not deleted

**New endpoint group:** `/api/knowledge/`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/knowledge/` | GET | jwt_required | List/search solutions |
| `/api/knowledge/<id>` | GET | jwt_required | Single solution detail |
| `/api/knowledge/` | POST | supervisor+ | Publish a session as solution |
| `/api/knowledge/<id>` | PATCH | supervisor+ | Update title/tags |
| `/api/knowledge/<id>/archive` | PATCH | admin | Archive a solution |

**Modified:** `GET /api/troubleshooting/<id>` — include `similar_solutions: [...]` in response (top 3 matches from knowledge base)

### Frontend

**New page:** `src/pages/KnowledgeBasePage.jsx`
- Filter bar: Tester Type, Session Type, Hard Bin, Tags, keyword search
- Results grid: KnowledgeCard components
- "Publish Solution" button (supervisor only) → opens KnowledgePublishModal

**New components:** `src/components/knowledge/`
- `KnowledgeCard.jsx` — title, tags, tester type, hard bin, date, steps summary, link to full session
- `KnowledgeFilters.jsx` — filter bar component
- `KnowledgePublishModal.jsx` — form: select session, add title, add tags

**Modified:** `TroubleshootingModal.jsx`
- "Similar past cases" panel in the session view (Phase B)
- Show 2–3 KnowledgeCard instances, collapsed by default
- Pulled from `similar_solutions` included in the session API response

**New service:** `src/services/knowledgeService.js`
- `getSolutions(params)` — GET /api/knowledge/ with filters
- `getSolution(id)` — GET /api/knowledge/<id>
- `publishSolution(body)` — POST /api/knowledge/
- `updateSolution(id, body)` — PATCH /api/knowledge/<id>

**Modified:** `Navbar.jsx` — add "Knowledge Base" link for line_technician+

---

## Database Changes

| Table | Change | Reason |
|-------|--------|--------|
| `knowledge_entries` | New table | Store published solutions |

---

## Acceptance Criteria

- [ ] A supervisor can publish any closed, solved troubleshooting session as a knowledge entry with a title and tags
- [ ] Any line_technician can search the knowledge base and find relevant solutions
- [ ] When opening a new troubleshooting session on a tester, 2–3 similar knowledge entries are shown
- [ ] Archived solutions no longer appear in search results or similar-cases panels
- [ ] The knowledge base page loads within 2 seconds with up to 200 entries
- [ ] Tags are consistent — a predefined tag list is shown in the publish form (with ability to add custom)
