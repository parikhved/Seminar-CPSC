import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import ShortListTable from '../components/ShortListTable'
import EditShortListModal from '../components/EditShortListModal'
import LoadingSpinner from '../components/LoadingSpinner'
import PriorityBadge from '../components/PriorityBadge'
import { showToast } from '../components/NotificationToast'
import { useAuth } from '../context/AuthContext'

const PRIORITIES = ['All', 'Critical', 'High', 'Medium', 'Low']

export default function ShortListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [showArchived, setShowArchived] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [assignTarget, setAssignTarget] = useState(null)
  const [investigators, setInvestigators] = useState([])
  const [selectedInvestigatorID, setSelectedInvestigatorID] = useState('')
  const [assigning, setAssigning] = useState(false)
  const isInvestigator = user?.role === 'Investigator'
  const isManager = user?.role === 'Manager'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter !== 'All') params.priority = filter
      if (isInvestigator && user?.userID) params.investigatorUserID = user.userID
      if (showArchived) params.includeArchived = true
      const res = await api.get('/api/shortlist', { params })
      const data = showArchived ? res.data.filter((entry) => entry.isArchived) : res.data
      setItems(data)
    } finally {
      setLoading(false)
    }
  }, [filter, isInvestigator, user?.userID, showArchived])

  useEffect(() => {
    if (isManager) {
      api.get('/api/shortlist/investigators').then((res) => setInvestigators(res.data)).catch(() => {})
    }
  }, [isManager])

  async function handleAssign() {
    if (!assignTarget) return
    setAssigning(true)
    try {
      await api.patch(`/api/shortlist/${assignTarget.shortListID}/assign`, {
        investigatorUserID: selectedInvestigatorID ? Number(selectedInvestigatorID) : null,
      })
      showToast(
        selectedInvestigatorID
          ? `Recall assigned to investigator.`
          : `Investigator assignment cleared.`,
        'success',
      )
      setAssignTarget(null)
      fetchData()
    } catch (err) {
      showToast(err.response?.data?.detail ?? 'Assignment failed.', 'error')
    } finally {
      setAssigning(false)
    }
  }

  function openAssignModal(item) {
    setAssignTarget(item)
    setSelectedInvestigatorID(item.assignedInvestigatorID ? String(item.assignedInvestigatorID) : '')
  }

  useEffect(() => { fetchData() }, [fetchData])

  async function handleArchive(item) {
    const nextArchived = !item.isArchived
    try {
      await api.patch(`/api/shortlist/${item.shortListID}/archive`, {
        isArchived: nextArchived,
      })
      showToast(
        nextArchived
          ? `Priority list entry #${item.shortListID} archived.`
          : `Priority list entry #${item.shortListID} restored.`,
        'info',
      )
      fetchData()
    } catch (err) {
      showToast(err.response?.data?.detail ?? 'Failed to update entry.', 'error')
    }
  }

  // Count by priority from ALL items (use unfiltered count)
  const counts = items.reduce((acc, item) => {
    acc[item.priorityLevel] = (acc[item.priorityLevel] ?? 0) + 1
    return acc
  }, {})

  return (
    <div style={{ padding: 32, maxWidth: 1300 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0A1628' }}>
            {isInvestigator ? 'My Assigned Recalls' : 'High Priority Recall List'}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>
            {isInvestigator ? 'Recalls assigned to you for investigation' : 'Recalls prioritized for investigation — assign investigators from here'}
          </p>
        </div>
      </div>

      {/* Filter bar + summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
            {isInvestigator ? 'Filter by Severity:' : 'Filter by Priority:'}
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #E2E8F0',
              fontSize: 13,
              color: '#1E293B',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <span style={{ fontSize: 13, color: '#64748B' }}>
          <strong>{items.length}</strong> recall{items.length !== 1 ? 's' : ''} {isInvestigator ? 'in your queue' : showArchived ? 'archived' : 'on priority list'}
        </span>

        {!isInvestigator && (
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              backgroundColor: showArchived ? '#0A1628' : '#FFFFFF',
              color: showArchived ? '#FFFFFF' : '#334155',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showArchived ? 'Showing Archived — Switch to Active' : 'Show Archived'}
          </button>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Critical', 'High', 'Medium', 'Low'].map((lvl) =>
            counts[lvl] ? (
              <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748B' }}>
                <PriorityBadge level={lvl} />
                <span>×{counts[lvl]}</span>
              </div>
            ) : null,
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <ShortListTable
          items={items}
          onEdit={setEditItem}
          onArchive={handleArchive}
          readOnly={isInvestigator}
          actionRenderer={(item) => (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isInvestigator && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(`/recalls/${item.recallID}`)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #dbe4f0', backgroundColor: '#ffffff', color: '#0f172a', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    View Recall
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/violations/logging?recallId=${item.recallID}`)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Compare Listings
                  </button>
                </>
              )}
              {isManager && (
                <button
                  type="button"
                  onClick={() => openAssignModal(item)}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #a5b4fc', backgroundColor: '#eef2ff', color: '#3730a3', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {item.assignedInvestigatorID ? 'Reassign' : 'Assign Investigator'}
                </button>
              )}
            </div>
          )}
        />
      )}

      {/* Edit modal */}
      {!isInvestigator && editItem && (
        <EditShortListModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSuccess={fetchData}
        />
      )}

      {/* Assign Investigator modal */}
      {assignTarget && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 20, color: '#0f172a' }}>Assign Investigator</h3>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>
              Recall: <strong>{assignTarget.productName}</strong>
            </p>

            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#334155' }}>
              Investigator
            </label>
            <select
              value={selectedInvestigatorID}
              onChange={(e) => setSelectedInvestigatorID(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 20 }}
            >
              <option value="">— Unassigned —</option>
              {investigators.map((inv) => (
                <option key={inv.userID} value={inv.userID}>
                  {inv.firstName} {inv.lastName} ({inv.email})
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssign}
                disabled={assigning}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                {assigning ? 'Saving…' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
