import React, { useEffect, useState } from 'react'
import { ExternalLink, Upload } from 'lucide-react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import { showToast } from '../components/NotificationToast'

function formatDate(value) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function SellerViolationNoticePage() {
  const { violationId } = useParams()
  const { user } = useAuth()
  const [notice, setNotice] = useState(null)
  const [responseText, setResponseText] = useState('')
  const [evidenceURL, setEvidenceURL] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get(`/api/violations/notices/${user.userID}/${violationId}`)
        setNotice(response.data)
        setResponseText(response.data.sellerResponse || '')
        setEvidenceURL(response.data.responseEvidenceURL || '')
      } catch (err) {
        setError(err.response?.data?.detail ?? 'Unable to load this violation notice.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user.userID, violationId])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)

    try {
      await api.post(`/api/violations/${violationId}/responses`, {
        sellerUserID: user.userID,
        response: responseText.trim(),
        evidenceURL: evidenceURL.trim(),
      })

      const refreshed = await api.get(`/api/violations/notices/${user.userID}/${violationId}`)
      setNotice(refreshed.data)
      setResponseText(refreshed.data.sellerResponse || '')
      setEvidenceURL(refreshed.data.responseEvidenceURL || '')
      showToast('Seller response submitted successfully.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail ?? 'Unable to submit your response.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error || !notice) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: '#b91c1c', fontSize: 15 }}>{error || 'Unable to load this notice.'}</p>
      </div>
    )
  }

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <p style={eyebrow}>Violation Notice</p>
          <h1 style={title}>{notice.recallProductName}</h1>
          <p style={subtitle}>Respond to this notice with your explanation and supporting evidence.</p>
        </div>
      </div>

      <div style={layout}>
        <section style={panel}>
          <h2 style={panelTitle}>Notice Details</h2>
          <div style={detailCard}>
            <DetailRow label="Notice ID" value={notice.violationID} />
            <DetailRow label="Detected" value={formatDate(notice.dateDetected)} />
            <DetailRow label="Status" value={notice.violationStatus || 'Open'} />
            <DetailRow label="Marketplace" value={notice.marketplaceName || 'eBay'} />
            <DetailRow label="Listing" value={notice.listingTitle || 'Marketplace listing'} />
            <DetailRow label="Hazard" value={notice.hazard || 'Hazard pending review'} />
            <DetailRow label="Investigator" value={notice.investigatorName || 'CPSC Investigator'} />
          </div>

          <div style={messageCard}>
            <div style={sectionLabel}>Violation Notice</div>
            <div style={messageText}>{notice.message || 'No additional notice details provided.'}</div>
          </div>

          <div style={linkRow}>
            {notice.listingURL ? (
              <a href={notice.listingURL} target="_blank" rel="noreferrer" style={externalLink}>
                View Marketplace Listing
                <ExternalLink size={14} />
              </a>
            ) : null}
            {notice.evidenceURL ? (
              <a href={notice.evidenceURL} target="_blank" rel="noreferrer" style={externalLink}>
                View Notice Evidence
                <ExternalLink size={14} />
              </a>
            ) : null}
          </div>
        </section>

        <section style={panel}>
          <h2 style={panelTitle}>Submit Response + Evidence</h2>
          <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
            <label style={fieldBlock}>
              <span style={label}>Seller Response</span>
              <textarea
                value={responseText}
                onChange={(event) => setResponseText(event.target.value)}
                rows={8}
                style={textarea}
                required
              />
            </label>

            <label style={fieldBlock}>
              <span style={label}>Evidence URL</span>
              <input
                type="url"
                value={evidenceURL}
                onChange={(event) => setEvidenceURL(event.target.value)}
                placeholder="proof of removal, refund, or corrective action"
                style={input}
                required
              />
            </label>

            {notice.dateResponded ? (
              <div style={infoBox}>
                Latest response submitted on {formatDate(notice.dateResponded)}.
              </div>
            ) : null}

            <button type="submit" disabled={saving} style={submitButton}>
              <Upload size={16} />
              {saving ? 'Submitting…' : notice.responseID ? 'Update Response' : 'Submit Response'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={detailRow}>
      <span style={detailLabel}>{label}</span>
      <span style={detailValue}>{value}</span>
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
  color: '#475569',
  fontSize: 15,
}

const layout = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.15fr) minmax(340px, 0.95fr)',
  gap: 18,
}

const panel = {
  backgroundColor: '#ffffff',
  borderRadius: 28,
  padding: 24,
  border: '1px solid #e2e8f0',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
}

const panelTitle = {
  margin: 0,
  fontSize: 24,
  color: '#0f172a',
}

const detailCard = {
  marginTop: 18,
  borderRadius: 22,
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
}

const detailRow = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  padding: '14px 16px',
  borderBottom: '1px solid #e2e8f0',
}

const detailLabel = {
  color: '#64748b',
  fontSize: 13,
  fontWeight: 700,
}

const detailValue = {
  color: '#0f172a',
  fontSize: 14,
  textAlign: 'right',
}

const messageCard = {
  marginTop: 18,
  padding: 18,
  borderRadius: 22,
  background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
  border: '1px solid #dbeafe',
}

const sectionLabel = {
  fontSize: 12,
  color: '#2563eb',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const messageText = {
  marginTop: 10,
  color: '#0f172a',
  fontSize: 15,
  lineHeight: 1.7,
}

const linkRow = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  marginTop: 18,
}

const externalLink = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 14,
}

const fieldBlock = {
  display: 'block',
  marginTop: 16,
}

const label = {
  display: 'block',
  marginBottom: 8,
  color: '#0f172a',
  fontWeight: 700,
  fontSize: 14,
}

const input = {
  width: '100%',
  minHeight: 52,
  borderRadius: 16,
  border: '1px solid #dbe4f0',
  backgroundColor: '#ffffff',
  padding: '0 16px',
  fontSize: 15,
  color: '#0f172a',
  outline: 'none',
}

const textarea = {
  ...input,
  minHeight: 180,
  paddingTop: 14,
  resize: 'vertical',
}

const infoBox = {
  marginTop: 16,
  padding: '14px 16px',
  borderRadius: 16,
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  color: '#166534',
  fontSize: 14,
}

const submitButton = {
  width: '100%',
  minHeight: 54,
  marginTop: 18,
  borderRadius: 16,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  cursor: 'pointer',
}
