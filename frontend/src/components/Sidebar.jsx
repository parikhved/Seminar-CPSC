import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, AlertTriangle, BarChart3 } from 'lucide-react'

const navItems = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Recall List',   icon: FileText,         path: '/recalls'   },
  { label: 'Priority List', icon: AlertTriangle,    path: '/shortlist' },
  { label: 'Analytics',     icon: BarChart3,        path: '/analytics' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #dfe1e2',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
      {/* Agency label */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid #dfe1e2',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#71767a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Navigation
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#162e51', lineHeight: 1.4 }}>
          Recall Prioritization System
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, paddingTop: 8, paddingBottom: 8 }}>
        {navItems.map(({ label, icon: Icon, path }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: isActive ? 700 : 400,
              color: isActive ? '#0071BC' : '#1b1b1b',
              borderLeft: isActive ? '4px solid #0071BC' : '4px solid transparent',
              backgroundColor: 'transparent',
              transition: 'background-color 0.1s, border-color 0.1s',
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.getAttribute('aria-current')) {
                e.currentTarget.style.backgroundColor = '#f0f0f0'
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.getAttribute('aria-current')) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
