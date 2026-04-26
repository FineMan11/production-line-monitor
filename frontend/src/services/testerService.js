import api from '../api/axios'

export const getTester = (id) =>
  api.get(`/testers/${id}`)

export const getTesterAnalytics = (id) =>
  api.get(`/testers/${id}/analytics`)

export const getTesterHistory = (id, limit = 50) =>
  api.get(`/testers/${id}/history`, { params: { limit } })
