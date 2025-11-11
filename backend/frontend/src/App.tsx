import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Dashboard from './pages/Dashboard'
import Clubs from './pages/Clubs'
import Riders from './pages/Riders'
import Events from './pages/Events'
import Sync from './pages/Sync'
import RacingDataMatrix from './pages/RacingDataMatrix'
import Debug from './pages/Debug'
import AuthDebug from './pages/AuthDebug'
import AdminHome from './pages/AdminHome'
import { AccessRequests } from './pages/AccessRequests'
import PendingAccess from './pages/PendingAccess'
import UserManagement from './pages/UserManagement'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginModal } from './components/LoginModal'

function Navigation() {
  const { user, signOut } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const navigate = useNavigate()

  const handleLogoClick = () => {
    navigate('/')
  }

  return (
    <>
      <nav className="bg-gradient-to-r from-gray-900 to-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-28">
            {/* Logo + Brand - Clickable */}
            <button 
              onClick={handleLogoClick}
              className="flex items-center space-x-4 hover:opacity-90 transition-all duration-200 group"
            >
              {/* Logo met TeamNL Oranje Kader */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-white rounded-full p-1 ring-4 ring-orange-500 shadow-xl group-hover:ring-orange-400 transition-all">
                  <img 
                    src="/CloudRacer9.png" 
                    alt="CloudRacer" 
                    className="h-20 w-20 object-contain rounded-full"
                  />
                </div>
              </div>
              
              <div className="text-left">
                <h1 className="text-2xl font-bold text-white tracking-wide">CLOUDRACER</h1>
                <p className="text-sm text-cyan-300 font-medium">TeamNL Cloud9 Racing</p>
              </div>
            </button>

            {/* Nav Links */}
            <div className="flex items-center space-x-6">
              <Link to="/" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white hover:text-cyan-300 border-b-2 border-transparent hover:border-cyan-400 transition">
                📊 Racing Matrix
              </Link>
              <Link to="/clubs" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-cyan-400 transition">
                🏢 Clubs
              </Link>
              <Link to="/events" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-cyan-400 transition">
                🏁 Events
              </Link>
              
              {/* Admin Button - Only visible when logged in */}
              {user && (
                <Link 
                  to="/admin" 
                  className="inline-flex items-center px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  ⚙️ Admin
                </Link>
              )}

              {/* Login/Logout Button */}
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition"
                >
                  🔒 Logout
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
                >
                  � Admin Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  )
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Content */}
      <main className="mx-auto py-6 px-4">
        <Routes>
          {/* Landing Page - Matrix */}
          <Route path="/" element={<RacingDataMatrix />} />
          
          {/* Public Pages */}
          <Route path="/clubs" element={<div className="max-w-7xl mx-auto"><Clubs /></div>} />
          <Route path="/events" element={<div className="max-w-7xl mx-auto"><Events /></div>} />
          <Route path="/debug" element={<Debug />} />
          <Route path="/auth/debug" element={<AuthDebug />} />
          
          {/* Admin Home - Dashboard met tegels */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminHome />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Dashboard (System Status) */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute>
                <div className="max-w-7xl mx-auto"><Dashboard /></div>
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/riders" 
            element={
              <ProtectedRoute>
                <div className="max-w-7xl mx-auto"><Riders /></div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/sync" 
            element={
              <ProtectedRoute>
                <div className="max-w-7xl mx-auto"><Sync /></div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/access-requests" 
            element={
              <ProtectedRoute>
                <AccessRequests />
              </ProtectedRoute>
            } 
          />
          <Route path="/auth/pending" element={<PendingAccess />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
