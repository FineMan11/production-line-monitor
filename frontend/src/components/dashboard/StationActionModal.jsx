/**
 * StationActionModal
 * Wraps MaintenanceForm in a modal overlay, launched from TesterCard's "Start Maintenance" action.
 *
 * Props:
 *   tester    { id, name }
 *   onClose   () => void
 *   onCreated (newLog) => void
 */
import MaintenanceForm from '../maintenance/MaintenanceForm'

export default function StationActionModal({ tester, onClose, onCreated }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            Log Maintenance — <span className="font-mono">{tester.name}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <MaintenanceForm
            mode="modal"
            initialTesterId={tester.id}
            onCreated={(log) => { onCreated(log); onClose() }}
            onClose={onClose}
          />
        </div>

      </div>
    </div>
  )
}
