import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

export default function OKRBarChart({ title, baseline, current, target }) {
  const data = [
    { name: 'Performance', Baseline: baseline, Current: current, Target: target },
  ]

  return (
    <div>
      {title && (
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#334155' }}>
          {title}
        </h4>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="40%" barGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="name" hide />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 13,
              borderRadius: 6,
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
            iconType="square"
          />
          <Bar dataKey="Baseline" fill="#94A3B8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Current"  fill="#0071BC" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Target"   fill="#16A34A" radius={[4, 4, 0, 0]} opacity={0.75} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
