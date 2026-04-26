/**
 * App — Root component
 *
 * Sets up:
 *   - AuthProvider (wraps everything so any component can use useAuth())
 *   - BrowserRouter (enables URL-based navigation)
 *   - Routes (maps URLs to page components)
 *
 * To add a new page:
 *   1. Create the component in src/pages/
 *   2. Add a <Route> here
 *   3. Wrap it in <ProtectedRoute> if login is required
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MaintenancePage from './pages/MaintenancePage'
import AdminPage from './pages/AdminPage'
import TesterDetailPage from './pages/TesterDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — require authentication */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Protected routes — line technician and above */}
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute>
                <MaintenancePage />
              </ProtectedRoute>
            }
          />

          {/* Protected routes — admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* Tester detail page — all authenticated users */}
          <Route
            path="/testers/:id"
            element={
              <ProtectedRoute>
                <TesterDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all: redirect to dashboard (ProtectedRoute handles login redirect) */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
