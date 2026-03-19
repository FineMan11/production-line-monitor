/**
 * TroubleshootingModal
 *
 * Phase 0 — type picker: Upchuck | Jamming
 * Phase A — start session form (technician + HB for upchuck / technician only for jamming)
 * Phase B — active session: view steps + add step + close
 *
 * Props:
 *   tester           { id, name }
 *   openSession      session object | null
 *   onSessionStarted (session) => void
 *   onStepAdded      (session) => void
 *   onSessionClosed  (session) => void
 *   onClose          () => void
 */
import { useState, useEffect } from 'react'
import { startSession, addStep, closeSession, getSession, deleteSession } from '../../services/troubleshootingService'
import { useAuth } from '../../context/AuthContext'
import StepItem from './StepItem'

const HARD_BINS = [
  { code: 'HB04', hint: 'SB27 Continuity Short · SB30 Continuity Open' },
  { code: 'HB08', hint: 'Hard Bin 08' },
  { code: 'HB12', hint: 'Hard Bin 12' },
]

function formatTime(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function TroubleshootingModal({
  tester,
  openSession,
  onSessionStarted,
  onStepAdded,
  onSessionClosed,
  onClose,
}) {
  // Phase 0 — type selection (only shown when no open session)
  const [sessionType, setSessionType] = useState(null) // null | 'upchuck' | 'jamming'

  // Phase A state
  const [technician,   setTechnician]   = useState('')
  const [hardBin,      setHardBin]      = useState('HB04')
  const [jammingDesc,  setJammingDesc]  = useState('')
  const [starting,     setStarting]     = useState(false)
  const [startErr,     setStartErr]     = useState('')

  // Phase B state
  const [session,      setSession]      = useState(openSession)
  const [action,       setAction]       = useState('')
  const [result,       setResult]       = useState('')
  const [plan,         setPlan]         = useState('')
  const [addingStep,   setAddingStep]   = useState(false)
  const [closing,      setClosing]      = useState(false)
  const [stepErr,      setStepErr]      = useState('')
  const [confirmDel,   setConfirmDel]   = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  const { user } = useAuth()
  const canDelete = user?.role === 'supervisor' || user?.role === 'admin'
  // PC failure observation fields (upchuck only, all optional)
  const [pinNumber,          setPinNumber]          = useState('')
  const [hbObserved,         setHbObserved]         = useState('')
  const [sbObserved,         setSbObserved]         = useState('')
  const [failureDescription, setFailureDescription] = useState('')
  const [measuredValue,      setMeasuredValue]      = useState('')
  const [upperLimit,         setUpperLimit]         = useState('')
  const [lowerLimit,         setLowerLimit]         = useState('')

  // Keep local session in sync when parent passes a new openSession
  useEffect(() => { setSession(openSession) }, [openSession])

  // If there's already an open session, derive the type from it
  const activeType = session?.session_type ?? sessionType

  async function handleStart() {
    if (!technician.trim()) { setStartErr('Technician name is required.'); return }
    setStarting(true); setStartErr('')
    try {
      const body = {
        tester_id:    tester.id,
        session_type: activeType,
        technician:   technician.trim(),
      }
      if (activeType === 'upchuck') body.hard_bin    = hardBin
      if (activeType === 'jamming') body.description = jammingDesc.trim()
      const res = await startSession(body)
      onSessionStarted?.(res.data)
      const full = await getSession(res.data.id)
      setSession(full.data)
    } catch (e) {
      setStartErr(e.response?.data?.msg || e.response?.data?.description || 'Failed to start session.')
    } finally {
      setStarting(false)
    }
  }

  async function handleAddStep() {
    if (!action.trim()) { setStepErr('Action is required.'); return }
    if (!result.trim()) { setStepErr('Result is required.'); return }
    setAddingStep(true); setStepErr('')
    try {
      const body = { action: action.trim(), result: result.trim() }
      if (activeType === 'jamming') {
        body.plan = plan.trim() || null
      } else {
        body.pin_number          = pinNumber.trim()          || null
        body.hb_observed         = hbObserved.trim()         || null
        body.sb_observed         = sbObserved.trim()         || null
        body.failure_description = failureDescription.trim() || null
        body.measured_value      = measuredValue.trim()      || null
        body.upper_limit         = upperLimit.trim()         || null
        body.lower_limit         = lowerLimit.trim()         || null
      }
      await addStep(session.id, body)
      const full = await getSession(session.id)
      setSession(full.data)
      onStepAdded?.(full.data)
      setAction(''); setResult(''); setPlan('')
      setPinNumber(''); setHbObserved(''); setSbObserved('')
      setFailureDescription(''); setMeasuredValue(''); setUpperLimit(''); setLowerLimit('')
    } catch (e) {
      setStepErr(e.response?.data?.msg || e.response?.data?.description || 'Failed to add step.')
    } finally {
      setAddingStep(false)
    }
  }

  async function handleClose(solved) {
    setClosing(true); setStepErr('')
    try {
      const res = await closeSession(session.id, { solved })
      onSessionClosed?.(res.data)
      onClose?.()
    } catch (e) {
      setStepErr(e.response?.data?.msg || e.response?.data?.description || 'Failed to close session.')
      setClosing(false)
    }
  }

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    try {
      await deleteSession(session.id)
      onSessionClosed?.({ id: session.id, deleted: true })
      onClose?.()
    } catch (e) {
      setStepErr(e.response?.data?.description || 'Failed to delete session.')
      setDeleting(false)
      setConfirmDel(false)
    }
  }

  const isPhaseB = !!session
  const isPhaseA = !isPhaseB && sessionType !== null
  const isPhase0 = !isPhaseB && sessionType === null

  const typeLabel = activeType === 'jamming' ? 'Jamming' : 'Upchuck'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">
              {isPhaseB ? 'Troubleshooting' : 'Start Troubleshooting'} — {tester.name}
            </span>
            {isPhaseB && (
              <>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                  ${activeType === 'jamming'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-blue-100 text-blue-700'}`}>
                  {typeLabel}
                </span>
                {session.hard_bin && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                    {session.hard_bin}
                  </span>
                )}
              </>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">

          {isPhase0 && (
            /* ─── Phase 0: Type Picker ─── */
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium text-gray-700 text-center">What type of troubleshooting?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSessionType('upchuck')}
                  className="flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-blue-200
                             bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition"
                >
                  <span className="text-2xl">⬆</span>
                  <span className="text-sm font-semibold text-blue-700">Upchuck</span>
                  <span className="text-xs text-blue-500 text-center px-2">HB04 / HB08 / HB12</span>
                </button>
                <button
                  onClick={() => setSessionType('jamming')}
                  className="flex flex-col items-center gap-2 py-5 rounded-xl border-2 border-orange-200
                             bg-orange-50 hover:bg-orange-100 hover:border-orange-400 transition"
                >
                  <span className="text-2xl">⚙</span>
                  <span className="text-sm font-semibold text-orange-700">Jamming</span>
                  <span className="text-xs text-orange-500 text-center px-2">Handler / tester jam</span>
                </button>
              </div>
            </div>
          )}

          {isPhaseA && (
            /* ─── Phase A: Start Session Form ─── */
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => { setSessionType(null); setStartErr('') }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition"
                >
                  ← Back
                </button>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                  ${sessionType === 'jamming'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-blue-100 text-blue-700'}`}>
                  {typeLabel}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Technician</label>
                <input
                  type="text"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {sessionType === 'jamming' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">What is jamming? <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={jammingDesc}
                    onChange={(e) => setJammingDesc(e.target.value)}
                    placeholder="e.g. Handler arm stuck, device lodged in socket…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              )}

              {sessionType === 'upchuck' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hard Bin</label>
                  <div className="flex gap-2">
                    {HARD_BINS.map(({ code }) => (
                      <button
                        key={code}
                        onClick={() => setHardBin(code)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition
                          ${hardBin === code
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">
                    {HARD_BINS.find(b => b.code === hardBin)?.hint}
                  </p>
                </div>
              )}

              {startErr && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{startErr}</p>
              )}
            </div>
          )}

          {isPhaseB && (
            /* ─── Phase B: Active Session ─── */
            <div className="p-4 space-y-4">
              <div className="text-xs text-gray-500 space-y-0.5">
                {session.description && (
                  <p className="font-medium text-orange-700 text-sm">{session.description}</p>
                )}
                <p>
                  Technician: <span className="font-medium text-gray-700">{session.technician}</span>
                  {' · '}Started: <span className="font-medium text-gray-700">{formatTime(session.started_at)}</span>
                </p>
              </div>

              {/* Steps list */}
              {session.steps?.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Steps</p>
                  {session.steps.map((s, i) => (
                    <StepItem
                      key={s.id}
                      step={s}
                      index={i}
                      sessionType={activeType}
                      formatTime={formatTime}
                      onUpdated={(updated) => setSession(prev => ({
                        ...prev,
                        steps: prev.steps.map(st => st.id === updated.id ? updated : st)
                      }))}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No steps recorded yet.</p>
              )}

              {/* Add step form */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Step</p>

                {/* PC failure observation — upchuck only */}
                {activeType === 'upchuck' && (
                  <div className="bg-gray-50 rounded-lg p-2 space-y-2">
                    <p className="text-xs font-medium text-gray-500">Failure from PC <span className="font-normal">(optional)</span></p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-0.5">Pin No.</label>
                        <input type="text" value={pinNumber} onChange={(e) => setPinNumber(e.target.value)}
                          placeholder="e.g. 170.2"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono
                                     focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 mb-0.5">HB</label>
                        <input type="text" value={hbObserved} onChange={(e) => setHbObserved(e.target.value)}
                          placeholder="HB12"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono
                                     focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 mb-0.5">SB</label>
                        <input type="text" value={sbObserved} onChange={(e) => setSbObserved(e.target.value)}
                          placeholder="SB05"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono
                                     focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Description of failure</label>
                      <input type="text" value={failureDescription} onChange={(e) => setFailureDescription(e.target.value)}
                        placeholder="e.g. Contact resistance out of range"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs
                                   focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-0.5">Measured</label>
                        <input type="text" value={measuredValue} onChange={(e) => setMeasuredValue(e.target.value)}
                          placeholder="value"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono
                                     focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-0.5">↑ Upper limit</label>
                        <input type="text" value={upperLimit} onChange={(e) => setUpperLimit(e.target.value)}
                          placeholder="limit"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono
                                     focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-0.5">↓ Lower limit</label>
                        <input type="text" value={lowerLimit} onChange={(e) => setLowerLimit(e.target.value)}
                          placeholder="limit"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono
                                     focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Action taken</label>
                  <textarea
                    rows={2}
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    placeholder="What did you do?"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
                               focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Result</label>
                  <textarea
                    rows={2}
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    placeholder="What happened?"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
                               focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {/* Plan — jamming only */}
                {activeType === 'jamming' && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Plan <span className="text-gray-400 font-normal">(next planned action, optional)</span></label>
                    <textarea
                      rows={2}
                      value={plan}
                      onChange={(e) => setPlan(e.target.value)}
                      placeholder="What is the plan if not resolved?"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
                                 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                )}

                {stepErr && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{stepErr}</p>
                )}

                <button
                  onClick={handleAddStep}
                  disabled={addingStep}
                  className={`w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition
                    ${activeType === 'jamming'
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {addingStep ? 'Adding…' : 'Add Step'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
          {isPhase0 && (
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600
                         hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          )}
          {isPhaseA && (
            <>
              <button
                onClick={() => { setSessionType(null); setStartErr('') }}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600
                           hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleStart}
                disabled={starting}
                className={`flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition
                  ${sessionType === 'jamming'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {starting ? 'Starting…' : 'Start Session'}
              </button>
            </>
          )}
          {isPhaseB && (
            <>
              {canDelete && (
                confirmDel ? (
                  <>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="py-2 px-3 rounded-lg text-xs font-medium text-white bg-red-500
                                 hover:bg-red-600 disabled:opacity-50 transition"
                    >
                      {deleting ? 'Deleting…' : 'Confirm delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDel(false)}
                      className="py-2 px-3 rounded-lg text-xs text-gray-500 hover:text-gray-800
                                 hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleDelete}
                    className="py-2 px-3 rounded-lg text-xs text-gray-400 hover:text-red-500
                               hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                )
              )}
              <button
                onClick={() => handleClose(false)}
                disabled={closing}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600
                           hover:bg-gray-50 disabled:opacity-50 transition"
              >
                {closing ? '…' : 'Close — Not Solved'}
              </button>
              <button
                onClick={() => handleClose(true)}
                disabled={closing}
                className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium
                           hover:bg-green-700 disabled:opacity-50 transition"
              >
                {closing ? '…' : 'Mark Solved'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
