import api from '../api/axios'

export const startSession   = (data)      => api.post('/troubleshooting/', data)
export const addStep        = (id, data)  => api.post(`/troubleshooting/${id}/steps`, data)
export const closeSession   = (id, data)  => api.patch(`/troubleshooting/${id}/close`, data)
export const getSessions    = (params)    => api.get('/troubleshooting/', { params })
export const getSession     = (id)        => api.get(`/troubleshooting/${id}`)
export const deleteSession  = (id)        => api.delete(`/troubleshooting/${id}`)
export const updateStep     = (id, data)  => api.patch(`/troubleshooting/steps/${id}`, data)
