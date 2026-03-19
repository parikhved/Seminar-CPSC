import React, { useEffect, useState, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../api/axios'
import RecallTable from '../components/RecallTable'
import AddToShortListModal from '../components/AddToShortListModal'
import LoadingSpinner from '../components/LoadingSpinner'

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

export default function RecallListPage() {
  const [recalls, setRecalls] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [shortlistedIds, setShortlistedIds] = useState(new Set())
  const [selectedRecall, setSelectedRecall] = useState(null)

  const debouncedSearch = useDebounce(search, 300)
  const LIMIT = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT }
      if (debouncedSearch) params.search = debouncedSearch

      const [recallsRes, shortlistRes] = await Promise.all([
        api.get('/api/recalls', { params }),
        api.get('/api/shortlist'),
      ])

      setRecalls(recallsRes.data.recalls)
      setTotal(recallsRes.data.total)
      setPages(recallsRes.data.pages)

      const ids = new Set(shortlistRes.data.map((s) => s.recallID))
      setShortlistedIds(ids)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handlePageChange(newPage) {
    if (newPage >= 1 && newPage <= pages) setPage(newPage)
  }

  const pageNumbers = []
  const start = Math.max(1, page - 2)
  const end = Math.min(pages, page + 2)
  for (let i = start; i <= end; i++) pageNumbers.push(i)

  return (
    <div style={{ padding: 32, maxWidth: 1300 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#0A1628' }}>CPSC Recall List</h1>
        <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 14 }}>All recalled products from CPSC database</p>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 520 }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, manufacturer, or hazard…"
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: 7,
              border: '1px solid #E2E8F0',
              fontSize: 14,
              color: '#1E293B',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <span style={{ fontSize: 13, color: '#64748B', whiteSpace: 'nowrap' }}>
          Showing <strong>{recalls.length}</strong> of <strong>{total}</strong> recalls
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <RecallTable
          recalls={recalls}
          onAddToShortList={setSelectedRecall}
          shortlistedIds={shortlistedIds}
        />
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, justifyContent: 'center' }}>
          <PaginationBtn onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
            <ChevronLeft size={15} />
          </PaginationBtn>

          {start > 1 && (
            <>
              <PaginationBtn onClick={() => handlePageChange(1)} active={page === 1}>1</PaginationBtn>
              {start > 2 && <span style={{ color: '#94A3B8', fontSize: 13 }}>…</span>}
            </>
          )}

          {pageNumbers.map((n) => (
            <PaginationBtn key={n} onClick={() => handlePageChange(n)} active={n === page}>{n}</PaginationBtn>
          ))}

          {end < pages && (
            <>
              {end < pages - 1 && <span style={{ color: '#94A3B8', fontSize: 13 }}>…</span>}
              <PaginationBtn onClick={() => handlePageChange(pages)} active={page === pages}>{pages}</PaginationBtn>
            </>
          )}

          <PaginationBtn onClick={() => handlePageChange(page + 1)} disabled={page === pages}>
            <ChevronRight size={15} />
          </PaginationBtn>
        </div>
      )}

      {/* Add to shortlist modal */}
      {selectedRecall && (
        <AddToShortListModal
          recall={selectedRecall}
          onClose={() => setSelectedRecall(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}

function PaginationBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 34,
        height: 34,
        padding: '0 10px',
        borderRadius: 6,
        border: '1px solid',
        borderColor: active ? '#0071BC' : '#E2E8F0',
        backgroundColor: active ? '#0071BC' : '#FFFFFF',
        color: active ? '#FFFFFF' : disabled ? '#CBD5E1' : '#475569',
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}
