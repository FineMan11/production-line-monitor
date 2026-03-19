import { useState } from 'react'
import { closeMaintenanceLog, deleteMaintenanceLog } from '../../services/maintenanceService'
import { useAuth } from '../../context/AuthContext'

/**
 * Maintenance log list with filters and close-event action.
 * Props:
 *   logs     {Array}    — maintenance log objects
 *   testers  {Array}    — tester list for the filter dropdown
 *   filters  {Object}   — { tester_id, date } controlled by parent
 *   onFilterChange {Function} — called with updated filter object
 *   onClosed  {Function} — called with the closed log's id after successful close
 *   loading  {boolean}
 */
export default function MaintenanceList({
  logs = [],
  testers = [],
  filters,
  onFilterChange,
  onClosed,
  onDeleted,
  loading,
}) {
  const { user } = useAuth()
  const canDelete = user?.role === 'supervisor' || user?.role === 'admin'

  const [closingId,    setClosingId]    = useState(null)
  const [closeError,   setCloseError]   = useState('')
  const [confirmingId, setConfirmingId] = useState(null)
  const [deletingId,   setDeletingId]   = useState(null)

  const handleClose = async (log) => {
    setCloseError('')
    setClosingId(log.id)
    try {
      await closeMaintenanceLog(log.id)
      onClosed?.(log.id)
    } catch (err) {
      setCloseError(err.response?.data?.error ?? 'Failed to close event.')
    } finally {
      setClosingId(null)
    }
  }

  const handleDelete = async (log) => {
    if (confirmingId !== log.id) { setConfirmingId(log.id); return }
    setDeletingId(log.id)
    try {
      await deleteMaintenanceLog(log.id)
      onDeleted?.(log.id)
      setConfirmingId(null)
    } catch (err) {
      setCloseError(err.response?.data?.error ?? 'Failed to delete log.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDatetime = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const formatDuration = (start, end) => {
    if (!end) return null
    const ms = new Date(end) - new Date(start)
    const h  = Math.floor(ms / 3600000)
    const m  = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">

      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-700 mr-2">Event History</h2>
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

        <span className="ml-auto text-xs text-gray-400">{logs.length} records</span>
      </div>

      {closeError && (
        <div className="mx-4 mt-3 flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <span>⚠</span>
          <span>{closeError}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto flex-1">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse flex gap-4">
                <div className="h-3 bg-gray-200 rounded w-24" />
                <div className="h-3 bg-gray-100 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <span className="text-gray-400 text-xl">○</span>
            </div>
            <p className="text-sm font-medium text-gray-700">No records</p>
            <p className="text-xs text-gray-400 mt-1">Logged events will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tester</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Technician</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Start</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">End / Duration</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const duration = formatDuration(log.start_time, log.end_time)
                const isOpen   = !log.end_time
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono text-gray-900 text-xs font-medium whitespace-nowrap">
                      {log.tester_name ?? `#${log.tester_id}`}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{log.technician}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatDatetime(log.start_time)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {isOpen ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Open
                        </span>
                      ) : (
                        <span className="text-gray-600">{duration}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate" title={log.notes}>
                      {log.notes || <span className="italic text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {isOpen && (
                          <button
                            onClick={() => handleClose(log)}
                            disabled={closingId === log.id}
                            className="text-xs font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50
                                       px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                          >
                            {closingId === log.id ? 'Closing…' : 'Close'}
                          </button>
                        )}
                        {canDelete && (
                          confirmingId === log.id ? (
                            <>
                              <button
                                onClick={() => handleDelete(log)}
                                disabled={deletingId === log.id}
                                className="text-xs font-medium text-white bg-red-500 hover:bg-red-600
                                           px-2 py-1 rounded transition disabled:opacity-50"
                              >
                                {deletingId === log.id ? 'Deleting…' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setConfirmingId(null)}
                                className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1
                                           rounded hover:bg-gray-100 transition"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleDelete(log)}
                              className="text-xs text-gray-400 hover:text-red-500 px-2 py-1
                                         rounded hover:bg-red-50 transition"
                            >
                              Delete
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
