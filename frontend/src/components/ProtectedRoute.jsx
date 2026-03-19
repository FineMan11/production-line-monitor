/**
 * ProtectedRoute — wraps any page that requires authentication.
 *
 * If the user is not logged in, they are redirected to /login.
 * If a requiredRole is specified, users without that role are redirected to /dashboard.
 *
 * Usage in App.jsx:
 *   <Route path="/dashboard" element={
 *     <ProtectedRoute><DashboardPage /></ProtectedRoute>
 *   } />
 *
 *   <Route path="/admin" element={
 *     <ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>
 *   } />
 */
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth()

  // Not logged in → go to login page
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Logged in but wrong role → go to dashboard (graceful degradation)
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
