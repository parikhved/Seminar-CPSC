import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, AlertTriangle, TrendingUp, CheckCircle,
  ArrowRight, BarChart3, List,
} from 'lucide-react'
import api from '../api/axios'
import StatsCard from '../components/StatsCard'
import PriorityBadge from '../components/PriorityBadge'
import LoadingSpinner from '../components/LoadingSpinner'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DashboardPage() {
  const [okr, setOkr] = useState(null)
  const [recentItems, setRecentItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [okrRes, listRes] = await Promise.all([
          api.get('/api/shortlist/analytics/okr'),
          api.get('/api/shortlist'),
        ])
        setOkr(okrRes.data)
        setRecentItems(listRes.data.slice(0, 5))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingSpinner />

  const completenessStr = okr
    ? `${okr.complete_records} / ${okr.complete_target} complete`
    : '—'

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200 }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#71767a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Manager Dashboard
        </p>
        <h1 style={{ margin: '0 0 16px', fontSize: 28, fontWeight: 700, color: '#162e51', lineHeight: 1.2 }}>
          Recall Prioritization Overview
        </h1>
        <div style={{ height: 1, backgroundColor: '#dfe1e2' }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, marginBottom: 40, border: '1px solid #dfe1e2' }}>
        <StatsCard
          title="Total Recalls"
          value={okr?.total_recalls ?? '—'}
          subtitle="In CPSC database"
        />
        <StatsCard
          title="Shortlisted"
          value={okr?.total_shortlisted ?? '—'}
          subtitle="Recalls prioritized"
        />
        <StatsCard
          title="Shortlist Progress"
          value={okr ? `${okr.total_shortlisted} / ${okr.shortlist_target}` : '—'}
          subtitle={`Target: ${okr?.shortlist_target ?? 134}`}
        />
        <StatsCard
          title="Record Completeness"
          value={okr ? `${okr.completeness_percentage}%` : '—'}
          subtitle={completenessStr}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 32, alignItems: 'start' }}>

        {/* Recent activity */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#162e51' }}>Recent Priority List Activity</h2>
            <Link to="/shortlist" style={{ fontSize: 13, color: '#0071BC', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              View All <ArrowRight size={13} />
            </Link>
          </div>
          <div style={{ border: '1px solid #dfe1e2' }}>
            {recentItems.length === 0 ? (
              <p style={{ color: '#71767a', fontSize: 14, padding: 20, margin: 0 }}>No recalls have been shortlisted yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #dfe1e2' }}>
                    {['Product Name', 'Priority', 'Date Added'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 700, color: '#1b1b1b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((item, i) => (
                    <tr key={item.shortListID} style={{ borderBottom: i < recentItems.length - 1 ? '1px solid #dfe1e2' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#1b1b1b', fontWeight: 400, maxWidth: 300 }}>
                        {item.productName?.length > 55 ? item.productName.slice(0, 55) + '…' : (item.productName ?? '—')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <PriorityBadge level={item.priorityLevel} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#71767a', whiteSpace: 'nowrap' }}>
                        {formatDate(item.shortListDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#162e51' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #dfe1e2' }}>
            <QuickAction to="/recalls" icon={List} label="View Recall List" />
            <QuickAction to="/shortlist" icon={AlertTriangle} label="View Priority List" />
            <QuickAction to="/analytics" icon={BarChart3} label="View Analytics" />
          </div>
        </div>

      </div>
    </div>
  )
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 16px',
        borderBottom: '1px solid #dfe1e2',
        backgroundColor: '#ffffff',
        color: '#0071BC',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 600,
        transition: 'background-color 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f0f0' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff' }}
    >
      <Icon size={15} />
      {label}
      <ArrowRight size={13} color="#a9aeb1" style={{ marginLeft: 'auto' }} />
    </Link>
  )
}
