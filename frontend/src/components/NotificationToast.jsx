import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
}

const COLORS = {
  success: { bg: '#F0FDF4', border: '#16A34A', icon: '#16A34A', text: '#14532D' },
  error:   { bg: '#FEF2F2', border: '#DC2626', icon: '#DC2626', text: '#7F1D1D' },
  info:    { bg: '#EFF6FF', border: '#0071BC', icon: '#0071BC', text: '#1E3A5F' },
}

let globalToastFn = null

export function showToast(message, type = 'success') {
  if (globalToastFn) globalToastFn(message, type)
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    globalToastFn = (message, type) => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    }
    return () => { globalToastFn = null }
  }, [])

  function dismiss(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 400,
      }}
    >
      {toasts.map((toast) => {
        const c = COLORS[toast.type] ?? COLORS.info
        const Icon = ICONS[toast.type] ?? Info
        return (
          <div
            key={toast.id}
            className="toast-enter"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '14px 16px',
              backgroundColor: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            <Icon size={18} color={c.icon} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: 1, fontSize: 13, color: c.text, lineHeight: 1.5 }}>
              {toast.message}
            </span>
            <button
              onClick={() => dismiss(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 2,
                color: c.text,
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
