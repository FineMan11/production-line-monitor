import api from '../api/axios'

// Section keys: "plant1", "plant3_bay1", "plant3_bay2", "plant3_bay3"
// Layout: ordered array of tester IDs (int) and nulls for empty slots

export const getLayout  = (key)         => api.get(`/layout/${key}`)
export const saveLayout = (key, layout) => api.put(`/layout/${key}`, { layout })
