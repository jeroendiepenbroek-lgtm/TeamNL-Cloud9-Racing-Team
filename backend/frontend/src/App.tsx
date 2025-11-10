import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Clubs from './pages/Clubs'
import Riders from './pages/Riders'
import Events from './pages/Events'
import Sync from './pages/Sync'
import RacingDataMatrix from './pages/RacingDataMatrix'
import Debug from './pages/Debug'
import { AccessRequests } from './pages/AccessRequests'
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
          <div className="flex justify-between h-20">
            {/* Logo + Brand - Clickable */}
            <button 
              onClick={handleLogoClick}
              className="flex items-center space-x-3 hover:opacity-80 transition"
            >
              <img 
                src="/legacy/Cloudracer-logo.png" 
                alt="CloudRacer" 
                className="h-14 w-14 rounded-full border-2 border-cyan-400 shadow-lg"
              />
              <div className="text-left">
                <h1 className="text-xl font-bold text-white tracking-wide">CLOUDRACER</h1>
                <p className="text-xs text-cyan-300">TeamNL Cloud9 Racing</p>
              </div>
            </button>

            {/* Nav Links */}
            <div className="flex items-center space-x-6">
              <Link to="/" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white hover:text-cyan-300 border-b-2 border-transparent hover:border-cyan-400 transition">
                🏠 Dashboard
              </Link>
              <Link to="/matrix" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-cyan-400 transition">
                📊 Matrix
              </Link>
              <Link to="/clubs" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-cyan-400 transition">
                🏢 Clubs
              </Link>
              <Link to="/events" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-cyan-400 transition">
                🏆 Events
              </Link>

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
          <Route path="/" element={<div className="max-w-7xl mx-auto"><Dashboard /></div>} />
          <Route path="/matrix" element={<RacingDataMatrix />} />
          <Route path="/clubs" element={<div className="max-w-7xl mx-auto"><Clubs /></div>} />
          <Route path="/events" element={<div className="max-w-7xl mx-auto"><Events /></div>} />
          <Route path="/debug" element={<Debug />} />
          
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
            path="/admin/access-requests" 
            element={
              <ProtectedRoute>
                <AccessRequests />
              </ProtectedRoute>
            } 
          />
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
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
