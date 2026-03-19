import { useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_BADGE = {
  admin:           'bg-red-100 text-red-700',
  supervisor:      'bg-amber-100 text-amber-700',
  line_technician: 'bg-teal-100 text-teal-700',
  operator:        'bg-gray-100 text-gray-700',
}

/**
 * Shared top navigation bar.
 * Props:
 *   title {string} — page title shown after the logo separator
 */
export default function Navbar({ title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const badgeClass = ROLE_BADGE[user?.role] ?? 'bg-gray-100 text-gray-700'

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div className="px-6 h-14 flex items-center justify-between max-w-screen-xl mx-auto">

        {/* Left: logo + nav links */}
        <div className="flex items-center gap-4">
          <span className="text-teal-600 font-bold text-base select-none">⬡ Monitor</span>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm px-3 py-1.5 rounded-md transition font-medium ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/maintenance"
              className={({ isActive }) =>
                `text-sm px-3 py-1.5 rounded-md transition font-medium ${
                  isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              Maintenance
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `text-sm px-3 py-1.5 rounded-md transition font-medium ${
                    isActive ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                Admin
              </NavLink>
            )}
          </nav>
        </div>

        {/* Right: user info */}
        {user && (
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
              {user.username}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-800 transition px-2 py-1 rounded hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        )}

      </div>
    </nav>
  )
}
