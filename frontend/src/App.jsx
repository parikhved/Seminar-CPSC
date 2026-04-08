import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import NotificationToast from './components/NotificationToast'

import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RecallListPage from './pages/RecallListPage'
import ShortListPage from './pages/ShortListPage'
import AnalyticsPage from './pages/AnalyticsPage'
import RecallReviewPage from './pages/RecallReviewPage'
import PrioritizationPage from './pages/PrioritizationPage'
import ViolationLoggingPage from './pages/ViolationLoggingPage'

function AuthenticatedLayout({ children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Navbar />
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#ffffff' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationToast />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <DashboardPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/recalls"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <RecallListPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/recalls/:recallId"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <RecallReviewPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/recalls/:recallId/prioritize"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <PrioritizationPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/shortlist"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ShortListPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <AnalyticsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/violations"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ViolationLoggingPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
