/**
 * Configured Axios instance with JWT interceptors.
 *
 * All API calls in the app should import and use this `api` object
 * instead of plain axios. This ensures:
 *   1. The JWT token is automatically attached to every request
 *   2. If the server returns 401 (token expired/invalid), the user
 *      is automatically redirected to the login page
 */
import axios from 'axios'

const api = axios.create({
  // All requests go to /api/... — Nginx proxies this to the Flask backend
  baseURL: '/api',
})

// --- REQUEST interceptor ---
// Runs before every request is sent
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// --- RESPONSE interceptor ---
// Runs after every response is received
api.interceptors.response.use(
  // Success (2xx): pass through unchanged
  (response) => response,

  // Error: check if it's a 401 (unauthorized)
  (error) => {
    if (error.response?.status === 401) {
      // Token is expired or invalid — clear storage and go to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
