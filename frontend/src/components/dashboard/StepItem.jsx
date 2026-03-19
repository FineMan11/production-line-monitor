/**
 * StepItem — single troubleshooting step with inline edit support.
 *
 * Props:
 *   step        step object
 *   index       0-based position in the steps list
 *   sessionType 'upchuck' | 'jamming'
 *   onUpdated   (updatedStep) => void — called after a successful save
 *   formatTime  (isoStr) => string   — time formatter passed from parent
 */
import { useState } from 'react'
import { updateStep } from '../../services/troubleshootingService'

export default function StepItem({ step, index, sessionType, onUpdated, formatTime }) {
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  const [eAction,   setEAction]   = useState(step.action)
  const [eResult,   setEResult]   = useState(step.result)
  const [ePlan,     setEPlan]     = useState(step.plan ?? '')
  const [ePin,      setEPin]      = useState(step.pin_number ?? '')
  const [eHb,       setEHb]       = useState(step.hb_observed ?? '')
  const [eSb,       setESb]       = useState(step.sb_observed ?? '')
  const [eDesc,     setEDesc]     = useState(step.failure_description ?? '')
  const [eMeasured, setEMeasured] = useState(step.measured_value ?? '')
  const [eUpper,    setEUpper]    = useState(step.upper_limit ?? '')
  const [eLower,    setELower]    = useState(step.lower_limit ?? '')

  function startEdit() {
    setEAction(step.action); setEResult(step.result); setEPlan(step.plan ?? '')
    setEPin(step.pin_number ?? ''); setEHb(step.hb_observed ?? ''); setESb(step.sb_observed ?? '')
    setEDesc(step.failure_description ?? ''); setEMeasured(step.measured_value ?? '')
    setEUpper(step.upper_limit ?? ''); setELower(step.lower_limit ?? '')
    setErr(''); setEditing(true)
  }

  async function save() {
    if (!eAction.trim()) { setErr('Action is required.'); return }
    if (!eResult.trim()) { setErr('Result is required.'); return }
    setSaving(true); setErr('')
    try {
      const body = { action: eAction.trim(), result: eResult.trim() }
      if (sessionType === 'jamming') {
        body.plan = ePlan.trim() || null
      } else {
        body.pin_number          = ePin.trim()      || null
        body.hb_observed         = eHb.trim()       || null
        body.sb_observed         = eSb.trim()       || null
        body.failure_description = eDesc.trim()     || null
        body.measured_value      = eMeasured.trim() || null
        body.upper_limit         = eUpper.trim()    || null
        body.lower_limit         = eLower.trim()    || null
      }
      const res = await updateStep(step.id, body)
      onUpdated(res.data)
      setEditing(false)
    } catch (e) {
      setErr(e.response?.data?.description || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const ts = formatTime ? formatTime(step.created_at) : ''

  if (editing) {
    return (
      <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm space-y-2">
        <p className="text-gray-400 text-xs">Step {index + 1} · {ts}</p>

        {sessionType === 'upchuck' && (
          <div className="bg-gray-50 rounded p-2 space-y-2">
            <p className="text-xs font-medium text-gray-500">Failure from PC <span className="font-normal">(optional)</span></p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-0.5">Pin No.</label>
                <input value={ePin} onChange={(e) => setEPin(e.target.value)} placeholder="e.g. 170.2"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <div className="w-20">
                <label className="block text-xs text-gray-500 mb-0.5">HB</label>
                <input value={eHb} onChange={(e) => setEHb(e.target.value)} placeholder="HB12"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <div className="w-20">
                <label className="block text-xs text-gray-500 mb-0.5">SB</label>
                <input value={eSb} onChange={(e) => setESb(e.target.value)} placeholder="SB05"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            </div>
            <input value={eDesc} onChange={(e) => setEDesc(e.target.value)} placeholder="Description of failure"
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-0.5">Measured</label>
                <input value={eMeasured} onChange={(e) => setEMeasured(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-0.5">↑ Upper</label>
                <input value={eUpper} onChange={(e) => setEUpper(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-0.5">↓ Lower</label>
                <input value={eLower} onChange={(e) => setELower(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-600 mb-0.5">Action</label>
          <textarea rows={2} value={eAction} onChange={(e) => setEAction(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-0.5">Result</label>
          <textarea rows={2} value={eResult} onChange={(e) => setEResult(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        {sessionType === 'jamming' && (
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">Plan <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea rows={2} value={ePlan} onChange={(e) => setEPlan(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        )}

        {err && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{err}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={saving}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm space-y-0.5 group">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-xs">Step {index + 1} · {ts}</p>
        <button onClick={startEdit}
          className="text-xs text-gray-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition opacity-0 group-hover:opacity-100">
          Edit
        </button>
      </div>
      {(step.pin_number || step.hb_observed || step.sb_observed || step.failure_description) && (
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
      {step.plan && <p><span className="font-medium text-gray-700">Plan:</span> {step.plan}</p>}
    </div>
  )
}
