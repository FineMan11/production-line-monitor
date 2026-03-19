import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import Navbar from '../components/Navbar'
import TesterCard from '../components/dashboard/TesterCard'
import { getTesters, getHandlers, getStatuses } from '../services/dashboardService'
import { getMaintenanceLogs } from '../services/maintenanceService'
import { getSessions } from '../services/troubleshootingService'

const HANDLER_BADGE = {
  JHT: 'bg-teal-100 text-teal-700',
  MT:  'bg-orange-100 text-orange-700',
  CAS: 'bg-pink-100 text-pink-700',
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

export default function DashboardPage() {
  const [testers,               setTesters]               = useState([])
  const [handlers,              setHandlers]              = useState([])
  const [statuses,              setStatuses]              = useState([])
  const [openLogByTester,       setOpenLogByTester]       = useState({})
  const [openSessionByTester,   setOpenSessionByTester]   = useState({})
  const [loading,               setLoading]               = useState(true)
  const [error,                 setError]                 = useState('')

  // ── Load all data on mount ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [testersRes, handlersRes, statusesRes, maintenanceRes, sessionsRes] = await Promise.all([
          getTesters(),
          getHandlers(),
          getStatuses(),
          getMaintenanceLogs({ open_only: true }),
          getSessions({ open_only: true }),
        ])
        setTesters(testersRes.data)
        setHandlers(handlersRes.data)
        setStatuses(statusesRes.data)

        // Build lookup: { [tester_id]: openLog }
        const lookup = {}
        maintenanceRes.data.forEach((log) => { lookup[log.tester_id] = log })
        setOpenLogByTester(lookup)

        // Build lookup: { [tester_id]: openSession }
        const sessionLookup = {}
        sessionsRes.data.forEach((s) => { sessionLookup[s.tester_id] = s })
        setOpenSessionByTester(sessionLookup)
      } catch {
        setError('Could not load station data. The backend may not be available yet.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── WebSocket — real-time status updates ────────────────────────────
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
    return () => {
      socket.off('status_update')
      socket.disconnect()
    }
  }, [])

  // ── State update callbacks passed to TesterCard ─────────────────────
  const handleStatusChange = (testerId, updatedTester) => {
    setTesters((prev) => prev.map((t) => t.id === testerId ? { ...t, ...updatedTester } : t))
  }

  const handleMaintenanceCreated = (newLog) => {
    setOpenLogByTester((prev) => ({ ...prev, [newLog.tester_id]: newLog }))
  }

  const handleMaintenanceClosed = (logId, testerId) => {
    setOpenLogByTester((prev) => {
      const next = { ...prev }
      delete next[testerId]
      return next
    })
  }

  const handleDeviceUpdated = (testerId, updatedTester) => {
    setTesters((prev) => prev.map((t) => t.id === testerId ? { ...t, ...updatedTester } : t))
  }

  const handleTroubleshootingUpdated = (testerId, session) => {
    setOpenSessionByTester((prev) => {
      const next = { ...prev }
      if (session) next[testerId] = session
      else delete next[testerId]
      return next
    })
  }

  const handleTesterEdited = (updatedTester) => {
    setTesters((prev) => prev.map((t) => t.id === updatedTester.id ? updatedTester : t))
    // If the tester now has a new handler, update handlers list too
    if (updatedTester.handler) {
      setHandlers((prev) => prev.map((h) =>
        h.id === updatedTester.handler.id
          ? { ...h, current_tester_id: updatedTester.id }
          : h.current_tester_id === updatedTester.id
            ? { ...h, current_tester_id: null }
            : h
      ))
    } else {
      // Handler was unassigned — move all handlers that were on this tester to offline
      setHandlers((prev) => prev.map((h) =>
        h.current_tester_id === updatedTester.id ? { ...h, current_tester_id: null } : h
      ))
    }
  }

  // ── Derived data ────────────────────────────────────────────────────
  const plant1  = testers.filter((t) => t.plant === 1).sort((a, b) => a.station_number - b.station_number)
  const plant2  = testers.filter((t) => t.plant === 2).sort((a, b) => a.station_number - b.station_number)
  const offline = handlers.filter((h) => !h.current_tester_id)

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Dashboard" />

      <main className="px-6 py-6 max-w-screen-xl mx-auto">

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-6">
            <span className="mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div>
            <SectionHeader title="Loading stations…" count="—" />
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
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
            {plant1.length > 0 && (
              <section>
                <SectionHeader title="Plant 1" count={plant1.length} />
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                  {plant1.map((tester) => (
                    <TesterCard
                      key={tester.id}
                      tester={tester}
                      handler={tester.handler ?? null}
                      openLog={openLogByTester[tester.id] ?? null}
                      openTroubleshootingSession={openSessionByTester[tester.id] ?? null}
                      statuses={statuses}
                      handlers={handlers}
                      onStatusChange={handleStatusChange}
                      onMaintenanceCreated={handleMaintenanceCreated}
                      onMaintenanceClosed={handleMaintenanceClosed}
                      onTesterEdited={handleTesterEdited}
                      onTroubleshootingUpdated={handleTroubleshootingUpdated}
                      onDeviceUpdated={handleDeviceUpdated}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Plant 2 ── */}
            {plant2.length > 0 && (
              <section>
                <SectionHeader title="Plant 2" count={plant2.length} />
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                  {plant2.map((tester) => (
                    <TesterCard
                      key={tester.id}
                      tester={tester}
                      handler={tester.handler ?? null}
                      openLog={openLogByTester[tester.id] ?? null}
                      openTroubleshootingSession={openSessionByTester[tester.id] ?? null}
                      statuses={statuses}
                      handlers={handlers}
                      onStatusChange={handleStatusChange}
                      onMaintenanceCreated={handleMaintenanceCreated}
                      onMaintenanceClosed={handleMaintenanceClosed}
                      onTesterEdited={handleTesterEdited}
                      onTroubleshootingUpdated={handleTroubleshootingUpdated}
                      onDeviceUpdated={handleDeviceUpdated}
                    />
                  ))}
                </div>
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
                    <div
                      key={h.id}
                      className="flex items-center gap-1.5 bg-white border border-gray-200
                                 rounded-lg px-3 py-2 shadow-sm"
                    >
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
