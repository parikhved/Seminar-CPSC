import React, { useEffect, useState, useCallback } from 'react'
import { Download, Plus, RefreshCw, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import AddRecallModal from '../components/AddRecallModal'
import RecallTable from '../components/RecallTable'
import LoadingSpinner from '../components/LoadingSpinner'
import { showToast } from '../components/NotificationToast'

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

function sortRecalls(items, sortKey) {
  const sorted = [...items]

  if (sortKey === 'date-asc') {
    sorted.sort((a, b) => new Date(a.recallDate || 0) - new Date(b.recallDate || 0))
    return sorted
  }

  if (sortKey === 'product') {
    sorted.sort((a, b) => (a.productName || '').localeCompare(b.productName || ''))
    return sorted
  }

  sorted.sort((a, b) => new Date(b.recallDate || 0) - new Date(a.recallDate || 0))
  return sorted
}

function formatDate(d) {
  if (!d) return 'N/A'
  return new Date(d).toLocaleDateString('en-US')
}

export default function RecallListPage() {
  const navigate = useNavigate()
  const [recalls, setRecalls] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState('date-desc')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recallsRes, shortlistRes] = await Promise.all([
        api.get('/api/recalls', { params: { page: 1, limit: 100, search: debouncedSearch || undefined } }),
        api.get('/api/shortlist'),
      ])

      const shortlistByRecallId = new Map(shortlistRes.data.map((item) => [item.recallID, item]))
      const enrichedRecalls = recallsRes.data.recalls.map((recall) => {
        const shortlistItem = shortlistByRecallId.get(recall.recallID)
        const severity = shortlistItem?.priorityLevel ?? null
        const status = shortlistItem ? deriveStatus(shortlistItem.priorityLevel) : 'Pending'

        return {
          ...recall,
          severity,
          status,
          shortListID: shortlistItem?.shortListID ?? null,
        }
      })

      setRecalls(enrichedRecalls)
    } catch {
      showToast('Failed to load recalls. The server may be starting up — try again in a moment.', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchData()
    showToast('Recall data refreshed from the backend.', 'info')
  }

  function handleDownloadCsv() {
    const rows = [
      ['Recall ID', 'Product Name', 'Hazard', 'Severity', 'Date Reported', 'Status'],
      ...filteredRecalls.map((recall) => [
        recall.recallID,
        escapeCsv(recall.productName),
        escapeCsv(recall.hazard),
        recall.severity ?? '',
        formatDate(recall.recallDate),
        recall.status,
      ]),
    ]

    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cpsc-recalls.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredRecalls = sortRecalls(
    recalls.filter((recall) => statusFilter === 'All' || recall.status === statusFilter),
    sortBy,
  )

  const stats = summarizeRecalls(recalls)

  return (
    <div style={page}>
      <div style={headerRow}>
        <div>
          <h1 style={pageTitle}>Import / View Recalls</h1>
          <p style={pageSubtitle}>
            Search, review, and prioritize database-backed recalls without leaving the workflow.
          </p>
        </div>

        <div style={headerActions}>
          <button onClick={() => setShowAddModal(true)} style={addButton}>
            <Plus size={16} />
            Add New Recall
          </button>
          <button onClick={handleRefresh} disabled={refreshing} style={syncButton}>
            <RefreshCw size={16} />
            {refreshing ? 'Refreshing…' : 'Sync Recalls'}
          </button>
          <button onClick={handleDownloadCsv} style={downloadButton}>
            <Download size={16} />
            Download CSV
          </button>
        </div>
      </div>

      <div style={controlsRow}>
        <div style={searchWrap}>
          <Search size={16} color="#64748b" style={searchIcon} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, manufacturer, or hazard..."
            style={searchInput}
          />
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="All">Filter by Status</option>
          <option value="Pending">Pending</option>
          <option value="Under Review">Under Review</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
          <option value="date-desc">Sort by Date (Newest)</option>
          <option value="date-asc">Sort by Date (Oldest)</option>
          <option value="product">Sort by Product Name</option>
        </select>
      </div>

      <div style={tableCard}>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <RecallTable
              recalls={filteredRecalls}
              shortlistedIds={new Set(recalls.filter((recall) => recall.shortListID).map((recall) => recall.recallID))}
              onViewRecall={(recall) => navigate(`/recalls/${recall.recallID}`)}
              onPrioritizeRecall={(recall) => navigate(`/recalls/${recall.recallID}/prioritize`)}
            />

            <div style={tableFooter}>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Showing {filteredRecalls.length} of {recalls.length} recall records
              </span>
            </div>
          </>
        )}
      </div>

      <div style={statsGrid}>
        <SummaryCard label="Total Recalls" value={stats.total} accent="blue" />
        <SummaryCard label="High Priority" value={stats.highPriority} accent="rose" />
        <SummaryCard label="Pending Review" value={stats.pending} accent="amber" />
        <SummaryCard label="Resolved" value={stats.resolved} accent="green" />
      </div>

      {showAddModal ? (
        <AddRecallModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchData}
        />
      ) : null}
    </div>
  )
}

function SummaryCard({ label, value, accent }) {
  const accents = {
    blue: 'linear-gradient(180deg, #eff6ff 0%, #60a5fa 100%)',
    rose: 'linear-gradient(180deg, #fff1f2 0%, #fda4af 100%)',
    amber: 'linear-gradient(180deg, #fffbeb 0%, #fcd34d 100%)',
    green: 'linear-gradient(180deg, #f0fdf4 0%, #4ade80 100%)',
  }

  return (
    <div style={{ ...summaryCard, background: accents[accent] }}>
      <div style={{ fontSize: 15, color: '#334155' }}>{label}</div>
      <div style={{ fontSize: 42, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function summarizeRecalls(recalls) {
  return {
    total: recalls.length,
    highPriority: recalls.filter((item) => item.severity === 'High' || item.severity === 'Critical').length,
    pending: recalls.filter((item) => item.status === 'Pending').length,
    resolved: recalls.filter((item) => item.status === 'Resolved').length,
  }
}

function deriveStatus(priorityLevel) {
  if (priorityLevel === 'Low') return 'Resolved'
  if (priorityLevel === 'Medium') return 'Pending'
  return 'Under Review'
}

function escapeCsv(value) {
  if (!value) return '""'
  return `"${String(value).replaceAll('"', '""')}"`
}

const page = {
  padding: '32px',
  maxWidth: 1320,
}

const headerRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 20,
  flexWrap: 'wrap',
}

const pageTitle = {
  margin: 0,
  fontSize: 40,
  lineHeight: 1.05,
  color: '#0f172a',
}

const pageSubtitle = {
  margin: '10px 0 0',
  fontSize: 15,
  color: '#64748b',
  maxWidth: 680,
}

const headerActions = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
}

const baseHeaderButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 18px',
  borderRadius: 14,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const syncButton = {
  ...baseHeaderButton,
  border: 'none',
  background: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
  color: '#ffffff',
}

const addButton = {
  ...baseHeaderButton,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#ffffff',
}

const downloadButton = {
  ...baseHeaderButton,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#0f172a',
}

const controlsRow = {
  display: 'grid',
  gridTemplateColumns: 'minmax(280px, 1fr) 220px 240px',
  gap: 14,
  marginBottom: 20,
}

const searchWrap = {
  position: 'relative',
}

const searchIcon = {
  position: 'absolute',
  left: 14,
  top: '50%',
  transform: 'translateY(-50%)',
}

const searchInput = {
  width: '100%',
  minHeight: 52,
  padding: '0 16px 0 42px',
  borderRadius: 16,
  border: '1px solid #dbe4f0',
  backgroundColor: '#ffffff',
  fontSize: 15,
  color: '#0f172a',
  outline: 'none',
}

const selectStyle = {
  minHeight: 52,
  padding: '0 16px',
  borderRadius: 16,
  border: '1px solid #dbe4f0',
  backgroundColor: '#ffffff',
  fontSize: 14,
  color: '#0f172a',
  cursor: 'pointer',
}

const tableCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 28,
  padding: 16,
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
}

const tableFooter = {
  padding: '16px 6px 4px',
}

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 16,
  marginTop: 24,
}

const summaryCard = {
  minHeight: 132,
  borderRadius: 24,
  padding: '22px 24px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxShadow: '0 14px 28px rgba(15, 23, 42, 0.08)',
}
