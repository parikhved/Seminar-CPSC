import React from 'react'
import { ArrowRight, Eye } from 'lucide-react'

function truncate(str, maxLen = 80) {
  if (!str) return '—'
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function RecallTable({
  recalls,
  onViewRecall,
  onPrioritizeRecall,
  shortlistedIds = new Set(),
  showPrioritizeAction = true,
}) {
  const TH = ({ children, align = 'left' }) => (
    <th
      style={{
        padding: '10px 16px',
        textAlign: align,
        fontSize: 11,
        fontWeight: 600,
        color: '#CBD5E1',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
        backgroundColor: '#0A1628',
      }}
    >
      {children}
    </th>
  )

  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
        <thead>
          <tr>
            <TH>ID</TH>
            <TH>Product Name</TH>
            <TH>Manufacturer</TH>
            <TH>Hazard</TH>
            <TH>Status</TH>
            <TH>Recall Date</TH>
            <TH>Severity</TH>
            <TH align="center">Action</TH>
          </tr>
        </thead>
        <tbody>
          {recalls.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14, backgroundColor: '#FFFFFF' }}>
                No recalls found.
              </td>
            </tr>
          ) : (
            recalls.map((r, idx) => {
              const listed = shortlistedIds.has(r.recallID)
              return (
                <tr
                  key={r.recallID}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                    borderBottom: '1px solid #F1F5F9',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')}
                >
                  <td style={td}>{r.recallID}</td>
                  <td style={{ ...td, fontWeight: 500, color: '#1E293B', maxWidth: 200 }}>
                    <span title={r.productName}>{truncate(r.productName, 50)}</span>
                  </td>
                  <td style={td}>{r.manufacturerName ?? '—'}</td>
                  <td style={{ ...td, maxWidth: 240 }}>
                    <span title={r.hazard} style={{ color: '#475569' }}>{truncate(r.hazard, 70)}</span>
                  </td>
                  <td style={td}>
                    <span style={statusPill(r.status)}>{r.status ?? 'Pending'}</span>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatDate(r.recallDate)}</td>
                  <td style={td}>
                    {r.severity ? <span style={severityPill(r.severity)}>{r.severity}</span> : '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button onClick={() => onViewRecall(r)} style={secondaryActionBtn}>
                        <Eye size={13} />
                        View
                      </button>
                      {showPrioritizeAction ? (
                        <button
                          onClick={() => onPrioritizeRecall(r)}
                          style={listed ? listedActionBtn : primaryActionBtn}
                        >
                          <ArrowRight size={13} />
                          {listed ? 'Update' : 'Prioritize'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

const td = {
  padding: '11px 16px',
  fontSize: 13,
  color: '#475569',
  verticalAlign: 'middle',
}

const primaryActionBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 12px',
  borderRadius: 999,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const listedActionBtn = {
  ...primaryActionBtn,
  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
}

const secondaryActionBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 12px',
  borderRadius: 999,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

function statusPill(status) {
  const map = {
    Pending: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
    'Under Review': { backgroundColor: '#fef3c7', color: '#b45309' },
    Resolved: { backgroundColor: '#dcfce7', color: '#15803d' },
    Closed: { backgroundColor: '#e2e8f0', color: '#475569' },
  }
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    ...(map[status] ?? map.Pending),
  }
}

function severityPill(level) {
  const map = {
    Low: { backgroundColor: '#dbeafe', color: '#2563eb' },
    Medium: { backgroundColor: '#fef3c7', color: '#d97706' },
    High: { backgroundColor: '#fee2e2', color: '#dc2626' },
    Critical: { backgroundColor: '#fce7f3', color: '#be185d' },
  }
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    ...(map[level] ?? map.Low),
  }
}
