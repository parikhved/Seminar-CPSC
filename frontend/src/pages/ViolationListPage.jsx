import React, { useEffect, useState } from 'react'
import {
  ExternalLink,
  Pencil,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner'
import { showToast } from '../components/NotificationToast'
import { useAuth } from '../context/AuthContext'

const DESCRIPTION_MAX = 500
const STATUS_OPTIONS = ['Unresolved', 'Resolved']
const MATCH_OPTIONS = [
  { label: 'True', value: 'true' },
  { label: 'False', value: 'false' },
]

function formatDate(value) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isResolved(status) {
  return String(status || '').trim().toLowerCase() === 'resolved'
}

function normalizeEditableStatus(status) {
  return isResolved(status) ? 'Resolved' : 'Unresolved'
}

function getStatusTone(status) {
  if (isResolved(status)) {
    return { background: '#dcfce7', color: '#166534' }
  }
  return { background: '#fee2e2', color: '#b91c1c' }
}

function getMatchTone(matchConfirmation) {
  if (matchConfirmation) {
    return { background: '#dbeafe', color: '#1d4ed8' }
  }
  return { background: '#f3f4f6', color: '#475569' }
}

function summarizeViolations(items) {
  return {
    total: items.length,
    unresolved: items.filter((item) => !isResolved(item.status || item.violationStatus)).length,
    resolved: items.filter((item) => isResolved(item.status || item.violationStatus)).length,
    complete: items.filter((item) => item.documentationComplete).length,
  }
}

function buildEditState(violation) {
  return {
    matchConfirmation: String(Boolean(violation.matchConfirmation ?? violation.isViolation)),
    violationDescription: violation.violationDescription ?? violation.message ?? '',
    status: normalizeEditableStatus(violation.status || violation.violationStatus),
  }
}

export default function ViolationListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [searchSummary, setSearchSummary] = useState(null)

  const recallFilter = searchParams.get('recallId')
  const filteredViolations = recallFilter
    ? violations.filter((item) => String(item.recallID) === String(recallFilter))
    : violations
  const stats = summarizeViolations(filteredViolations)

  useEffect(() => {
    loadViolations()
  }, [])

  async function loadViolations() {
    setLoading(true)
    try {
      const response = await api.get('/api/violations')
      setViolations(response.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Unable to load the violation list right now.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch() {
    if (!user?.userID) {
      showToast('You must be signed in before searching for violations.', 'error')
      return
    }

    setSearching(true)
    try {
      const response = await api.post('/api/violations/search-shortlist', {
        investigatorID: user.userID,
      })
      setSearchSummary(response.data)
      await loadViolations()
    } catch (err) {
      const detail = err.response?.data?.detail ?? 'Unable to search eBay for violation matches right now.'
      showToast(detail, 'error')
    } finally {
      setSearching(false)
    }
  }

  function openEditModal(violation) {
    setEditTarget(violation)
    setEditForm(buildEditState(violation))
  }

  function closeEditModal() {
    setEditTarget(null)
    setEditForm(null)
    setSaving(false)
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    if (!editTarget || !editForm) return

    if (editForm.violationDescription.length > DESCRIPTION_MAX) {
      return
    }

    setSaving(true)
    try {
      const response = await api.put(`/api/violations/${editTarget.violationID}`, {
        matchConfirmation: editForm.matchConfirmation === 'true',
        violationDescription: editForm.violationDescription,
        status: editForm.status,
      })

      setViolations((current) => current.map((item) => (
        item.violationID === editTarget.violationID ? response.data : item
      )))
      showToast(`Violation #${editTarget.violationID} updated.`, 'success')
      closeEditModal()
    } catch (err) {
      const detail = err.response?.data?.detail ?? 'Unable to save violation changes right now.'
      showToast(detail, 'error')
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      await api.delete(`/api/violations/${deleteTarget.violationID}`)
      setViolations((current) => current.filter((item) => item.violationID !== deleteTarget.violationID))
      showToast(`Violation #${deleteTarget.violationID} deleted.`, 'info')
      setDeleteTarget(null)
    } catch (err) {
      const detail = err.response?.data?.detail ?? 'Unable to delete this violation right now.'
      showToast(detail, 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <p style={eyebrow}>Marketplace Enforcement</p>
          <h1 style={title}>Violation List</h1>
          <p style={subtitle}>
            Search the current shortlist against eBay Browse API results, review marketplace matches, and keep violation records current.
          </p>
        </div>

        <div style={headerActions}>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            style={primaryButton}
          >
            <Search size={16} />
            {searching ? 'Searching…' : 'Search for Violations'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/violations/logging')}
            style={secondaryButton}
          >
            <ShieldAlert size={16} />
            Open Logging Workspace
          </button>
        </div>
      </div>

      {recallFilter ? (
        <div style={filterBanner}>
          <div>
            Showing violation records for Recall #{recallFilter}.
          </div>
          <button type="button" onClick={() => navigate('/violations')} style={filterDismissButton}>
            Clear Filter
          </button>
        </div>
      ) : null}

      {error ? <div style={errorBox}>{error}</div> : null}

      <div style={statsGrid}>
        <SummaryCard label="Total Violations" value={stats.total} accent="#dbeafe" />
        <SummaryCard label="Unresolved" value={stats.unresolved} accent="#fee2e2" />
        <SummaryCard label="Resolved" value={stats.resolved} accent="#dcfce7" />
        <SummaryCard label="Complete Documentation" value={stats.complete} accent="#fef3c7" />
      </div>

      <div style={panel}>
        <div style={panelHeader}>
          <div>
            <h2 style={panelTitle}>Current Marketplace Matches</h2>
            <p style={panelCopy}>
              Imported matches are created from shortlist product-name searches against the eBay Browse API.
            </p>
          </div>
        </div>

        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                {['Violation', 'Shortlist', 'Product', 'Marketplace Listing', 'Seller', 'Match', 'Status', 'Date', 'Description', 'Actions'].map((heading) => (
                  <th key={heading} style={th}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredViolations.length ? filteredViolations.map((violation) => {
                const deleteDisabled = !isResolved(violation.status || violation.violationStatus)
                return (
                  <tr key={violation.violationID} style={{ borderBottom: '1px solid #eef2f7' }}>
                    <td style={tdStrong}>#{violation.violationID}</td>
                    <td style={td}>{violation.shortListID ? `#${violation.shortListID}` : 'N/A'}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{violation.productName || violation.recallProductName || 'Unknown product'}</div>
                      <div style={subtleMeta}>Recall #{violation.recallID ?? 'N/A'}</div>
                    </td>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{violation.listingTitle || 'Marketplace listing'}</div>
                      <div style={subtleMeta}>{violation.marketplaceSource || violation.marketplaceName || 'eBay'}</div>
                      {violation.URL || violation.listingURL ? (
                        <a
                          href={violation.URL || violation.listingURL}
                          target="_blank"
                          rel="noreferrer"
                          style={externalLink}
                        >
                          View Listing
                          <ExternalLink size={13} />
                        </a>
                      ) : null}
                    </td>
                    <td style={td}>
                      <div>{violation.seller || violation.sellerName || violation.sellerEmail || 'Unknown seller'}</div>
                      <div style={subtleMeta}>{violation.sellerID ? `Seller #${violation.sellerID}` : 'Seller ID pending'}</div>
                    </td>
                    <td style={td}>
                      <span style={{ ...pill, ...getMatchTone(violation.matchConfirmation ?? violation.isViolation) }}>
                        {(violation.matchConfirmation ?? violation.isViolation) ? 'True' : 'False'}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ ...pill, ...getStatusTone(violation.status || violation.violationStatus) }}>
                        {normalizeEditableStatus(violation.status || violation.violationStatus)}
                      </span>
                    </td>
                    <td style={td}>{formatDate(violation.violationDate || violation.dateDetected)}</td>
                    <td style={td}>
                      <div style={descriptionCell}>
                        {violation.violationDescription || violation.message || 'No violation description added yet.'}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={actionRow}>
                        <button type="button" onClick={() => openEditModal(violation)} style={editButton}>
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(violation)}
                          disabled={deleteDisabled}
                          style={deleteDisabled ? disabledDeleteButton : deleteButton}
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={10} style={emptyCell}>
                    No violations are available yet. Run “Search for Violations” to import current shortlist matches from eBay.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {searchSummary ? (
        <ModalCard>
          <h2 style={modalTitle}>Search Complete</h2>
          <p style={modalCopy}>The number of new violations found is: {searchSummary.newViolationsFound}</p>
          <button type="button" onClick={() => setSearchSummary(null)} style={modalPrimaryButton}>
            OK
          </button>
        </ModalCard>
      ) : null}

      {editTarget && editForm ? (
        <ModalCard>
          <form onSubmit={handleEditSubmit}>
            <h2 style={modalTitle}>Edit Violation Information</h2>
            <div style={detailGrid}>
              <DetailRow label="Violation ID" value={`#${editTarget.violationID}`} />
              <DetailRow label="Shortlist ID" value={editTarget.shortListID ? `#${editTarget.shortListID}` : 'N/A'} />
              <DetailRow label="Product Name" value={editTarget.productName || editTarget.recallProductName || 'N/A'} />
              <DetailRow label="Seller" value={editTarget.seller || editTarget.sellerName || editTarget.sellerEmail || 'Unknown seller'} />
              <DetailRow label="Marketplace" value={editTarget.marketplaceSource || editTarget.marketplaceName || 'eBay'} />
              <DetailRow label="Violation Date" value={formatDate(editTarget.violationDate || editTarget.dateDetected)} />
            </div>

            <label style={fieldLabel}>Match Confirmation</label>
            <select
              value={editForm.matchConfirmation}
              onChange={(event) => setEditForm((current) => ({ ...current, matchConfirmation: event.target.value }))}
              style={input}
            >
              {MATCH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <label style={fieldLabel}>Violation Description</label>
            <textarea
              rows={5}
              value={editForm.violationDescription}
              onChange={(event) => setEditForm((current) => ({ ...current, violationDescription: event.target.value }))}
              style={{ ...input, resize: 'vertical', paddingTop: 14 }}
            />
            <div style={editForm.violationDescription.length > DESCRIPTION_MAX ? helperError : helperCopy}>
              {editForm.violationDescription.length > DESCRIPTION_MAX
                ? `Violation description exceeds ${DESCRIPTION_MAX} characters.`
                : `${editForm.violationDescription.length} / ${DESCRIPTION_MAX} characters`}
            </div>

            <label style={fieldLabel}>Status</label>
            <select
              value={editForm.status}
              onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
              style={input}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <div style={modalActions}>
              <button type="button" onClick={closeEditModal} style={modalSecondaryButton}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || editForm.violationDescription.length > DESCRIPTION_MAX}
                style={saving || editForm.violationDescription.length > DESCRIPTION_MAX ? modalDisabledButton : modalPrimaryButton}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </ModalCard>
      ) : null}

      {deleteTarget ? (
        <ModalCard>
          <h2 style={modalTitle}>Delete Violation?</h2>
          <p style={modalCopy}>
            Delete Violation #{deleteTarget.violationID} for {deleteTarget.productName || deleteTarget.recallProductName || 'this product'}.
          </p>
          <div style={modalActions}>
            <button type="button" onClick={() => setDeleteTarget(null)} style={modalSecondaryButton}>
              Cancel
            </button>
            <button type="button" onClick={confirmDelete} disabled={deleting} style={deleting ? modalDisabledDeleteButton : modalDeleteButton}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </ModalCard>
      ) : null}
    </div>
  )
}

function SummaryCard({ label, value, accent }) {
  return (
    <div style={{ ...summaryCard, backgroundColor: accent }}>
      <div style={{ fontSize: 14, color: '#334155' }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: 38, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <div style={detailLabel}>{label}</div>
      <div style={detailValue}>{value}</div>
    </div>
  )
}

function ModalCard({ children }) {
  return (
    <div style={overlay}>
      <div style={modal}>
        {children}
      </div>
    </div>
  )
}

const page = {
  padding: '32px',
  maxWidth: 1420,
}

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
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
  fontSize: 40,
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

const headerActions = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
}

const primaryButton = {
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

const secondaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 18px',
  borderRadius: 14,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const filterBanner = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 18,
  padding: '14px 18px',
  borderRadius: 16,
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  color: '#1d4ed8',
  fontSize: 14,
  fontWeight: 600,
  flexWrap: 'wrap',
}

const filterDismissButton = {
  border: 'none',
  backgroundColor: '#1d4ed8',
  color: '#ffffff',
  borderRadius: 999,
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

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

const summaryCard = {
  padding: '22px 20px',
  borderRadius: 22,
  boxShadow: '0 18px 36px rgba(15, 23, 42, 0.08)',
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
  flexWrap: 'wrap',
  marginBottom: 18,
}

const panelTitle = {
  margin: 0,
  fontSize: 22,
  color: '#0f172a',
}

const panelCopy = {
  margin: '8px 0 0',
  color: '#64748b',
  fontSize: 14,
}

const tableWrap = {
  overflowX: 'auto',
}

const table = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 1280,
}

const th = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const td = {
  padding: '16px 14px',
  fontSize: 13,
  color: '#475569',
  verticalAlign: 'top',
}

const tdStrong = {
  ...td,
  fontWeight: 700,
  color: '#0f172a',
}

const subtleMeta = {
  marginTop: 6,
  color: '#94a3b8',
  fontSize: 12,
}

const externalLink = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  marginTop: 8,
  color: '#1d4ed8',
  fontSize: 12,
  fontWeight: 600,
  textDecoration: 'none',
}

const pill = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 9px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
}

const descriptionCell = {
  maxWidth: 260,
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
}

const actionRow = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const editButton = {
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

const deleteButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #fecaca',
  backgroundColor: '#fef2f2',
  color: '#b91c1c',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const disabledDeleteButton = {
  ...deleteButton,
  opacity: 0.45,
  cursor: 'not-allowed',
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
  maxWidth: 640,
  maxHeight: '90vh',
  overflowY: 'auto',
  backgroundColor: '#ffffff',
  borderRadius: 24,
  padding: 28,
  boxShadow: '0 30px 70px rgba(15, 23, 42, 0.24)',
}

const modalTitle = {
  margin: 0,
  fontSize: 26,
  color: '#0f172a',
}

const modalCopy = {
  margin: '12px 0 0',
  color: '#475569',
  fontSize: 15,
  lineHeight: 1.6,
}

const detailGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 16,
  marginTop: 20,
  marginBottom: 22,
  padding: 18,
  borderRadius: 18,
  backgroundColor: '#f8fafc',
}

const detailLabel = {
  fontSize: 11,
  color: '#64748b',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const detailValue = {
  marginTop: 6,
  color: '#0f172a',
  fontSize: 14,
  lineHeight: 1.5,
}

const fieldLabel = {
  display: 'block',
  marginTop: 18,
  marginBottom: 8,
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 700,
}

const input = {
  width: '100%',
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  padding: '12px 14px',
  fontSize: 14,
  color: '#0f172a',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
}

const helperCopy = {
  marginTop: 8,
  color: '#64748b',
  fontSize: 12,
}

const helperError = {
  marginTop: 8,
  color: '#b91c1c',
  fontSize: 12,
  fontWeight: 600,
}

const modalActions = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
  marginTop: 26,
  flexWrap: 'wrap',
}

const modalPrimaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minWidth: 120,
  padding: '12px 18px',
  border: 'none',
  borderRadius: 12,
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#ffffff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}

const modalSecondaryButton = {
  minWidth: 110,
  padding: '12px 18px',
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}

const modalDeleteButton = {
  ...modalPrimaryButton,
  background: '#b91c1c',
}

const modalDisabledButton = {
  ...modalPrimaryButton,
  opacity: 0.55,
  cursor: 'not-allowed',
}

const modalDisabledDeleteButton = {
  ...modalDeleteButton,
  opacity: 0.55,
  cursor: 'not-allowed',
}
