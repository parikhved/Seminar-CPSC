import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

function formatDate(value) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function SellerNoticesPage() {
  const { user } = useAuth()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get(`/api/violations/notices/${user.userID}`)
        setNotices(response.data)
      } catch (err) {
        setError(err.response?.data?.detail ?? 'Unable to load seller notices right now.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user.userID])

  if (loading) return <LoadingSpinner />
  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: '#b91c1c', fontSize: 15 }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 32, maxWidth: 1300 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, color: '#0f172a' }}>Violation Notices</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
          Review each notice and open it to submit your response and supporting evidence.
        </p>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ backgroundColor: '#0A1628' }}>
              {['Notice ID', 'Recall', 'Listing', 'Detected', 'Status', 'Response', 'Action'].map((heading) => (
                <th key={heading} style={th}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notices.length ? notices.map((notice, index) => (
              <tr key={notice.violationID} style={{ backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                <td style={td}>{notice.violationID}</td>
                <td style={{ ...td, color: '#0f172a', fontWeight: 700 }}>{notice.recallProductName}</td>
                <td style={td}>{notice.listingTitle}</td>
                <td style={td}>{formatDate(notice.dateDetected)}</td>
                <td style={td}>{notice.violationStatus || 'Open'}</td>
                <td style={td}>{notice.responseID ? 'Submitted' : 'Awaiting Response'}</td>
                <td style={td}>
                  <Link to={`/seller/notices/${notice.violationID}`} style={actionLink}>
                    View Notice
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94A3B8', fontSize: 14, backgroundColor: '#FFFFFF' }}>
                  No violation notices are available for this seller account.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: '#CBD5E1',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

const td = {
  padding: '12px 16px',
  fontSize: 13,
  color: '#475569',
  verticalAlign: 'middle',
}

const actionLink = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 8,
  textDecoration: 'none',
  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  color: '#ffffff',
  fontSize: 12,
  fontWeight: 700,
}
