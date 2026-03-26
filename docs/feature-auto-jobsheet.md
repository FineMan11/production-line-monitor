# Feature: Auto Job Sheet from Tester Log Files

## Status: Planned
## Phase: 5

---

## Problem Statement

Tester machines produce log files after each run. Operators currently transcribe this data manually into the digital job sheet (RIO daily entries). This is:
- Time-consuming (especially at end-of-shift)
- Error-prone (manual transcription mistakes)
- Delayed (operator may forget or rush the entry)

The goal is to parse tester log files automatically and pre-fill job sheet entries — with a human review step before they are committed.

---

## Proposed Solution

A technician or operator uploads a log file for a given tester via the job sheet UI. The backend parses it using a tester-type-specific parser, extracts RIO entry fields, and returns a draft for the operator to review and confirm before any data is saved.

This is **not fully automated** — the operator always reviews the parsed entries. Auto-fill is an assist, not a replacement for the person accountable for the sheet.

---

## User Stories

- **As an operator**, I want to upload a log file from my tester and have the RIO entries pre-filled so I don't have to type everything manually.
- **As a supervisor**, I want to know which job sheet entries came from auto-parsing vs manual input, so I can audit data quality.
- **As an operator**, if a parsed entry looks wrong I want to be able to correct it before it's saved.
- **As a line technician**, if a log file spans a shift boundary, I want the system to split the entries correctly across two job sheets.

---

## Open Questions

- [ ] What format are the tester log files? Separate formats per tester type (INVTG vs ETS364 vs J750)?
- [ ] Are log files accessible from the server (shared drive / NFS mount), or does the operator upload them manually?
- [ ] Which fields in the log file map to job sheet fields (time, flow, site, totals)?
- [ ] How do we identify which tester and which shift a log file belongs to? (filename convention? header in file?)
- [ ] What happens when a log file covers multiple shifts? Split by shift boundary?
- [ ] Can a log file contain data for multiple testers, or always one tester per file?
- [ ] What encoding / line endings are the files in? (Windows CRLF? ASCII?)

---

## Technical Approach

### Backend

**New endpoint:** `POST /api/jobsheets/<id>/parse-log`
- Accept `multipart/form-data` with the log file
- Call `log_parser_service.parse(file_content, tester_type)`
- Return parsed entries as a JSON draft for operator review (do NOT commit yet)

**New endpoint:** `POST /api/jobsheets/<id>/confirm-parsed-entries`
- Accept the reviewed/corrected draft
- Save each entry as a `JobSheetEntry` with `source = "auto_parsed"`

**New service:** `backend/app/services/log_parser_service.py`
- Strategy pattern: one parser class per tester type
  ```python
  class INVTGLogParser:
      def parse(self, content: str) -> list[JobSheetEntryDraft]: ...

  class ETS364LogParser:
      def parse(self, content: str) -> list[JobSheetEntryDraft]: ...

  class J750LogParser:
      def parse(self, content: str) -> list[JobSheetEntryDraft]: ...
  ```
- `parse_log_file(content, tester_type)` — dispatch to correct parser
- Return `list[dict]` with fields: `time`, `flow`, `site`, `total`, `notes`

### Frontend

**Modified:** `src/pages/JobSheetPage.jsx`
- Add "Upload Log File" button
- After upload: show parsed entries table with editable fields
- "Confirm and Save" and "Cancel" buttons

**New component:** `src/components/jobsheet/ParsedEntriesReview.jsx`
- Table of parsed entries, all fields editable
- Highlight any entry that has a missing or suspect value
- Shows which entries will be saved vs skipped

---

## Database Changes

| Table | Change | Reason |
|-------|--------|--------|
| `jobsheet_entries` | Add `source` ENUM `manual / auto_parsed` | Distinguish human vs parsed entries |
| `jobsheet_entries` | Add `raw_log_ref` (Text, nullable) | Optional reference to source log line for traceability |

---

## Acceptance Criteria

- [ ] Uploading a valid log file for a supported tester type returns a parsed entries draft within 5 seconds
- [ ] The operator can edit any field in the draft before confirming
- [ ] Confirmed entries are saved with `source = "auto_parsed"` in the database
- [ ] Uploading a log file for an unsupported tester type returns a clear error message
- [ ] Uploading a malformed file returns a clear error — no partial saves
- [ ] Entries from auto-parsing are visually distinguished from manual entries in the job sheet view
