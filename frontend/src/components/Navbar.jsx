import { useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_BADGE = {
  admin:           'bg-red-100 text-red-700',
  supervisor:      'bg-amber-100 text-amber-700',
  line_technician: 'bg-teal-100 text-teal-700',
  operator:        'bg-gray-100 text-gray-700',
}

function desktopLinkClass({ isActive }) {
  return `text-sm px-3 py-1.5 rounded-md transition font-medium ${
    isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
  }`
}

function mobileLinkClass({ isActive }) {
  return `block px-3 py-2.5 rounded-md text-sm font-medium transition ${
    isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
  }`
}

/**
 * Shared top navigation bar.
 * Props:
 *   title {string} — page title shown after the logo separator
 */
export default function Navbar({ title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const close = () => setMenuOpen(false)
  const badgeClass = ROLE_BADGE[user?.role] ?? 'bg-gray-100 text-gray-700'

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">

      {/* ── Main bar ── */}
      <div className="px-4 h-14 flex items-center justify-between max-w-screen-xl mx-auto">

        {/* Logo — always visible */}
        <span className="text-teal-600 font-bold text-base select-none">⬡ Monitor</span>

        {/* Desktop: nav links (centre) */}
        <nav className="hidden sm:flex items-center gap-1">
          <NavLink to="/dashboard"   className={desktopLinkClass}>Dashboard</NavLink>
          <NavLink to="/maintenance" className={desktopLinkClass}>Maintenance</NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin"
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

        {/* Desktop: user info (right) */}
        {user && (
          <div className="hidden sm:flex items-center gap-3">
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

        {/* Mobile: hamburger button */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="sm:hidden p-2 rounded-md text-gray-500 active:bg-gray-100 transition"
          aria-label="Toggle menu"
        >
          <span className="text-xl leading-none">{menuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* ── Mobile dropdown panel ── */}
      {menuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 shadow-md">
          <NavLink to="/dashboard"   onClick={close} className={mobileLinkClass}>Dashboard</NavLink>
          <NavLink to="/maintenance" onClick={close} className={mobileLinkClass}>Maintenance</NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" onClick={close}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-md text-sm font-medium transition ${
                  isActive ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              Admin
            </NavLink>
          )}
          {user && (
            <div className="border-t border-gray-100 pt-3 mt-2 flex items-center justify-between">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                {user.username}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 px-3 py-1.5 rounded hover:bg-gray-100 transition"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}

    </nav>
  )
}
