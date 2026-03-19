import { useState } from 'react'
import { getSession, deleteSession } from '../../services/troubleshootingService'
import { useAuth } from '../../context/AuthContext'

function StatusBadge({ session }) {
  if (session.is_open)
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Open</span>
  if (session.solved)
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Solved</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Not Solved</span>
}

function formatDatetime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDuration(start, end) {
  if (!end) return null
  const ms = new Date(end) - new Date(start)
  const h  = Math.floor(ms / 3600000)
  const m  = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function StepRow({ step, index }) {
  const hasFailure = step.pin_number || step.hb_observed || step.sb_observed ||
                     step.failure_description || step.measured_value ||
                     step.upper_limit || step.lower_limit

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm space-y-1">
      <p className="text-xs text-gray-400">Step {index + 1} · {formatDatetime(step.created_at)}</p>

      {hasFailure && (
        <div className="bg-red-50 border border-red-100 rounded px-2 py-1.5 text-xs space-y-0.5">
          {(step.pin_number || step.hb_observed || step.sb_observed) && (
            <p className="font-mono text-red-700">
              {[step.pin_number && `Pin ${step.pin_number}`, step.hb_observed, step.sb_observed]
                .filter(Boolean).join('  ·  ')}
            </p>
          )}
          {step.failure_description && <p className="text-red-800">{step.failure_description}</p>}
          {(step.measured_value || step.upper_limit || step.lower_limit) && (
            <p className="text-red-600 font-mono">
              {step.measured_value && `Value: ${step.measured_value}`}
              {step.upper_limit   && `  ↑ ${step.upper_limit}`}
              {step.lower_limit   && `  ↓ ${step.lower_limit}`}
            </p>
          )}
        </div>
      )}

      <p><span className="font-medium text-gray-700">Action:</span> {step.action}</p>
      <p><span className="font-medium text-gray-700">Result:</span> {step.result}</p>
      {step.plan && (
        <p><span className="font-medium text-gray-700">Plan:</span> {step.plan}</p>
      )}
    </div>
  )
}

function SessionRow({ session, showHardBin, showDescription, canDelete, onDelete }) {
  const [expanded,   setExpanded]   = useState(false)
  const [steps,      setSteps]      = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  const duration = formatDuration(session.started_at, session.resolved_at)
  const isOpen   = session.is_open

  async function toggle(e) {
    // Don't expand/collapse when clicking delete area
    if (e.target.closest('[data-delete]')) return
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

  async function handleDelete(e) {
    e.stopPropagation()
    if (!confirming) { setConfirming(true); return }
    setDeleting(true)
    try {
      await deleteSession(session.id)
      onDelete(session.id)
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  function cancelDelete(e) {
    e.stopPropagation()
    setConfirming(false)
  }

  return (
    <>
      <tr onClick={toggle} className="hover:bg-gray-50 transition cursor-pointer">
        <td className="px-4 py-3 font-mono text-gray-900 text-xs font-medium whitespace-nowrap">
          {session.tester_name ?? `#${session.tester_id}`}
        </td>
        {showHardBin && (
          <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800 whitespace-nowrap">
            {session.hard_bin}
          </td>
        )}
        {showDescription && (
          <td className="px-4 py-3 text-xs text-orange-700 font-medium max-w-xs truncate" title={session.description}>
            {session.description || <span className="text-gray-300 italic">—</span>}
          </td>
        )}
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-sm">{session.technician}</td>
        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatDatetime(session.started_at)}</td>
        <td className="px-4 py-3 whitespace-nowrap">
          <StatusBadge session={session} />
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
          {isOpen ? (
            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Open
            </span>
          ) : (
            duration ?? '—'
          )}
        </td>
        <td className="px-4 py-3 text-right whitespace-nowrap" data-delete>
          <div className="flex items-center justify-end gap-2">
            {canDelete && (
              confirming ? (
                <>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Confirm'}
                  </button>
                  <button
                    onClick={cancelDelete}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleDelete}
                  className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition"
                  title="Delete session"
                >
                  Delete
                </button>
              )
            )}
            <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={showHardBin || showDescription ? 7 : 6} className="px-4 pb-3 pt-1 bg-gray-50 border-b border-gray-100">
            {loading ? (
              <p className="text-xs text-gray-400 py-2">Loading steps…</p>
            ) : steps?.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">No steps recorded.</p>
            ) : (
              <div className="space-y-2 pt-1">
                {steps?.map((s, i) => <StepRow key={s.id} step={s} index={i} />)}
                {session.resolved_at && (
                  <p className="text-xs text-gray-500 pt-1">
                    Closed: {formatDatetime(session.resolved_at)}
                    {session.solved === false && ' — Not solved'}
                  </p>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

/**
 * TroubleshootingList
 *
 * Props:
 *   sessions        {Array}
 *   testers         {Array}
 *   filters         { tester_id, date }
 *   onFilterChange  (filters) => void
 *   onDeleted       (id) => void
 *   loading         boolean
 */
export default function TroubleshootingList({ sessions = [], testers = [], filters, onFilterChange, onDeleted, loading }) {
  const { user } = useAuth()
  const canDelete = user?.role === 'supervisor' || user?.role === 'admin'
  const [activeTab, setActiveTab] = useState('upchuck')

  const visibleSessions = sessions.filter((s) => (s.session_type ?? 'upchuck') === activeTab)
  const upchuckCount   = sessions.filter((s) => (s.session_type ?? 'upchuck') === 'upchuck').length
  const jammingCount   = sessions.filter((s) => s.session_type === 'jamming').length

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-700 mr-2">Troubleshooting History</h2>

        <select
          value={filters.tester_id}
          onChange={(e) => onFilterChange({ ...filters, tester_id: e.target.value })}
          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                     text-gray-900 transition"
        >
          <option value="">All testers</option>
          {testers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={filters.date}
          onChange={(e) => onFilterChange({ ...filters, date: e.target.value })}
          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                     text-gray-900 transition"
        />

        {(filters.tester_id || filters.date) && (
          <button
            onClick={() => onFilterChange({ tester_id: '', date: '' })}
            className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded hover:bg-gray-100 transition"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">{visibleSessions.length} records</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('upchuck')}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition border-b-2 -mb-px
            ${activeTab === 'upchuck'
              ? 'border-blue-500 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Upchuck
          <span className={`px-1.5 py-0.5 rounded-full text-xs
            ${activeTab === 'upchuck' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
            {upchuckCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('jamming')}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition border-b-2 -mb-px
            ${activeTab === 'jamming'
              ? 'border-orange-500 text-orange-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Jamming
          <span className={`px-1.5 py-0.5 rounded-full text-xs
            ${activeTab === 'jamming' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
            {jammingCount}
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex gap-4">
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="h-3 bg-gray-100 rounded w-16" />
                <div className="h-3 bg-gray-100 rounded w-28" />
              </div>
            ))}
          </div>
        ) : visibleSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <span className="text-gray-400 text-lg">○</span>
            </div>
            <p className="text-sm font-medium text-gray-700">No records</p>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === 'jamming' ? 'Jamming sessions' : 'Upchuck sessions'} will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tester</th>
                {activeTab === 'upchuck' && (
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hard Bin</th>
                )}
                {activeTab === 'jamming' && (
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                )}
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Technician</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Started</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleSessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  showHardBin={activeTab === 'upchuck'}
                  showDescription={activeTab === 'jamming'}
                  canDelete={canDelete}
                  onDelete={onDeleted}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
