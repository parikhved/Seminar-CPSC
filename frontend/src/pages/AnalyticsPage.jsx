import React, { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import api from '../api/axios'
import OKRBarChart from '../components/OKRBarChart'
import LoadingSpinner from '../components/LoadingSpinner'

const PIE_COLORS = {
  Critical: '#DC2626',
  High:     '#EA580C',
  Medium:   '#CA8A04',
  Low:      '#16A34A',
}

function StatusBadge({ current, target }) {
  const pct = target > 0 ? (current / target) * 100 : 0
  let label, bg, color
  if (pct >= 100) { label = 'Achieved'; bg = '#F0FDF4'; color = '#16A34A' }
  else if (pct >= 70)  { label = 'On Track'; bg = '#EFF6FF'; color = '#0071BC' }
  else { label = 'Behind';   bg = '#FEF2F2'; color = '#DC2626' }
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, backgroundColor: bg, color }}>
      {label}
    </span>
  )
}

function ProgressBar({ current, target }) {
  const pct = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0)
  const color = pct >= 100 ? '#16A34A' : pct >= 70 ? '#0071BC' : '#DC2626'
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: '#64748B' }}>Progress toward target</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{pct}%</span>
      </div>
      <div style={{ height: 8, backgroundColor: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [okr, setOkr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/shortlist/analytics/okr').then((r) => {
      setOkr(r.data)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const pieData = Object.entries(okr.shortlist_by_priority)
    .filter(([, cnt]) => cnt > 0)
    .map(([name, value]) => ({ name, value }))

  const metricRows = [
    { metric: 'Shortlisted Recalls', baseline: okr.shortlist_baseline, current: okr.total_shortlisted, target: okr.shortlist_target },
    { metric: 'Complete Records',    baseline: okr.complete_baseline,   current: okr.complete_records,  target: okr.complete_target },
  ]

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0A1628' }}>Analytics</h1>
        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>OKR performance tracking</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* OKR 1.1 */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0A1628' }}>High Priority Recalls Shortlisted per Quarter</h2>
            </div>
            <StatusBadge current={okr.total_shortlisted} target={okr.shortlist_target} />
          </div>

          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
            Increase the number of recalls shortlisted as high priority from a baseline of 122 to a target of 134, representing a 10% increase.
          </p>

          <OKRBarChart
            baseline={okr.shortlist_baseline}
            current={okr.total_shortlisted}
            target={okr.shortlist_target}
          />

          <ProgressBar current={okr.total_shortlisted} target={okr.shortlist_target} />
        </div>

        {/* OKR 1.2 */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0A1628' }}>Recall Prioritization Completeness</h2>
            </div>
            <StatusBadge current={okr.complete_records} target={okr.complete_target} />
          </div>

          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
            Increase the number of shortlist records with all required fields completed from a baseline of 42 to a target of 50, representing a 20% improvement.
          </p>

          <OKRBarChart
            baseline={okr.complete_baseline}
            current={okr.complete_records}
            target={okr.complete_target}
          />

          <ProgressBar current={okr.complete_records} target={okr.complete_target} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Priority Distribution Pie */}
        <div style={card}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0A1628' }}>Priority Level Distribution</h2>
          {pieData.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 14 }}>No data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? '#94A3B8'} />
                  ))}
                </Pie>
                <ReTooltip
                  contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #E2E8F0' }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} iconType="square" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Summary Table */}
        <div style={card}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0A1628' }}>Performance Summary</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Metric', 'Baseline', 'Current', 'Target', 'Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '0 12px 10px 0', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #E2E8F0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricRows.map((row) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 12px 12px 0', fontWeight: 500, color: '#1E293B' }}>{row.metric}</td>
                  <td style={{ padding: '12px 12px 12px 0', color: '#64748B' }}>{row.baseline}</td>
                  <td style={{ padding: '12px 12px 12px 0', fontWeight: 600, color: '#0071BC' }}>{row.current}</td>
                  <td style={{ padding: '12px 12px 12px 0', color: '#64748B' }}>{row.target}</td>
                  <td style={{ padding: '12px 0' }}>
                    <StatusBadge current={row.current} target={row.target} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 20, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 8, fontSize: 13, color: '#64748B' }}>
            <strong style={{ color: '#0A1628' }}>Completeness Rate:</strong> {okr.completeness_percentage}% of shortlisted recalls have all required fields completed.
          </div>
        </div>
      </div>
    </div>
  )
}

const card = {
  backgroundColor: '#FFFFFF',
  borderRadius: 8,
  padding: 24,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
}
