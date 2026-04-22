import React, { useEffect, useState } from 'react'
import { Bell, CheckCircle2, Clock3, FileUp, Send, ShieldAlert } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import InvestigatorDashboardPage from './InvestigatorDashboardPage'
import SellerDashboardPage from './SellerDashboardPage'
import LoadingSpinner from '../components/LoadingSpinner'
import { showToast } from '../components/NotificationToast'

function formatDate(d) {
  if (!d) return 'N/A'
  return new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

export default function DashboardPage() {
  const { user } = useAuth()
  if (user?.role === 'Investigator') {
    return <InvestigatorDashboardPage />
  }
  if (user?.role === 'Seller') {
    return <SellerDashboardPage />
  }

  return <ManagerDashboardPage />
}

function ManagerDashboardPage() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sendingReminders, setSendingReminders] = useState(false)

  async function handleSendReminders() {
    setSendingReminders(true)
    try {
      const res = await api.post('/api/violations/remind-overdue')
      const { remindersSent, totalOverdue } = res.data
      if (remindersSent > 0) {
        showToast(`SLA reminders sent to ${remindersSent} of ${totalOverdue} overdue seller(s).`, 'success')
      } else {
        showToast(`No overdue violations found that need reminders right now.`, 'info')
      }
    } catch {
      showToast('Failed to send SLA reminders — please try again.', 'error')
    } finally {
      setSendingReminders(false)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [recallsRes, shortlistRes] = await Promise.all([
          api.get('/api/recalls', { params: { page: 1, limit: 100 } }),
          api.get('/api/shortlist'),
        ])

        const shortlist = shortlistRes.data
        const recalls = recallsRes.data.recalls.map((recall) => {
          const shortlistItem = shortlist.find((item) => item.recallID === recall.recallID)
          return {
            ...recall,
            priorityLevel: shortlistItem?.priorityLevel ?? deriveSeverity(recall.hazard),
            status: shortlistItem ? deriveStatus(shortlistItem.priorityLevel) : 'Pending',
          }
        })

        setDashboard(buildDashboard(recalls))
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) return <LoadingSpinner />
  if (error || !dashboard) return (
    <div style={{ padding: 32 }}>
      <p style={{ color: '#b91c1c', fontSize: 15 }}>
        Unable to load dashboard data. The server may be starting up — please refresh in a moment.
      </p>
    </div>
  )

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <p style={eyebrow}>Manager Dashboard</p>
          <h1 style={title}>Recall Oversight</h1>
        </div>
      </div>

      <div style={statsGrid}>
        <MetricCard icon={FileUp} label="Total Recalls" value={dashboard.totalRecalls} accent="blue" />
        <MetricCard icon={ShieldAlert} label="High Priority" value={dashboard.highPriority} accent="rose" />
        <MetricCard icon={Clock3} label="Pending Review" value={dashboard.pendingReview} accent="amber" />
        <MetricCard icon={CheckCircle2} label="Resolved" value={dashboard.resolved} accent="green" />
      </div>

      <div style={contentGrid}>
        <div style={panel}>
          <div style={panelHeader}>
            <h2 style={panelTitle}>Recent Recalls</h2>
            <Link to="/recalls" style={panelLink}>View All</Link>
          </div>

          <table style={table}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                {['Product Name', 'Hazard', 'Status', 'Date'].map((heading) => (
                  <th key={heading} style={th}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboard.recentRecalls.map((item) => (
                <tr key={item.recallID} style={{ borderBottom: '1px solid #eef2f7' }}>
                  <td style={tdStrong}>{item.productName}</td>
                  <td style={td}>{item.hazard}</td>
                  <td style={td}>
                    <span style={statusPill(item.status)}>{item.status}</span>
                  </td>
                  <td style={td}>{formatDate(item.recallDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 22 }}>
            <h3 style={subheading}>Quick Actions</h3>
            <div style={quickActionGrid}>
              <QuickAction label="Import / View Recalls" tint="#dbeafe" to="/recalls" />
              {dashboard.featuredRecallId ? (
                <QuickAction label="View Recall" tint="#dbeafe" to={`/recalls/${dashboard.featuredRecallId}`} />
              ) : null}
              {dashboard.featuredRecallId ? (
                <QuickAction label="Prioritize Recalls" tint="#fee2e2" to={`/recalls/${dashboard.featuredRecallId}/prioritize`} />
              ) : null}
              <button
                type="button"
                style={{ ...quickButton, backgroundColor: '#dcfce7' }}
                onClick={handleSendReminders}
                disabled={sendingReminders}
              >
                <Send size={18} />
                {sendingReminders ? 'Sending…' : 'Send SLA Reminders'}
              </button>
            </div>
          </div>
        </div>

        <div style={sideStack}>
          <div style={panel}>
            <h2 style={panelTitle}>Recalls by Severity</h2>
            <div style={severityList}>
              {dashboard.severityBreakdown.map((item) => (
                <div key={item.label} style={severityRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ ...severityDot, backgroundColor: item.color }} />
                    <span style={{ fontWeight: 600, color: '#334155' }}>{item.label}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={panel}>
            <h2 style={panelTitle}>Status Overview</h2>
            {dashboard.statusBreakdown.map((item) => (
              <div key={item.label} style={{ marginBottom: 18 }}>
                <div style={statusHeader}>
                  <span style={{ color: '#334155', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ color: '#0f172a', fontWeight: 700 }}>{item.value}</span>
                </div>
                <div style={barTrack}>
                  <div style={{ ...barFill, width: `${item.percent}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, accent }) {
  const accents = {
    blue: 'linear-gradient(180deg, #eff6ff 0%, #60a5fa 100%)',
    rose: 'linear-gradient(180deg, #fff1f2 0%, #fda4af 100%)',
    amber: 'linear-gradient(180deg, #fffbeb 0%, #fcd34d 100%)',
    green: 'linear-gradient(180deg, #f0fdf4 0%, #4ade80 100%)',
  }

  return (
    <div style={{ ...metricCard, background: accents[accent] }}>
      <Icon size={32} color="#0f172a" />
      <div>
        <div style={{ fontSize: 15, color: '#334155' }}>{label}</div>
        <div style={{ fontSize: 42, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  )
}

function QuickAction({ label, to, tint }) {
  return (
    <Link to={to} style={{ ...quickButton, backgroundColor: tint, textDecoration: 'none' }}>
      {label}
    </Link>
  )
}

function buildDashboard(recalls) {
  const totalRecalls = recalls.length
  const highPriority = recalls.filter((item) => item.priorityLevel === 'High' || item.priorityLevel === 'Critical').length
  const pendingReview = recalls.filter((item) => item.status === 'Pending' || item.status === 'Under Review').length
  const resolved = recalls.filter((item) => item.status === 'Resolved').length
  const recentRecalls = [...recalls].sort((a, b) => new Date(b.recallDate) - new Date(a.recallDate)).slice(0, 5)
  const featuredRecallId = recentRecalls[0]?.recallID ?? recalls[0]?.recallID

  const severityBreakdown = [
    { label: 'High', value: recalls.filter((item) => item.priorityLevel === 'High').length, color: '#ef4444' },
    { label: 'Medium', value: recalls.filter((item) => item.priorityLevel === 'Medium').length, color: '#f59e0b' },
    { label: 'Low', value: recalls.filter((item) => item.priorityLevel === 'Low').length, color: '#60a5fa' },
  ]

  const statusCounts = [
    { label: 'Pending', value: recalls.filter((item) => item.status === 'Pending').length, color: '#3b82f6' },
    { label: 'Under Review', value: recalls.filter((item) => item.status === 'Under Review').length, color: '#eab308' },
    { label: 'Resolved', value: recalls.filter((item) => item.status === 'Resolved').length, color: '#22c55e' },
  ]

  const statusBreakdown = statusCounts.map((item) => ({
    ...item,
    percent: totalRecalls ? Math.max(8, Math.round((item.value / totalRecalls) * 100)) : 0,
  }))

  return {
    totalRecalls,
    highPriority,
    pendingReview,
    resolved,
    recentRecalls,
    featuredRecallId,
    severityBreakdown,
    statusBreakdown,
  }
}

function deriveSeverity(hazard = '') {
  const normalized = hazard.toLowerCase()
  if (/lead|shock|fire|fatal|smolder/.test(normalized)) return 'High'
  if (/brake|fall|burn|injury|crush|entrapment/.test(normalized)) return 'Medium'
  return 'Low'
}

function deriveStatus(priorityLevel) {
  if (priorityLevel === 'Low') return 'Resolved'
  if (priorityLevel === 'Medium') return 'Pending'
  return 'Under Review'
}

const page = {
  padding: '32px',
  maxWidth: 1320,
}

const header = {
  marginBottom: 22,
}

const eyebrow = {
  margin: 0,
  color: '#2563eb',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}

const title = {
  margin: '10px 0 0',
  fontSize: 42,
  lineHeight: 1.02,
  color: '#0f172a',
}

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 16,
  marginBottom: 22,
}

const metricCard = {
  minHeight: 138,
  borderRadius: 24,
  padding: '22px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 18,
  boxShadow: '0 14px 28px rgba(15, 23, 42, 0.08)',
}

const contentGrid = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.6fr) minmax(290px, 0.8fr)',
  gap: 18,
}

const panel = {
  backgroundColor: '#ffffff',
  borderRadius: 28,
  padding: 22,
  border: '1px solid #e2e8f0',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
}

const panelHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 14,
}

const panelTitle = {
  margin: 0,
  fontSize: 22,
  color: '#0f172a',
}

const panelLink = {
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 600,
}

const table = {
  width: '100%',
  borderCollapse: 'collapse',
}

const th = {
  textAlign: 'left',
  padding: '12px 10px',
  fontSize: 12,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const td = {
  padding: '14px 10px',
  fontSize: 14,
  color: '#475569',
}

const tdStrong = {
  ...td,
  color: '#0f172a',
  fontWeight: 600,
}

const subheading = {
  margin: '0 0 12px',
  fontSize: 18,
  color: '#0f172a',
}

const quickActionGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
}

const quickButton = {
  minHeight: 76,
  border: 'none',
  borderRadius: 18,
  padding: '18px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  color: '#0f172a',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
}

const sideStack = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
}

const severityList = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

const severityRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const severityDot = {
  width: 14,
  height: 14,
  borderRadius: '50%',
}

const statusHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 6,
}

const barTrack = {
  height: 8,
  backgroundColor: '#e2e8f0',
  borderRadius: 999,
  overflow: 'hidden',
}

const barFill = {
  height: '100%',
  borderRadius: 999,
}

function statusPill(status) {
  const map = {
    Pending: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
    'Under Review': { backgroundColor: '#fef3c7', color: '#b45309' },
    Resolved: { backgroundColor: '#dcfce7', color: '#15803d' },
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    ...(map[status] ?? map.Pending),
  }
}
