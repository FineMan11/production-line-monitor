import api from '../api/axios'

// Fetch maintenance logs with optional filters.
// params: { tester_id, date, open_only }
export const getMaintenanceLogs = (params) => api.get('/maintenance/', { params })

// Create a new maintenance log entry.
// data: { tester_id, technician, start_time, fault_code, fault_description,
//         parts_replaced, issue_type, notes }
export const createMaintenanceLog = (data) => api.post('/maintenance/', data)

// Close an open maintenance log (records end_time = now on the backend).
export const closeMaintenanceLog = (id) => api.patch(`/maintenance/${id}/close`)

// Convenience: fetch only open logs, optionally filtered by tester.
export const getOpenMaintenanceLogs = (testerId) =>
  api.get('/maintenance/', { params: { tester_id: testerId, open_only: true } })

// Permanently delete a maintenance log (supervisor/admin only).
export const deleteMaintenanceLog = (id) => api.delete(`/maintenance/${id}`)
