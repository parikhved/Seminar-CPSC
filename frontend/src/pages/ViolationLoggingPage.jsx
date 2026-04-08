import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ExternalLink,
  Mail,
  Search,
  ShieldAlert,
  Siren,
  Store,
} from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import { showToast } from '../components/NotificationToast'

const STATUS_OPTIONS = ['Logged', 'Open', 'Pending Seller Response', 'Under Review', 'Closed']

function formatDate(value) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') return 'N/A'

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(Number(value))
  } catch {
    return `$${Number(value).toFixed(2)}`
  }
}

function buildViolationMessage(recall, candidate) {
  return [
    `Potential recalled-product violation detected on ${candidate.marketplaceName}.`,
    `Listing "${candidate.listingTitle}" appears to match recalled product "${recall.productName}".`,
    candidate.matchedTerms?.length
      ? `Matched terms: ${candidate.matchedTerms.join(', ')}.`
      : `Automated match score: ${Math.round(candidate.matchScore * 100)}%.`,
  ].join(' ')
}

function buildInvestigatorNotes(recall, candidate) {
  return [
    `Review source recall ${recall.recallID} for ${recall.productName}.`,
    `Candidate seller: ${candidate.sellerName || 'Unknown seller'}.`,
    `Listing URL: ${candidate.listingURL}.`,
    `Hazard context: ${recall.hazard || 'Hazard under review'}.`,
  ].join(' ')
}

function summarizeViolations(items) {
  return {
    total: items.length,
    open: items.filter((item) => item.violationStatus !== 'Closed').length,
    notified: items.filter((item) => item.receivedByID).length,
    products: new Set(items.map((item) => item.recallID)).size,
  }
}

function getScoreTone(score) {
  if (score >= 0.7) return { background: '#fee2e2', color: '#b91c1c' }
  if (score >= 0.5) return { background: '#fef3c7', color: '#b45309' }
  return { background: '#dbeafe', color: '#1d4ed8' }
}

export default function ViolationLoggingPage() {
  const { user } = useAuth()
  const [recalls, setRecalls] = useState([])
  const [violations, setViolations] = useState([])
  const [selectedRecallId, setSelectedRecallId] = useState('')
  const [customQuery, setCustomQuery] = useState('')
  const [candidates, setCandidates] = useState([])
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [sellerEmail, setSellerEmail] = useState('')
  const [violationStatus, setViolationStatus] = useState('Logged')
  const [message, setMessage] = useState('')
  const [investigatorNotes, setInvestigatorNotes] = useState('')
  const [scanSummary, setScanSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scanLoading, setScanLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedRecall = recalls.find((item) => String(item.recallID) === String(selectedRecallId)) ?? null
  const stats = summarizeViolations(violations)

  useEffect(() => {
    async function load() {
      try {
        const [recallsRes, violationsRes] = await Promise.all([
          api.get('/api/recalls', { params: { page: 1, limit: 100 } }),
          api.get('/api/violations'),
        ])

        const recallItems = recallsRes.data.recalls
        setRecalls(recallItems)
        setViolations(violationsRes.data)
        if (recallItems.length) {
          setSelectedRecallId(String(recallItems[0].recallID))
        }
      } catch {
        setError('Unable to load recalls and violations right now. Please refresh in a moment.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  function handleRecallChange(nextRecallId) {
    setSelectedRecallId(nextRecallId)
    setCandidates([])
    setSelectedCandidate(null)
    setScanSummary(null)
    setSellerEmail('')
    setMessage('')
    setInvestigatorNotes('')
    setError('')
  }

  function selectCandidate(candidate) {
    if (!selectedRecall) return

    setSelectedCandidate(candidate)
    setSellerEmail(candidate.sellerEmail || '')
    setViolationStatus('Logged')
    setMessage(buildViolationMessage(selectedRecall, candidate))
    setInvestigatorNotes(buildInvestigatorNotes(selectedRecall, candidate))
  }

  async function reloadViolations() {
    const response = await api.get('/api/violations')
    setViolations(response.data)
  }

  async function handleScan() {
    if (!selectedRecallId) {
      showToast('Choose a recall before scanning eBay.', 'error')
      return
    }

    setScanLoading(true)
    setError('')

    try {
      const response = await api.post('/api/violations/scan-ebay', {
        recallID: Number(selectedRecallId),
        query: customQuery.trim() || undefined,
      })

      setCandidates(response.data.candidates)
      setScanSummary({
        query: response.data.query,
        detectedCount: response.data.detectedCount,
      })

      if (response.data.candidates.length) {
        selectCandidate(response.data.candidates[0])
      } else {
        setSelectedCandidate(null)
        setSellerEmail('')
        setMessage('')
        setInvestigatorNotes('')
      }

      showToast(`eBay scan complete. ${response.data.detectedCount} likely match(es) detected.`, 'success')
    } catch (err) {
      const detail = err.response?.data?.detail ?? 'Unable to scan eBay right now.'
      setError(detail)
      showToast(detail, 'error')
    } finally {
      setScanLoading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!selectedRecall || !selectedCandidate) {
      showToast('Select an eBay listing before logging a violation.', 'error')
      return
    }

    if (!sellerEmail.trim()) {
      showToast('Seller email is required so the notification can be sent.', 'error')
      return
    }

    setSaving(true)

    try {
      const response = await api.post('/api/violations', {
        recallID: Number(selectedRecall.recallID),
        investigatorID: user.userID,
        violationStatus,
        message: message.trim(),
        investigatorNotes: investigatorNotes.trim(),
        listing: {
          externalListingId: selectedCandidate.externalListingId,
          listingTitle: selectedCandidate.listingTitle,
          listingURL: selectedCandidate.listingURL,
          marketplaceName: selectedCandidate.marketplaceName,
          sellerName: selectedCandidate.sellerName || '',
          sellerEmail: sellerEmail.trim(),
          listingDate: selectedCandidate.listingDate,
          price: selectedCandidate.price,
          currency: selectedCandidate.currency,
          listingDesc: selectedCandidate.listingDesc,
          address: selectedCandidate.address,
          imageURL: selectedCandidate.imageURL,
          isActive: true,
        },
      })

      await reloadViolations()
      showToast(response.data.notificationDetail, response.data.notificationStatus === 'sent' ? 'success' : 'info')
    } catch (err) {
      showToast(err.response?.data?.detail ?? 'Unable to log the violation.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  if (error && !recalls.length) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: '#b91c1c', fontSize: 15 }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={page}>
      <div style={hero}>
        <div>
          <p style={eyebrow}>Investigator Workflow</p>
          <h1 style={title}>Marketplace Violation Logging</h1>
          <p style={subtitle}>
            Search eBay for recalled products, confirm likely matches, log violations, and notify sellers from one screen.
          </p>
        </div>

        <div style={heroNotice}>
          <Mail size={18} />
          eBay search supplies listing details, but seller email must be added here before notification can be sent.
        </div>
      </div>

      <div style={statsGrid}>
        <StatCard icon={ShieldAlert} label="Violations Logged" value={stats.total} tint="blue" />
        <StatCard icon={AlertTriangle} label="Open Cases" value={stats.open} tint="amber" />
        <StatCard icon={Store} label="Recalled Products" value={stats.products} tint="rose" />
        <StatCard icon={Siren} label="Seller Links Found" value={stats.notified} tint="green" />
      </div>

      <div style={mainGrid}>
        <div style={leftColumn}>
          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <h2 style={panelTitle}>1. Scan eBay Listings</h2>
                <p style={panelCopy}>Choose a recalled product and search eBay using the Browse API.</p>
              </div>
              <button type="button" onClick={handleScan} disabled={scanLoading} style={scanButton}>
                <Search size={16} />
                {scanLoading ? 'Scanning…' : 'Scan eBay'}
              </button>
            </div>

            <div style={formGrid}>
              <label style={fieldBlock}>
                <span style={label}>Recall Record</span>
                <select
                  value={selectedRecallId}
                  onChange={(event) => handleRecallChange(event.target.value)}
                  style={input}
                >
                  {recalls.map((recall) => (
                    <option key={recall.recallID} value={recall.recallID}>
                      #{recall.recallID} {recall.productName}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldBlock}>
                <span style={label}>Optional Custom Query</span>
                <input
                  type="text"
                  value={customQuery}
                  onChange={(event) => setCustomQuery(event.target.value)}
                  placeholder="Override search with custom product keywords"
                  style={input}
                />
              </label>
            </div>

            {selectedRecall ? (
              <div style={recallCard}>
                <div style={recallName}>{selectedRecall.productName}</div>
                <div style={recallMeta}>Manufacturer: {selectedRecall.manufacturerName || 'Unknown'}</div>
                <div style={recallMeta}>Hazard: {selectedRecall.hazard || 'Pending review'}</div>
              </div>
            ) : null}

            {scanSummary ? (
              <div style={scanSummaryCard}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Latest query: {scanSummary.query}</div>
                <div style={{ marginTop: 6, color: '#475569', fontSize: 14 }}>
                  {scanSummary.detectedCount} listing(s) cleared the automated match threshold.
                </div>
              </div>
            ) : null}

            {error && recalls.length ? (
              <div style={errorBox}>{error}</div>
            ) : null}

            <div style={candidateList}>
              {candidates.length ? candidates.map((candidate) => (
                <div
                  key={candidate.externalListingId || candidate.listingURL}
                  onClick={() => selectCandidate(candidate)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectCandidate(candidate)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  style={{
                    ...candidateCard,
                    borderColor:
                      selectedCandidate?.externalListingId === candidate.externalListingId ? '#2563eb' : '#dbe4f0',
                    boxShadow:
                      selectedCandidate?.externalListingId === candidate.externalListingId
                        ? '0 20px 40px rgba(37, 99, 235, 0.18)'
                        : 'none',
                  }}
                >
                  <div style={candidateTopRow}>
                    <div style={{ flex: 1 }}>
                      <div style={candidateTitle}>{candidate.listingTitle}</div>
                      <div style={candidateMeta}>
                        {candidate.sellerName || 'Seller unavailable'} • {formatCurrency(candidate.price, candidate.currency)}
                      </div>
                    </div>

                    <span style={{ ...scorePill, ...getScoreTone(candidate.matchScore) }}>
                      {Math.round(candidate.matchScore * 100)}% match
                    </span>
                  </div>

                  <div style={candidateMetaRow}>
                    <span>{candidate.address || 'Location unavailable'}</span>
                    <span>{formatDate(candidate.listingDate)}</span>
                  </div>

                  <div style={termWrap}>
                    {(candidate.matchedTerms?.length ? candidate.matchedTerms : ['keyword match']).map((term) => (
                      <span key={term} style={termPill}>{term}</span>
                    ))}
                  </div>

                  <div style={candidateFooter}>
                    <span style={candidateFlag(candidate.isDetectedMatch)}>
                      {candidate.isDetectedMatch ? 'Detected match' : 'Needs review'}
                    </span>

                    <a
                      href={candidate.listingURL}
                      target="_blank"
                      rel="noreferrer"
                      style={listingLink}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Open listing
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              )) : (
                <div style={emptyState}>
                  Run an eBay scan to see candidate listings for the selected recall.
                </div>
              )}
            </div>
          </section>
        </div>

        <div style={rightColumn}>
          <section style={panel}>
            <h2 style={panelTitle}>2. Log Violation</h2>
            <p style={panelCopy}>The form writes to the violation table and attempts seller notification after save.</p>

            {selectedCandidate ? (
              <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
                <div style={selectedListingCard}>
                  <div style={selectedEyebrow}>Selected eBay Listing</div>
                  <div style={selectedTitle}>{selectedCandidate.listingTitle}</div>
                  <div style={selectedMeta}>
                    {selectedCandidate.sellerName || 'Seller unavailable'} • {selectedCandidate.marketplaceName}
                  </div>
                </div>

                <label style={fieldBlock}>
                  <span style={label}>Seller Email</span>
                  <input
                    type="email"
                    value={sellerEmail}
                    onChange={(event) => setSellerEmail(event.target.value)}
                    placeholder="required for seller notification"
                    style={input}
                    required
                  />
                  <span style={helperText}>Required because eBay Browse API does not expose seller email.</span>
                </label>

                <label style={fieldBlock}>
                  <span style={label}>Violation Status</span>
                  <select value={violationStatus} onChange={(event) => setViolationStatus(event.target.value)} style={input}>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label style={fieldBlock}>
                  <span style={label}>Violation Summary</span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={5}
                    style={textarea}
                    required
                  />
                </label>

                <label style={fieldBlock}>
                  <span style={label}>Investigator Notes</span>
                  <textarea
                    value={investigatorNotes}
                    onChange={(event) => setInvestigatorNotes(event.target.value)}
                    rows={6}
                    style={textarea}
                    required
                  />
                </label>

                <button type="submit" disabled={saving} style={submitButton}>
                  {saving ? 'Logging violation…' : 'Log Violation and Notify Seller'}
                </button>
              </form>
            ) : (
              <div style={emptyState}>Choose a scanned eBay listing to prefill the violation form.</div>
            )}
          </section>
        </div>
      </div>

      <section style={{ ...panel, marginTop: 24 }}>
        <div style={panelHeader}>
          <div>
            <h2 style={panelTitle}>3. Reporting</h2>
            <p style={panelCopy}>Logged violations from the database are shown here for follow-up and adjudication.</p>
          </div>
        </div>

        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                {['Detected', 'Recall', 'Marketplace Listing', 'Seller Email', 'Status', 'Investigator'].map((heading) => (
                  <th key={heading} style={th}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {violations.length ? violations.map((item) => (
                <tr key={item.violationID} style={{ borderBottom: '1px solid #eef2f7' }}>
                  <td style={td}>{formatDate(item.dateDetected)}</td>
                  <td style={tdStrong}>{item.recallProductName}</td>
                  <td style={td}>
                    <a href={item.listingURL} target="_blank" rel="noreferrer" style={tableLink}>
                      {item.listingTitle || `Listing #${item.listingID}`}
                    </a>
                  </td>
                  <td style={td}>{item.sellerEmail || 'N/A'}</td>
                  <td style={td}>
                    <span style={statusPill}>{item.violationStatus || 'Logged'}</span>
                  </td>
                  <td style={td}>{item.investigatorName || `User #${item.investigatorID}`}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} style={emptyTableCell}>
                    No violations have been logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tint }) {
  const backgrounds = {
    blue: 'linear-gradient(180deg, #eff6ff 0%, #93c5fd 100%)',
    amber: 'linear-gradient(180deg, #fffbeb 0%, #fcd34d 100%)',
    rose: 'linear-gradient(180deg, #fff1f2 0%, #fda4af 100%)',
    green: 'linear-gradient(180deg, #f0fdf4 0%, #86efac 100%)',
  }

  return (
    <div style={{ ...statCard, background: backgrounds[tint] }}>
      <Icon size={26} color="#0f172a" />
      <div>
        <div style={{ fontSize: 14, color: '#334155' }}>{label}</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#0f172a' }}>{value}</div>
      </div>
    </div>
  )
}

const page = {
  padding: '32px',
  maxWidth: 1360,
}

const hero = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 18,
  flexWrap: 'wrap',
  marginBottom: 24,
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

const heroNotice = {
  maxWidth: 420,
  padding: '16px 18px',
  borderRadius: 18,
  backgroundColor: '#fff7ed',
  border: '1px solid #fed7aa',
  color: '#9a3412',
  display: 'flex',
  gap: 10,
  fontSize: 14,
  lineHeight: 1.5,
}

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 14,
  marginBottom: 18,
}

const statCard = {
  borderRadius: 22,
  padding: 20,
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  boxShadow: '0 20px 48px rgba(15, 23, 42, 0.08)',
}

const mainGrid = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(360px, 0.9fr)',
  gap: 18,
}

const leftColumn = {
  minWidth: 0,
}

const rightColumn = {
  minWidth: 0,
}

const panel = {
  backgroundColor: '#ffffff',
  borderRadius: 28,
  border: '1px solid #e2e8f0',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
  padding: 24,
}

const panelHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  flexWrap: 'wrap',
}

const panelTitle = {
  margin: 0,
  color: '#0f172a',
  fontSize: 24,
}

const panelCopy = {
  margin: '8px 0 0',
  color: '#64748b',
  fontSize: 14,
  lineHeight: 1.5,
}

const scanButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 18px',
  border: 'none',
  borderRadius: 14,
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}

const formGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 14,
  marginTop: 18,
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
  minHeight: 132,
  paddingTop: 14,
  resize: 'vertical',
}

const helperText = {
  display: 'block',
  marginTop: 8,
  color: '#64748b',
  fontSize: 12,
}

const recallCard = {
  marginTop: 18,
  padding: 18,
  borderRadius: 20,
  background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
  border: '1px solid #dbeafe',
}

const recallName = {
  fontSize: 18,
  fontWeight: 700,
  color: '#0f172a',
}

const recallMeta = {
  marginTop: 8,
  color: '#475569',
  fontSize: 14,
}

const scanSummaryCard = {
  marginTop: 16,
  padding: 16,
  borderRadius: 18,
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
}

const errorBox = {
  marginTop: 16,
  padding: '14px 16px',
  borderRadius: 16,
  backgroundColor: '#fff1f2',
  border: '1px solid #fecdd3',
  color: '#be123c',
  fontSize: 14,
}

const candidateList = {
  display: 'grid',
  gap: 14,
  marginTop: 18,
}

const candidateCard = {
  textAlign: 'left',
  backgroundColor: '#ffffff',
  borderRadius: 22,
  border: '1px solid #dbe4f0',
  padding: 18,
  cursor: 'pointer',
}

const candidateTopRow = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'flex-start',
}

const candidateTitle = {
  fontSize: 17,
  color: '#0f172a',
  fontWeight: 700,
  lineHeight: 1.4,
}

const candidateMeta = {
  marginTop: 8,
  color: '#64748b',
  fontSize: 14,
}

const candidateMetaRow = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 14,
  color: '#475569',
  fontSize: 13,
  flexWrap: 'wrap',
}

const termWrap = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 14,
}

const termPill = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: 999,
  backgroundColor: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 12,
  fontWeight: 700,
}

const candidateFooter = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 16,
  alignItems: 'center',
  flexWrap: 'wrap',
}

const scorePill = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '7px 10px',
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
}

function candidateFlag(isDetectedMatch) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 10px',
    borderRadius: 999,
    backgroundColor: isDetectedMatch ? '#dcfce7' : '#e0f2fe',
    color: isDetectedMatch ? '#166534' : '#0f766e',
    fontWeight: 700,
    fontSize: 12,
  }
}

const listingLink = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 13,
}

const selectedListingCard = {
  padding: 18,
  borderRadius: 20,
  background: 'linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%)',
  border: '1px solid #c7d2fe',
}

const selectedEyebrow = {
  color: '#4338ca',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const selectedTitle = {
  marginTop: 10,
  fontSize: 18,
  color: '#0f172a',
  fontWeight: 700,
}

const selectedMeta = {
  marginTop: 8,
  color: '#475569',
  fontSize: 14,
}

const submitButton = {
  width: '100%',
  minHeight: 54,
  marginTop: 18,
  borderRadius: 16,
  border: 'none',
  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
}

const emptyState = {
  marginTop: 18,
  padding: 20,
  borderRadius: 18,
  backgroundColor: '#f8fafc',
  border: '1px dashed #cbd5e1',
  color: '#64748b',
  fontSize: 14,
}

const tableWrap = {
  marginTop: 18,
  overflowX: 'auto',
}

const table = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 880,
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

const tableLink = {
  color: '#2563eb',
  textDecoration: 'none',
  fontWeight: 600,
}

const statusPill = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '7px 10px',
  borderRadius: 999,
  backgroundColor: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 12,
  fontWeight: 700,
}

const emptyTableCell = {
  padding: '24px 16px',
  textAlign: 'center',
  color: '#64748b',
  fontSize: 14,
}
