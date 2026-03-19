import React from 'react'

export default function StatsCard({ title, value, subtitle }) {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #dfe1e2',
      borderTop: '4px solid #0071BC',
      padding: '20px 24px',
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#71767a',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 10,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 36,
        fontWeight: 700,
        color: '#162e51',
        lineHeight: 1,
        marginBottom: 6,
      }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 13, color: '#71767a' }}>{subtitle}</div>
      )}
    </div>
  )
}
