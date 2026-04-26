/**
 * StepItem — single troubleshooting step with inline edit support.
 *
 * Props:
 *   step        step object
 *   index       0-based position in the steps list
 *   sessionType 'upchuck' | 'jamming'
 *   onUpdated   (updatedStep) => void
 *   formatTime  (isoStr) => string
 */
import { useState } from 'react'
import { updateStep } from '../../services/troubleshootingService'
import { ACTION_GROUPS, SITE_COUNTS } from '../../services/troubleshootingConstants'

function parseTags(str) {
  return str ? str.split(',').filter(Boolean) : []
}
function parseSites(str) {
  return str ? str.split(',').map(Number).filter(Boolean) : []
}
function toggleItem(arr, item) {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item].sort((a, b) => a - b)
}

function initSiteFailures(siteNums, savedArr) {
  const map = {}
  const saved = savedArr ? Object.fromEntries(savedArr.map(s => [s.site, s])) : {}
  for (const n of siteNums) {
    map[n] = {
      pin:      saved[n]?.pin_number          ?? '',
      hb:       saved[n]?.hb_observed         ?? '',
      sb:       saved[n]?.sb_observed         ?? '',
      desc:     saved[n]?.failure_description ?? '',
      measured: saved[n]?.measured_value      ?? '',
      upper:    saved[n]?.upper_limit         ?? '',
      lower:    saved[n]?.lower_limit         ?? '',
    }
  }
  return map
}

export default function StepItem({ step, index, sessionType, onUpdated, formatTime }) {
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  // Edit state
  const [eTags,      setETags]      = useState(() => parseTags(step.action_tags))
  const [eDesc,      setEDesc]      = useState(step.action ?? '')
  const [eResult,    setEResult]    = useState(step.result)
  const [ePlan,      setEPlan]      = useState(step.plan ?? '')
  const [ePin,       setEPin]       = useState(step.pin_number ?? '')
  const [eHb,        setEHb]        = useState(step.hb_observed ?? '')
  const [eSb,        setESb]        = useState(step.sb_observed ?? '')
  const [eFailDesc,  setEFailDesc]  = useState(step.failure_description ?? '')
  const [eMeasured,  setEMeasured]  = useState(step.measured_value ?? '')
  const [eUpper,     setEUpper]     = useState(step.upper_limit ?? '')
  const [eLower,     setELower]     = useState(step.lower_limit ?? '')
  const [eSiteCount, setESiteCount] = useState(step.site_count ?? '')
  const [eSiteNums,  setESiteNums]  = useState(() => parseSites(step.site_number))
  const [eSiteFailures, setESiteFailures] = useState(
    () => initSiteFailures(parseSites(step.site_number), step.site_failures)
  )

  function updateSiteField(siteNum, field, value) {
    setESiteFailures(prev => ({
      ...prev,
      [siteNum]: { ...prev[siteNum], [field]: value },
    }))
  }

  function handleSiteNumsChange(newNums) {
    setESiteNums(newNums)
    setESiteFailures(prev => initSiteFailures(newNums, Object.entries(prev).map(([k, v]) => ({
      site: Number(k),
      pin_number: v.pin, hb_observed: v.hb, sb_observed: v.sb, failure_description: v.desc,
      measured_value: v.measured, upper_limit: v.upper, lower_limit: v.lower,
    }))))
  }

  function startEdit() {
    const nums = parseSites(step.site_number)
    setETags(parseTags(step.action_tags))
    setEDesc(step.action ?? '')
    setEResult(step.result)
    setEPlan(step.plan ?? '')
    setEPin(step.pin_number ?? '')
    setEHb(step.hb_observed ?? '')
    setESb(step.sb_observed ?? '')
    setEFailDesc(step.failure_description ?? '')
    setEMeasured(step.measured_value ?? '')
    setEUpper(step.upper_limit ?? '')
    setELower(step.lower_limit ?? '')
    setESiteCount(step.site_count ?? '')
    setESiteNums(nums)
    setESiteFailures(initSiteFailures(nums, step.site_failures))
    setErr(''); setEditing(true)
  }

  async function save() {
    if (!eTags.length && !eDesc.trim()) {
      setErr('Select at least one action or enter a description.'); return
    }
    if (!eResult.trim()) { setErr('Result is required.'); return }
    setSaving(true); setErr('')
    try {
      const body = {
        action_tags: eTags.length ? eTags.join(',') : null,
        action:      eDesc.trim() || null,
        result:      eResult.trim(),
      }
      if (sessionType === 'jamming') {
        body.plan = ePlan.trim() || null
      } else {
        body.site_count  = eSiteCount !== '' ? Number(eSiteCount) : null
        body.site_number = eSiteNums.length ? eSiteNums.join(',') : null

        if (eSiteNums.length > 0) {
          // per-site failure data
          body.pin_number = null
          body.site_failures = eSiteNums.map(n => ({
            site:                n,
            pin_number:          eSiteFailures[n]?.pin      || null,
            hb_observed:         eSiteFailures[n]?.hb       || null,
            sb_observed:         eSiteFailures[n]?.sb       || null,
            failure_description: eSiteFailures[n]?.desc     || null,
            measured_value:      eSiteFailures[n]?.measured || null,
            upper_limit:         eSiteFailures[n]?.upper    || null,
            lower_limit:         eSiteFailures[n]?.lower    || null,
          }))
          body.hb_observed = null; body.sb_observed = null
          body.failure_description = null; body.measured_value = null
          body.upper_limit = null; body.lower_limit = null
        } else {
          body.site_failures       = null
          body.pin_number          = ePin.trim()       || null
          body.hb_observed         = eHb.trim()        || null
          body.sb_observed         = eSb.trim()        || null
          body.failure_description = eFailDesc.trim()  || null
          body.measured_value      = eMeasured.trim()  || null
          body.upper_limit         = eUpper.trim()     || null
          body.lower_limit         = eLower.trim()     || null
        }
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

  /* ── Edit mode ─────────────────────────────────────────────────────── */
  if (editing) {
    return (
      <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm space-y-2">
        <p className="text-gray-400 text-xs">Step {index + 1} · {ts}</p>

        {/* PC failure block — upchuck only */}
        {sessionType === 'upchuck' && (
          <div className="bg-gray-50 rounded p-2 space-y-2">
            <p className="text-xs font-medium text-gray-500">Failure from PC <span className="font-normal">(optional)</span></p>

            {/* Shared Number — only when no sites selected */}
            {eSiteNums.length === 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Number of Test</label>
                <input type="number" step="any" min="0" value={ePin}
                  onChange={(e) => setEPin(e.target.value)} placeholder="e.g. 170.2"
                  className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            )}

            {/* Number of sites */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Number of Sites</label>
              <div className="flex gap-1 flex-wrap">
                {SITE_COUNTS.map(n => (
                  <button key={n} type="button"
                    onClick={() => { setESiteCount(n); handleSiteNumsChange([]) }}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition
                      ${eSiteCount === n
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                    {n}
                  </button>
                ))}
                {eSiteCount !== '' && (
                  <button type="button" onClick={() => { setESiteCount(''); handleSiteNumsChange([]) }}
                    className="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 transition">
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Which sites */}
            {eSiteCount !== '' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Site <span className="font-normal text-gray-400">(select all affected)</span>
                </label>
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: Number(eSiteCount) }, (_, i) => i + 1).map(n => (
                    <button key={n} type="button"
                      onClick={() => handleSiteNumsChange(toggleItem(eSiteNums, n))}
                      className={`px-2.5 py-1 rounded text-xs font-medium border transition
                        ${eSiteNums.includes(n)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Per-site failure sections — shown when sites are selected */}
            {eSiteNums.length > 0 ? (
              <div className="space-y-2">
                {eSiteNums.map(n => (
                  <div key={n} className="border border-blue-100 rounded p-2 space-y-1.5">
                    <p className="text-xs font-semibold text-blue-700">Site {n}</p>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Number of Test</label>
                      <input type="number" step="any" min="0" value={eSiteFailures[n]?.pin ?? ''}
                        onChange={e => updateSiteField(n, 'pin', e.target.value)}
                        placeholder="e.g. 170.2"
                        className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-24">
                        <label className="block text-xs text-gray-500 mb-0.5">HB</label>
                        <input value={eSiteFailures[n]?.hb ?? ''}
                          onChange={e => updateSiteField(n, 'hb', e.target.value)}
                          placeholder="HB12"
                          className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div className="w-24">
                        <label className="block text-xs text-gray-500 mb-0.5">SB</label>
                        <input value={eSiteFailures[n]?.sb ?? ''}
                          onChange={e => updateSiteField(n, 'sb', e.target.value)}
                          placeholder="SB05"
                          className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                    </div>
                    <input value={eSiteFailures[n]?.desc ?? ''}
                      onChange={e => updateSiteField(n, 'desc', e.target.value)}
                      placeholder="Description of failure"
                      className="w-full border border-gray-300 rounded px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-0.5">Current Reading Value</label>
                        <input type="number" step="any" value={eSiteFailures[n]?.measured ?? ''}
                          onChange={e => updateSiteField(n, 'measured', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-0.5">↑ Upper</label>
                        <input type="number" step="any" value={eSiteFailures[n]?.upper ?? ''}
                          onChange={e => updateSiteField(n, 'upper', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-0.5">↓ Lower</label>
                        <input type="number" step="any" value={eSiteFailures[n]?.lower ?? ''}
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
                    <input value={eHb} onChange={(e) => setEHb(e.target.value)} placeholder="HB12"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs text-gray-500 mb-0.5">SB</label>
                    <input value={eSb} onChange={(e) => setESb(e.target.value)} placeholder="SB05"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                </div>
                <input value={eFailDesc} onChange={(e) => setEFailDesc(e.target.value)} placeholder="Description of failure"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-0.5">Current Reading Value</label>
                    <input type="number" step="any" value={eMeasured} onChange={(e) => setEMeasured(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-0.5">↑ Upper</label>
                    <input type="number" step="any" value={eUpper} onChange={(e) => setEUpper(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-0.5">↓ Lower</label>
                    <input type="number" step="any" value={eLower} onChange={(e) => setELower(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Action section */}
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
                    onClick={() => setETags(prev => prev.includes(act) ? prev.filter(x => x !== act) : [...prev, act])}
                    className={`px-2 py-1 rounded text-xs font-medium border transition
                      ${eTags.includes(act)
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
            <textarea rows={2} value={eDesc} onChange={(e) => setEDesc(e.target.value)}
              placeholder="Additional details…"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>

        {/* Result */}
        <div>
          <label className="block text-xs text-gray-600 mb-0.5">Result</label>
          <textarea rows={2} value={eResult} onChange={(e) => setEResult(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>

        {/* Plan — jamming only */}
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

  /* ── Display mode ───────────────────────────────────────────────────── */
  const displaySites = step.site_number ? parseSites(step.site_number) : []

  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-xs">Step {index + 1} · {ts}</p>
        <button onClick={startEdit}
          className="text-xs text-gray-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition">
          Edit
        </button>
      </div>

      {/* PC failure block */}
      {step.site_failures && step.site_failures.length > 0 ? (
        /* Per-site failure display */
        <div className="space-y-1">
          {step.site_failures.map(sf => (
            <div key={sf.site} className="bg-red-50 border border-red-100 rounded px-2 py-1.5 text-xs space-y-0.5">
              <p className="font-semibold text-red-700">
                Site {sf.site}
                {step.site_count && ` of ${step.site_count}`}
              </p>
              {(sf.pin_number || sf.hb_observed || sf.sb_observed) && (
                <p className="font-mono text-red-700">
                  {[
                    sf.pin_number  && `No. ${sf.pin_number}`,
                    sf.hb_observed,
                    sf.sb_observed,
                  ].filter(Boolean).join('  ·  ')}
                </p>
              )}
              {sf.failure_description && <p className="text-red-800">{sf.failure_description}</p>}
              {(sf.measured_value || sf.upper_limit || sf.lower_limit) && (
                <p className="text-red-600 font-mono">
                  {sf.measured_value && `Reading: ${sf.measured_value}`}
                  {sf.upper_limit   && `  ↑ ${sf.upper_limit}`}
                  {sf.lower_limit   && `  ↓ ${sf.lower_limit}`}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Single shared failure block — backward compatible */
        (step.pin_number || step.hb_observed || step.sb_observed || step.failure_description || step.site_number) && (
          <div className="bg-red-50 border border-red-100 rounded px-2 py-1.5 text-xs space-y-0.5">
            {(step.pin_number || step.hb_observed || step.sb_observed || displaySites.length > 0) && (
              <p className="font-mono text-red-700">
                {[
                  step.pin_number  && `No. ${step.pin_number}`,
                  step.hb_observed,
                  step.sb_observed,
                  displaySites.length > 0 && step.site_count
                    && `Site${displaySites.length > 1 ? 's' : ''} ${displaySites.join(', ')} of ${step.site_count}`,
                ].filter(Boolean).join('  ·  ')}
              </p>
            )}
            {step.failure_description && <p className="text-red-800">{step.failure_description}</p>}
            {(step.measured_value || step.upper_limit || step.lower_limit) && (
              <p className="text-red-600 font-mono">
                {step.measured_value && `Reading: ${step.measured_value}`}
                {step.upper_limit   && `  ↑ ${step.upper_limit}`}
                {step.lower_limit   && `  ↓ ${step.lower_limit}`}
              </p>
            )}
          </div>
        )
      )}

      {/* Action tags + description */}
      {step.action_tags && (
        <div className="flex flex-wrap gap-1 mt-1">
          {parseTags(step.action_tags).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium border border-teal-200">
              {tag.trim()}
            </span>
          ))}
        </div>
      )}
      {step.action && <p className="text-gray-600 text-xs mt-0.5">{step.action}</p>}
      {!step.action_tags && !step.action && (
        <p><span className="font-medium text-gray-700">Action:</span> —</p>
      )}

      <p><span className="font-medium text-gray-700">Result:</span> {step.result}</p>
      {step.plan && <p><span className="font-medium text-gray-700">Plan:</span> {step.plan}</p>}
    </div>
  )
}
