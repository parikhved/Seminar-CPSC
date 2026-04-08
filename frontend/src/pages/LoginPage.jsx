import React, { useState } from 'react'
import { ArrowRight, Headset, Lock, Mail, Phone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await login(email, password)
      navigate(data.role === 'Investigator' ? '/violations' : '/dashboard')
    } catch (err) {
      if (!err.response) {
        setError('Server is unavailable or starting up — please wait 30 seconds and try again.')
      } else {
        setError(err.response.data?.detail ?? 'Unable to sign in.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={page}>
      <div style={heroPanel}>
        <div style={heroTopRibbon} />
        <div style={heroInner}>
          <div style={badge}>CPSC</div>
          <div style={heroTitle}>Recall Management System</div>
          <div style={heroCopy}>
            Protecting consumers through efficient recall review, prioritization, and investigator handoff.
          </div>
          <div style={heroMeta}>U.S. Consumer Product Safety Commission</div>
          <div style={heroMeta}>2026 Sprint 2 workspace</div>
        </div>
      </div>

      <div style={formPanel}>
        <div style={languageRow}>
          <span style={{ color: '#2563eb', fontWeight: 600 }}>Language:</span>
          <select style={languageSelect} defaultValue="English">
            <option>English</option>
          </select>
        </div>

        <div style={formCard}>
          <h1 style={title}>Login</h1>
          <p style={subtitle}>CPSC Recall Management System</p>
          <div style={titleRule} />

          <form onSubmit={handleSubmit} style={{ marginTop: 34 }}>
            <div style={fieldGroup}>
              <label style={label}>Email Address</label>
              <div style={inputWrap}>
                <Mail size={16} color="#64748b" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investigator@cpsc.gov"
                  required
                  style={input}
                />
              </div>
            </div>

            <div style={fieldGroup}>
              <label style={label}>Password</label>
              <div style={inputWrap}>
                <Lock size={16} color="#64748b" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={input}
                />
              </div>
            </div>

            <div style={optionsRow}>
              <label style={checkboxLabel}>
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Remember me
              </label>
              <button type="button" style={linkButton}>Forgot Password?</button>
            </div>

            {error ? <div style={errorBox}>{error}</div> : null}

            <button type="submit" disabled={loading} style={submitButton}>
              {loading ? 'Signing In…' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={supportRow}>
            <span style={{ color: '#475569' }}>Need access?</span>
            <button type="button" style={linkButton}>Contact IT Support</button>
          </div>

          <div style={demoCard}>
            <div style={demoHeading}>Demo Credentials</div>
            <div style={demoValue}>Email: emily.carter@cpsc-sim.gov</div>
            <div style={demoValue}>Password: demo123</div>
            <div style={{ ...demoValue, marginTop: 10 }}>Investigator: daniel.kim@cpsc-investigator.gov</div>
          </div>
        </div>

        <div style={helpRow}>
          <div style={helpItem}>
            <Headset size={18} />
            support@cpsc.gov
          </div>
          <div style={helpItem}>
            <Phone size={18} />
            1-800-555-0199
          </div>
        </div>
      </div>
    </div>
  )
}

const page = {
  minHeight: '100vh',
  display: 'grid',
  gridTemplateColumns: 'minmax(340px, 0.95fr) minmax(580px, 1.35fr)',
  background: 'linear-gradient(135deg, #eef4ff 0%, #f8fafc 55%, #e0f2fe 100%)',
}

const heroPanel = {
  position: 'relative',
  overflow: 'hidden',
  background: 'radial-gradient(circle at top left, #dbeafe 0%, #1d4ed8 55%, #0f172a 100%)',
  color: '#ffffff',
}

const heroTopRibbon = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(140deg, rgba(255,255,255,0.24) 0%, transparent 38%, transparent 100%)',
}

const heroInner = {
  position: 'relative',
  minHeight: '100%',
  padding: '72px 42px 42px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}

const badge = {
  width: 86,
  height: 86,
  borderRadius: 24,
  backgroundColor: 'rgba(255,255,255,0.16)',
  border: '1px solid rgba(255,255,255,0.24)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: '0.08em',
  backdropFilter: 'blur(8px)',
}

const heroTitle = {
  marginTop: 34,
  fontSize: 54,
  lineHeight: 0.98,
  fontWeight: 700,
  maxWidth: 420,
}

const heroCopy = {
  marginTop: 20,
  maxWidth: 460,
  fontSize: 22,
  lineHeight: 1.35,
  color: 'rgba(255,255,255,0.88)',
}

const heroMeta = {
  marginTop: 8,
  fontSize: 16,
  color: 'rgba(255,255,255,0.78)',
}

const formPanel = {
  padding: '28px 34px 24px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}

const languageRow = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: 12,
}

const languageSelect = {
  minHeight: 38,
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  padding: '0 12px',
}

const formCard = {
  maxWidth: 720,
  margin: '32px auto 0',
  width: '100%',
  backgroundColor: 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(18px)',
  border: '1px solid rgba(219, 228, 240, 0.9)',
  borderRadius: 32,
  boxShadow: '0 30px 80px rgba(37, 99, 235, 0.14)',
  padding: '44px 54px',
}

const title = {
  margin: 0,
  fontSize: 58,
  lineHeight: 1,
  color: '#2563eb',
  textAlign: 'center',
}

const subtitle = {
  margin: '12px 0 0',
  textAlign: 'center',
  fontSize: 24,
  color: '#1d4ed8',
  fontWeight: 600,
}

const titleRule = {
  width: 220,
  height: 4,
  borderRadius: 999,
  margin: '22px auto 0',
  background: 'linear-gradient(90deg, #f97316 0%, #ef4444 100%)',
}

const fieldGroup = {
  marginBottom: 22,
}

const label = {
  display: 'block',
  marginBottom: 8,
  color: '#1d4ed8',
  fontSize: 16,
  fontWeight: 700,
}

const inputWrap = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minHeight: 56,
  padding: '0 16px',
  borderRadius: 18,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
}

const input = {
  flex: 1,
  border: 'none',
  outline: 'none',
  fontSize: 16,
  color: '#0f172a',
  backgroundColor: 'transparent',
}

const optionsRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 18,
  gap: 12,
}

const checkboxLabel = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: '#475569',
  fontSize: 15,
}

const linkButton = {
  border: 'none',
  background: 'none',
  color: '#2563eb',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
}

const errorBox = {
  marginBottom: 18,
  padding: '14px 16px',
  borderRadius: 16,
  border: '1px solid #fecaca',
  backgroundColor: '#fef2f2',
  color: '#b91c1c',
  fontSize: 14,
}

const submitButton = {
  width: '100%',
  minHeight: 58,
  borderRadius: 18,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb 0%, #0f172a 100%)',
  color: '#ffffff',
  fontSize: 17,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  cursor: 'pointer',
  boxShadow: '0 20px 40px rgba(37, 99, 235, 0.25)',
}

const supportRow = {
  marginTop: 26,
  display: 'flex',
  justifyContent: 'center',
  gap: 12,
  flexWrap: 'wrap',
}

const demoCard = {
  marginTop: 28,
  borderRadius: 20,
  padding: '18px 20px',
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
}

const demoHeading = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#1d4ed8',
  marginBottom: 10,
}

const demoValue = {
  fontSize: 15,
  color: '#0f172a',
  lineHeight: 1.7,
}

const helpRow = {
  marginTop: 20,
  display: 'flex',
  justifyContent: 'center',
  gap: 22,
  flexWrap: 'wrap',
}

const helpItem = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: '#1d4ed8',
  fontWeight: 600,
}
