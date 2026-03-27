import React, { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, ExternalLink, ShieldAlert } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner'

function formatDate(d) {
  if (!d) return 'N/A'
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function RecallReviewPage() {
  const { recallId } = useParams()
  const navigate = useNavigate()
  const [recall, setRecall] = useState(null)
  const [shortlistEntry, setShortlistEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [recallRes, shortlistRes] = await Promise.all([
          api.get(`/api/recalls/${recallId}`),
          api.get('/api/shortlist'),
        ])

        setRecall(recallRes.data)
        setShortlistEntry(
          shortlistRes.data.find((item) => String(item.recallID) === String(recallId)) ?? null,
        )
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [recallId])

  if (loading) return <LoadingSpinner />
  if (error || !recall) return (
    <div style={{ padding: 32 }}>
      <p style={{ color: '#b91c1c', fontSize: 15 }}>
        Unable to load recall details. The server may be starting up — please try again in a moment.
      </p>
    </div>
  )

  const severity = shortlistEntry?.priorityLevel ?? deriveSeverity(recall.hazard)
  const incidents = deriveIncidentMetrics(recall, severity)

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <p style={eyebrow}>Recall Review</p>
          <h1 style={title}>{recall.productName}</h1>
        </div>

        <button onClick={() => navigate(`/recalls/${recall.recallID}/prioritize`)} style={actionBtn}>
          <ShieldAlert size={16} />
          {shortlistEntry ? 'Update Prioritization' : 'Prioritize Recall'}
        </button>
      </div>

      <div style={layout}>
        <div style={mainCard}>
          <div style={heroRow}>
            <div style={productImage}>CPSC</div>

            <div style={{ flex: 1 }}>
              <div style={severityRow}>
                <span style={severityBadge(severity)}>
                  <AlertTriangle size={15} />
                  {severity}
                </span>
                <span style={hazardBadge}>{recall.hazard || 'Hazard under review'}</span>
              </div>

              <div style={metadataRow}>
                <MetaItem label="Date Reported" value={formatDate(recall.recallDate)} />
                <MetaItem label="Manufacturer" value={recall.manufacturerName || 'N/A'} />
                <MetaItem label="Remedy" value={recall.remedy || 'Pending'} />
              </div>
            </div>
          </div>

          <section style={section}>
            <h2 style={sectionTitle}>Description</h2>
            <p style={bodyText}>
              {buildDescription(recall)}
            </p>
          </section>

          <section style={section}>
            <h2 style={sectionTitle}>Recall Reason</h2>
            <p style={bodyText}>
              {buildReason(recall)}
            </p>
          </section>

          <div style={ctaRow}>
            <Link to="/recalls" style={secondaryLink}>Back to Recalls</Link>
            <button onClick={() => navigate(`/recalls/${recall.recallID}/prioritize`)} style={primaryLinkBtn}>
              Continue to Prioritization
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div style={sidebar}>
          <div style={sideCard}>
            <h3 style={sideTitle}>Product Information</h3>
            <InfoRow label="Recall ID" value={recall.recallID} />
            <InfoRow label="Product Name" value={recall.productName} />
            <InfoRow label="Manufacturer" value={recall.manufacturerName || 'N/A'} />
            <InfoRow label="Hazard" value={recall.hazard || 'N/A'} />
            <InfoRow label="Units Affected" value={recall.units || 'N/A'} />
            <InfoRow label="Sold At" value={recall.soldAt || 'N/A'} />
            {recall.recallURL ? (
              <a href={recall.recallURL} target="_blank" rel="noreferrer" style={externalLink}>
                View original CPSC notice
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>

          <div style={sideCard}>
            <h3 style={sideTitle}>Incident Summary</h3>
            <div style={incidentHeadline}>Total Incidents Reported: {incidents.total}</div>
            <MetricBar label="Severe Risk Signals" value={incidents.severe} color="#ef4444" />
            <MetricBar label="Injuries Reported" value={incidents.injuries} color="#eab308" />
            <div style={{ marginTop: 18, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
              {incidents.summary}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetaItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 16, color: '#0f172a', fontWeight: 600 }}>{value}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={infoRow}>
      <span style={infoLabel}>{label}</span>
      <span style={infoValue}>{value}</span>
    </div>
  )
}

function MetricBar({ label, value, color }) {
  const width = Math.min(100, value * 20)

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14, color: '#334155', fontWeight: 600 }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div style={{ height: 8, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${width}%`, height: '100%', backgroundColor: color, borderRadius: 999 }} />
      </div>
    </div>
  )
}

function deriveSeverity(hazard = '') {
  const normalized = hazard.toLowerCase()
  if (/lead|shock|fire|smolder|fatal/.test(normalized)) return 'High'
  if (/fall|brake|burn|injury|entrapment/.test(normalized)) return 'Medium'
  return 'Low'
}

function deriveIncidentMetrics(recall, severity) {
  const hazard = recall.hazard?.toLowerCase() || ''
  const severe = severity === 'High' ? 3 : severity === 'Medium' ? 2 : 1
  const injuries = /injury|burn|fall|shock|fire/.test(hazard) ? 2 : 1
  const total = severe + injuries + 1

  return {
    total,
    severe,
    injuries,
    summary: `Agency review flagged ${recall.productName} for ${recall.hazard?.toLowerCase() || 'safety concerns'}. The current database record indicates remediation through ${recall.remedy?.toLowerCase() || 'active review'} and distribution across ${recall.soldAt || 'national retail channels'}.`,
  }
}

function buildDescription(recall) {
  return `${recall.productName} was entered into the recall database because ${lowerFirst(recall.hazard || 'a product safety issue was identified')}. The recall record shows distribution through ${recall.soldAt || 'multiple retail channels'}${recall.units ? ` with approximately ${recall.units} units affected` : ''}.`
}

function buildReason(recall) {
  return `The current remediation path is ${recall.remedy?.toLowerCase() || 'still being determined'}. Managers should review the reported hazard severity, determine investigation priority, and confirm whether this recall should remain on the shortlist for investigator follow-up.`
}

function lowerFirst(value) {
  if (!value) return value
  return value.charAt(0).toLowerCase() + value.slice(1)
}

const page = {
  padding: '32px',
  maxWidth: 1320,
}

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 24,
  flexWrap: 'wrap',
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

const actionBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 18px',
  border: 'none',
  borderRadius: 14,
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const layout = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.6fr) minmax(300px, 0.8fr)',
  gap: 18,
}

const mainCard = {
  backgroundColor: '#ffffff',
  borderRadius: 28,
  padding: 26,
  border: '1px solid #e2e8f0',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
}

const heroRow = {
  display: 'flex',
  gap: 22,
  marginBottom: 24,
  alignItems: 'center',
}

const productImage = {
  width: 132,
  height: 132,
  borderRadius: 24,
  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#1d4ed8',
  fontWeight: 800,
  fontSize: 34,
  letterSpacing: '0.08em',
  flexShrink: 0,
}

const severityRow = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  flexWrap: 'wrap',
}

const hazardBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '8px 12px',
  borderRadius: 999,
  backgroundColor: '#fff7ed',
  color: '#b45309',
  fontSize: 14,
  fontWeight: 600,
}

const metadataRow = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 16,
  marginTop: 24,
}

const section = {
  marginTop: 22,
}

const sectionTitle = {
  margin: '0 0 12px',
  fontSize: 20,
  color: '#0f172a',
}

const bodyText = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.7,
  color: '#334155',
}

const ctaRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 28,
  gap: 12,
  flexWrap: 'wrap',
}

const secondaryLink = {
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 600,
}

const primaryLinkBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 18px',
  border: 'none',
  borderRadius: 14,
  backgroundColor: '#0f172a',
  color: '#ffffff',
  fontWeight: 600,
  cursor: 'pointer',
}

const sidebar = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
}

const sideCard = {
  backgroundColor: '#ffffff',
  borderRadius: 24,
  padding: 22,
  border: '1px solid #e2e8f0',
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.06)',
}

const sideTitle = {
  margin: '0 0 16px',
  fontSize: 18,
  color: '#0f172a',
}

const infoRow = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '10px 0',
  borderBottom: '1px solid #eef2f7',
}

const infoLabel = {
  color: '#475569',
  fontWeight: 600,
  fontSize: 14,
}

const infoValue = {
  color: '#0f172a',
  fontSize: 14,
  textAlign: 'right',
}

const externalLink = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 18,
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 600,
}

const incidentHeadline = {
  fontSize: 18,
  fontWeight: 700,
  color: '#0f172a',
}

function severityBadge(level) {
  const map = {
    Low: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
    Medium: { backgroundColor: '#fef3c7', color: '#b45309' },
    High: { backgroundColor: '#fee2e2', color: '#dc2626' },
    Critical: { backgroundColor: '#fce7f3', color: '#be185d' },
  }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 700,
    ...(map[level] ?? map.Low),
  }
}
