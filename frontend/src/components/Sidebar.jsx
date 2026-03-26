import React from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, FileSearch, LayoutDashboard, ShieldAlert } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Import / View Recalls', icon: FileSearch, path: '/recalls' },
  { label: 'Priority List', icon: ShieldAlert, path: '/shortlist' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
]

export default function Sidebar() {
  return (
    <aside style={aside}>
      <div style={brandCard}>
        <div style={logoWrap}>CPSC</div>
        <div>
          <div style={brandTitle}>Recall Management System</div>
          <div style={brandSubtitle}>Manager workspace</div>
        </div>
      </div>

      <nav style={nav}>
        {navItems.map(({ label, icon: Icon, path }) => (
          <NavLink key={path} to={path} style={({ isActive }) => navLinkStyle(isActive)}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={footerCard}>
        <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Sprint 1
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: '#e2e8f0', lineHeight: 1.5 }}>
          Prioritize high-risk recalls and keep investigator workflows moving.
        </div>
      </div>
    </aside>
  )
}

const aside = {
  width: 290,
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #0f172a 0%, #172554 100%)',
  padding: 22,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  flexShrink: 0,
}

const brandCard = {
  padding: 18,
  borderRadius: 24,
  background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)',
  border: '1px solid rgba(255,255,255,0.14)',
  color: '#ffffff',
}

const logoWrap = {
  width: 64,
  height: 64,
  borderRadius: 18,
  background: 'linear-gradient(135deg, #ffffff 0%, #bfdbfe 100%)',
  color: '#1d4ed8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  marginBottom: 16,
}

const brandTitle = {
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1.1,
}

const brandSubtitle = {
  marginTop: 8,
  fontSize: 14,
  color: '#cbd5e1',
}

const nav = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  flex: 1,
}

function navLinkStyle(isActive) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    padding: '0 16px',
    textDecoration: 'none',
    borderRadius: 18,
    color: isActive ? '#ffffff' : '#cbd5e1',
    background: isActive ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.05)',
    border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.06)',
    fontSize: 15,
    fontWeight: 600,
    boxShadow: isActive ? '0 14px 28px rgba(37, 99, 235, 0.28)' : 'none',
  }
}

const footerCard = {
  padding: 18,
  borderRadius: 22,
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  border: '1px solid rgba(255,255,255,0.08)',
}
