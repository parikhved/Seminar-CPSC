import React, { useEffect, useState, useCallback } from 'react'
import api from '../api/axios'
import ShortListTable from '../components/ShortListTable'
import EditShortListModal from '../components/EditShortListModal'
import LoadingSpinner from '../components/LoadingSpinner'
import PriorityBadge from '../components/PriorityBadge'
import { showToast } from '../components/NotificationToast'

const PRIORITIES = ['All', 'Critical', 'High', 'Medium', 'Low']

export default function ShortListPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [editItem, setEditItem] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter !== 'All' ? { priority: filter } : {}
      const res = await api.get('/api/shortlist', { params })
      setItems(res.data)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(shortListID) {
    try {
      await api.delete(`/api/shortlist/${shortListID}`)
      showToast(`Priority list entry #${shortListID} removed.`, 'info')
      fetchData()
    } catch (err) {
      showToast(err.response?.data?.detail ?? 'Failed to delete entry.', 'error')
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0A1628' }}>High Priority Recall List</h1>
        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>Recalls prioritized for investigation</p>
      </div>

      {/* Filter bar + summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Filter by Priority:</label>
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
          <strong>{items.length}</strong> recall{items.length !== 1 ? 's' : ''} on priority list
        </span>

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
          onDelete={handleDelete}
        />
      )}

      {/* Edit modal */}
      {editItem && (
        <EditShortListModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}
