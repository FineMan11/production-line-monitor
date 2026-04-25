/**
 * StationEditModal
 * Edit a station's name, type, plant, handler assignment, and active state.
 * Admin only — caller is responsible for only rendering this for admins.
 *
 * Props:
 *   tester    { id, name, tester_type, plant, station_number, is_active }
 *   handlers  Array<{ id, name, handler_type, current_tester_id }>
 *   onClose   () => void
 *   onSaved   (updatedTester) => void
 */
import { useState } from 'react'
import { updateTester } from '../../services/dashboardService'

const TESTER_TYPES = ['INTVG', 'ETS364', 'J750', 'ETS800', 'FLEX', 'STS']

const HANDLER_BADGE = {
  JHT: 'bg-teal-100 text-teal-700',
  MT:  'bg-orange-100 text-orange-700',
  CAS: 'bg-pink-100 text-pink-700',
  HT:  'bg-purple-100 text-purple-700',
}

// Extract the numeric suffix from a station name, e.g. "INVTG-03" → "03"
function extractNumber(name) {
  const match = name.match(/-(\d+)$/)
  return match ? match[1] : '01'
}

// Build a station name from type + number string, e.g. ("J750", "05") → "J750-05"
function buildName(type, numStr) {
  const n = parseInt(numStr, 10)
  if (isNaN(n) || n < 1) return `${type}-01`
  return `${type}-${String(n).padStart(2, '0')}`
}

export default function StationEditModal({ tester, handlers = [], onClose, onSaved }) {
  const initialNum = extractNumber(tester.name)

  const [type,       setType]      = useState(tester.tester_type)
  const [numStr,     setNumStr]    = useState(initialNum)
  const [plant,      setPlant]     = useState(tester.plant)
  const [bay,        setBay]       = useState(tester.bay ?? 1)
  const [isActive,   setIsActive]  = useState(tester.is_active)
  const [handlerId,  setHandlerId] = useState(
    // Find which handler is currently docked to this tester
    handlers.find((h) => h.current_tester_id === tester.id)?.id ?? ''
  )
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Auto-update the preview name when type or number changes
  const previewName = buildName(type, numStr)

  const handleTypeChange = (newType) => {
    setType(newType)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const num = parseInt(numStr, 10)
    if (isNaN(num) || num < 1) {
      setError('Station number must be a positive integer.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        name:        previewName,
        tester_type: type,
        plant:       Number(plant),
        bay:         Number(plant) === 3 ? Number(bay) : null,
        is_active:   isActive,
        handler_id:  handlerId === '' ? null : Number(handlerId),
      }
      const res = await updateTester(tester.id, payload)
      onSaved(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to save changes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
    text-gray-900 transition`

  // Handlers available: all handlers + option to leave unassigned
  // Show each handler with its current assignment for context
  const currentDocked = handlers.find((h) => h.current_tester_id === tester.id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Edit Station</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{tester.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200
                            rounded-lg text-sm text-red-700 mb-4">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Tester Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Tester Type</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {TESTER_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex-1 py-2 text-xs font-medium transition
                      ${type === t
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Station Number + Name Preview */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Station Number</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="99"
                  required
                  value={numStr}
                  onChange={(e) => setNumStr(e.target.value)}
                  className="w-24 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                             text-gray-900 transition"
                />
                <span className="text-xs text-gray-500">→</span>
                <span className="text-sm font-mono font-semibold text-gray-900 bg-gray-50
                                 border border-gray-200 rounded-lg px-3 py-2">
                  {previewName}
                </span>
              </div>
              <p className="text-xs text-gray-400">Name is auto-built as Type-Number</p>
            </div>

            {/* Plant */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Plant</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {[1, 3].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlant(p)}
                    className={`flex-1 py-2 text-xs font-medium transition
                      ${plant === p
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    Plant {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Bay — only for Plant 3 */}
            {plant === 3 && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-700">Bay</label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  {[1, 2, 3].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBay(b)}
                      className={`flex-1 py-2 text-xs font-medium transition
                        ${bay === b
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                      Bay {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Handler Assignment */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Handler</label>
              <select
                value={handlerId}
                onChange={(e) => setHandlerId(e.target.value)}
                className={inputClass}
              >
                <option value="">None (Offline Area)</option>
                {handlers
                  .filter((h) => h.is_active)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((h) => {
                    const docked = h.current_tester_id && h.current_tester_id !== tester.id
                    return (
                      <option key={h.id} value={h.id} disabled={docked}>
                        {h.name}
                        {docked ? ' (docked elsewhere)' : ''}
                        {h.current_tester_id === tester.id ? ' (current)' : ''}
                      </option>
                    )
                  })}
              </select>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">Station Active</p>
                <p className="text-xs text-gray-400">Inactive stations are hidden from the dashboard</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition
                  ${isActive ? 'bg-teal-600' : 'bg-gray-300'}`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform
                    ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg
                           hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed
                           focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg
                           border border-gray-300 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
