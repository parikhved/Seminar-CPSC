import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import api from '../api/axios'
import { showToast } from './NotificationToast'

const INITIAL_FORM = {
  productName: '',
  manufacturerName: '',
  hazard: '',
  recallDate: '',
  recallURL: '',
  remedy: '',
  units: '',
  soldAt: '',
}

export default function AddRecallModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const hasMissingField = Object.values(form).some((value) => !String(value).trim())
    if (hasMissingField) {
      setError('Fill in every recall field before submitting the record.')
      return
    }

    setSaving(true)

    try {
      await api.post('/api/recalls', form)
      showToast('New recall added successfully.', 'success')
      await onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Unable to create the recall record.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <div>
            <h2 style={title}>Add New Recall</h2>
            <p style={subtitle}>Create a recall record and return directly to the Import / View Recalls page.</p>
          </div>
          <button type="button" onClick={onClose} style={closeButton}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={grid}>
            <Field label="Product Name" value={form.productName} onChange={(value) => updateField('productName', value)} />
            <Field label="Manufacturer" value={form.manufacturerName} onChange={(value) => updateField('manufacturerName', value)} />
            <Field label="Hazard" value={form.hazard} onChange={(value) => updateField('hazard', value)} />
            <Field label="Recall Date" type="date" value={form.recallDate} onChange={(value) => updateField('recallDate', value)} />
            <Field label="Recall URL" value={form.recallURL} onChange={(value) => updateField('recallURL', value)} />
            <Field label="Remedy" value={form.remedy} onChange={(value) => updateField('remedy', value)} />
            <Field label="Units" value={form.units} onChange={(value) => updateField('units', value)} />
            <Field label="Sold At" value={form.soldAt} onChange={(value) => updateField('soldAt', value)} />
          </div>

          {error ? <div style={errorBox}>{error}</div> : null}

          <div style={buttonRow}>
            <button type="button" onClick={onClose} style={cancelButton}>Cancel</button>
            <button type="submit" disabled={saving} style={submitButton}>
              <Plus size={16} />
              {saving ? 'Saving…' : 'Add Recall'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange }) {
  return (
    <label style={fieldWrap}>
      <span style={labelStyle}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
        required
      />
    </label>
  )
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
  maxWidth: 860,
  backgroundColor: '#ffffff',
  borderRadius: 28,
  padding: 28,
  border: '1px solid #e2e8f0',
  boxShadow: '0 30px 70px rgba(15, 23, 42, 0.2)',
}

const header = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 24,
}

const title = {
  margin: 0,
  fontSize: 28,
  color: '#0f172a',
}

const subtitle = {
  margin: '8px 0 0',
  color: '#64748b',
  fontSize: 14,
}

const closeButton = {
  width: 40,
  height: 40,
  borderRadius: 12,
  border: '1px solid #dbe4f0',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  cursor: 'pointer',
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 16,
}

const fieldWrap = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const labelStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: '#0f172a',
}

const inputStyle = {
  minHeight: 50,
  borderRadius: 14,
  border: '1px solid #dbe4f0',
  padding: '0 14px',
  fontSize: 14,
  color: '#0f172a',
  outline: 'none',
}

const errorBox = {
  marginTop: 18,
  padding: '14px 16px',
  borderRadius: 16,
  border: '1px solid #fecaca',
  backgroundColor: '#fef2f2',
  color: '#b91c1c',
  fontSize: 14,
}

const buttonRow = {
  marginTop: 24,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
}

const cancelButton = {
  padding: '12px 18px',
  borderRadius: 14,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontWeight: 600,
  cursor: 'pointer',
}

const submitButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 18px',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer',
}
