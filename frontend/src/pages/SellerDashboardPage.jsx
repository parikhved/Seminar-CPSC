import React, { useEffect, useState } from 'react'
import { ArrowRight, FileWarning, MailQuestion, ShieldCheck, Upload } from 'lucide-react'
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

function summarizeNotices(notices) {
  return {
    total: notices.length,
    awaitingResponse: notices.filter((item) => !item.responseID).length,
    responded: notices.filter((item) => item.responseID).length,
    active: notices.filter((item) => item.violationStatus !== 'Closed').length,
  }
}

function MetricCard({ icon: Icon, label, value, tint }) {
  const backgrounds = {
    blue: 'linear-gradient(180deg, #eff6ff 0%, #93c5fd 100%)',
    amber: 'linear-gradient(180deg, #fffbeb 0%, #fcd34d 100%)',
    rose: 'linear-gradient(180deg, #fff1f2 0%, #fda4af 100%)',
    green: 'linear-gradient(180deg, #f0fdf4 0%, #86efac 100%)',
  }

  return (
    <div style={{ ...metricCard, background: backgrounds[tint] }}>
      <Icon size={28} color="#0f172a" />
      <div>
        <div style={{ fontSize: 14, color: '#334155' }}>{label}</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#0f172a' }}>{value}</div>
      </div>
    </div>
  )
}

export default function SellerDashboardPage() {
  const { user } = useAuth()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get(`/api/violations/notices/${user.userID}`)
        setNotices(response.data)
      } catch (err) {
        setError(err.response?.data?.detail ?? 'Unable to load your violation notices right now.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user.userID])

  if (loading) return <LoadingSpinner />
  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: '#b91c1c', fontSize: 15 }}>{error}</p>
      </div>
    )
  }

  const stats = summarizeNotices(notices)
  const featuredNotice = notices[0]

  return (
    <div style={page}>
      <div style={hero}>
        <div>
          <p style={eyebrow}>Seller Dashboard</p>
          <h1 style={title}>Violation Notice Response</h1>
          <p style={subtitle}>
            Review notices tied to your marketplace listings, open the violation details, and submit your response with evidence.
          </p>
        </div>
      </div>

      <div style={statsGrid}>
        <MetricCard icon={FileWarning} label="Violation Notices" value={stats.total} tint="blue" />
        <MetricCard icon={MailQuestion} label="Awaiting Response" value={stats.awaitingResponse} tint="amber" />
        <MetricCard icon={Upload} label="Responses Submitted" value={stats.responded} tint="rose" />
        <MetricCard icon={ShieldCheck} label="Active Notices" value={stats.active} tint="green" />
      </div>

      <div style={contentGrid}>
        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <h2 style={panelTitle}>Latest Notices</h2>
              <p style={panelCopy}>Open a notice to review the violation details and respond.</p>
            </div>
            <Link to="/seller/notices" style={primaryAction}>
              View All Notices
              <ArrowRight size={16} />
            </Link>
          </div>

          <div style={noticeStack}>
            {notices.length ? notices.slice(0, 4).map((notice) => (
              <Link key={notice.violationID} to={`/seller/notices/${notice.violationID}`} style={noticeCard}>
                <div style={{ fontSize: 18, color: '#0f172a', fontWeight: 700 }}>
                  {notice.recallProductName}
                </div>
                <div style={{ marginTop: 8, color: '#475569', fontSize: 14 }}>
                  {notice.listingTitle}
                </div>
                <div style={noticeMetaRow}>
                  <span>Detected {formatDate(notice.dateDetected)}</span>
                  <span>{notice.responseID ? 'Response Submitted' : 'Awaiting Response'}</span>
                </div>
              </Link>
            )) : (
              <div style={emptyCard}>No seller notices are assigned to this account right now.</div>
            )}
          </div>
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>Next Step</h2>
          {featuredNotice ? (
            <div style={featuredCard}>
              <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Current Notice
              </div>
              <div style={{ marginTop: 10, fontSize: 20, color: '#0f172a', fontWeight: 700 }}>
                {featuredNotice.recallProductName}
              </div>
              <div style={{ marginTop: 8, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
                {featuredNotice.message}
              </div>
              <Link to={`/seller/notices/${featuredNotice.violationID}`} style={primaryAction}>
                Open Violation Notice
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div style={emptyCard}>You do not have any active violation notices to review.</div>
          )}
        </section>
      </div>
    </div>
  )
}

const page = {
  padding: '32px',
  maxWidth: 1360,
}

const hero = {
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
  maxWidth: 700,
  color: '#475569',
  fontSize: 15,
  lineHeight: 1.6,
}

const stepsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 12,
  marginBottom: 18,
}

const stepCard = {
  minHeight: 92,
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
  gridTemplateColumns: 'minmax(0, 1.35fr) minmax(320px, 0.85fr)',
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
  marginTop: 16,
  padding: '12px 18px',
  borderRadius: 14,
  textDecoration: 'none',
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 700,
}

const noticeStack = {
  display: 'grid',
  gap: 14,
  marginTop: 18,
}

const noticeCard = {
  display: 'block',
  textDecoration: 'none',
  padding: 18,
  borderRadius: 22,
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
}

const noticeMetaRow = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 14,
  color: '#64748b',
  fontSize: 13,
  flexWrap: 'wrap',
}

const featuredCard = {
  marginTop: 16,
  padding: 20,
  borderRadius: 22,
  background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
  border: '1px solid #dbeafe',
}

const emptyCard = {
  marginTop: 18,
  padding: 20,
  borderRadius: 18,
  backgroundColor: '#f8fafc',
  border: '1px dashed #cbd5e1',
  color: '#64748b',
  fontSize: 14,
}
