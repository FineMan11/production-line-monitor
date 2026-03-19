import { useEffect, useState, useCallback } from 'react'
import Navbar from '../components/Navbar'
import MaintenanceList from '../components/maintenance/MaintenanceList'
import TroubleshootingList from '../components/maintenance/TroubleshootingList'
import { getMaintenanceLogs } from '../services/maintenanceService'
import { getSessions } from '../services/troubleshootingService'
import { getTesters } from '../services/dashboardService'

export default function MaintenancePage() {
  const [testers,   setTesters]   = useState([])
  const [logs,      setLogs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filters,   setFilters]   = useState({ tester_id: '', date: '' })
  const [sessions,  setSessions]  = useState([])
  const [tsLoading, setTsLoading] = useState(true)
  const [tsFilters, setTsFilters] = useState({ tester_id: '', date: '' })

  useEffect(() => {
    getTesters()
      .then((res) => setTesters(res.data))
      .catch(() => {})
  }, [])

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.tester_id) params.tester_id = filters.tester_id
      if (filters.date)      params.date       = filters.date
      const res = await getMaintenanceLogs(params)
      setLogs(res.data)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { loadLogs() }, [loadLogs])

  const loadSessions = useCallback(async () => {
    setTsLoading(true)
    try {
      const params = {}
      if (tsFilters.tester_id) params.tester_id = tsFilters.tester_id
      if (tsFilters.date)      params.date       = tsFilters.date
      const res = await getSessions(params)
      setSessions(res.data)
    } catch {
      setSessions([])
    } finally {
      setTsLoading(false)
    }
  }, [tsFilters])

  useEffect(() => { loadSessions() }, [loadSessions])

  const handleClosed = (closedId) => {
    setLogs((prev) =>
      prev.map((log) =>
        log.id === closedId ? { ...log, end_time: new Date().toISOString() } : log
      )
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Maintenance Log" />

      <main className="px-6 py-6 max-w-screen-xl mx-auto">

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Maintenance Log</h1>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        <div className="flex flex-col gap-6">
          <MaintenanceList
            logs={logs}
            testers={testers}
            filters={filters}
            onFilterChange={setFilters}
            onClosed={handleClosed}
            onDeleted={(id) => setLogs((prev) => prev.filter((l) => l.id !== id))}
            loading={loading}
          />

          <TroubleshootingList
            sessions={sessions}
            testers={testers}
            filters={tsFilters}
            onFilterChange={setTsFilters}
            onDeleted={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))}
            loading={tsLoading}
          />
        </div>

      </main>
    </div>
  )
}
