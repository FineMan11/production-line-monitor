import { useState, useEffect } from 'react'
import { createMaintenanceLog } from '../../services/maintenanceService'
import { getTesters } from '../../services/dashboardService'

/**
 * Form to log a new maintenance event.
 *
 * Props:
 *   mode             "page" | "modal"   default "page"
 *   testers          Array              list of tester objects (used in page mode only)
 *   initialTesterId  number | ""        pre-selects tester (used in modal mode)
 *   onCreated        (newLog) => void   called after successful submission
 *   onClose          () => void         called when Cancel is clicked (modal mode)
 */
export default function MaintenanceForm({
  mode = 'page',
  testers: testersProp = [],
  initialTesterId = '',
  onCreated,
  onClose,
}) {
  const now = new Date()
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  // In modal mode we load testers ourselves if not provided
  const [testers, setTesters] = useState(testersProp)

  useEffect(() => {
    if (mode === 'modal' && testersProp.length === 0) {
      getTesters().then((res) => setTesters(res.data)).catch(() => {})
    }
  }, [mode, testersProp.length])

  const [form, setForm] = useState({
    tester_id:         initialTesterId,
    start_time:        localNow,
    technician:        '',
    fault_code:        '',
    fault_description: '',
    parts_replaced:    '',
    issue_type:        'tester',
    notes:             '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setError('')
    setSuccess(false)
  }

  const setIssueType = (type) => {
    setForm((prev) => ({ ...prev, issue_type: type }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      const payload = {
        ...form,
        tester_id: Number(form.tester_id),
      }
      const res = await createMaintenanceLog(payload)
      onCreated?.(res.data)
      if (mode === 'page') {
        setForm({
          tester_id: '', start_time: localNow, technician: '',
          fault_code: '', fault_description: '', parts_replaced: '',
          issue_type: 'tester', notes: '',
        })
        setSuccess(true)
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to log event. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
    placeholder:text-gray-400 text-gray-900 transition`

  const isModal = mode === 'modal'

  return (
    <div className={isModal ? '' : 'bg-white border border-gray-200 rounded-xl shadow-sm p-5'}>
      {!isModal && (
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Log New Event</h2>
      )}

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
          <span className="mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {success && !isModal && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 mb-4">
          <span>✓</span>
          <span>Event logged successfully.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Tester Station — hidden in modal mode (pre-selected) */}
        {!isModal && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-700">Tester Station</label>
            <select
              required
              value={form.tester_id}
              onChange={set('tester_id')}
              className={inputClass}
            >
              <option value="">Select tester…</option>
              {testers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Start Time */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">Start Time</label>
          <input
            type="datetime-local"
            required
            value={form.start_time}
            onChange={set('start_time')}
            className={inputClass}
          />
        </div>

        {/* Technician */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">Technician <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={form.technician}
            onChange={set('technician')}
            placeholder="Full name"
            className={inputClass}
          />
        </div>

        {/* Fault Code */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">Fault Code</label>
          <input
            type="text"
            value={form.fault_code}
            onChange={set('fault_code')}
            placeholder="e.g. FC-042"
            className={inputClass}
          />
        </div>

        {/* Fault Description */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">Fault Description</label>
          <textarea
            rows={2}
            value={form.fault_description}
            onChange={set('fault_description')}
            placeholder="Describe the problem…"
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Parts Replaced */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">Parts Replaced</label>
          <textarea
            rows={2}
            value={form.parts_replaced}
            onChange={set('parts_replaced')}
            placeholder="List parts used or replaced…"
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Issue Type — segmented control */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">Issue Type</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {[
              { value: 'tester',  label: 'Tester Issue' },
              { value: 'handler', label: 'Handler Issue' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setIssueType(value)}
                className={`flex-1 py-2 text-xs font-medium transition
                  ${form.issue_type === value
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">Notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={set('notes')}
            placeholder="Additional observations or actions taken…"
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Actions */}
        <div className={`flex gap-2 ${isModal ? 'flex-row-reverse' : ''}`}>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg
                       hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            {loading ? 'Logging…' : 'Log Event'}
          </button>

          {isModal && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg
                         border border-gray-300 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          )}
        </div>

      </form>
    </div>
  )
}
