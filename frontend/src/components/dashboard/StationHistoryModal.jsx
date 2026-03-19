/**
 * StationHistoryModal
 * Shows the status change history for a specific tester station.
 *
 * Props:
 *   tester  { id, name, tester_type }
 *   onClose () => void
 */
import { useState, useEffect } from 'react'
import { getTesterHistory } from '../../services/dashboardService'
import { STATUS_DOT, STATUS_LABEL, STATUS_BG } from './statusColors'

const TYPE_BADGE = {
  INVTG:  'bg-violet-100 text-violet-700',
  ETS364: 'bg-blue-100 text-blue-700',
  J750:   'bg-amber-100 text-amber-700',
}

function formatDateTime(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function StationHistoryModal({ tester, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    getTesterHistory(tester.id)
      .then((res) => setHistory(res.data))
      .catch(() => setError('Failed to load history.'))
      .finally(() => setLoading(false))
  }, [tester.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">
              <span className="font-mono">{tester.name}</span> — Status History
            </h3>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                              ${TYPE_BADGE[tester.tester_type] ?? 'bg-gray-100 text-gray-700'}`}>
              {tester.tester_type}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-100 rounded w-20" />
                  <div className="h-4 bg-gray-100 rounded w-32" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <p className="text-sm font-medium text-gray-700">No history found</p>
              <p className="text-xs text-gray-400 mt-1">Status changes will appear here.</p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Changed By</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
                                        ${STATUS_BG[row.status_color]} ${STATUS_LABEL[row.status_color]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[row.status_color]}`} />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs font-mono">{row.changed_by}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDateTime(row.changed_at)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate" title={row.note ?? ''}>
                      {row.note ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
