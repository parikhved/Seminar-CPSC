import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import { showToast } from '../components/NotificationToast'

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

function formatDate(d) {
  if (!d) return 'N/A'
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function PrioritizationPage() {
  const { recallId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [recall, setRecall] = useState(null)
  const [existingShortlist, setExistingShortlist] = useState(null)
  const [priorityLevel, setPriorityLevel] = useState('High')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [recallRes, shortlistRes] = await Promise.all([
          api.get(`/api/recalls/${recallId}`),
          api.get('/api/shortlist'),
        ])

        const entry = shortlistRes.data.find((item) => String(item.recallID) === String(recallId)) ?? null

        setRecall(recallRes.data)
        setExistingShortlist(entry)
        setPriorityLevel(entry?.priorityLevel ?? deriveSeverity(recallRes.data.hazard))
        setNotes(entry?.notes ?? buildInitialJustification(recallRes.data))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [recallId])

  const isValid = useMemo(() => notes.trim().length >= 30, [notes])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!priorityLevel) {
      setError('Select a severity level before submitting.')
      return
    }

    if (!isValid) {
      setError('Provide a more complete prioritization justification before submitting.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        priorityLevel,
        notes: notes.trim(),
      }

      if (existingShortlist) {
        await api.put(`/api/shortlist/${existingShortlist.shortListID}`, payload)
        showToast(`Priority list entry #${existingShortlist.shortListID} updated.`, 'success')
      } else {
        await api.post('/api/shortlist', {
          ...payload,
          recallID: Number(recallId),
          managerUserID: user.userID,
        })
        showToast(`Recall #${recallId} added to the priority list.`, 'success')
      }

      navigate('/shortlist')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Unable to save prioritization changes.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!recall) return null

  return (
    <div style={page}>
      <div style={header}>
        <div>
          <p style={eyebrow}>Prioritization Form</p>
          <h1 style={title}>{recall.productName}</h1>
        </div>
      </div>

      <div style={layout}>
        <form onSubmit={handleSubmit} style={mainCard}>
          <div style={topRow}>
            <div style={productBadge}>CPSC</div>
            <div style={{ flex: 1 }}>
              <div style={priorityPill(priorityLevel)}>
                <AlertTriangle size={15} />
                {priorityLevel}
              </div>
              <div style={hazardText}>{recall.hazard || 'Hazard pending review'}</div>
              <div style={reportDate}>Date Reported: {formatDate(recall.recallDate)}</div>
            </div>
          </div>

          <div style={fieldGroup}>
            <label style={label}>Severity Level</label>
            <select value={priorityLevel} onChange={(e) => setPriorityLevel(e.target.value)} style={input}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
            <div style={helperWarning}>
              <AlertTriangle size={16} />
              Severity currently marked as {priorityLevel}
            </div>
          </div>

          <div style={fieldGroup}>
            <label style={label}>Prioritization Justification</label>
            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...input, resize: 'vertical', paddingTop: 14 }}
            />
            <div style={isValid ? helperValid : helperMuted}>
              <CheckCircle2 size={16} />
              {isValid ? 'Valid justification provided' : 'Add more decision context to meet the review threshold'}
            </div>
          </div>

          {error ? <div style={errorBox}>{error}</div> : null}

          <div style={buttonRow}>
            <button type="submit" disabled={saving} style={submitBtn}>
              {saving ? 'Saving…' : existingShortlist ? 'Update Priority' : 'Submit'}
            </button>
            <button type="button" onClick={() => navigate(`/recalls/${recall.recallID}`)} style={cancelBtn}>
              Cancel
            </button>
          </div>
        </form>

        <div style={sidebar}>
          <div style={sideCard}>
            <h3 style={sideTitle}>Product Information</h3>
            <InfoRow label="Recall ID" value={recall.recallID} />
            <InfoRow label="Product Name" value={recall.productName} />
            <InfoRow label="Manufacturer" value={recall.manufacturerName || 'N/A'} />
            <InfoRow label="Hazard" value={recall.hazard || 'N/A'} />
            <InfoRow label="Units Affected" value={recall.units || 'N/A'} />
            <InfoRow label="Sold At" value={recall.soldAt || 'N/A'} />
          </div>

          <div style={sideCard}>
            <h3 style={sideTitle}>Review Context</h3>
            <p style={sideText}>
              This form writes directly to the FastAPI shortlist endpoint and persists the priority level and notes in the database.
            </p>
            <p style={sideText}>
              Manager: {user?.firstName} {user?.lastName}
            </p>
            <p style={sideText}>
              Existing record: {existingShortlist ? `ShortList #${existingShortlist.shortListID}` : 'No shortlist entry yet'}
            </p>
          </div>
        </div>
      </div>
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

function deriveSeverity(hazard = '') {
  const normalized = hazard.toLowerCase()
  if (/lead|shock|fire|fatal|smolder/.test(normalized)) return 'High'
  if (/brake|fall|burn|injury|crush|entrapment/.test(normalized)) return 'Medium'
  return 'Low'
}

function buildInitialJustification(recall) {
  return `The recall for ${recall.productName} requires review because ${lowerFirst(recall.hazard || 'the safety issue may impact consumers')}. Distribution across ${recall.soldAt || 'multiple sales channels'} increases the need for immediate manager attention.`
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

const layout = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.8fr)',
  gap: 18,
}

const mainCard = {
  backgroundColor: '#ffffff',
  borderRadius: 28,
  padding: 28,
  border: '1px solid #e2e8f0',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
}

const topRow = {
  display: 'flex',
  gap: 22,
  alignItems: 'center',
  marginBottom: 26,
}

const productBadge = {
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

const hazardText = {
  marginTop: 12,
  display: 'inline-flex',
  padding: '8px 12px',
  borderRadius: 999,
  backgroundColor: '#fff7ed',
  color: '#b45309',
  fontWeight: 600,
}

const reportDate = {
  marginTop: 18,
  fontSize: 14,
  color: '#475569',
}

const fieldGroup = {
  marginBottom: 22,
}

const label = {
  display: 'block',
  marginBottom: 10,
  fontSize: 15,
  fontWeight: 700,
  color: '#0f172a',
}

const input = {
  width: '100%',
  minHeight: 54,
  borderRadius: 16,
  border: '1px solid #dbe4f0',
  backgroundColor: '#ffffff',
  padding: '0 16px',
  fontSize: 15,
  color: '#0f172a',
  outline: 'none',
}

const helperWarning = {
  marginTop: 10,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: '#dc2626',
  fontSize: 14,
  fontWeight: 600,
}

const helperValid = {
  marginTop: 10,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: '#16a34a',
  fontSize: 14,
  fontWeight: 600,
}

const helperMuted = {
  marginTop: 10,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: '#64748b',
  fontSize: 14,
}

const errorBox = {
  marginBottom: 18,
  padding: '14px 16px',
  borderRadius: 16,
  border: '1px solid #fecaca',
  backgroundColor: '#fef2f2',
  color: '#b91c1c',
  fontSize: 14,
}

const buttonRow = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
}

const submitBtn = {
  padding: '12px 28px',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
}

const cancelBtn = {
  padding: '12px 28px',
  borderRadius: 14,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontWeight: 600,
  fontSize: 14,
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

const sideText = {
  margin: '0 0 12px',
  color: '#475569',
  fontSize: 14,
  lineHeight: 1.7,
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

function priorityPill(level) {
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
