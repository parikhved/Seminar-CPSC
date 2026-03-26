import React from 'react'
import { Bell, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header style={header}>
      <div>
        <div style={eyebrow}>CPSC Manager Console</div>
        <div style={heading}>Recall prioritization workspace</div>
      </div>

      <div style={rightSide}>
        <div style={welcomeBlock}>
          <div style={welcomeText}>Welcome, {user?.firstName} {user?.lastName}</div>
          <div style={roleText}>{user?.role}</div>
        </div>

        <div style={iconButton}><Bell size={18} /></div>
        <div style={iconButton}><User size={18} /></div>

        <button onClick={handleLogout} style={logoutButton}>
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </header>
  )
}

const header = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
  minHeight: 84,
  padding: '18px 28px',
  backgroundColor: 'rgba(248, 250, 252, 0.92)',
  backdropFilter: 'blur(18px)',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
}

const eyebrow = {
  fontSize: 12,
  color: '#2563eb',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
}

const heading = {
  marginTop: 6,
  fontSize: 24,
  color: '#0f172a',
  fontWeight: 700,
}

const rightSide = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const welcomeBlock = {
  paddingRight: 16,
  marginRight: 4,
  borderRight: '1px solid #dbe4f0',
  textAlign: 'right',
}

const welcomeText = {
  fontSize: 16,
  color: '#0f172a',
  fontWeight: 600,
}

const roleText = {
  marginTop: 4,
  color: '#64748b',
  fontSize: 13,
}

const iconButton = {
  width: 42,
  height: 42,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#ffffff',
  border: '1px solid #dbe4f0',
  color: '#0f172a',
}

const logoutButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '11px 16px',
  borderRadius: 14,
  border: '1px solid #dbe4f0',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}
