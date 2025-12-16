import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import RacingMatrix from './pages/RacingMatrix'
import EventsDashboard from './pages/EventsDashboard'
import ResultsDashboard from './pages/ResultsDashboard'
import TeamManager from './pages/TeamManager'
import TeamBuilder from './pages/TeamBuilder'
import TeamViewer from './pages/TeamViewer'
import TeamCompetition from './pages/TeamCompetition'
import ChristmasSnow from './components/ChristmasSnow'

function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <nav className="bg-gradient-to-r from-red-900 via-green-900 to-red-900 shadow-lg border-b-4 border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo + Brand with Christmas Trees */}
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-4 hover:opacity-90 transition"
            >
              <span className="text-4xl">🎄</span>
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
                <div className="text-white font-black text-2xl flex items-center gap-2">
                  TeamNL
                  <span className="text-red-500">🎅</span>
                </div>
                <div className="text-orange-400 font-bold text-lg">Cloud9 Racing</div>
              </div>
              <span className="text-4xl">🎄</span>
            </button>

            {/* YouTube Streams Badge - Next to logo */}
            <a 
              href="https://www.youtube.com/@CloudRacer-9/streams" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all hover:scale-105 shadow-lg hover:shadow-xl border-2 border-white/20"
              title="Race livestreams op YouTube - CloudRacer-9"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="text-sm font-bold text-white tracking-wide">🔴 LIVE STREAMS</span>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-white hover:text-orange-400 transition font-semibold">
                Team Dashboard
              </Link>
              <Link to="/team-competition" className="text-white hover:text-orange-400 transition font-semibold">
                🏆 Team Competition
              </Link>
              <Link to="/team-manager" className="text-white hover:text-orange-400 transition font-semibold">
                Team Manager
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
              <Link to="/team-competition" onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-orange-400 py-2 px-4 rounded transition">
                🏆 Team Competition
              </Link>
              <Link to="/team-manager" onClick={() => setMobileMenuOpen(false)} className="block text-white hover:text-orange-400 py-2 px-4 rounded transition">
                Team Manager
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
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-gray-900">
        <ChristmasSnow />
        <Navigation />
        <Routes>
          <Route path="/" element={<RacingMatrix />} />
          <Route path="/events" element={<EventsDashboard />} />
          <Route path="/results" element={<ResultsDashboard />} />
          <Route path="/team-manager" element={<TeamManager />} />
          <Route path="/team-competition" element={<TeamCompetition />} />
          <Route path="/team-builder" element={<TeamBuilder />} />
          <Route path="/team-viewer" element={<TeamViewer />} />
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
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  )
}

export default App

