import React, { useState } from 'react'
import { Pencil, Archive, RotateCcw } from 'lucide-react'
import PriorityBadge from './PriorityBadge'

function truncate(str, maxLen = 60) {
  if (!str) return '—'
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ShortListTable({ items, onEdit, onArchive, readOnly = false, actionRenderer = null }) {
  const [confirmEntry, setConfirmEntry] = useState(null)

  const TH = ({ children }) => (
    <th
      style={{
        padding: '10px 16px',
        textAlign: 'left',
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
    <>
      <div style={{ overflowX: 'auto', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr>
              <TH>SL ID</TH>
              <TH>Recall ID</TH>
              <TH>Product Name</TH>
              <TH>Hazard</TH>
              <TH>Priority</TH>
              <TH>Notes</TH>
              <TH>Date Added</TH>
              <TH>Manager</TH>
              <TH>Assigned Investigator</TH>
              <TH>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14, backgroundColor: '#FFFFFF' }}>
                  No items on the priority list yet.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr
                  key={item.shortListID}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                    borderBottom: '1px solid #F1F5F9',
                  }}
                >
                  <td style={td}>{item.shortListID}</td>
                  <td style={td}>{item.recallID}</td>
                  <td style={{ ...td, fontWeight: 500, color: '#1E293B' }}>
                    <span title={item.productName}>{truncate(item.productName, 45)}</span>
                  </td>
                  <td style={td}>
                    <span title={item.hazard}>{truncate(item.hazard, 55)}</span>
                  </td>
                  <td style={td}>
                    <PriorityBadge level={item.priorityLevel} />
                  </td>
                  <td style={{ ...td, color: '#64748B' }}>
                    <span title={item.notes}>{truncate(item.notes, 45)}</span>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{formatDate(item.shortListDate)}</td>
                  <td style={td}>
                    {item.managerFirstName} {item.managerLastName}
                  </td>
                  <td style={td}>
                    {item.assignedInvestigatorName
                      ? <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{item.assignedInvestigatorName}</span>
                      : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>}
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap', minWidth: 220 }}>
                    {readOnly ? (
                      actionRenderer ? actionRenderer(item) : (
                        <span style={{ color: '#64748B', fontSize: 12 }}>Assigned</span>
                      )
                    ) : (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {!item.isArchived && (
                          <button
                            onClick={() => onEdit(item)}
                            title="Edit"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '5px 10px',
                              borderRadius: 5,
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#F8FAFC',
                              color: '#0071BC',
                              fontSize: 12,
                              cursor: 'pointer',
                            }}
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                        )}
                        {!item.isArchived && actionRenderer ? actionRenderer(item) : null}
                        <button
                          onClick={() => setConfirmEntry(item)}
                          title={item.isArchived ? 'Restore' : 'Archive'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 10px',
                            borderRadius: 5,
                            border: item.isArchived ? '1px solid #BAE6FD' : '1px solid #FED7AA',
                            backgroundColor: item.isArchived ? '#F0F9FF' : '#FFF7ED',
                            color: item.isArchived ? '#0369A1' : '#C2410C',
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          {item.isArchived ? <RotateCcw size={13} /> : <Archive size={13} />}
                          {item.isArchived ? 'Restore' : 'Archive'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Archive Dialog */}
      {!readOnly && confirmEntry && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: 420, textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', color: '#0A1628' }}>
              {confirmEntry.isArchived ? 'Restore Entry?' : 'Archive Entry?'}
            </h3>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24 }}>
              {confirmEntry.isArchived
                ? `Restore ShortList #${confirmEntry.shortListID} so it appears in the active priority list again.`
                : `Archive ShortList #${confirmEntry.shortListID}. Archived entries are hidden from the active list but kept on record and can be restored later.`}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmEntry(null)}
                style={cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={() => { onArchive(confirmEntry); setConfirmEntry(null) }}
                style={{
                  padding: '9px 20px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: confirmEntry.isArchived ? '#0284C7' : '#C2410C',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {confirmEntry.isArchived ? 'Restore' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const td = { padding: '11px 16px', fontSize: 13, color: '#475569', verticalAlign: 'middle' }
const overlay = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modal = {
  backgroundColor: '#FFFFFF', borderRadius: 10, padding: 32,
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
}
const cancelBtn = {
  padding: '9px 20px', borderRadius: 6, border: '1px solid #E2E8F0',
  backgroundColor: '#F8FAFC', color: '#475569', fontWeight: 500,
  fontSize: 14, cursor: 'pointer',
}
