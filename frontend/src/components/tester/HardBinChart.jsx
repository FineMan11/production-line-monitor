import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const HB_COLORS = {
  HB04: '#fca5a5',
  HB08: '#f87171',
  HB12: '#dc2626',
}

export default function HardBinChart({ data = [] }) {
  if (!data.length) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mt-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Hard Bin Frequency (Upchuck)</h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="hard_bin" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
            cursor={{ fill: '#fff1f2' }}
          />
          <Bar dataKey="count" name="Sessions" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.hard_bin} fill={HB_COLORS[d.hard_bin] ?? '#fca5a5'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
