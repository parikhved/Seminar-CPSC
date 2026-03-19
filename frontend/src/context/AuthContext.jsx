import React, { createContext, useContext, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('cpsc_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(() => localStorage.getItem('cpsc_token') || null)

  const isAuthenticated = Boolean(user && token)

  async function login(email, password) {
    const response = await api.post('/api/auth/login', { email, password })
    const data = response.data
    setUser(data)
    setToken(data.token)
    localStorage.setItem('cpsc_user', JSON.stringify(data))
    localStorage.setItem('cpsc_token', data.token)
    return data
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('cpsc_user')
    localStorage.removeItem('cpsc_token')
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
