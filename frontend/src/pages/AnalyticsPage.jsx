import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
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

const CATEGORY_COLORS = {
  Toy:                '#3B82F6',
  Helmet:             '#EF4444',
  Furniture:          '#F59E0B',
  'Outdoor Equipment':'#10B981',
  'Baby Product':     '#8B5CF6',
  Vehicle:            '#EC4899',
  Appliance:          '#06B6D4',
  Other:              '#94A3B8',
}

function StatusBadge({ current, target }) {
  const pct = target > 0 ? (current / target) * 100 : 0
  let label, bg, color
  if (pct >= 100)     { label = 'Achieved'; bg = '#F0FDF4'; color = '#16A34A' }
  else if (pct >= 70) { label = 'On Track'; bg = '#EFF6FF'; color = '#0071BC' }
  else                { label = 'Behind';   bg = '#FEF2F2'; color = '#DC2626' }
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

function SectionHeading({ children }) {
  return (
    <h2 style={{ margin: '32px 0 16px', fontSize: 18, fontWeight: 700, color: '#0A1628', borderBottom: '2px solid #E2E8F0', paddingBottom: 10 }}>
      {children}
    </h2>
  )
}

function pivotCategoryWeek(rows) {
  const byWeek = {}
  const categories = new Set()
  rows.forEach(({ week, category, count }) => {
    if (!byWeek[week]) byWeek[week] = { week: week.slice(0, 10) }
    byWeek[week][category] = count
    categories.add(category)
  })
  return { data: Object.values(byWeek), categories: [...categories].sort() }
}

export default function AnalyticsPage() {
  const [okr, setOkr]                       = useState(null)
  const [incomplete, setIncomplete]          = useState([])
  const [shortlistTrend, setShortlistTrend]  = useState([])
  const [recallsByDate, setRecallsByDate]    = useState([])
  const [categoryWeek, setCategoryWeek]      = useState([])
  const [violationOverview, setViolationOverview] = useState({
    newViolationsByDay: [],
    newViolationsTotal: 0,
    documentationCompletion: { complete: 0, incomplete: 0, percentageComplete: 0 },
    resolutionRate: { resolved: 0, unresolved: 0, percentageResolved: 0 },
  })
  const [loading, setLoading]                = useState(true)
  const [error, setError]                    = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [
          okrRes,
          incRes,
          trendRes,
          dateRes,
          catRes,
          violationRes,
        ] = await Promise.all([
          api.get('/api/shortlist/analytics/okr'),
          api.get('/api/analytics/incomplete-recalls'),
          api.get('/api/analytics/shortlist-trend'),
          api.get('/api/analytics/recalls-by-date'),
          api.get('/api/analytics/category-week'),
          api.get('/api/analytics/violations-overview'),
        ])

        setOkr(okrRes.data)
        setIncomplete(incRes.data)
        setShortlistTrend(trendRes.data)
        setRecallsByDate(dateRes.data)
        setCategoryWeek(catRes.data)
        setViolationOverview(violationRes.data)
        setError('')
      } catch {
        setError('Unable to load analytics right now. Please refresh in a moment.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) return <LoadingSpinner />
  if (error || !okr) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: '#b91c1c', fontSize: 15 }}>{error || 'Unable to load analytics right now.'}</p>
      </div>
    )
  }

  const pieData = Object.entries(okr.shortlist_by_priority)
    .filter(([, cnt]) => cnt > 0)
    .map(([name, value]) => ({ name, value }))

  const { data: catWeekData, categories } = pivotCategoryWeek(categoryWeek)
  const documentationPieData = [
    { name: 'Complete', value: violationOverview.documentationCompletion.complete, color: '#16A34A' },
    { name: 'Incomplete', value: violationOverview.documentationCompletion.incomplete, color: '#DC2626' },
  ]
  const resolutionPieData = [
    { name: 'Resolved', value: violationOverview.resolutionRate.resolved, color: '#16A34A' },
    { name: 'Unresolved', value: violationOverview.resolutionRate.unresolved, color: '#EA580C' },
  ]

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0A1628' }}>Analytics</h1>
        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>OKR performance tracking — live database</p>
      </div>

      <SectionHeading>Violation Analytics</SectionHeading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h3 style={cardTitle}>New Violations</h3>
              <p style={cardDesc}>Number of new violations found during the last 7 days.</p>
            </div>
            <div style={metricBadge}>
              {violationOverview.newViolationsTotal} this week
            </div>
          </div>
          {violationOverview.newViolationsByDay.length === 0 ? (
            <p style={emptyMsg}>No weekly violation data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={violationOverview.newViolationsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="count" fill="#2563EB" radius={[8, 8, 0, 0]} name="New Violations" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card}>
          <h3 style={{ ...cardTitle, marginBottom: 8 }}>Violation Documentation Completion</h3>
          <p style={cardDesc}>Percentage of violations with all required documentation fields completed.</p>
          {documentationPieData.every((item) => item.value === 0) ? (
            <p style={emptyMsg}>No violation data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={documentationPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {documentationPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={metricSummary}>
            <strong>{violationOverview.documentationCompletion.percentageComplete}% complete</strong>
            <span>{violationOverview.documentationCompletion.complete} complete</span>
            <span>{violationOverview.documentationCompletion.incomplete} incomplete</span>
          </div>
        </div>

        <div style={card}>
          <h3 style={{ ...cardTitle, marginBottom: 8 }}>Violation Resolution Rate</h3>
          <p style={cardDesc}>Percentage of current violations that have been resolved versus unresolved.</p>
          {resolutionPieData.every((item) => item.value === 0) ? (
            <p style={emptyMsg}>No violation data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={resolutionPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {resolutionPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #E2E8F0' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={metricSummary}>
            <strong>{violationOverview.resolutionRate.percentageResolved}% resolved</strong>
            <span>{violationOverview.resolutionRate.resolved} resolved</span>
            <span>{violationOverview.resolutionRate.unresolved} unresolved</span>
          </div>
        </div>
      </div>

      {/* ── OKR 1.1 ── */}
      <SectionHeading>OKR 1.1 — High Priority Recalls Shortlisted per Quarter</SectionHeading>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h3 style={cardTitle}>Current vs Baseline</h3>
            <StatusBadge current={okr.total_shortlisted} target={okr.shortlist_target} />
          </div>
          <p style={cardDesc}>Increase shortlisted recalls from baseline of 122 to target of 134 (10% increase).</p>
          <OKRBarChart baseline={okr.shortlist_baseline} current={okr.total_shortlisted} target={okr.shortlist_target} />
          <ProgressBar current={okr.total_shortlisted} target={okr.shortlist_target} />
        </div>

        <div style={card}>
          <h3 style={{ ...cardTitle, marginBottom: 16 }}>Shortlist Trend</h3>
          {shortlistTrend.length === 0 ? (
            <p style={emptyMsg}>No trend data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={shortlistTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #E2E8F0' }} />
                <Line type="monotone" dataKey="count" stroke="#0071BC" strokeWidth={2} dot={{ r: 4 }} name="Shortlisted" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── OKR 1.2 ── */}
      <SectionHeading>OKR 1.2 — Recall Prioritization Completeness</SectionHeading>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h3 style={cardTitle}>Current vs Baseline</h3>
            <StatusBadge current={okr.complete_records} target={okr.complete_target} />
          </div>
          <p style={cardDesc}>Increase complete shortlist records from baseline of 42 to target of 50 (20% improvement).</p>
          <OKRBarChart baseline={okr.complete_baseline} current={okr.complete_records} target={okr.complete_target} />
          <ProgressBar current={okr.complete_records} target={okr.complete_target} />
        </div>

        <div style={card}>
          <h3 style={{ ...cardTitle, marginBottom: 16 }}>Recalls by Month</h3>
          {recallsByDate.length === 0 ? (
            <p style={emptyMsg}>No data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={recallsByDate} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #E2E8F0' }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0071BC"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: '#0071BC', strokeWidth: 0 }}
                  activeDot={{ r: 7 }}
                  name="Recalls"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── OKR 1.3 ── */}
      <SectionHeading>OKR 1.3 — Prioritized Recalls by Product Category and Week</SectionHeading>
      <div style={card}>
        {catWeekData.length === 0 ? (
          <p style={emptyMsg}>No data available yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={catWeekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #E2E8F0' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
              {categories.map((cat) => (
                <Bar key={cat} dataKey={cat} stackId="a" fill={CATEGORY_COLORS[cat] ?? '#94A3B8'} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Shortlist Distribution ── */}
      <SectionHeading>Shortlist Distribution</SectionHeading>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={card}>
          <h3 style={{ ...cardTitle, marginBottom: 16 }}>Priority Level Distribution</h3>
          {pieData.length === 0 ? (
            <p style={emptyMsg}>No data available yet.</p>
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
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 6, border: '1px solid #E2E8F0' }} />
                <Legend wrapperStyle={{ fontSize: 13 }} iconType="square" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={card}>
          <h3 style={{ ...cardTitle, marginBottom: 16 }}>Performance Summary</h3>
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
              {[
                { metric: 'Shortlisted Recalls', baseline: okr.shortlist_baseline, current: okr.total_shortlisted, target: okr.shortlist_target },
                { metric: 'Complete Records',    baseline: okr.complete_baseline,   current: okr.complete_records,  target: okr.complete_target },
              ].map((row) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 12px 12px 0', fontWeight: 500, color: '#1E293B' }}>{row.metric}</td>
                  <td style={{ padding: '12px 12px 12px 0', color: '#64748B' }}>{row.baseline}</td>
                  <td style={{ padding: '12px 12px 12px 0', fontWeight: 600, color: '#0071BC' }}>{row.current}</td>
                  <td style={{ padding: '12px 12px 12px 0', color: '#64748B' }}>{row.target}</td>
                  <td style={{ padding: '12px 0' }}><StatusBadge current={row.current} target={row.target} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 20, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 8, fontSize: 13, color: '#64748B' }}>
            <strong style={{ color: '#0A1628' }}>Completeness Rate:</strong> {okr.completeness_percentage}% of shortlisted recalls have all required fields completed.
          </div>
        </div>
      </div>

      {/* ── Incomplete Recalls ── */}
      <SectionHeading>Incomplete Recalls ({incomplete.length})</SectionHeading>
      <div style={card}>
        {incomplete.length === 0 ? (
          <p style={{ ...emptyMsg, color: '#16A34A' }}>All recalls have complete records.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC' }}>
                  {['ID', 'Product Name', 'Manufacturer', 'Hazard', 'Recall Date', 'URL'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incomplete.map((r) => (
                  <tr key={r.recallID} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={tdStyle}>{r.recallID}</td>
                    <td style={{ ...tdStyle, color: r.productName ? '#1E293B' : '#EF4444', fontWeight: 500 }}>
                      {r.productName || '⚠ Missing'}
                    </td>
                    <td style={{ ...tdStyle, color: r.manufacturerName ? '#475569' : '#EF4444' }}>
                      {r.manufacturerName || '⚠ Missing'}
                    </td>
                    <td style={{ ...tdStyle, color: r.hazard ? '#475569' : '#EF4444' }}>
                      {r.hazard ? (r.hazard.length > 60 ? r.hazard.slice(0, 60) + '…' : r.hazard) : '⚠ Missing'}
                    </td>
                    <td style={{ ...tdStyle, color: r.recallDate ? '#475569' : '#EF4444', whiteSpace: 'nowrap' }}>
                      {r.recallDate || '⚠ Missing'}
                    </td>
                    <td style={{ ...tdStyle, color: r.recallURL ? '#475569' : '#EF4444' }}>
                      {r.recallURL || '⚠ Missing'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

const cardTitle = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: '#0A1628',
}

const cardDesc = {
  margin: '0 0 16px',
  fontSize: 13,
  color: '#64748B',
  lineHeight: 1.6,
}

const emptyMsg = {
  color: '#94A3B8',
  fontSize: 14,
  margin: 0,
}

const tdStyle = {
  padding: '11px 12px',
  fontSize: 13,
  color: '#475569',
  verticalAlign: 'middle',
}

const metricBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  backgroundColor: '#dbeafe',
  color: '#1d4ed8',
  fontSize: 12,
  fontWeight: 700,
}

const metricSummary = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginTop: 12,
  color: '#475569',
  fontSize: 13,
}
