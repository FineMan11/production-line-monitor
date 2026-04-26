export default function TesterStatCards({ summary }) {
  const {
    total_sessions   = 0,
    upchuck_sessions = 0,
    jamming_sessions = 0,
    solved_sessions  = 0,
    open_sessions    = 0,
  } = summary

  const closed = total_sessions - open_sessions
  const solvedPct = closed > 0 ? Math.round((solved_sessions / closed) * 100) : null

  const cards = [
    {
      label: 'Total Sessions',
      value: total_sessions,
      sub: `${open_sessions} open`,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    {
      label: 'Upchuck',
      value: upchuck_sessions,
      sub: 'HB sessions',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
    },
    {
      label: 'Jamming',
      value: jamming_sessions,
      sub: 'jam sessions',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
    },
    {
      label: 'Solved Rate',
      value: solvedPct !== null ? `${solvedPct}%` : '—',
      sub: `${solved_sessions} of ${closed} closed`,
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{c.label}</p>
          <p className={`text-3xl font-bold mt-1 ${c.text}`}>{c.value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}
