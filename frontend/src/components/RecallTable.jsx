import React from 'react'
import { Plus } from 'lucide-react'

function truncate(str, maxLen = 80) {
  if (!str) return '—'
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function RecallTable({ recalls, onAddToShortList, shortlistedIds = new Set() }) {
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
            <TH>Recall Date</TH>
            <TH>Remedy</TH>
            <TH align="center">Action</TH>
          </tr>
        </thead>
        <tbody>
          {recalls.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14, backgroundColor: '#FFFFFF' }}>
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
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatDate(r.recallDate)}</td>
                  <td style={td}>
                    {r.remedy ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 500,
                        backgroundColor: '#E1F3F8',
                        color: '#0071BC',
                      }}>
                        {r.remedy}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {listed ? (
                      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>Already Listed</span>
                    ) : (
                      <button
                        onClick={() => onAddToShortList(r)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 12px',
                          borderRadius: 5,
                          border: 'none',
                          backgroundColor: '#0071BC',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Plus size={13} />
                        Add to List
                      </button>
                    )}
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
