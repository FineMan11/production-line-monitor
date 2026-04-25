import { useEffect, useState, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import Navbar from '../components/Navbar'
import TesterCard from '../components/dashboard/TesterCard'
import { getTesters, getHandlers, getStatuses, updateTester } from '../services/dashboardService'
import { getMaintenanceLogs } from '../services/maintenanceService'
import { getSessions } from '../services/troubleshootingService'
import { getLayout, saveLayout as saveLayoutApi } from '../services/layoutService'
import { useAuth } from '../context/AuthContext'

// ── Section key helpers ───────────────────────────────────────────────────────
const SECTION_KEYS = ['plant1', 'plant3_bay1', 'plant3_bay2', 'plant3_bay3']

function getBayFromKey(key) {
  const match = key.match(/_bay(\d+)$/)
  return match ? parseInt(match[1], 10) : null
}

function getPlantFromKey(key) {
  return key.startsWith('plant3') ? 3 : 1
}

function sectionKeyForTester(tester) {
  if (tester.plant === 1) return 'plant1'
  return `plant3_bay${tester.bay}`
}

// ── Slot components ───────────────────────────────────────────────────────────

// A slot that is both draggable (if it holds a tester) and droppable
function Slot({ slotId, tester, editMode, onRemoveEmpty, cardProps }) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: slotId,
    disabled: !editMode || !tester,
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: slotId })

  const setNodeRef = (el) => { setDragRef(el); setDropRef(el) }

  if (!tester) {
    return (
      <div
        ref={setNodeRef}
        className={`relative rounded-lg border-2 border-dashed transition-all
          ${isOver && editMode
            ? 'border-teal-400 bg-teal-50 scale-[1.02]'
            : 'border-gray-200 bg-gray-50'}`}
        style={{ minHeight: 120 }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-2xl select-none">
          —
        </div>
        {editMode && (
          <button
            onClick={() => onRemoveEmpty(slotId)}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100
                       hover:text-red-500 text-gray-400 text-xs flex items-center justify-center
                       transition leading-none"
            title="Remove empty slot"
          >
            ×
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className={`transition-opacity ${isOver && editMode ? 'ring-2 ring-teal-400 rounded-lg' : ''}`}
    >
      <TesterCard
        tester={tester}
        dragHandleProps={editMode ? { ...attributes, ...listeners } : null}
        {...cardProps}
      />
    </div>
  )
}

// The "+" add-slot button
function AddSlotButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border-2 border-dashed border-gray-300 hover:border-teal-400
                 hover:bg-teal-50 transition-all flex items-center justify-center
                 text-gray-300 hover:text-teal-400 text-3xl"
      style={{ minHeight: 120 }}
      title="Add empty slot"
    >
      +
    </button>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, count, unit = 'stations' }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
        {title}
      </h2>
      <div className="flex-1 border-t border-gray-200" />
      <span className="text-xs text-gray-400">{count} {unit}</span>
    </div>
  )
}

function BayHeader({ bay }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Bay {bay}</span>
      <div className="flex-1 border-t border-dashed border-gray-200" />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-2.5 bg-gray-100 rounded w-1/3 mb-3" />
      <div className="border-t border-gray-100 pt-2">
        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  )
}

const HANDLER_BADGE = {
  JHT: 'bg-teal-100 text-teal-700',
  MT:  'bg-orange-100 text-orange-700',
  CAS: 'bg-pink-100 text-pink-700',
  HT:  'bg-purple-100 text-purple-700',
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin'

  const [testers,              setTesters]             = useState([])
  const [handlers,             setHandlers]            = useState([])
  const [statuses,             setStatuses]            = useState([])
  const [openLogByTester,      setOpenLogByTester]     = useState({})
  const [openSessionByTester,  setOpenSessionByTester] = useState({})
  const [layouts,              setLayouts]             = useState({
    plant1: null, plant3_bay1: null, plant3_bay2: null, plant3_bay3: null,
  })
  const [loading,              setLoading]             = useState(true)
  const [error,                setError]               = useState('')
  const [layoutEditMode,       setLayoutEditMode]      = useState(false)
  const [activeDragId,         setActiveDragId]        = useState(null)

  // Keep a stable ref to layouts for use inside async callbacks
  const layoutsRef = useRef(layouts)
  useEffect(() => { layoutsRef.current = layouts }, [layouts])

  // ── Load all data on mount ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [testersRes, handlersRes, statusesRes, maintenanceRes, sessionsRes,
               ...layoutResults] = await Promise.all([
          getTesters(),
          getHandlers(),
          getStatuses(),
          getMaintenanceLogs({ open_only: true }),
          getSessions({ open_only: true }),
          ...SECTION_KEYS.map((k) => getLayout(k)),
        ])

        setTesters(testersRes.data)
        setHandlers(handlersRes.data)
        setStatuses(statusesRes.data)

        const logLookup = {}
        maintenanceRes.data.forEach((log) => { logLookup[log.tester_id] = log })
        setOpenLogByTester(logLookup)

        const sessionLookup = {}
        sessionsRes.data.forEach((s) => { sessionLookup[s.tester_id] = s })
        setOpenSessionByTester(sessionLookup)

        const newLayouts = {}
        SECTION_KEYS.forEach((k, i) => { newLayouts[k] = layoutResults[i].data.layout })
        setLayouts(newLayouts)
      } catch {
        setError('Could not load station data. The backend may not be available yet.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── WebSocket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io('/')
    socket.on('status_update', (data) => {
      setTesters((prev) =>
        prev.map((t) =>
          t.id === data.tester_id
            ? { ...t, status: data.status, status_color: data.status_color }
            : t
        )
      )
    })
    return () => { socket.off('status_update'); socket.disconnect() }
  }, [])

  // ── TesterCard callbacks ────────────────────────────────────────────────────
  const handleStatusChange = (testerId, updatedTester) =>
    setTesters((prev) => prev.map((t) => t.id === testerId ? { ...t, ...updatedTester } : t))

  const handleMaintenanceCreated = (newLog) =>
    setOpenLogByTester((prev) => ({ ...prev, [newLog.tester_id]: newLog }))

  const handleMaintenanceClosed = (logId, testerId) =>
    setOpenLogByTester((prev) => { const n = { ...prev }; delete n[testerId]; return n })

  const handleDeviceUpdated = (testerId, updatedTester) =>
    setTesters((prev) => prev.map((t) => t.id === testerId ? { ...t, ...updatedTester } : t))

  const handleTroubleshootingUpdated = (testerId, session) =>
    setOpenSessionByTester((prev) => {
      const n = { ...prev }
      if (session) n[testerId] = session; else delete n[testerId]
      return n
    })

  const handleTesterEdited = (updatedTester) => {
    setTesters((prev) => prev.map((t) => t.id === updatedTester.id ? updatedTester : t))
    if (updatedTester.handler) {
      setHandlers((prev) => prev.map((h) =>
        h.id === updatedTester.handler.id
          ? { ...h, current_tester_id: updatedTester.id }
          : h.current_tester_id === updatedTester.id
            ? { ...h, current_tester_id: null }
            : h
      ))
    } else {
      setHandlers((prev) => prev.map((h) =>
        h.current_tester_id === updatedTester.id ? { ...h, current_tester_id: null } : h
      ))
    }
  }

  // ── Layout mutations ────────────────────────────────────────────────────────
  const addEmptySlot = async (sectionKey) => {
    const prev = layoutsRef.current[sectionKey] ?? []
    const next = [...prev, null]
    setLayouts((l) => ({ ...l, [sectionKey]: next }))
    try { await saveLayoutApi(sectionKey, next) } catch {
      setLayouts((l) => ({ ...l, [sectionKey]: prev }))
    }
  }

  const removeEmptySlot = async (slotId) => {
    // slotId format: "empty-<sectionKey>-<index>"
    const parts = slotId.split('-')
    const idx = parseInt(parts[parts.length - 1], 10)
    const sectionKey = parts.slice(1, -1).join('-')
    const prev = layoutsRef.current[sectionKey] ?? []
    const next = prev.filter((_, i) => i !== idx)
    setLayouts((l) => ({ ...l, [sectionKey]: next }))
    try { await saveLayoutApi(sectionKey, next) } catch {
      setLayouts((l) => ({ ...l, [sectionKey]: prev }))
    }
  }

  // ── Drag sensors ────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const handleDragStart = useCallback((event) => {
    setActiveDragId(event.active.id)
  }, [])

  // ── Drag end ─────────────────────────────────────────────────────────────────
  // active.id is always a tester ID (number) — only tester slots are draggable
  // over.id is a tester ID (number) or an empty-slot ID string "empty-<key>-<index>"
  const handleDragEnd = useCallback(async ({ active, over }) => {
    setActiveDragId(null)
    if (!over || active.id === over.id) return

    const activeId = active.id   // tester ID (number)
    const overId   = over.id     // number or string

    const current = layoutsRef.current

    // Locate source: find which section's layout contains activeId
    let sourceKey = null, sourceIdx = null
    for (const key of SECTION_KEYS) {
      const idx = (current[key] ?? []).indexOf(activeId)
      if (idx !== -1) { sourceKey = key; sourceIdx = idx; break }
    }
    if (!sourceKey) return

    // Locate target
    let targetKey = null, targetIdx = null
    if (typeof overId === 'string' && overId.startsWith('empty-')) {
      // "empty-plant3_bay1-3" → key="plant3_bay1", idx=3
      const parts = overId.split('-')
      targetIdx = parseInt(parts[parts.length - 1], 10)
      targetKey = parts.slice(1, -1).join('-')
    } else {
      // Dropping on another tester card
      for (const key of SECTION_KEYS) {
        const idx = (current[key] ?? []).indexOf(overId)
        if (idx !== -1) { targetKey = key; targetIdx = idx; break }
      }
    }
    if (!targetKey) return

    // Build updated layouts
    const newLayouts = { ...current }
    const newSource  = [...(current[sourceKey] ?? [])]
    const displaced  = (current[targetKey] ?? [])[targetIdx] // null or another tester ID

    if (sourceKey === targetKey) {
      // Same section — swap
      ;[newSource[sourceIdx], newSource[targetIdx]] = [newSource[targetIdx], newSource[sourceIdx]]
      newLayouts[sourceKey] = newSource
    } else {
      // Different sections — move active to target, put displaced at source position
      const newTarget = [...(current[targetKey] ?? [])]
      newSource[sourceIdx] = displaced     // null or the displaced tester
      newTarget[targetIdx] = activeId
      newLayouts[sourceKey] = newSource
      newLayouts[targetKey] = newTarget
    }

    // Optimistic UI update
    setLayouts(newLayouts)

    // If cross-section: update bay fields on testers
    if (sourceKey !== targetKey) {
      const newBay    = getBayFromKey(targetKey)
      const sourceBay = getBayFromKey(sourceKey)
      setTesters((prev) => prev.map((t) => {
        if (t.id === activeId)   return { ...t, bay: newBay }
        if (displaced && t.id === displaced) return { ...t, bay: sourceBay }
        return t
      }))
    }

    // Persist
    try {
      const saves = [saveLayoutApi(sourceKey, newLayouts[sourceKey])]
      if (sourceKey !== targetKey) {
        saves.push(saveLayoutApi(targetKey, newLayouts[targetKey]))
        const newBay = getBayFromKey(targetKey)
        saves.push(updateTester(activeId, { bay: newBay }))
        if (displaced) {
          const sourceBay = getBayFromKey(sourceKey)
          saves.push(updateTester(displaced, { bay: sourceBay }))
        }
      }
      await Promise.all(saves)
    } catch {
      // Rollback
      setLayouts(current)
      if (sourceKey !== targetKey) {
        setTesters((prev) => {
          const original = {}
          ;[activeId, displaced].filter(Boolean).forEach((id) => {
            const t = prev.find((x) => x.id === id)
            if (t) original[id] = t
          })
          return prev.map((t) => original[t.id] ?? t)
        })
      }
    }
  }, [])

  // ── Render helpers ──────────────────────────────────────────────────────────
  const testerMap = Object.fromEntries(testers.map((t) => [t.id, t]))

  const sharedCardProps = {
    statuses,
    handlers,
    onStatusChange:           handleStatusChange,
    onMaintenanceCreated:     handleMaintenanceCreated,
    onMaintenanceClosed:      handleMaintenanceClosed,
    onTesterEdited:           handleTesterEdited,
    onTroubleshootingUpdated: handleTroubleshootingUpdated,
    onDeviceUpdated:          handleDeviceUpdated,
  }

  function renderSectionGrid(sectionKey, editMode) {
    const layout = layouts[sectionKey]
    if (!layout) return null

    return (
      <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
        {layout.map((slotValue, idx) => {
          const tester = slotValue != null ? testerMap[slotValue] : null
          const slotId = tester ? tester.id : `empty-${sectionKey}-${idx}`
          return (
            <Slot
              key={slotId}
              slotId={slotId}
              tester={tester ?? null}
              editMode={editMode}
              onRemoveEmpty={removeEmptySlot}
              cardProps={{
                ...sharedCardProps,
                handler: tester?.handler ?? null,
                openLog: tester ? (openLogByTester[tester.id] ?? null) : null,
                openTroubleshootingSession: tester ? (openSessionByTester[tester.id] ?? null) : null,
              }}
            />
          )
        })}
        {editMode && isAdmin && (
          <AddSlotButton onClick={() => addEmptySlot(sectionKey)} />
        )}
      </div>
    )
  }

  const activeDragTester = activeDragId != null ? testerMap[activeDragId] : null
  const offline = handlers.filter((h) => !h.current_tester_id)

  // Count occupied slots for section headers
  const slotCount = (key) => (layouts[key] ?? []).length

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Dashboard" />

      <main className="px-3 py-4 sm:px-6 sm:py-6 max-w-screen-xl mx-auto overflow-x-hidden">

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200
                          rounded-lg text-sm text-red-700 mb-6">
            <span className="mt-0.5">⚠</span><span>{error}</span>
          </div>
        )}

        {loading ? (
          <div>
            <SectionHeader title="Loading stations…" count="—" />
            <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
              {Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : testers.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <span className="text-gray-400 text-2xl">○</span>
            </div>
            <p className="text-sm font-medium text-gray-700">No stations found</p>
            <p className="text-xs text-gray-400 mt-1">
              Run <code className="bg-gray-100 px-1 rounded">flask seed</code> to populate tester stations.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">

            {/* ── Plant 1 ── */}
            {(layouts.plant1?.length > 0 || layoutEditMode) && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Plant 1
                  </h2>
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400">{slotCount('plant1')} stations</span>
                  {isAdmin && (
                    <button
                      onClick={() => setLayoutEditMode((v) => !v)}
                      className={`ml-2 px-2.5 py-1 rounded-lg text-xs font-medium border transition
                        ${layoutEditMode
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-600'}`}
                    >
                      {layoutEditMode ? '✓ Done Editing' : 'Edit Layout'}
                    </button>
                  )}
                </div>
                {layoutEditMode && (
                  <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 mb-4">
                    Drag cards to reposition. Click "+" to add an empty slot. Click "×" to remove one.
                  </p>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  {renderSectionGrid('plant1', layoutEditMode)}
                  <DragOverlay>
                    {activeDragTester && (
                      <div className="opacity-90 rotate-1 scale-105 shadow-xl">
                        <TesterCard
                          tester={activeDragTester}
                          handler={activeDragTester.handler ?? null}
                          openLog={openLogByTester[activeDragTester.id] ?? null}
                          openTroubleshootingSession={openSessionByTester[activeDragTester.id] ?? null}
                          {...sharedCardProps}
                        />
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              </section>
            )}

            {/* ── Plant 3 (Bays 1–3 in one DndContext so cross-bay drag works) ── */}
            {(['plant3_bay1', 'plant3_bay2', 'plant3_bay3'].some((k) => (layouts[k]?.length ?? 0) > 0) || layoutEditMode) && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Plant 3
                  </h2>
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs text-gray-400">
                    {['plant3_bay1', 'plant3_bay2', 'plant3_bay3'].reduce((s, k) => s + slotCount(k), 0)} stations
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => setLayoutEditMode((v) => !v)}
                      className={`ml-2 px-2.5 py-1 rounded-lg text-xs font-medium border transition
                        ${layoutEditMode
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-600'}`}
                    >
                      {layoutEditMode ? '✓ Done Editing' : 'Edit Layout'}
                    </button>
                  )}
                </div>
                {layoutEditMode && (
                  <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 mb-4">
                    Drag cards anywhere — within a bay or across bays. "+" adds an empty slot. "×" removes one.
                  </p>
                )}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex flex-col gap-6">
                    {[1, 2, 3].map((bay) => {
                      const key = `plant3_bay${bay}`
                      return (
                        <div key={bay}>
                          <BayHeader bay={bay} />
                          {renderSectionGrid(key, layoutEditMode)}
                        </div>
                      )
                    })}
                  </div>

                  <DragOverlay>
                    {activeDragTester && (
                      <div className="opacity-90 rotate-1 scale-105 shadow-xl">
                        <TesterCard
                          tester={activeDragTester}
                          handler={activeDragTester.handler ?? null}
                          openLog={openLogByTester[activeDragTester.id] ?? null}
                          openTroubleshootingSession={openSessionByTester[activeDragTester.id] ?? null}
                          {...sharedCardProps}
                        />
                      </div>
                    )}
                  </DragOverlay>
                </DndContext>
              </section>
            )}

            {/* ── Offline Area ── */}
            <section>
              <SectionHeader title="Offline Area" count={offline.length} unit="handlers" />
              {offline.length === 0 ? (
                <p className="text-xs text-gray-400 italic">All handlers are docked to stations.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {offline.map((h) => (
                    <div key={h.id} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
                                        ${HANDLER_BADGE[h.handler_type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {h.handler_type}
                      </span>
                      <span className="text-xs font-mono text-gray-700">{h.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </main>
    </div>
  )
}
