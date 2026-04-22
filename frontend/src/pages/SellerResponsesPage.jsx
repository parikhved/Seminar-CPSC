import React, { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'

function formatDate(value) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getResponseTypeTone(type) {
  if (type === 'Removed Listing')      return { background: '#dcfce7', color: '#166534' }
  if (type === 'Remediated Product')   return { background: '#dbeafe', color: '#1d4ed8' }
  if (type === 'Contesting Violation') return { background: '#fee2e2', color: '#b91c1c' }
  return { background: '#f3f4f6', color: '#475569' }
}

function getViolationStatusTone(s) {
  const lower = (s || '').toLowerCase()
  if (lower === 'resolved')         return { background: '#dcfce7', color: '#166534' }
  if (lower === 'unresolved')       return { background: '#fef9c3', color: '#854d0e' }
  if (lower === 'seller responded') return { background: '#dbeafe', color: '#1d4ed8' }
  return { background: '#f3f4f6', color: '#475569' }
}

export default function SellerResponsesPage() {
  const { user } = useAuth()
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailTarget, setDetailTarget] = useState(null)
  const [adjudicating, setAdjudicating] = useState(false)
  const [adjudicateError, setAdjudicateError] = useState('')
  const [archiveSuccess, setArchiveSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/violations/responses')
        setResponses(res.data)
      } catch (err) {
        setError(err.response?.data?.detail ?? 'Unable to load seller responses right now.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleStatusUpdate(violationID, newStatus) {
    setAdjudicating(true)
    setAdjudicateError('')
    try {
      await api.patch(`/api/violations/${violationID}/status`, { status: newStatus })
      setDetailTarget(prev => ({ ...prev, violationStatus: newStatus }))
      setResponses(prev => prev.map(r =>
        r.violationID === violationID ? { ...r, violationStatus: newStatus } : r
      ))
    } catch (err) {
      setAdjudicateError(err.response?.data?.detail ?? 'Failed to update status.')
    } finally {
      setAdjudicating(false)
    }
  }

  async function handleArchive(violationID) {
    setAdjudicating(true)
    setAdjudicateError('')
    try {
      await api.delete(`/api/violations/${violationID}`)
      setArchiveSuccess(true)
      setTimeout(() => {
        setArchiveSuccess(false)
        setDetailTarget(null)
        setResponses(prev => prev.filter(r => r.violationID !== violationID))
      }, 1400)
    } catch (err) {
      setAdjudicateError(err.response?.data?.detail ?? 'Failed to archive case.')
    } finally {
      setAdjudicating(false)
    }
  }

  const stats = {
    total: responses.length,
    removedListing: responses.filter((r) => r.responseType === 'Removed Listing').length,
    remediated: responses.filter((r) => r.responseType === 'Remediated Product').length,
    contesting: responses.filter((r) => r.responseType === 'Contesting Violation').length,
  }

  if (loading) return <LoadingSpinner />

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <p style={eyebrow}>Sprint 3 — Seller Engagement</p>
          <h1 style={title}>Seller Responses</h1>
          <p style={subtitle}>
            Review all seller responses submitted to violation notices. Track response types and supporting evidence.
          </p>
        </div>
      </div>

      {error ? <div style={errorBox}>{error}</div> : null}

      <div style={statsGrid}>
        <SummaryCard label="Total Responses" value={stats.total} accent="#dbeafe" />
        <SummaryCard label="Removed Listing" value={stats.removedListing} accent="#dcfce7" />
        <SummaryCard label="Remediated Product" value={stats.remediated} accent="#eff6ff" />
        <SummaryCard label="Contesting Violation" value={stats.contesting} accent="#fee2e2" />
      </div>

      <div style={panel}>
        <div style={panelHeader}>
          <div>
            <h2 style={panelTitle}>All Seller Responses</h2>
            <p style={panelCopy}>
              Click a row to view the full response text and supporting evidence.
            </p>
          </div>
        </div>

        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                {['Response ID', 'Violation', 'Product', 'Listing', 'Seller Email', 'Response Type', 'Date Responded', 'Evidence', 'Actions'].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.length ? responses.map((r) => (
                <tr key={r.responseID} style={{ borderBottom: '1px solid #eef2f7' }}>
                  <td style={tdStrong}>#{r.responseID}</td>
                  <td style={td}>#{r.violationID}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.violationProductName || 'N/A'}</div>
                    <div style={subtleMeta}>{r.violationDateDetected ? formatDate(r.violationDateDetected) : ''}</div>
                  </td>
                  <td style={td}>{r.violationListingTitle || '—'}</td>
                  <td style={td}>{r.sellerEmail || '—'}</td>
                  <td style={td}>
                    <span style={{ ...pill, ...getResponseTypeTone(r.responseType) }}>
                      {r.responseType}
                    </span>
                  </td>
                  <td style={td}>{formatDate(r.dateResponded)}</td>
                  <td style={td}>
                    {r.evidenceURL ? (
                      <a href={r.evidenceURL} target="_blank" rel="noreferrer" style={externalLink}>
                        View Evidence
                        <ExternalLink size={13} />
                      </a>
                    ) : '—'}
                  </td>
                  <td style={td}>
                    <button type="button" onClick={() => setDetailTarget(r)} style={viewButton}>
                      View Response
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} style={emptyCell}>
                    No seller responses have been submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailTarget ? (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={modalTitle}>Seller Response #{detailTarget.responseID}</h2>

            <div style={detailGrid}>
              <DetailRow label="Violation ID" value={`#${detailTarget.violationID}`} />
              <DetailRow label="Product" value={detailTarget.violationProductName || 'N/A'} />
              <DetailRow label="Seller Email" value={detailTarget.sellerEmail || 'N/A'} />
              <DetailRow label="Response Type" value={detailTarget.responseType} />
              <DetailRow label="Date Responded" value={formatDate(detailTarget.dateResponded)} />
            </div>

            <div style={responseSectionLabel}>Response Text</div>
            <div style={responseTextBox}>
              {detailTarget.responseText || 'No response text provided.'}
            </div>

            {detailTarget.evidenceURL ? (
              <div style={{ marginTop: 18 }}>
                <div style={responseSectionLabel}>Supporting Evidence</div>
                <a href={detailTarget.evidenceURL} target="_blank" rel="noreferrer" style={externalLinkLarge}>
                  View Supporting Document
                  <ExternalLink size={16} />
                </a>
              </div>
            ) : null}

            <div style={adjudicationSection}>
              <div style={responseSectionLabel}>Adjudication</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: '#475569' }}>Violation Status:</span>
                <span style={{ ...statusPill, ...getViolationStatusTone(detailTarget.violationStatus) }}>
                  {detailTarget.violationStatus || 'Unknown'}
                </span>
              </div>

              {adjudicateError ? <div style={adjudicateErrorBox}>{adjudicateError}</div> : null}
              {archiveSuccess ? <div style={archiveSuccessBox}>Case archived successfully.</div> : null}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(detailTarget.violationStatus || '').toLowerCase() !== 'resolved' ? (
                  <button
                    type="button"
                    disabled={adjudicating}
                    onClick={() => handleStatusUpdate(detailTarget.violationID, 'Resolved')}
                    style={resolveButton}
                  >
                    {adjudicating ? 'Updating…' : 'Mark Resolved'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={adjudicating}
                    onClick={() => handleStatusUpdate(detailTarget.violationID, 'Unresolved')}
                    style={unresolveButton}
                  >
                    {adjudicating ? 'Updating…' : 'Mark Unresolved'}
                  </button>
                )}

                {(detailTarget.violationStatus || '').toLowerCase() === 'resolved' && (
                  <button
                    type="button"
                    disabled={adjudicating}
                    onClick={() => handleArchive(detailTarget.violationID)}
                    style={archiveButton}
                  >
                    {adjudicating ? 'Archiving…' : 'Archive Case'}
                  </button>
                )}
              </div>
            </div>

            <div style={modalActions}>
              <button type="button" onClick={() => { setDetailTarget(null); setAdjudicateError('') }} style={modalPrimaryButton}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SummaryCard({ label, value, accent }) {
  return (
    <div style={{ padding: '22px 20px', borderRadius: 22, backgroundColor: accent, boxShadow: '0 18px 36px rgba(15,23,42,0.08)' }}>
      <div style={{ fontSize: 14, color: '#334155' }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: 38, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ marginTop: 6, color: '#0f172a', fontSize: 14 }}>{value}</div>
    </div>
  )
}

const page = { padding: '32px', maxWidth: 1420 }

const header = { marginBottom: 24 }

const eyebrow = {
  margin: 0,
  color: '#2563eb',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}

const title = { margin: '10px 0 0', fontSize: 40, lineHeight: 1.02, color: '#0f172a' }

const subtitle = { margin: '12px 0 0', maxWidth: 760, color: '#475569', fontSize: 15, lineHeight: 1.6 }

const errorBox = {
  marginBottom: 18,
  padding: '14px 16px',
  borderRadius: 14,
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#991b1b',
  fontSize: 14,
}

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: 16,
  marginBottom: 24,
}

const panel = {
  backgroundColor: '#ffffff',
  borderRadius: 24,
  border: '1px solid #e2e8f0',
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
  padding: 24,
}

const panelHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 18,
}

const panelTitle = { margin: 0, fontSize: 22, color: '#0f172a' }

const panelCopy = { margin: '8px 0 0', color: '#64748b', fontSize: 14 }

const tableWrap = { overflowX: 'auto' }

const table = { width: '100%', borderCollapse: 'collapse', minWidth: 1000 }

const th = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const td = { padding: '16px 14px', fontSize: 13, color: '#475569', verticalAlign: 'top' }

const tdStrong = { ...td, fontWeight: 700, color: '#0f172a' }

const subtleMeta = { marginTop: 6, color: '#94a3b8', fontSize: 12 }

const pill = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 9px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
}

const externalLink = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: '#1d4ed8',
  fontSize: 12,
  fontWeight: 600,
  textDecoration: 'none',
}

const externalLinkLarge = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: '#1d4ed8',
  fontSize: 14,
  fontWeight: 700,
  textDecoration: 'none',
  marginTop: 8,
}

const viewButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #dbe4f0',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const emptyCell = {
  padding: '40px 16px',
  textAlign: 'center',
  color: '#94a3b8',
  fontSize: 14,
}

const overlay = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  zIndex: 1000,
}

const modal = {
  width: '100%',
  maxWidth: 600,
  maxHeight: '90vh',
  overflowY: 'auto',
  backgroundColor: '#ffffff',
  borderRadius: 24,
  padding: 28,
  boxShadow: '0 30px 70px rgba(15, 23, 42, 0.24)',
}

const modalTitle = { margin: 0, fontSize: 26, color: '#0f172a' }

const detailGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 16,
  marginTop: 20,
  marginBottom: 22,
  padding: 18,
  borderRadius: 18,
  backgroundColor: '#f8fafc',
}

const responseSectionLabel = {
  marginBottom: 8,
  fontSize: 11,
  color: '#2563eb',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const responseTextBox = {
  padding: 16,
  borderRadius: 14,
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  color: '#0f172a',
  fontSize: 14,
  lineHeight: 1.7,
  whiteSpace: 'pre-wrap',
  minHeight: 80,
}

const modalActions = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
  marginTop: 26,
}

const modalPrimaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 100,
  padding: '12px 18px',
  border: 'none',
  borderRadius: 12,
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}

const adjudicationSection = {
  marginTop: 22,
  paddingTop: 20,
  borderTop: '1px solid #e2e8f0',
}

const statusPill = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
}

const adjudicateErrorBox = {
  marginBottom: 12,
  padding: '10px 14px',
  borderRadius: 10,
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#b91c1c',
  fontSize: 13,
}

const archiveSuccessBox = {
  marginBottom: 12,
  padding: '10px 14px',
  borderRadius: 10,
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  color: '#166534',
  fontSize: 13,
}

const resolveButton = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '9px 16px',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const unresolveButton = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '9px 16px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#374151',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const archiveButton = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '9px 16px',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}
