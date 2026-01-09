import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import RacingMatrix from './pages/RacingMatrix'
import EventsDashboard from './pages/EventsDashboard'
import ResultsDashboard from './pages/ResultsDashboard'
import RaceResults from './pages/RaceResults'
import RaceDetails from './pages/RaceDetails'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

function Navigation() {
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
                Team Dashboard
              </Link>
              <Link to="/events" className="text-white hover:text-orange-400 transition font-semibold">
                Events
              </Link>
              <Link to="/results" className="text-white hover:text-orange-400 transition font-semibold">
                Results
              </Link>
              <Link to="/race-results" className="text-white hover:text-orange-400 transition font-semibold">
                Race Results
              </Link>
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
                Team Dashboard
              </Link>
              <Link to="/events" onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-orange-400 py-2 px-4 rounded transition">
                Events
              </Link>
              <Link to="/results" onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-orange-400 py-2 px-4 rounded transition">
                Results
              </Link>
              <Link to="/race-results" onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-orange-400 py-2 px-4 rounded transition">
                Race Results
              </Link>
                Events
              </Link>
              <Link to="/results" onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-orange-400 py-2 px-4 rounded transition">
                Results
              </Link>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900">
        <Routes>
          {/* Admin Routes (no navigation) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          
          {/* Public Routes (with navigation) */}
          <Route path="*" element={
            <>
              <Navigation />
              <Routes>
                <Route path="/" element={<RacingMatrix />} />
                <Route path="/events" element={<EventsDashboard />} />
                <Route path="/results" element={<ResultsDashboard />} />
                <Route path="/race-results" element={<RaceResults />} />
                <Route path="/race/:eventId" element={<RaceDetails />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="*" element={
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-white mb-4">404</h1>
                      <p className="text-gray-400 mb-8">Page not found</p>
                      <Link to="/" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg inline-block">
                        Back to Team Dashboard
                      </Link>
                    </div>
                  </div>
                } />
              </Routes>
            </>
          } />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  )
}

export default App
