import { useState } from 'react'
import { RankingTable } from './components/RankingTable'
import { RiderCard } from './components/RiderCard'
import { ClubStats } from './components/ClubStats'
import { Legend } from './components/Legend'
import { AdminPanel } from './components/AdminPanel'
import { DataViewer } from './components/DataViewer'
import { SyncSettings } from './components/SyncSettings'
import E2ETest from './components/E2ETest'

function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'admin' | 'data' | 'settings' | 'test'>('dashboard')
  const [selectedRider, setSelectedRider] = useState<any>(null)

  return (
    <div className="app">
      <header className="header">
        <h1>🏆 TeamNL Cloud9 Racing Dashboard</h1>
        <nav>
          <button 
            className={activeView === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveView('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={activeView === 'data' ? 'active' : ''}
            onClick={() => setActiveView('data')}
          >
            🗄️ Data
          </button>
          <button 
            className={activeView === 'admin' ? 'active' : ''}
            onClick={() => setActiveView('admin')}
          >
            ➕ Upload
          </button>
          <button 
            className={activeView === 'settings' ? 'active' : ''}
            onClick={() => setActiveView('settings')}
          >
            ⚙️ Sync
          </button>
          <button 
            className={activeView === 'test' ? 'active' : ''}
            onClick={() => setActiveView('test')}
          >
            🧪 E2E Test
          </button>
        </nav>
      </header>

      {activeView === 'dashboard' ? (
        <main className="main">
          <section className="left">
            <ClubStats />
            <RankingTable onSelectRider={setSelectedRider} />
          </section>
          <section className="right">
            <RiderCard rider={selectedRider} />
            <Legend />
          </section>
        </main>
      ) : activeView === 'data' ? (
        <main className="main-single">
          <DataViewer />
        </main>
      ) : activeView === 'settings' ? (
        <main className="main-single">
          <SyncSettings />
        </main>
      ) : activeView === 'test' ? (
        <main className="main-single">
          <E2ETest />
        </main>
      ) : (
        <main className="main-single">
          <AdminPanel />
        </main>
      )}

      <footer className="footer">
        © {new Date().getFullYear()} TeamNL Cloud9 Racing Team | Zero-cost deployment via Vercel + Supabase
      </footer>
    </div>
  )
}

export default App
