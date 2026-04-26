import { Link } from 'react-router-dom'
import { STATUS_BG, STATUS_DOT, STATUS_LABEL } from '../dashboard/statusColors'

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

export default function TesterDetailHeader({ tester }) {
  const typeBadge    = TYPE_BADGE[tester.tester_type]    ?? 'bg-gray-100 text-gray-700'
  const handlerBadge = HANDLER_BADGE[tester.handler?.handler_type] ?? 'bg-gray-100 text-gray-600'
  const statusBg     = STATUS_BG[tester.status_color]    ?? 'bg-gray-100'
  const statusDot    = STATUS_DOT[tester.status_color]   ?? 'bg-gray-400'
  const statusLabel  = STATUS_LABEL[tester.status_color] ?? 'text-gray-700'

  const location = tester.bay
    ? `Plant ${tester.plant} · Bay ${tester.bay}`
    : `Plant ${tester.plant}`

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-lg text-sm font-mono font-bold ${typeBadge}`}>
            {tester.name}
          </span>
          <div>
            <p className="text-xs text-gray-400">{tester.tester_type} · {location} · Station {tester.station_number}</p>
            {tester.current_device_customer && (
              <p className="text-xs text-indigo-600 font-medium mt-0.5">
                {tester.current_device_customer}
                {tester.current_device_part_number && ` · ${tester.current_device_part_number}`}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Current status badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusBg} ${statusLabel}`}>
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            {tester.status}
          </span>

          {/* Handler badge */}
          {tester.handler ? (
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-mono font-medium ${handlerBadge}`}>
              {tester.handler.name}
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm text-gray-400 bg-gray-100 italic">
              No handler
            </span>
          )}

          <Link
            to="/dashboard"
            className="text-sm text-gray-500 hover:text-teal-600 transition"
          >
            ← Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
