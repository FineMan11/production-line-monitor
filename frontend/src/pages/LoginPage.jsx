import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">

      {/* Logo mark */}
      <div className="mb-8 text-center">
        <span className="text-teal-600 font-bold text-3xl select-none">⬡</span>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">Production Monitor</h1>
        <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8">

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-5">
            <span className="mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div className="flex flex-col gap-1">
            <label htmlFor="username" className="text-xs font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                         placeholder:text-gray-400 text-gray-900 transition"
              placeholder="Enter your username"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                         placeholder:text-gray-400 text-gray-900 transition"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg
                       hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

        </form>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Contact your administrator if you cannot log in.
      </p>

    </div>
  )
}
