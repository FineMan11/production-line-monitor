import api from '../api/axios'

// Fetch all active testers ordered by plant + station_number.
// Each tester includes an embedded handler object (or null if undocked).
export const getTesters = () => api.get('/dashboard/testers')

// Fetch all active handlers (including undocked ones shown in Offline Area).
export const getHandlers = () => api.get('/dashboard/handlers')

// Fetch the four valid status options (used by Change Status dropdown).
export const getStatuses = () => api.get('/dashboard/statuses')

// Change the status of a specific tester station.
// data: { status: "Maintenance", note: "optional context string" }
export const updateTesterStatus = (testerId, data) =>
  api.patch(`/testers/${testerId}/status`, data)

// Get status change history for a tester (for the View History modal).
export const getTesterHistory = (testerId, limit = 50) =>
  api.get(`/testers/${testerId}/history`, { params: { limit } })

// Get the currently open maintenance log for a tester, or null.
// Used by TesterCard to decide whether to show "Start" or "Close" maintenance.
export const getOpenMaintenanceLog = (testerId) =>
  api.get(`/maintenance/${testerId}/open`)

// Edit station details (admin only).
// data: { name, tester_type, plant, station_number, is_active, handler_id }
export const updateTester = (testerId, data) =>
  api.patch(`/testers/${testerId}`, data)

// Update the current device under test for a station (any logged-in user).
// data: { customer, part_number, lot_number }  — all optional, null clears
export const updateTesterDevice = (testerId, data) =>
  api.patch(`/testers/${testerId}/device`, data)
