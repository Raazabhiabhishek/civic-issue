import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import ReportIssuePage from './pages/ReportIssuePage'
import MapViewPage from './pages/MapViewPage'
import ReportDetailPage from './pages/ReportDetailPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import LoadingSpinner from './components/LoadingSpinner'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner full />
  if (!user) return <Navigate to="/login" replace />
  return children
}

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <LoadingSpinner full />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner full />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

const AppRoutes = () => {
  const { user } = useAuth()
  return (
    <div className="min-h-screen bg-ink-950">
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup"   element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/report"    element={<ProtectedRoute><ReportIssuePage /></ProtectedRoute>} />
        <Route path="/map"       element={<ProtectedRoute><MapViewPage /></ProtectedRoute>} />
        <Route path="/reports/:id" element={<ProtectedRoute><ReportDetailPage /></ProtectedRoute>} />
        <Route path="/issues/:id" element={<ProtectedRoute><ReportDetailPage /></ProtectedRoute>} />
        <Route path="/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/admin"     element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#0f172a' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
        }}
      />
    </AuthProvider>
  )
}
