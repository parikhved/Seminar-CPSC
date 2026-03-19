import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(detail ?? 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f0f0', display: 'flex', flexDirection: 'column' }}>

      {/* Agency header */}
      <div style={{
        backgroundColor: '#162e51',
        borderBottom: '4px solid #0071BC',
        padding: '16px 24px',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a9aeb1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
          U.S. Consumer Product Safety Commission
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#ffffff' }}>
          CPSC Compliance &amp; Analytics
        </div>
      </div>

      {/* Form area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #dfe1e2',
          width: '100%',
          maxWidth: 440,
        }}>

          {/* Card header */}
          <div style={{
            borderBottom: '1px solid #dfe1e2',
            padding: '20px 32px',
            backgroundColor: '#f8f8f8',
          }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#162e51' }}>
              Sign in to your account
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#71767a' }}>
              Recall Prioritization System
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '28px 32px' }}>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#71767a" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@cpsc.gov"
                  style={{ ...inputStyle, paddingLeft: 36 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#71767a" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  style={{ ...inputStyle, paddingLeft: 36, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#71767a', padding: 0 }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                marginBottom: 20,
                padding: '10px 14px',
                backgroundColor: '#fff3cd',
                borderLeft: '4px solid #d54309',
                fontSize: 13,
                color: '#1b1b1b',
                lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                border: 'none',
                backgroundColor: loading ? '#4a90d9' : '#0071BC',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            padding: '16px 32px 24px',
            borderTop: '1px solid #dfe1e2',
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#71767a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Demo Credentials
            </p>
            <p style={{ margin: '0 0 3px', fontSize: 13, color: '#1b1b1b' }}>
              <strong>Email:</strong> emily.carter@cpsc-sim.gov
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#1b1b1b' }}>
              <strong>Password:</strong> demo123
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 14,
  fontWeight: 700,
  color: '#1b1b1b',
  marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #a9aeb1',
  fontSize: 14,
  color: '#1b1b1b',
  outline: 'none',
  borderRadius: 0,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}
