import React from 'react'

const CONFIG = {
  Critical: { bg: '#DC2626', color: '#FFFFFF' },
  High:     { bg: '#EA580C', color: '#FFFFFF' },
  Medium:   { bg: '#CA8A04', color: '#FFFFFF' },
  Low:      { bg: '#16A34A', color: '#FFFFFF' },
}

export default function PriorityBadge({ level }) {
  const style = CONFIG[level] ?? { bg: '#64748B', color: '#FFFFFF' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: style.bg,
        color: style.color,
        borderRadius: 9999,
        padding: '3px 10px',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {level}
    </span>
  )
}
