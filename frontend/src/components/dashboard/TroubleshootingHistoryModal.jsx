/**
 * TroubleshootingHistoryModal
 *
 * Shows all troubleshooting sessions for a station, newest first.
 * Each row is expandable to show individual steps with inline edit support.
 *
 * Props:
 *   tester   { id, name }
 *   onClose  () => void
 */
import { useState, useEffect } from 'react'
import { getSessions, getSession } from '../../services/troubleshootingService'
import StepItem from './StepItem'

function StatusBadge({ session }) {
  if (session.is_open)
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Open</span>
  if (session.solved)
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Solved</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Not Solved</span>
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

function SessionRow({ session }) {
  const [expanded, setExpanded] = useState(false)
  const [steps,    setSteps]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function toggleExpand() {
    if (!expanded && steps === null) {
      setLoading(true)
      try {
        const res = await getSession(session.id)
        setSteps(res.data.steps || [])
      } catch {
        setSteps([])
      } finally {
        setLoading(false)
      }
    }
    setExpanded((v) => !v)
  }

  function handleStepUpdated(updated) {
    setSteps(prev => prev.map(st => st.id === updated.id ? updated : st))
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={toggleExpand}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          {session.session_type === 'jamming' ? (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Jamming</span>
          ) : (
            <span className="font-mono text-sm font-semibold text-gray-800">{session.hard_bin}</span>
          )}
          <StatusBadge session={session} />
          {session.description && (
            <span className="text-xs text-orange-700 font-medium truncate">· {session.description}</span>
          )}
          {!session.description && (
            <span className="text-xs text-gray-500 truncate">· {session.technician}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400">{formatDateTime(session.started_at)}</span>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50">
          {loading ? (
            <p className="text-xs text-gray-400 py-2">Loading steps…</p>
          ) : steps?.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">No steps recorded.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {steps?.map((s, i) => (
                <StepItem
                  key={s.id}
                  step={s}
                  index={i}
                  sessionType={session.session_type}
                  formatTime={formatDateTime}
                  onUpdated={handleStepUpdated}
                />
              ))}
              {session.resolved_at && (
                <p className="text-xs text-gray-500 pt-1">
                  Closed: {formatDateTime(session.resolved_at)}
                  {session.solved === false && ' — Not solved'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TroubleshootingHistoryModal({ tester, onClose }) {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    getSessions({ tester_id: tester.id })
      .then((res) => setSessions(res.data))
      .catch(() => setError('Failed to load history.'))
      .finally(() => setLoading(false))
  }, [tester.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">
            Troubleshooting History — {tester.name}
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No troubleshooting sessions on record.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => <SessionRow key={s.id} session={s} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
