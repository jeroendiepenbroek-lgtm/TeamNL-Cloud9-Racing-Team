import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import DashboardModern from './pages/DashboardModern'
import EventsModern from './pages/EventsModern'
import SyncControl from './pages/SyncControl'
import AdminHome from './pages/AdminHome'
import RacingDataMatrixModern from './pages/RacingDataMatrixModern'
import TeamManagement from './pages/TeamManagement'
import ResultsDashboard from './pages/ResultsDashboard'
import RiderResultsView from './pages/RiderResultsView'
import Debug from './pages/Debug'
import AuthDebug from './pages/AuthDebug'
import { AccessRequests } from './pages/AccessRequests'
import PendingAccess from './pages/PendingAccess'
import UserManagement from './pages/UserManagement'
import Archive from './pages/Archive'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginModal } from './components/LoginModal'

// No longer needed - AdminHome is now a React component

function Navigation() {
  const { user, signOut } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <nav className="bg-gradient-to-r from-gray-900 to-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo + Brand */}
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-4 hover:opacity-90 transition"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500 rounded-full blur-sm opacity-75"></div>
                <div className="relative bg-white rounded-full p-1 ring-4 ring-orange-500">
                  <img 
                    src="/CloudRacer9.png" 
                    alt="CloudRacer" 
                    className="h-16 w-16 rounded-full" 
                  />
                </div>
              </div>
              
              <div className="text-left">
                <div className="text-white font-black text-2xl">TeamNL</div>
                <div className="text-orange-400 font-bold text-lg">Cloud9 Racing</div>
              </div>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-white hover:text-orange-400 transition font-semibold">
                Racing Matrix
              </Link>
              <Link to="/events" className="text-white hover:text-orange-400 transition font-semibold">
                Events
              </Link>
              <Link to="/results" className="text-white hover:text-orange-400 transition font-semibold">
                Results
              </Link>

              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300 text-sm">
                    {user.user_metadata?.name || user.email}
                  </span>
                  <button
                    onClick={signOut}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition font-semibold"
                >
                  Login
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-2">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-orange-400 py-2 px-4 rounded transition">
                Racing Matrix
              </Link>
              <Link to="/events" onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-orange-400 py-2 px-4 rounded transition">
                Events
              </Link>
              <Link to="/results" onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-orange-400 py-2 px-4 rounded transition">
                Results
              </Link>
              {user ? (
                <>
                  <div className="text-gray-300 py-2 px-4 text-sm">
                    {user.user_metadata?.name || user.email}
                  </div>
                  <button
                    onClick={() => { signOut(); setMobileMenuOpen(false) }}
                    className="block w-full text-left bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setShowLoginModal(true); setMobileMenuOpen(false) }}
                  className="block w-full text-left bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded"
                >
                  Login
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-900">
          <Navigation />
          <Routes>
            <Route path="/" element={<RacingMatrix />} />
            <Route path="/events" element={<EventsDashboard />} />
            <Route path="/results" element={<ResultsDashboard />} />
            <Route path="*" element={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-white mb-4">404</h1>
                  <p className="text-gray-400 mb-8">Page not found</p>
                  <Link to="/" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg inline-block">
                    Back to Racing Matrix
                  </Link>
                </div>
              </div>
            } />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
