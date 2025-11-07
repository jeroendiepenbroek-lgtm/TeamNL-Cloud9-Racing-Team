import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Clubs from './pages/Clubs'
import Riders from './pages/Riders'
import Events from './pages/Events'
import Sync from './pages/Sync'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-gradient-to-r from-gray-900 to-blue-900 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20">
              {/* Logo + Brand */}
              <div className="flex items-center space-x-3">
                <img 
                  src="/legacy/Cloudracer-logo.png" 
                  alt="CloudRacer" 
                  className="h-14 w-14 rounded-full border-2 border-cyan-400 shadow-lg"
                />
                <div>
                  <h1 className="text-xl font-bold text-white tracking-wide">CLOUDRACER</h1>
                  <p className="text-xs text-cyan-300">TeamNL Cloud9 Racing</p>
                </div>
              </div>

              {/* Nav Links */}
              {/* Nav Links */}
              <div className="flex space-x-8">
                <Link to="/" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-white hover:text-cyan-300 border-b-2 border-transparent hover:border-cyan-400 transition">
                  🏠 Dashboard
                </Link>
                <Link to="/clubs" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-cyan-400 transition">
                  🏢 Clubs
                </Link>
                <Link to="/riders" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-cyan-400 transition">
                  🚴 Riders
                </Link>
                <Link to="/events" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-cyan-400 transition">
                  🏆 Events
                </Link>
                <Link to="/sync" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-300 hover:text-white border-b-2 border-transparent hover:border-cyan-400 transition">
                  🔄 Sync
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/riders" element={<Riders />} />
            <Route path="/events" element={<Events />} />
            <Route path="/sync" element={<Sync />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
