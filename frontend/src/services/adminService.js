import api from '../api/axios'

// ── Testers ──────────────────────────────────────────────────────────────── //

// All testers including inactive (admin view)
export const adminGetTesters = () => api.get('/admin/testers')

// Create a new tester: { name, tester_type, plant, station_number? }
export const adminCreateTester = (data) => api.post('/admin/testers', data)

// Edit a tester: { name?, tester_type?, plant?, is_active?, handler_id? }
export const adminEditTester = (id, data) => api.patch(`/testers/${id}`, data)

// Soft-delete a tester (sets is_active=false)
export const adminRemoveTester = (id) => api.delete(`/admin/testers/${id}`)

// Re-enable a deactivated tester
export const adminRestoreTester = (id) => api.patch(`/admin/testers/${id}/restore`)

// ── Handlers ─────────────────────────────────────────────────────────────── //

// All handlers including inactive (admin view)
export const adminGetHandlers = () => api.get('/admin/handlers')

// Create a new handler: { name, handler_type }
export const adminCreateHandler = (data) => api.post('/admin/handlers', data)

// Edit a handler: { name?, handler_type?, is_active? }
export const adminEditHandler = (id, data) => api.patch(`/admin/handlers/${id}`, data)

// Soft-delete a handler
export const adminRemoveHandler = (id) => api.delete(`/admin/handlers/${id}`)

// Re-enable a deactivated handler
export const adminRestoreHandler = (id) => api.patch(`/admin/handlers/${id}/restore`)
