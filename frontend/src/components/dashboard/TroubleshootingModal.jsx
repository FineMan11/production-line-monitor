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
import { ACTION_GROUPS, SITE_COUNTS } from '../../services/troubleshootingConstants'

function toggleItem(arr, item) {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item].sort((a, b) => a - b)
}

function initSiteFailures(siteNums, prev = {}) {
  const map = {}
  for (const n of siteNums) {
    map[n] = prev[n] ?? { pin: '', hb: '', sb: '', desc: '', measured: '', upper: '', lower: '' }
  }
  return map
}

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
  const [stepIndex,    setStepIndex]    = useState(0)
  const [actionTags,   setActionTags]   = useState([])
  const [actionDesc,   setActionDesc]   = useState('')
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
  const [siteCount,          setSiteCount]          = useState('')
  const [siteNumbers,        setSiteNumbers]        = useState([])
  const [siteFailures,       setSiteFailures]       = useState({})

  function updateSiteField(siteNum, field, value) {
    setSiteFailures(prev => ({ ...prev, [siteNum]: { ...prev[siteNum], [field]: value } }))
  }

  function handleSiteNumbersChange(newNums) {
    setSiteNumbers(newNums)
    setSiteFailures(prev => initSiteFailures(newNums, prev))
  }

  // Keep local session in sync when parent passes a new openSession
  useEffect(() => { setSession(openSession) }, [openSession])

  // ── Draft: load saved form state when Phase B opens ──────────────────
  useEffect(() => {
    if (!session?.id) return
    const saved = localStorage.getItem(`draft_step_${session.id}`)
    if (!saved) return
    try {
      const d = JSON.parse(saved)
      if (d.actionTags)              setActionTags(d.actionTags)
      if (d.actionDesc)              setActionDesc(d.actionDesc)
      if (d.result)                  setResult(d.result)
      if (d.plan)                    setPlan(d.plan)
      if (d.pinNumber)               setPinNumber(d.pinNumber)
      if (d.hbObserved)              setHbObserved(d.hbObserved)
      if (d.sbObserved)              setSbObserved(d.sbObserved)
      if (d.failureDescription)      setFailureDescription(d.failureDescription)
      if (d.measuredValue)           setMeasuredValue(d.measuredValue)
      if (d.upperLimit)              setUpperLimit(d.upperLimit)
      if (d.lowerLimit)              setLowerLimit(d.lowerLimit)
      if (d.siteCount !== undefined) setSiteCount(d.siteCount)
      if (d.siteNumbers)             setSiteNumbers(d.siteNumbers)
      if (d.siteFailures)            setSiteFailures(d.siteFailures)
    } catch {}
  }, [session?.id])

  // ── Draft: persist on every field change ─────────────────────────────
  useEffect(() => {
    if (!session?.id) return
    localStorage.setItem(`draft_step_${session.id}`, JSON.stringify({
      actionTags, actionDesc, result, plan,
      pinNumber, hbObserved, sbObserved, failureDescription,
      measuredValue, upperLimit, lowerLimit,
      siteCount, siteNumbers, siteFailures,
    }))
  }, [
    actionTags, actionDesc, result, plan,
    pinNumber, hbObserved, sbObserved, failureDescription,
    measuredValue, upperLimit, lowerLimit,
    siteCount, siteNumbers, siteFailures, session?.id,
  ])

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
    if (!actionTags.length && !actionDesc.trim()) {
      setStepErr('Select at least one action or enter a description.'); return
    }
    if (!result.trim()) { setStepErr('Result is required.'); return }
    setAddingStep(true); setStepErr('')
    try {
      const body = {
        action_tags: actionTags.length ? actionTags.join(',') : null,
        action:      actionDesc.trim() || null,
        result:      result.trim(),
      }
      if (activeType === 'jamming') {
        body.plan = plan.trim() || null
      } else {
        body.site_count  = siteCount !== '' ? Number(siteCount) : null
        body.site_number = siteNumbers.length ? siteNumbers.join(',') : null

        if (siteNumbers.length > 0) {
          body.site_failures = siteNumbers.map(n => ({
            site:                n,
            pin_number:          siteFailures[n]?.pin      || null,
            hb_observed:         siteFailures[n]?.hb       || null,
            sb_observed:         siteFailures[n]?.sb       || null,
            failure_description: siteFailures[n]?.desc     || null,
            measured_value:      siteFailures[n]?.measured || null,
            upper_limit:         siteFailures[n]?.upper    || null,
            lower_limit:         siteFailures[n]?.lower    || null,
          }))
          body.pin_number = null
          body.hb_observed = null; body.sb_observed = null
          body.failure_description = null; body.measured_value = null
          body.upper_limit = null; body.lower_limit = null
        } else {
          body.site_failures       = null
          body.pin_number          = pinNumber.trim()          || null
          body.hb_observed         = hbObserved.trim()         || null
          body.sb_observed         = sbObserved.trim()         || null
          body.failure_description = failureDescription.trim() || null
          body.measured_value      = measuredValue.trim()      || null
          body.upper_limit         = upperLimit.trim()         || null
          body.lower_limit         = lowerLimit.trim()         || null
        }
      }
      await addStep(session.id, body)
      const full = await getSession(session.id)
      setSession(full.data)
      onStepAdded?.(full.data)
      setStepIndex(full.data.steps.length - 1)

      // Reset form fields
      setActionTags([]); setActionDesc(''); setResult(''); setPlan('')
      setPinNumber(''); setHbObserved(''); setSbObserved('')
      setFailureDescription(''); setMeasuredValue(''); setUpperLimit(''); setLowerLimit('')
      setSiteCount(''); setSiteNumbers([]); setSiteFailures({})

      // Clear draft
      localStorage.removeItem(`draft_step_${session.id}`)
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
      localStorage.removeItem(`draft_step_${session.id}`)
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
      localStorage.removeItem(`draft_step_${session.id}`)
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
         onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="bg-white w-full rounded-t-2xl sm:rounded-xl sm:max-w-md sm:mx-4
                      flex flex-col max-h-[92vh] sm:shadow-lg">

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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1">✕</button>
        </div>

        <div className="overflow-y-auto flex-1">

          {isPhase0 && (
            /* ─── Phase 0: Type Picker ─── */
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium text-gray-700 text-center">What type of troubleshooting?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSessionType('upchuck')}
                  className="flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-blue-200
                             bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition"
                >
                  <span className="text-2xl">⬆</span>
                  <span className="text-sm font-semibold text-blue-700">Upchuck</span>
                  <span className="text-xs text-blue-500 text-center px-2">HB04 / HB08 / HB12</span>
                </button>
                <button
                  onClick={() => setSessionType('jamming')}
                  className="flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-orange-200
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
                  className="text-xs text-gray-400 hover:text-gray-600 transition py-1"
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Badge Number</label>
                <input
                  type="text"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g. AB1234"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
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
                        className={`flex-1 py-3 rounded-lg text-sm font-medium border transition
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

              {/* Step navigator */}
              {session.steps?.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Steps</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setStepIndex(i => Math.max(0, i - 1))}
                        disabled={stepIndex === 0}
                        className="px-3 py-1.5 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"
                      >←</button>
                      <span className="text-xs text-gray-500">
                        {stepIndex + 1} of {session.steps.length}
                      </span>
                      <button
                        onClick={() => setStepIndex(i => Math.min(session.steps.length - 1, i + 1))}
                        disabled={stepIndex === session.steps.length - 1}
                        className="px-3 py-1.5 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"
                      >→</button>
                    </div>
                  </div>
                  <StepItem
                    key={session.steps[stepIndex]?.id}
                    step={session.steps[stepIndex]}
                    index={stepIndex}
                    sessionType={activeType}
                    formatTime={formatTime}
                    onUpdated={(updated) => setSession(prev => ({
                      ...prev,
                      steps: prev.steps.map(st => st.id === updated.id ? updated : st)
                    }))}
                  />
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

                    {/* Shared Number — only shown when no sites selected */}
                    {siteNumbers.length === 0 && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Number of Test</label>
                        <input type="number" step="any" min="0" value={pinNumber}
                          onChange={(e) => setPinNumber(e.target.value)} placeholder="e.g. 170.2"
                          className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono
                                     focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                    )}

                    {/* Number of sites */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Number of Sites</label>
                      <div className="flex gap-1 flex-wrap">
                        {SITE_COUNTS.map(n => (
                          <button key={n} type="button"
                            onClick={() => { setSiteCount(n); handleSiteNumbersChange([]) }}
                            className={`px-3 py-2 rounded text-xs font-medium border transition
                              ${siteCount === n
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                            {n}
                          </button>
                        ))}
                        {siteCount !== '' && (
                          <button type="button" onClick={() => { setSiteCount(''); handleSiteNumbersChange([]) }}
                            className="px-2 py-2 rounded text-xs text-gray-400 hover:text-gray-600 border border-gray-200 transition">
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Which sites */}
                    {siteCount !== '' && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Site <span className="font-normal text-gray-400">(select all affected)</span>
                        </label>
                        <div className="flex gap-1 flex-wrap">
                          {Array.from({ length: Number(siteCount) }, (_, i) => i + 1).map(n => (
                            <button key={n} type="button"
                              onClick={() => handleSiteNumbersChange(toggleItem(siteNumbers, n))}
                              className={`px-3 py-2 rounded text-xs font-medium border transition
                                ${siteNumbers.includes(n)
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Per-site failure cards — shown when sites selected */}
                    {siteNumbers.length > 0 ? (
                      <div className="space-y-2">
                        {siteNumbers.map(n => (
                          <div key={n} className="border border-blue-100 rounded p-2 space-y-1.5">
                            <p className="text-xs font-semibold text-blue-700">Site {n}</p>
                            <div>
                              <label className="block text-xs text-gray-500 mb-0.5">Number of Test</label>
                              <input type="number" step="any" min="0"
                                value={siteFailures[n]?.pin ?? ''}
                                onChange={e => updateSiteField(n, 'pin', e.target.value)}
                                placeholder="e.g. 170.2"
                                className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                            </div>
                            <div className="flex gap-2">
                              <div className="w-24">
                                <label className="block text-xs text-gray-500 mb-0.5">HB</label>
                                <input value={siteFailures[n]?.hb ?? ''}
                                  onChange={e => updateSiteField(n, 'hb', e.target.value)}
                                  placeholder="HB12"
                                  className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                              </div>
                              <div className="w-24">
                                <label className="block text-xs text-gray-500 mb-0.5">SB</label>
                                <input value={siteFailures[n]?.sb ?? ''}
                                  onChange={e => updateSiteField(n, 'sb', e.target.value)}
                                  placeholder="SB05"
                                  className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                              </div>
                            </div>
                            <input value={siteFailures[n]?.desc ?? ''}
                              onChange={e => updateSiteField(n, 'desc', e.target.value)}
                              placeholder="Description of failure"
                              className="w-full border border-gray-300 rounded px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-0.5">Current Reading Value</label>
                                <input type="number" step="any" value={siteFailures[n]?.measured ?? ''}
                                  onChange={e => updateSiteField(n, 'measured', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-0.5">↑ Upper</label>
                                <input type="number" step="any" value={siteFailures[n]?.upper ?? ''}
                                  onChange={e => updateSiteField(n, 'upper', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-0.5">↓ Lower</label>
                                <input type="number" step="any" value={siteFailures[n]?.lower ?? ''}
                                  onChange={e => updateSiteField(n, 'lower', e.target.value)}
                                  className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Single shared failure block — no sites selected */
                      <>
                        <div className="flex gap-2">
                          <div className="w-24">
                            <label className="block text-xs text-gray-500 mb-0.5">HB</label>
                            <input type="text" value={hbObserved} onChange={(e) => setHbObserved(e.target.value)}
                              placeholder="HB12"
                              className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono
                                         focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs text-gray-500 mb-0.5">SB</label>
                            <input type="text" value={sbObserved} onChange={(e) => setSbObserved(e.target.value)}
                              placeholder="SB05"
                              className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono
                                         focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">Description of failure</label>
                          <input type="text" value={failureDescription} onChange={(e) => setFailureDescription(e.target.value)}
                            placeholder="e.g. Contact resistance out of range"
                            className="w-full border border-gray-300 rounded px-2 py-2 text-xs
                                       focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-0.5">Current Reading Value</label>
                            <input type="number" step="any" value={measuredValue}
                              onChange={(e) => setMeasuredValue(e.target.value)} placeholder="value"
                              className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono
                                         focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-0.5">↑ Upper limit</label>
                            <input type="number" step="any" value={upperLimit}
                              onChange={(e) => setUpperLimit(e.target.value)} placeholder="limit"
                              className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono
                                         focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-0.5">↓ Lower limit</label>
                            <input type="number" step="any" value={lowerLimit}
                              onChange={(e) => setLowerLimit(e.target.value)} placeholder="limit"
                              className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono
                                         focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Action selection */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">
                    Action <span className="font-normal text-gray-400">(select all that apply)</span>
                  </p>
                  {ACTION_GROUPS.map(group => (
                    <div key={group.label}>
                      <p className="text-xs text-gray-400 mb-1">{group.label}</p>
                      <div className="flex flex-wrap gap-1">
                        {group.actions.map(act => (
                          <button key={act} type="button"
                            onClick={() => setActionTags(prev =>
                              prev.includes(act) ? prev.filter(x => x !== act) : [...prev, act]
                            )}
                            className={`px-2 py-2 rounded text-xs font-medium border transition
                              ${actionTags.includes(act)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                            {act}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">
                      Description <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea rows={2} value={actionDesc} onChange={(e) => setActionDesc(e.target.value)}
                      placeholder="Additional details…"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
                                 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Result</label>
                  <textarea rows={2} value={result} onChange={(e) => setResult(e.target.value)}
                    placeholder="What happened?"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
                               focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>

                {/* Plan — jamming only */}
                {activeType === 'jamming' && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Plan <span className="text-gray-400 font-normal">(next planned action, optional)</span></label>
                    <textarea rows={2} value={plan} onChange={(e) => setPlan(e.target.value)}
                      placeholder="What is the plan if not resolved?"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none
                                 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                )}

                {stepErr && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{stepErr}</p>
                )}

                <button onClick={handleAddStep} disabled={addingStep}
                  className={`w-full py-3 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition
                    ${activeType === 'jamming'
                      ? 'bg-orange-500 hover:bg-orange-600'
                      : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {addingStep ? 'Adding…' : 'Add Step'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 pt-3 pb-4 border-t border-gray-100 flex gap-2"
             style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          {isPhase0 && (
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-gray-300 text-sm text-gray-600
                         hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          )}
          {isPhaseA && (
            <>
              <button
                onClick={() => { setSessionType(null); setStartErr('') }}
                className="flex-1 py-3 rounded-lg border border-gray-300 text-sm text-gray-600
                           hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleStart}
                disabled={starting}
                className={`flex-1 py-3 rounded-lg text-white text-sm font-medium disabled:opacity-50 transition
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
                      className="py-3 px-3 rounded-lg text-xs font-medium text-white bg-red-500
                                 hover:bg-red-600 disabled:opacity-50 transition"
                    >
                      {deleting ? 'Deleting…' : 'Confirm delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDel(false)}
                      className="py-3 px-3 rounded-lg text-xs text-gray-500 hover:text-gray-800
                                 hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleDelete}
                    className="py-3 px-3 rounded-lg text-xs text-gray-400 hover:text-red-500
                               hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                )
              )}
              <button
                onClick={() => handleClose(false)}
                disabled={closing}
                className="flex-1 py-3 rounded-lg border border-gray-300 text-sm text-gray-600
                           hover:bg-gray-50 disabled:opacity-50 transition"
              >
                {closing ? '…' : 'Close — Not Solved'}
              </button>
              <button
                onClick={() => handleClose(true)}
                disabled={closing}
                className="flex-1 py-3 rounded-lg bg-green-600 text-white text-sm font-medium
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
