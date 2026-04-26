import { useState, useEffect, useCallback } from 'react'
import { getSessions, getSession } from '../../services/troubleshootingService'

const PERIODS = [
  { key: 'all',   label: 'All' },
  { key: 'hour',  label: 'Hour' },
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'shift', label: 'Shift' },
]

function getPeriodRange(period) {
  const now = new Date()
  const iso = (d) => d.toISOString()

  if (period === 'all')   return { since: null, until: null }
  if (period === 'hour')  return { since: iso(new Date(now - 3600000)), until: null }

  if (period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    const end   = new Date(start); end.setDate(end.getDate() + 1)
    return { since: iso(start), until: iso(end) }
  }

  if (period === 'week')  return { since: iso(new Date(now - 7 * 86400000)), until: null }
  if (period === 'month') return { since: iso(new Date(now - 30 * 86400000)), until: null }

  if (period === 'shift') {
    const h = now.getHours()
    const todayAt = (hh) => { const d = new Date(now); d.setHours(hh, 0, 0, 0); return d }
    if (h >= 7 && h < 19) {
      return { since: iso(todayAt(7)), until: iso(todayAt(19)) }
    } else if (h >= 19) {
      const end = new Date(now); end.setDate(end.getDate() + 1); end.setHours(7, 0, 0, 0)
      return { since: iso(todayAt(19)), until: iso(end) }
    } else {
      const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(19, 0, 0, 0)
      return { since: iso(start), until: iso(todayAt(7)) }
    }
  }

  return { since: null, until: null }
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function duration(start, end) {
  if (!end) return null
  const mins = Math.round((new Date(end) - new Date(start)) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function SolvedBadge({ solved, isOpen }) {
  if (isOpen)  return <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">Open</span>
  if (solved)  return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">Solved</span>
  return              <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">Not Solved</span>
}

function StepRow({ step, index }) {
  const tags = step.action_tags
    ? step.action_tags.split(',').map((t) => t.trim()).filter(Boolean)
    : []
  const hasPC = step.pin_number || step.hb_observed || step.sb_observed || step.failure_description

  return (
    <div className="border-l-2 border-gray-200 pl-4 py-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-mono text-gray-400">Step {index + 1}</span>
        <span className="text-xs text-gray-400">{formatDate(step.created_at)}</span>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {tags.map((t) => (
            <span key={t} className="px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium border border-teal-200">
              {t}
            </span>
          ))}
        </div>
      )}

      {step.action && (
        <p className="text-xs text-gray-700 mb-1">
          <span className="font-medium text-gray-500">Action:</span> {step.action}
        </p>
      )}
      <p className="text-xs text-gray-700 mb-1">
        <span className="font-medium text-gray-500">Result:</span> {step.result}
      </p>
      {step.plan && (
        <p className="text-xs text-gray-600 italic">Next: {step.plan}</p>
      )}

      {hasPC && (
        <div className="mt-1.5 p-2 bg-red-50 rounded text-xs text-red-800 space-y-0.5">
          {step.pin_number        && <p>Pin: <span className="font-mono">{step.pin_number}</span></p>}
          {step.hb_observed       && <p>HB observed: <span className="font-mono">{step.hb_observed}</span></p>}
          {step.sb_observed       && <p>SB observed: <span className="font-mono">{step.sb_observed}</span></p>}
          {step.failure_description && <p>{step.failure_description}</p>}
          {(step.measured_value || step.upper_limit || step.lower_limit) && (
            <p>
              Measured: <span className="font-mono">{step.measured_value ?? '—'}</span>
              {' '}[{step.lower_limit ?? '—'} – {step.upper_limit ?? '—'}]
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function SessionCard({ session }) {
  const [expanded, setExpanded] = useState(false)
  const [steps,    setSteps]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  const dur = duration(session.started_at, session.resolved_at)
  const isUpchuck = session.session_type === 'upchuck'

  async function handleExpand() {
    if (!expanded && steps === null) {
      setLoading(true)
      try {
        const res = await getSession(session.id)
        setSteps(res.data.steps ?? [])
      } catch {
        setSteps([])
      } finally {
        setLoading(false)
      }
    }
    setExpanded((v) => !v)
  }

  // Collect unique action tags across loaded steps for the collapsed summary
  const allTags = steps
    ? [...new Set(
        steps.flatMap(s =>
          s.action_tags ? s.action_tags.split(',').map(t => t.trim()).filter(Boolean) : []
        )
      )]
    : []

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full text-left p-4 hover:bg-gray-50 transition"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide
            ${isUpchuck ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
            {session.session_type}
          </span>

          {session.hard_bin && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-red-50 text-red-600 border border-red-200">
              {session.hard_bin}
            </span>
          )}

          <SolvedBadge solved={session.solved} isOpen={session.is_open} />
          <span className="text-xs text-gray-500">{formatDate(session.started_at)}</span>
          {dur && <span className="text-xs text-gray-400">· {dur}</span>}
          <span className="ml-auto text-xs text-gray-400 font-medium">{session.technician}</span>
          <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>

        {session.description && (
          <p className="text-xs text-gray-500 mt-1 text-left">{session.description}</p>
        )}

        {/* Action tag summary — shown after steps are loaded */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {allTags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs border border-teal-200">
                {tag}
              </span>
            ))}
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50">
          {loading ? (
            <p className="text-xs text-gray-400 italic">Loading steps…</p>
          ) : steps?.length > 0 ? (
            steps.map((step, i) => <StepRow key={step.id} step={step} index={i} />)
          ) : (
            <p className="text-xs text-gray-400 italic">No steps recorded.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function SessionTimeline({ testerId }) {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [period,   setPeriod]   = useState('all')

  const fetch = useCallback((p) => {
    setLoading(true)
    setError(null)
    const { since, until } = getPeriodRange(p)
    const params = { tester_id: testerId }
    if (since) params.since = since
    if (until) params.until = until
    getSessions(params)
      .then((res) => setSessions(res.data))
      .catch(() => setError('Failed to load sessions.'))
      .finally(() => setLoading(false))
  }, [testerId])

  useEffect(() => { fetch(period) }, [period, fetch])

  return (
    <div className="mt-6">
      {/* Header + period selector */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-700 whitespace-nowrap">Session History</h2>
        <div className="flex items-center gap-1 flex-wrap">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                period === key
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {!loading && (
          <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          Loading…
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          No troubleshooting sessions for this period.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => <SessionCard key={s.id} session={s} />)}
        </div>
      )}
    </div>
  )
}
