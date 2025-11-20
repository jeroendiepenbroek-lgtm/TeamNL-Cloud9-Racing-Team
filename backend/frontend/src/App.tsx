import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import DashboardModern from './pages/DashboardModern'
import EventsModern from './pages/EventsModern'
import SyncStatusModern from './pages/SyncStatusModern'
import RacingDataMatrixModern from './pages/RacingDataMatrixModern'
import RidersModern from './pages/RidersModern'
import ResultsDashboard from './pages/ResultsDashboard'
import RiderResultsView from './pages/RiderResultsView'
import Debug from './pages/Debug'
import AuthDebug from './pages/AuthDebug'
import AdminHome from './pages/AdminHome'
import { AccessRequests } from './pages/AccessRequests'
import PendingAccess from './pages/PendingAccess'
import UserManagement from './pages/UserManagement'
import Archive from './pages/Archive'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginModal } from './components/LoginModal'

function Navigation() {
  const { user, signOut } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogoClick = () => {
    navigate('/')
  }

  return (
    <>
      <nav className="bg-gradient-to-r from-gray-900 to-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 lg:h-28">
            {/* Logo + Brand - Responsive sizing */}
            <button 
              onClick={handleLogoClick}
              className="flex items-center space-x-2 lg:space-x-4 hover:opacity-90 transition-all duration-200 group"
            >
              {/* Logo met TeamNL Oranje Kader - Smaller on mobile */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative bg-white rounded-full p-0.5 lg:p-1 ring-2 lg:ring-4 ring-orange-500 shadow-xl group-hover:ring-orange-400 transition-all">
                  <img 
                    src="/CloudRacer9.png" 
                    alt="CloudRacer" 
                    className="h-12 w-12 lg:h-20 lg:w-20 object-contain rounded-full"
                  />
                </div>
              </div>
              
              <div className="text-left">
                <h1 className="text-lg lg:text-2xl font-bold text-white tracking-wide">CLOUDRACER</h1>
                <p className="text-xs lg:text-sm text-cyan-300 font-medium hidden sm:block">TeamNL Cloud9 Racing</p>
              </div>
            </button>

            {/* YouTube Streams Badge - Next to logo */}
            <a 
              href="https://www.youtube.com/@CloudRacer-9/streams" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all hover:scale-105 shadow-md hover:shadow-lg"
              title="Race livestreams op YouTube"
            >
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="text-xs font-bold text-white tracking-wide">LIVE STREAMS</span>
            </a>

            {/* Desktop Nav Links - Hidden on mobile */}
            <div className="hidden lg:flex items-center space-x-6">
              <Link to="/" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white hover:text-cyan-300 border-b-2 border-transparent hover:border-cyan-400 transition">
                📊 Racing Matrix
              </Link>
              <Link to="/events" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-cyan-400 transition">
                🏁 Events
              </Link>
              <Link to="/results" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-cyan-400 transition">
                🏆 Results
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
                  👤 Admin Login
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-white hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu - Dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-700 py-4 space-y-2">
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-base font-medium text-white hover:bg-gray-800 rounded-md transition"
              >
                📊 Racing Matrix
              </Link>
              <Link 
                to="/events" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition"
              >
                🏁 Events
              </Link>
              <Link 
                to="/results" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition"
              >
                🏆 Results
              </Link>
              
              {user && (
                <Link 
                  to="/admin" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-base font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-md hover:from-amber-600 hover:to-orange-600 transition"
                >
                  ⚙️ Admin
                </Link>
              )}

              {user ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full text-left px-4 py-3 text-base font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition"
                >
                  🔒 Logout
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLoginModal(true);
                  }}
                  className="w-full text-left px-4 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
                >
                  👤 Admin Login
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  )
}

function BottomNavigation() {
  const { user } = useAuth()
  const location = window.location.pathname

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="grid grid-cols-4 h-16">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center space-y-1 ${
            location === '/' ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <span className="text-xl">📊</span>
          <span className="text-xs font-medium">Matrix</span>
        </Link>
        
        <Link 
          to="/results" 
          className={`flex flex-col items-center justify-center space-y-1 ${
            location === '/results' || location.startsWith('/results/') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <span className="text-xl">🏆</span>
          <span className="text-xs font-medium">Results</span>
        </Link>
        
        <Link 
          to="/events" 
          className={`flex flex-col items-center justify-center space-y-1 ${
            location === '/events' ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <span className="text-xl">🏁</span>
          <span className="text-xs font-medium">Events</span>
        </Link>
        
        {user ? (
          <Link 
            to="/admin" 
            className={`flex flex-col items-center justify-center space-y-1 ${
              location.startsWith('/admin') ? 'text-orange-600' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">⚙️</span>
            <span className="text-xs font-medium">Admin</span>
          </Link>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-1 text-gray-400">
            <span className="text-xl">👤</span>
            <span className="text-xs font-medium">Login</span>
          </div>
        )}
      </div>
    </nav>
  )
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
      <Navigation />

      {/* Content */}
      <main className="mx-auto py-6 px-4">
        <Routes>
          {/* Landing Page - Modern Matrix */}
          <Route path="/" element={<RacingDataMatrixModern />} />
          
          {/* Public Pages */}
          <Route path="/events" element={<div className="max-w-7xl mx-auto"><EventsModern /></div>} />
          <Route path="/results" element={<ResultsDashboard />} />
          <Route path="/results/rider/:riderId" element={<RiderResultsView />} />
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
          
          {/* Admin Dashboard (System Status) - Modern */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardModern />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/riders" 
            element={
              <ProtectedRoute>
                <div className="max-w-7xl mx-auto"><RidersModern /></div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/sync" 
            element={
              <ProtectedRoute>
                <SyncStatusModern />
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
          
          {/* Archive - Legacy Dashboards */}
          <Route 
            path="/admin/archive" 
            element={
              <ProtectedRoute>
                <Archive />
              </ProtectedRoute>
            } 
          />
          <Route path="/admin/archive/dashboard" element={<ProtectedRoute><DashboardModern /></ProtectedRoute>} />
          <Route path="/admin/archive/sync" element={<ProtectedRoute><SyncStatusModern /></ProtectedRoute>} />
          <Route path="/admin/archive/matrix" element={<ProtectedRoute><RacingDataMatrixModern /></ProtectedRoute>} />
          <Route path="/admin/archive/events" element={<ProtectedRoute><div className="max-w-7xl mx-auto"><EventsModern /></div></ProtectedRoute>} />
          <Route path="/admin/archive/riders" element={<ProtectedRoute><div className="max-w-7xl mx-auto"><RidersModern /></div></ProtectedRoute>} />
        </Routes>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <BottomNavigation />
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
