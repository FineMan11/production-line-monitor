import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

export default function ActionTagsChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Action Tags</h2>
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
          No action tags recorded yet
        </div>
      </div>
    )
  }

  // Recharts vertical bar needs reversed order so highest is at top
  const sorted = [...data].reverse()

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Action Tags</h2>
      <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 32)}>
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="tag" width={130} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            cursor={{ fill: '#f0fdfa' }}
          />
          <Bar dataKey="count" name="Uses" radius={[0, 3, 3, 0]}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={i === sorted.length - 1 ? '#0d9488' : '#5eead4'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
