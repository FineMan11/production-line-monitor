import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import {
  adminGetTesters, adminCreateTester, adminEditTester,
  adminRemoveTester, adminRestoreTester,
} from '../services/adminService'
import {
  adminGetHandlers, adminCreateHandler, adminEditHandler,
  adminRemoveHandler, adminRestoreHandler,
} from '../services/adminService'

// ── Small reusable pieces ─────────────────────────────────────────────────── //

function Badge({ label, color = 'gray' }) {
  const map = {
    gray:   'bg-gray-100 text-gray-700',
    violet: 'bg-violet-100 text-violet-700',
    blue:   'bg-blue-100 text-blue-700',
    amber:  'bg-amber-100 text-amber-700',
    teal:   'bg-teal-100 text-teal-700',
    orange: 'bg-orange-100 text-orange-700',
    pink:   'bg-pink-100 text-pink-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[color] ?? map.gray}`}>
      {label}
    </span>
  )
}

function StatusDot({ active }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium
      ${active ? 'text-green-700' : 'text-gray-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function ErrorBanner({ msg }) {
  if (!msg) return null
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200
                    rounded-lg text-sm text-red-700 mb-4">
      <span>⚠</span><span>{msg}</span>
    </div>
  )
}

const inputClass = `w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg
  focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
  placeholder:text-gray-400 text-gray-900 transition`

// ── Inline Edit Row (shared) ─────────────────────────────────────────────── //

function InlineField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-2 py-1.5 text-sm bg-white border border-gray-300 rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500
                   text-gray-900 transition w-full"
      />
    </div>
  )
}

// ── Add Tester Form ──────────────────────────────────────────────────────── //

function AddTesterForm({ onCreated }) {
  const [name,   setName]   = useState('')
  const [type,   setType]   = useState('')
  const [plant,  setPlant]  = useState(1)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // Auto-build name preview from type + number
  const [num, setNum] = useState('')
  const preview = type && num ? `${type.toUpperCase()}-${String(parseInt(num) || 1).padStart(2,'0')}` : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const finalName = preview || name.trim()
    if (!finalName) return setError('Name is required.')
    if (!type.trim()) return setError('Type is required.')
    setSaving(true)
    try {
      const res = await adminCreateTester({ name: finalName, tester_type: type.trim().toUpperCase(), plant })
      onCreated(res.data)
      setName(''); setType(''); setNum(''); setPlant(1)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to create tester.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-5">
      <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider mb-3">Add New Tester</p>
      <ErrorBanner msg={error} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-600">Type <span className="text-red-500">*</span></label>
          <input value={type} onChange={(e) => setType(e.target.value)}
            placeholder="e.g. INVTG" className={inputClass} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-600">Number <span className="text-red-500">*</span></label>
          <input type="number" min="1" max="99" value={num} onChange={(e) => setNum(e.target.value)}
            placeholder="e.g. 11" className={inputClass} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-600">Plant <span className="text-red-500">*</span></label>
          <select value={plant} onChange={(e) => setPlant(Number(e.target.value))} className={inputClass}>
            <option value={1}>Plant 1</option>
            <option value={2}>Plant 2</option>
          </select>
        </div>
        <div className="flex flex-col gap-0.5 justify-end">
          <label className="text-xs text-gray-600">Name preview</label>
          <div className="px-3 py-2 text-sm font-mono font-semibold text-gray-900
                          bg-white border border-gray-200 rounded-lg min-h-[38px]">
            {preview || <span className="text-gray-400 font-normal">—</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg
                     hover:bg-teal-700 transition disabled:opacity-50">
          {saving ? 'Adding…' : '+ Add Tester'}
        </button>
      </div>
    </form>
  )
}

// ── Add Handler Form ─────────────────────────────────────────────────────── //

function AddHandlerForm({ onCreated }) {
  const [type,   setType]   = useState('')
  const [num,    setNum]    = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const preview = type && num
    ? `${type.toUpperCase()}-${String(parseInt(num) || 1).padStart(2,'0')}`
    : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const name = preview
    if (!name) return setError('Type and number are required.')
    setSaving(true)
    try {
      const res = await adminCreateHandler({ name, handler_type: type.trim().toUpperCase() })
      onCreated(res.data)
      setType(''); setNum('')
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to create handler.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-5">
      <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider mb-3">Add New Handler</p>
      <ErrorBanner msg={error} />
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-600">Type <span className="text-red-500">*</span></label>
          <input value={type} onChange={(e) => setType(e.target.value)}
            placeholder="e.g. JHT, ROBOT" className={inputClass} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-600">Number <span className="text-red-500">*</span></label>
          <input type="number" min="1" max="99" value={num} onChange={(e) => setNum(e.target.value)}
            placeholder="e.g. 11" className={inputClass} />
        </div>
        <div className="flex flex-col gap-0.5 justify-end">
          <label className="text-xs text-gray-600">Name preview</label>
          <div className="px-3 py-2 text-sm font-mono font-semibold text-gray-900
                          bg-white border border-gray-200 rounded-lg min-h-[38px]">
            {preview || <span className="text-gray-400 font-normal">—</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg
                     hover:bg-teal-700 transition disabled:opacity-50">
          {saving ? 'Adding…' : '+ Add Handler'}
        </button>
      </div>
    </form>
  )
}

// ── Testers Tab ──────────────────────────────────────────────────────────── //

function TestersTab() {
  const [testers,  setTesters]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [editId,   setEditId]   = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving,   setSaving]   = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    adminGetTesters()
      .then((r) => setTesters(r.data))
      .catch(() => setError('Failed to load testers.'))
      .finally(() => setLoading(false))
  }, [])

  const startEdit = (t) => {
    const num = t.name.match(/-(\d+)$/)?.[1] ?? '01'
    setEditId(t.id)
    setEditForm({ type: t.tester_type, num, plant: t.plant })
    setActionError('')
  }

  const cancelEdit = () => { setEditId(null); setEditForm({}) }

  const saveEdit = async (t) => {
    setSaving(true)
    setActionError('')
    const n = parseInt(editForm.num, 10)
    const name = `${editForm.type.toUpperCase()}-${String(n || 1).padStart(2, '0')}`
    try {
      const res = await adminEditTester(t.id, {
        name,
        tester_type: editForm.type.toUpperCase(),
        plant: Number(editForm.plant),
      })
      setTesters((prev) => prev.map((x) => x.id === t.id ? res.data : x))
      cancelEdit()
    } catch (err) {
      setActionError(err.response?.data?.error ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (t) => {
    if (!window.confirm(`Deactivate ${t.name}? It will be hidden from the dashboard.`)) return
    setActionError('')
    try {
      await adminRemoveTester(t.id)
      setTesters((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: false } : x))
    } catch (err) {
      setActionError(err.response?.data?.error ?? 'Failed to deactivate.')
    }
  }

  const handleRestore = async (t) => {
    setActionError('')
    try {
      const res = await adminRestoreTester(t.id)
      setTesters((prev) => prev.map((x) => x.id === t.id ? res.data : x))
    } catch (err) {
      setActionError(err.response?.data?.error ?? 'Failed to restore.')
    }
  }

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
  if (error)   return <p className="text-sm text-red-600 py-4">{error}</p>

  const typeColor = { INVTG: 'violet', ETS364: 'blue', J750: 'amber' }

  return (
    <>
      <AddTesterForm onCreated={(t) => setTesters((prev) => [...prev, t])} />
      <ErrorBanner msg={actionError} />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plant</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">State</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {testers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No testers found.</td></tr>
            )}
            {testers.map((t) => (
              <tr key={t.id} className={`hover:bg-gray-50 transition ${!t.is_active ? 'opacity-50' : ''}`}>
                {editId === t.id ? (
                  /* ── Inline edit row ── */
                  <td colSpan={6} className="px-4 py-3">
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="w-28">
                        <InlineField label="Type" value={editForm.type}
                          onChange={(v) => setEditForm((p) => ({ ...p, type: v }))} placeholder="INVTG" />
                      </div>
                      <div className="w-20">
                        <InlineField label="Number" value={editForm.num} type="number"
                          onChange={(v) => setEditForm((p) => ({ ...p, num: v }))} placeholder="01" />
                      </div>
                      <div className="w-24">
                        <label className="text-xs text-gray-500">Plant</label>
                        <select value={editForm.plant}
                          onChange={(e) => setEditForm((p) => ({ ...p, plant: Number(e.target.value) }))}
                          className="mt-0.5 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg
                                     focus:outline-none focus:ring-2 focus:ring-teal-500">
                          <option value={1}>Plant 1</option>
                          <option value={2}>Plant 2</option>
                        </select>
                      </div>
                      <div className="flex items-end gap-2 mt-auto">
                        <button onClick={() => saveEdit(t)} disabled={saving}
                          className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg
                                     hover:bg-teal-700 transition disabled:opacity-50">
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={cancelEdit}
                          className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-lg
                                     border border-gray-300 hover:bg-gray-50 transition">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{t.name}</td>
                    <td className="px-4 py-3">
                      <Badge label={t.tester_type} color={typeColor[t.tester_type] ?? 'gray'} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">Plant {t.plant}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.status}</td>
                    <td className="px-4 py-3"><StatusDot active={t.is_active} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {t.is_active ? (
                          <>
                            <button onClick={() => startEdit(t)}
                              className="text-xs text-teal-600 hover:text-teal-800 font-medium transition">
                              Edit
                            </button>
                            <button onClick={() => handleRemove(t)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium transition">
                              Remove
                            </button>
                          </>
                        ) : (
                          <button onClick={() => handleRestore(t)}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium transition">
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Handlers Tab ─────────────────────────────────────────────────────────── //

function HandlersTab() {
  const [handlers, setHandlers] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [editId,   setEditId]   = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving,   setSaving]   = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    adminGetHandlers()
      .then((r) => setHandlers(r.data))
      .catch(() => setError('Failed to load handlers.'))
      .finally(() => setLoading(false))
  }, [])

  const startEdit = (h) => {
    const num = h.name.match(/-(\d+)$/)?.[1] ?? '01'
    setEditId(h.id)
    setEditForm({ type: h.handler_type, num })
    setActionError('')
  }

  const cancelEdit = () => { setEditId(null); setEditForm({}) }

  const saveEdit = async (h) => {
    setSaving(true)
    setActionError('')
    const n = parseInt(editForm.num, 10)
    const name = `${editForm.type.toUpperCase()}-${String(n || 1).padStart(2, '0')}`
    try {
      const res = await adminEditHandler(h.id, { name, handler_type: editForm.type.toUpperCase() })
      setHandlers((prev) => prev.map((x) => x.id === h.id ? res.data : x))
      cancelEdit()
    } catch (err) {
      setActionError(err.response?.data?.error ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (h) => {
    if (!window.confirm(`Deactivate ${h.name}? It will be moved to inactive.`)) return
    setActionError('')
    try {
      await adminRemoveHandler(h.id)
      setHandlers((prev) => prev.map((x) => x.id === h.id ? { ...x, is_active: false, current_tester_id: null } : x))
    } catch (err) {
      setActionError(err.response?.data?.error ?? 'Failed to deactivate.')
    }
  }

  const handleRestore = async (h) => {
    setActionError('')
    try {
      const res = await adminRestoreHandler(h.id)
      setHandlers((prev) => prev.map((x) => x.id === h.id ? res.data : x))
    } catch (err) {
      setActionError(err.response?.data?.error ?? 'Failed to restore.')
    }
  }

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
  if (error)   return <p className="text-sm text-red-600 py-4">{error}</p>

  const typeColor = { JHT: 'teal', MT: 'orange', CAS: 'pink' }

  return (
    <>
      <AddHandlerForm onCreated={(h) => setHandlers((prev) => [...prev, h])} />
      <ErrorBanner msg={actionError} />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Docked To</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">State</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {handlers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No handlers found.</td></tr>
            )}
            {handlers.map((h) => (
              <tr key={h.id} className={`hover:bg-gray-50 transition ${!h.is_active ? 'opacity-50' : ''}`}>
                {editId === h.id ? (
                  <td colSpan={5} className="px-4 py-3">
                    <div className="flex items-end gap-3 flex-wrap">
                      <div className="w-28">
                        <InlineField label="Type" value={editForm.type}
                          onChange={(v) => setEditForm((p) => ({ ...p, type: v }))} placeholder="JHT" />
                      </div>
                      <div className="w-20">
                        <InlineField label="Number" value={editForm.num} type="number"
                          onChange={(v) => setEditForm((p) => ({ ...p, num: v }))} placeholder="01" />
                      </div>
                      <div className="flex items-end gap-2">
                        <button onClick={() => saveEdit(h)} disabled={saving}
                          className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg
                                     hover:bg-teal-700 transition disabled:opacity-50">
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={cancelEdit}
                          className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-lg
                                     border border-gray-300 hover:bg-gray-50 transition">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{h.name}</td>
                    <td className="px-4 py-3">
                      <Badge label={h.handler_type} color={typeColor[h.handler_type] ?? 'gray'} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                      {h.current_tester_id ? `Tester #${h.current_tester_id}` : <span className="text-gray-400 italic">Offline</span>}
                    </td>
                    <td className="px-4 py-3"><StatusDot active={h.is_active} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {h.is_active ? (
                          <>
                            <button onClick={() => startEdit(h)}
                              className="text-xs text-teal-600 hover:text-teal-800 font-medium transition">
                              Edit
                            </button>
                            <button onClick={() => handleRemove(h)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium transition">
                              Remove
                            </button>
                          </>
                        ) : (
                          <button onClick={() => handleRestore(h)}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium transition">
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Main AdminPage ───────────────────────────────────────────────────────── //

const TABS = ['Testers', 'Handlers']

export default function AdminPage() {
  const [tab, setTab] = useState('Testers')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Admin" />

      <main className="px-6 py-6 max-w-screen-xl mx-auto">

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition
                ${tab === t
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Testers'  && <TestersTab />}
        {tab === 'Handlers' && <HandlersTab />}

      </main>
    </div>
  )
}
