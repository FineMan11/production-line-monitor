import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getSessions } from '../../services/troubleshootingService'

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
  if (period === 'week')  return { since: iso(new Date(now - 7 * 86400000)), until: null }
  if (period === 'month') return { since: iso(new Date(now - 30 * 86400000)), until: null }
  if (period === 'today') {
    const s = new Date(now); s.setHours(0, 0, 0, 0)
    const e = new Date(s);   e.setDate(e.getDate() + 1)
    return { since: iso(s), until: iso(e) }
  }
  if (period === 'shift') {
    const h = now.getHours()
    const at = (hh) => { const d = new Date(now); d.setHours(hh, 0, 0, 0); return d }
    if (h >= 7 && h < 19) return { since: iso(at(7)), until: iso(at(19)) }
    if (h >= 19) { const e = new Date(now); e.setDate(e.getDate()+1); e.setHours(7,0,0,0); return { since: iso(at(19)), until: iso(e) } }
    const s = new Date(now); s.setDate(s.getDate()-1); s.setHours(19,0,0,0)
    return { since: iso(s), until: iso(at(7)) }
  }
  return { since: null, until: null }
}

// Aggregate raw sessions into chart buckets based on period
function aggregate(sessions, period) {
  const buckets = {}

  for (const s of sessions) {
    const d = new Date(s.started_at)
    let key, label

    if (period === 'hour' || period === 'today' || period === 'shift') {
      // group by hour
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      key   = `${d.getFullYear()}-${mm}-${dd}-${hh}`
      label = `${hh}:00`
    } else {
      // group by day (week / month)
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      key   = `${d.getFullYear()}-${mm}-${dd}`
      label = `${dd}/${mm}`
    }

    if (!buckets[key]) buckets[key] = { key, label, upchuck: 0, jamming: 0 }
    buckets[key][s.session_type] = (buckets[key][s.session_type] || 0) + 1
  }

  return Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key))
}

export default function SessionsOverTimeChart({ data: analyticsData = [], testerId }) {
  const [period,   setPeriod]   = useState('all')
  const [fetched,  setFetched]  = useState(null)   // sessions from API for non-all periods
  const [loading,  setLoading]  = useState(false)

  const load = useCallback((p) => {
    if (p === 'all') { setFetched(null); return }
    setLoading(true)
    const { since, until } = getPeriodRange(p)
    const params = { tester_id: testerId }
    if (since) params.since = since
    if (until) params.until = until
    getSessions(params)
      .then((res) => setFetched(res.data))
      .catch(() => setFetched([]))
      .finally(() => setLoading(false))
  }, [testerId])

  useEffect(() => { load(period) }, [period, load])

  // Build chart data
  let chartData
  if (period === 'all') {
    chartData = analyticsData.map((d) => ({
      ...d,
      label: d.month.slice(5) + '/' + d.month.slice(2, 4), // "03/26"
    }))
  } else {
    chartData = fetched ? aggregate(fetched, period) : []
  }

  const hasData = chartData.some((d) => (d.upchuck || 0) + (d.jamming || 0) > 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-700">Sessions Over Time</h2>
        <div className="flex gap-1 flex-wrap">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                period === key
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">Loading…</div>
      ) : !hasData ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
          No sessions for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} cursor={{ fill: '#f9fafb' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="upchuck" name="Upchuck" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Bar dataKey="jamming" name="Jamming" fill="#f97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
