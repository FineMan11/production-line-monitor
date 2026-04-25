/**
 * TesterCard
 * Displays a single tester station with live status, handler info,
 * and a "..." maintenance dropdown menu.
 *
 * Props:
 *   tester               { id, name, tester_type, plant, station_number, status, status_color }
 *   handler              { id, name, handler_type } | null
 *   openLog              { id, technician, start_time } | null  — open maintenance log if any
 *   statuses             Array<{ id, name, color_code }>        — valid status options
 *   onStatusChange       (testerId, updatedTester) => void
 *   onMaintenanceCreated (newLog) => void
 *   onMaintenanceClosed  (logId, testerId) => void
 *   handlers             Array<handler>  — all handlers (for edit modal)
 *   onTesterEdited       (updatedTester) => void
 */
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { updateTesterStatus, updateTesterDevice } from '../../services/dashboardService'
import { closeMaintenanceLog } from '../../services/maintenanceService'
import { STATUS_BORDER, STATUS_DOT, STATUS_LABEL } from './statusColors'
import StationActionModal from './StationActionModal'
import StationHistoryModal from './StationHistoryModal'
import StationEditModal from './StationEditModal'
import TroubleshootingModal from './TroubleshootingModal'
import TroubleshootingHistoryModal from './TroubleshootingHistoryModal'

const TYPE_BADGE = {
  INTVG:  'bg-violet-100 text-violet-700',
  ETS364: 'bg-blue-100 text-blue-700',
  J750:   'bg-amber-100 text-amber-700',
  ETS800: 'bg-indigo-100 text-indigo-700',
  FLEX:   'bg-emerald-100 text-emerald-700',
  STS:    'bg-slate-100 text-slate-600',
}

const HANDLER_BADGE = {
  JHT: 'bg-teal-100 text-teal-700',
  MT:  'bg-orange-100 text-orange-700',
  CAS: 'bg-pink-100 text-pink-700',
  HT:  'bg-purple-100 text-purple-700',
}

export default function TesterCard({
  tester,
  handler,
  openLog,
  openTroubleshootingSession,
  statuses = [],
  handlers = [],
  onStatusChange,
  onMaintenanceCreated,
  onMaintenanceClosed,
  onTesterEdited,
  onTroubleshootingUpdated,
  onDeviceUpdated,
  dragHandleProps = null,
}) {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin'

  const [menuOpen,              setMenuOpen]              = useState(false)
  const [dropdownAlign,         setDropdownAlign]         = useState('right')
  const [statusPickerOpen,      setStatusPickerOpen]      = useState(false)
  const [showMaintModal,        setShowMaintModal]        = useState(false)
  const [showHistoryModal,      setShowHistoryModal]      = useState(false)
  const [showEditModal,         setShowEditModal]         = useState(false)
  const [showTroubleModal,      setShowTroubleModal]      = useState(false)
  const [showTroubleHistory,    setShowTroubleHistory]    = useState(false)
  const [closingLog,            setClosingLog]            = useState(false)
  const [statusLoading,         setStatusLoading]         = useState(false)
  const [localOpenSession,      setLocalOpenSession]      = useState(openTroubleshootingSession ?? null)
  // Device editing
  const [deviceEditMode,  setDeviceEditMode]  = useState(false)
  const [deviceCustomer,  setDeviceCustomer]  = useState(tester.current_device_customer  ?? '')
  const [devicePartNo,    setDevicePartNo]    = useState(tester.current_device_part_number ?? '')
  const [deviceLotNo,     setDeviceLotNo]     = useState(tester.current_device_lot_number  ?? '')
  const [deviceSaving,    setDeviceSaving]    = useState(false)

  const menuRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setStatusPickerOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function handleDeviceSave() {
    setDeviceSaving(true)
    try {
      const res = await updateTesterDevice(tester.id, {
        customer:    deviceCustomer.trim()  || null,
        part_number: devicePartNo.trim()    || null,
        lot_number:  deviceLotNo.trim()     || null,
      })
      onDeviceUpdated?.(tester.id, res.data)
      setDeviceEditMode(false)
    } catch {
      // silent — fields stay editable
    } finally {
      setDeviceSaving(false)
    }
  }

  function handleDeviceCancel() {
    setDeviceCustomer(tester.current_device_customer   ?? '')
    setDevicePartNo(tester.current_device_part_number  ?? '')
    setDeviceLotNo(tester.current_device_lot_number    ?? '')
    setDeviceEditMode(false)
  }

  const isOffline    = !handler
  const borderClass  = isOffline ? 'border-gray-300' : (STATUS_BORDER[tester.status_color] ?? 'border-gray-200')
  const typeBadge    = TYPE_BADGE[tester.tester_type] ?? 'bg-gray-100 text-gray-700'
  const handlerBadge = HANDLER_BADGE[handler?.handler_type] ?? 'bg-gray-100 text-gray-600'

  async function handleStatusSelect(statusName) {
    if (statusLoading) return
    setStatusLoading(true)
    setMenuOpen(false)
    setStatusPickerOpen(false)
    try {
      const res = await updateTesterStatus(tester.id, { status: statusName })
      onStatusChange?.(tester.id, res.data)
    } catch {
      // status update failed — card will revert on next full fetch
    } finally {
      setStatusLoading(false)
    }
  }

  async function handleCloseMaintenance() {
    if (closingLog || !openLog) return
    setClosingLog(true)
    setMenuOpen(false)
    try {
      await closeMaintenanceLog(openLog.id)
      onMaintenanceClosed?.(openLog.id, tester.id)
    } catch {
      // silent — state stays consistent on next full fetch
    } finally {
      setClosingLog(false)
    }
  }

  return (
    <>
      <div
        className={`relative rounded-lg border-2 ${borderClass} shadow-sm p-3
                    hover:shadow-md transition-all cursor-default
                    ${isOffline ? 'bg-gray-50' : 'bg-white'}`}
      >
        {/* ── Drag handle (layout edit mode only) ── */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="absolute top-1 left-1/2 -translate-x-1/2 text-gray-300 hover:text-gray-500
                       cursor-grab active:cursor-grabbing select-none text-base leading-none px-2 py-0.5"
            title="Drag to move to another bay"
          >
            ⠿
          </div>
        )}

        {/* ── Top row: name + menu button ── */}
        <div className="flex items-start justify-between gap-1">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold truncate ${typeBadge}`}
                title={tester.name}>
            {tester.name}
          </span>

          {/* Three-dot menu trigger */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => {
                if (!menuOpen && menuRef.current) {
                  const rect = menuRef.current.getBoundingClientRect()
                  setDropdownAlign(rect.left < window.innerWidth / 2 ? 'left' : 'right')
                }
                setMenuOpen((o) => !o)
                setStatusPickerOpen(false)
              }}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              title="Station actions"
            >
              <span className="text-base leading-none select-none">···</span>
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className={`absolute top-full mt-1 w-44 bg-white border border-gray-200
                              rounded-lg shadow-md z-20 py-1
                              ${dropdownAlign === 'left' ? 'left-0' : 'right-0'}`}>

                {/* Change Status (expands inline) */}
                <button
                  onClick={() => setStatusPickerOpen((o) => !o)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition
                             flex items-center justify-between"
                >
                  <span>Change Status</span>
                  <span className="text-gray-400 text-xs">{statusPickerOpen ? '▲' : '▼'}</span>
                </button>

                {statusPickerOpen && (
                  <div className="border-t border-gray-100 py-1">
                    {statuses.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleStatusSelect(s.name)}
                        disabled={statusLoading}
                        className={`w-full text-left px-4 py-1.5 text-xs flex items-center gap-2
                                    hover:bg-gray-50 transition disabled:opacity-50
                                    ${tester.status === s.name ? 'font-semibold' : ''}`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0
                                          ${STATUS_DOT[s.color_code] ?? 'bg-gray-400'}`} />
                        {s.name}
                        {tester.status === s.name && <span className="ml-auto text-teal-600">✓</span>}
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-100 mt-1 pt-1">
                  {/* Start / Close Maintenance */}
                  {openLog ? (
                    <button
                      onClick={handleCloseMaintenance}
                      disabled={closingLog}
                      className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50
                                 transition disabled:opacity-50"
                    >
                      {closingLog ? 'Closing…' : 'Close Maintenance'}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setMenuOpen(false); setShowMaintModal(true) }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      Start Maintenance
                    </button>
                  )}

                  {/* Troubleshooting */}
                  {localOpenSession ? (
                    <button
                      onClick={() => { setMenuOpen(false); setShowTroubleModal(true) }}
                      className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition"
                    >
                      Active Troubleshooting
                    </button>
                  ) : (
                    <button
                      onClick={() => { setMenuOpen(false); setShowTroubleModal(true) }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      Start Troubleshooting
                    </button>
                  )}

                  {/* Edit Station — admin only */}
                  {isAdmin && (
                    <>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => { setMenuOpen(false); setShowEditModal(true) }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        Edit Station
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Status dot + label ── */}
        <div className="mt-1">
          {isOffline ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              Offline
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 text-xs font-medium
                              ${STATUS_LABEL[tester.status_color] ?? 'text-gray-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[tester.status_color] ?? 'bg-gray-400'}
                                ${openLog ? 'animate-pulse' : ''}`} />
              {tester.status}
            </span>
          )}
        </div>

        {/* ── Handler row ── */}
        <div className="mt-2 pt-2 border-t border-gray-100">
          {handler ? (
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-medium ${handlerBadge}`}>
                {handler.name}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic">No handler</span>
          )}
        </div>

        {/* ── Device under test ── */}
        <div className="mt-2 pt-2 border-t border-gray-100">
          {deviceEditMode ? (
            <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                type="text" value={deviceCustomer} onChange={(e) => setDeviceCustomer(e.target.value)}
                placeholder="Customer / Product"
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs
                           focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <input
                type="text" value={devicePartNo} onChange={(e) => setDevicePartNo(e.target.value)}
                placeholder="Part number"
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono
                           focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <input
                type="text" value={deviceLotNo} onChange={(e) => setDeviceLotNo(e.target.value)}
                placeholder="Lot number"
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono
                           focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <div className="flex gap-1 pt-0.5">
                <button onClick={handleDeviceSave} disabled={deviceSaving}
                  className="flex-1 py-1 rounded bg-indigo-600 text-white text-xs font-medium
                             hover:bg-indigo-700 disabled:opacity-50 transition">
                  {deviceSaving ? '…' : 'Save'}
                </button>
                <button onClick={handleDeviceCancel}
                  className="flex-1 py-1 rounded border border-gray-300 text-xs text-gray-600
                             hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          ) : (deviceCustomer || devicePartNo || deviceLotNo) ? (
            <button onClick={() => setDeviceEditMode(true)}
              className="w-full text-left group">
              <p className="text-xs text-indigo-700 font-medium truncate group-hover:underline">
                {deviceCustomer || '—'}
              </p>
              <p className="text-xs text-gray-500 font-mono truncate">
                {[devicePartNo, deviceLotNo].filter(Boolean).join(' · ')}
              </p>
            </button>
          ) : (
            <button onClick={() => setDeviceEditMode(true)}
              className="text-xs text-gray-400 hover:text-indigo-500 transition italic">
              + Add device
            </button>
          )}
        </div>

        {/* Open maintenance indicator banner */}
        {openLog && (
          <div className="mt-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
            🔧 {openLog.technician}
          </div>
        )}

        {/* Open troubleshooting session banner */}
        {localOpenSession && (
          <div className="mt-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 cursor-pointer"
               onClick={() => setShowTroubleModal(true)}>
            🔍 {localOpenSession.hard_bin} — {localOpenSession.technician}
          </div>
        )}
      </div>

      {/* Modals (rendered outside card layout flow via React portals not needed — fixed overlay handles it) */}
      {showMaintModal && (
        <StationActionModal
          tester={tester}
          onClose={() => setShowMaintModal(false)}
          onCreated={(log) => { onMaintenanceCreated?.(log); setShowMaintModal(false) }}
        />
      )}

      {showHistoryModal && (
        <StationHistoryModal
          tester={tester}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {showEditModal && (
        <StationEditModal
          tester={tester}
          handlers={handlers}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => { onTesterEdited?.(updated); setShowEditModal(false) }}
        />
      )}

      {showTroubleModal && (
        <TroubleshootingModal
          tester={tester}
          openSession={localOpenSession}
          onSessionStarted={(s) => {
            setLocalOpenSession(s)
            onTroubleshootingUpdated?.(tester.id, s)
          }}
          onStepAdded={(s) => {
            setLocalOpenSession(s)
            onTroubleshootingUpdated?.(tester.id, s)
          }}
          onSessionClosed={(s) => {
            setLocalOpenSession(null)
            onTroubleshootingUpdated?.(tester.id, null)
          }}
          onClose={() => setShowTroubleModal(false)}
        />
      )}

      {showTroubleHistory && (
        <TroubleshootingHistoryModal
          tester={tester}
          onClose={() => setShowTroubleHistory(false)}
        />
      )}
    </>
  )
}
