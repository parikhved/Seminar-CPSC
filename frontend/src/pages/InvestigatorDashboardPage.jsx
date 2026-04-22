import React, { useEffect, useState } from 'react'
import { ArrowRight, ExternalLink, FileSearch, Mail, ShieldAlert, Siren } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

function formatDate(value) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatusTone(status) {
  if (status === 'Violation Logged') return { background: '#dcfce7', color: '#166534' }
  if (status === 'Ready to Compare') return { background: '#dbeafe', color: '#1d4ed8' }
  return { background: '#fef3c7', color: '#b45309' }
}

function buildDashboard(shortlistItems, violations, investigatorId) {
  const investigatorViolations = violations.filter((item) => item.investigatorID === investigatorId)

  const assignments = shortlistItems.map((item) => {
    const latestViolation = investigatorViolations
      .filter((violation) => violation.recallID === item.recallID)
      .sort((a, b) => new Date(b.dateDetected || 0) - new Date(a.dateDetected || 0))[0]

    return {
      ...item,
      violationStatus: latestViolation?.violationStatus ?? null,
      violationID: latestViolation?.violationID ?? null,
      evidenceURL: latestViolation?.evidenceURL ?? null,
      workflowStatus: latestViolation ? 'Violation Logged' : 'Ready to Compare',
    }
  })

  return {
    assignments,
    assignedCount: assignments.length,
    readyToCompare: assignments.filter((item) => !item.violationID).length,
    loggedViolations: investigatorViolations.length,
    notificationsReady: investigatorViolations.filter((item) => item.sellerEmail).length,
  }
}

function MetricCard({ icon: Icon, label, value, accent }) {
  const accents = {
    blue: 'linear-gradient(180deg, #eff6ff 0%, #93c5fd 100%)',
    amber: 'linear-gradient(180deg, #fffbeb 0%, #fcd34d 100%)',
    rose: 'linear-gradient(180deg, #fff1f2 0%, #fda4af 100%)',
    green: 'linear-gradient(180deg, #f0fdf4 0%, #86efac 100%)',
  }

  return (
    <div style={{ ...metricCard, background: accents[accent] }}>
      <Icon size={28} color="#0f172a" />
      <div>
        <div style={{ fontSize: 14, color: '#334155' }}>{label}</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#0f172a' }}>{value}</div>
      </div>
    </div>
  )
}

export default function InvestigatorDashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [violationsError, setViolationsError] = useState('')

  useEffect(() => {
    async function load() {
      const [shortlistResult, violationsResult] = await Promise.allSettled([
        api.get('/api/shortlist', { params: { investigatorUserID: user?.userID } }),
        api.get('/api/violations', { params: { investigatorUserID: user?.userID } }),
      ])

      if (shortlistResult.status !== 'fulfilled') {
        const detail = shortlistResult.reason?.response?.data?.detail
        setError(detail ?? 'Unable to load assigned recalls right now.')
        setLoading(false)
        return
      }

      const shortlistItems = shortlistResult.value.data
      let violations = []

      if (violationsResult.status === 'fulfilled') {
        violations = violationsResult.value.data
        setViolationsError('')
      } else {
        const detail = violationsResult.reason?.response?.data?.detail
        setViolationsError(detail ?? 'Violation history could not be loaded, but assigned recalls are available below.')
      }

      setDashboard(buildDashboard(shortlistItems, violations, user?.userID))
      setLoading(false)
    }

    load()
  }, [user?.userID])

  if (loading) return <LoadingSpinner />
  if (error || !dashboard) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: '#b91c1c', fontSize: 15 }}>{error || 'Unable to load investigator workflow.'}</p>
      </div>
    )
  }

  const featuredRecallId = dashboard.assignments[0]?.recallID

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <p style={eyebrow}>Investigator Dashboard</p>
          <h1 style={title}>Enforcement Workflow</h1>
          <p style={subtitle}>
            Log in, review assigned recalls, compare them with marketplace listings, capture evidence, log violations, and notify sellers.
          </p>
        </div>
      </div>

      <div style={stepsGrid}>
        {[
          'Log In',
          'View Assigned Recall',
          'Compare Recall vs Marketplace Listings',
          'Log Violation (Notes + Evidence)',
          'Send Notification to Seller',
        ].map((step, index) => (
          <div key={step} style={stepCard}>
            <div style={stepNumber}>{index + 1}</div>
            <div style={stepText}>{step}</div>
          </div>
        ))}
      </div>

      <div style={statsGrid}>
        <MetricCard icon={ShieldAlert} label="Assigned Recalls" value={dashboard.assignedCount} accent="blue" />
        <MetricCard icon={FileSearch} label="Ready to Compare" value={dashboard.readyToCompare} accent="amber" />
        <MetricCard icon={Siren} label="Violations Logged" value={dashboard.loggedViolations} accent="rose" />
        <MetricCard icon={Mail} label="Seller Notices Ready" value={dashboard.notificationsReady} accent="green" />
      </div>

      <div style={contentGrid}>
        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <h2 style={panelTitle}>Assigned Recalls</h2>
              <p style={panelCopy}>Recalls assigned to you by a Manager appear here. Unassigned recalls can be viewed on the full Priority List.</p>
            </div>
            {featuredRecallId ? (
              <Link to={`/violations/logging?recallId=${featuredRecallId}`} style={primaryAction}>
                Open Compare Workspace
                <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>

          {violationsError ? (
            <div style={warningBox}>{violationsError}</div>
          ) : null}

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  {['Recall', 'Hazard', 'Priority', 'Status', 'Assigned Date', 'Actions'].map((heading) => (
                    <th key={heading} style={th}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dashboard.assignments.length ? dashboard.assignments.map((item) => (
                  <tr key={item.shortListID} style={{ borderBottom: '1px solid #eef2f7' }}>
                    <td style={tdStrong}>{item.productName}</td>
                    <td style={td}>{item.hazard || 'Hazard pending review'}</td>
                    <td style={td}>{item.priorityLevel}</td>
                    <td style={td}>
                      <span style={{ ...statusPill, ...getStatusTone(item.workflowStatus) }}>
                        {item.workflowStatus}
                      </span>
                    </td>
                    <td style={td}>{formatDate(item.shortListDate)}</td>
                    <td style={td}>
                      <div style={actionRow}>
                        <Link to={`/recalls/${item.recallID}`} style={secondaryAction}>
                          View Recall
                        </Link>
                        <Link to={`/violations/logging?recallId=${item.recallID}`} style={secondaryAction}>
                          Compare Listings
                        </Link>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={emptyCell}>No assigned recalls are available yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>Current Investigator Path</h2>
          <div style={pathStack}>
            <PathCard
              title="View Assigned Recall"
              copy="Open the recall summary, hazard details, and source notice before comparing marketplace listings."
              actionLabel={featuredRecallId ? 'Open Recall' : 'Waiting for assignment'}
              actionTo={featuredRecallId ? `/recalls/${featuredRecallId}` : null}
            />
            <PathCard
              title="Compare Recall vs Marketplace Listings"
              copy="Launch the eBay comparison workflow with the selected recall preloaded."
              actionLabel={featuredRecallId ? 'Compare on eBay' : 'Waiting for assignment'}
              actionTo={featuredRecallId ? `/violations/logging?recallId=${featuredRecallId}` : null}
            />
            <PathCard
              title="Log Violation and Notify Seller"
              copy="Capture notes, attach an evidence URL, and send the seller notification from the same violation form."
              actionLabel={featuredRecallId ? 'Log Violation' : 'Waiting for assignment'}
              actionTo={featuredRecallId ? `/violations/logging?recallId=${featuredRecallId}` : null}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function PathCard({ title, copy, actionLabel, actionTo }) {
  return (
    <div style={pathCard}>
      <div style={{ fontSize: 18, color: '#0f172a', fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 8, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>{copy}</div>
      {actionTo ? (
        <Link to={actionTo} style={pathLink}>
          {actionLabel}
          <ExternalLink size={14} />
        </Link>
      ) : (
        <div style={{ ...pathLink, opacity: 0.5, pointerEvents: 'none' }}>{actionLabel}</div>
      )}
    </div>
  )
}

const page = {
  padding: '32px',
  maxWidth: 1360,
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

const subtitle = {
  margin: '12px 0 0',
  maxWidth: 760,
  color: '#475569',
  fontSize: 15,
  lineHeight: 1.6,
}

const stepsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 12,
  marginBottom: 18,
}

const stepCard = {
  minHeight: 96,
  borderRadius: 22,
  padding: 18,
  background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
  border: '1px solid #dbeafe',
}

const stepNumber = {
  width: 32,
  height: 32,
  borderRadius: 999,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: 14,
}

const stepText = {
  marginTop: 14,
  fontSize: 15,
  fontWeight: 700,
  color: '#0f172a',
  lineHeight: 1.45,
}

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 16,
  marginBottom: 22,
}

const metricCard = {
  minHeight: 132,
  borderRadius: 24,
  padding: '22px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  boxShadow: '0 14px 28px rgba(15, 23, 42, 0.08)',
}

const contentGrid = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.9fr)',
  gap: 18,
}

const panel = {
  backgroundColor: '#ffffff',
  borderRadius: 28,
  padding: 24,
  border: '1px solid #e2e8f0',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
}

const panelHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
}

const panelTitle = {
  margin: 0,
  fontSize: 24,
  color: '#0f172a',
}

const panelCopy = {
  margin: '8px 0 0',
  color: '#64748b',
  fontSize: 14,
}

const primaryAction = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 18px',
  borderRadius: 14,
  border: 'none',
  textDecoration: 'none',
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 700,
}

const secondaryAction = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 12px',
  borderRadius: 12,
  border: '1px solid #dbe4f0',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
}

const warningBox = {
  marginTop: 16,
  padding: '14px 16px',
  borderRadius: 16,
  backgroundColor: '#fff7ed',
  border: '1px solid #fed7aa',
  color: '#9a3412',
  fontSize: 14,
}

const tableWrap = {
  marginTop: 18,
  overflowX: 'auto',
}

const table = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 860,
}

const th = {
  textAlign: 'left',
  padding: '14px 16px',
  color: '#475569',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const td = {
  padding: '16px',
  color: '#475569',
  fontSize: 14,
  verticalAlign: 'top',
}

const tdStrong = {
  ...td,
  color: '#0f172a',
  fontWeight: 700,
}

const statusPill = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '7px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
}

const actionRow = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const emptyCell = {
  padding: '24px 16px',
  textAlign: 'center',
  color: '#64748b',
  fontSize: 14,
}

const pathStack = {
  display: 'grid',
  gap: 14,
  marginTop: 16,
}

const pathCard = {
  borderRadius: 22,
  padding: 18,
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
}

const pathLink = {
  marginTop: 14,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 14,
}
