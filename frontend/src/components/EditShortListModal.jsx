import React, { useState } from 'react'
import { X } from 'lucide-react'
import api from '../api/axios'
import { showToast } from './NotificationToast'

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

export default function EditShortListModal({ item, onClose, onSuccess }) {
  const [priorityLevel, setPriorityLevel] = useState(item.priorityLevel)
  const [notes, setNotes] = useState(item.notes ?? '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!priorityLevel) {
      setError('Please select a severity level.')
      return
    }

    setLoading(true)
    try {
      await api.put(`/api/shortlist/${item.shortListID}`, {
        priorityLevel,
        notes: notes || null,
      })
      showToast(`Priority list entry #${item.shortListID} updated successfully.`, 'success')
      onSuccess()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.detail ?? 'An error occurred. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0A1628' }}>
            Edit Priority List Entry
          </h2>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>

        {/* Read-only info */}
        <div style={{ backgroundColor: '#F8FAFC', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <Row label="ShortList ID" value={item.shortListID} />
          <Row label="Recall ID" value={item.recallID} />
          <Row label="Product Name" value={item.productName ?? '—'} last />
        </div>

        <form onSubmit={handleSubmit}>
          {/* Priority Level */}
          <div style={fieldGroup}>
            <label style={labelStyle}>
              Priority Level <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={priorityLevel}
              onChange={(e) => setPriorityLevel(e.target.value)}
              style={selectStyle}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div style={fieldGroup}>
            <label style={labelStyle}>Notes <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ ...selectStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 16, padding: '8px 12px', backgroundColor: '#FEF2F2', borderRadius: 6, border: '1px solid #FECACA' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '9px 20px', borderRadius: 6, border: 'none',
                backgroundColor: loading ? '#94A3B8' : '#0071BC',
                color: '#fff', fontWeight: 600, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Row({ label, value, last = false }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: last ? 0 : 8 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1E293B' }}>{value}</span>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modal = {
  backgroundColor: '#FFFFFF', borderRadius: 10, padding: 32,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 480,
  maxHeight: '90vh', overflowY: 'auto',
}
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4, display: 'flex' }
const fieldGroup = { marginBottom: 16 }
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }
const selectStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 6,
  border: '1px solid #E2E8F0', fontSize: 14, color: '#1E293B',
  outline: 'none', backgroundColor: '#FFFFFF',
}
const cancelBtn = {
  padding: '9px 20px', borderRadius: 6, border: '1px solid #E2E8F0',
  backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 500,
  fontSize: 14, cursor: 'pointer',
}
