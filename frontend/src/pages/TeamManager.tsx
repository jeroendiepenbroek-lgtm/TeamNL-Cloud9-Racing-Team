import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import SyncManager from '../components/SyncManager'

interface Rider {
  rider_id: number
  name: string
  full_name: string | null
  racing_name: string | null
  country: string
  country_alpha3: string | null
  velo_live: number | null
  category: string | null
  zwiftracing_category: string | null
  ftp: number | null
  ftp_watts: number | null
  racing_ftp: number | null
  weight: number | null
  avatar_url: string | null
  image_src: string | null
  last_synced: string | null
  team_last_synced: string | null
  race_finishes: number | null
  race_wins: number | null
}

export default function TeamManager() {
  const navigate = useNavigate()
  
  // 🔒 US3: Entry code protection
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [entryCode, setEntryCode] = useState('')
  const CORRECT_CODE = 'CLOUD9RACING' // Simple code - kan later environment variable worden
  
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'add' | 'manage' | 'sync' | 'logs'>('add')
  const [syncLogs, setSyncLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null)
  
  // Sync Monitor State
  const [bulkProgress, setBulkProgress] = useState<{
    total: number
    processed: number
    synced: number
    skipped: number
    failed: number
    isProcessing: boolean
  } | null>(null)
  
  // Add single rider
  const [singleRiderId, setSingleRiderId] = useState('')
  
  // Add multiple riders
  const [multipleRiderIds, setMultipleRiderIds] = useState('')
  
  // File upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  
  // Search filter for Manage view
  const [searchTerm, setSearchTerm] = useState('')
  
  // Multi-select for bulk actions
  const [selectedRiders, setSelectedRiders] = useState<number[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Initial load of rider count
  useEffect(() => {
    fetchRiderCount()
  }, [])

  useEffect(() => {
    if (view === 'manage') {
      fetchRiders()
    } else if (view === 'logs') {
      fetchSyncLogs()
    }
    // sync view handled by SyncManager component
  }, [view])

  const fetchRiderCount = async () => {
    try {
      const response = await fetch('/api/team/roster')
      const data = await response.json()
      if (data.success) {
        setRiders(data.riders)
      }
    } catch (error) {
      console.error('Error fetching rider count:', error)
    }
  }

  const fetchRiders = async () => {
    try {
      const response = await fetch('/api/team/roster')
      const data = await response.json()
      if (data.success) {
        setRiders(data.riders)
        console.log(`📊 Loaded ${data.riders.length} team riders`)
      }
    } catch (error) {
      console.error('Error fetching riders:', error)
      toast.error('Fout bij laden riders')
    }
  }

  // Fetch sync logs
  const fetchSyncLogs = async () => {
    setLogsLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/sync-logs?limit=50`)
      const data = await response.json()
      if (data.success) {
        setSyncLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch sync logs:', error)
      toast.error('Logs laden mislukt')
    } finally {
      setLogsLoading(false)
    }
  }

  const handleAddSingle = async () => {
    if (!singleRiderId.trim()) {
      toast.error('Voer een Rider ID in')
      return
    }

    setLoading(true)
    try {
      console.log(`➕ Adding rider ${singleRiderId}...`)
      const response = await fetch('/api/admin/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_ids: [parseInt(singleRiderId)] })
      })
      
      const data = await response.json()
      console.log('Add response:', data)
      
      if (data.success) {
        const result = data.results[0]
        toast.success(`Rider ${singleRiderId} toegevoegd! ${result?.synced ? '✓ Data gesynchroniseerd' : '⚠️ Sync gefaald'}`)
        setSingleRiderId('')
        await fetchRiderCount() // Refresh count
        if (view === 'manage') await fetchRiders()
      } else {
        toast.error(data.error || 'Toevoegen mislukt')
      }
    } catch (error) {
      console.error('Error adding rider:', error)
      toast.error('Fout bij toevoegen')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMultiple = async () => {
    const ids = multipleRiderIds
      .split(/[\n,\s]+/)
      .map(id => id.trim())
      .filter(id => id && /^\d+$/.test(id))
      .map(id => parseInt(id))

    if (ids.length === 0) {
      toast.error('Voer minimaal 1 geldig Rider ID in')
      return
    }

    setLoading(true)
    
    // Initialize progress monitor
    setBulkProgress({
      total: ids.length,
      processed: 0,
      synced: 0,
      skipped: 0,
      failed: 0,
      isProcessing: true
    })
    
    try {
      console.log(`🚀 Bulk POST: ${ids.length} riders (CSV support test)...`)
      const response = await fetch('/api/admin/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_ids: ids })
      })
      
      const data = await response.json()
      console.log('✅ Bulk add response:', data)
      
      if (data.success) {
        const synced = data.results.filter((r: any) => r.synced && !r.skipped).length
        const skipped = data.results.filter((r: any) => r.skipped).length
        const failed = data.results.filter((r: any) => !r.synced && !r.skipped).length
        
        // Update final progress
        setBulkProgress({
          total: ids.length,
          processed: ids.length,
          synced,
          skipped,
          failed,
          isProcessing: false
        })
        
        let message = `✅ ${ids.length} riders verwerkt via POST!`
        if (synced > 0) message += ` | ${synced} toegevoegd`
        if (skipped > 0) message += ` | ${skipped} overgeslagen`
        if (failed > 0) message += ` | ${failed} gefaald`
        
        toast.success(message, { duration: 6000 })
        setMultipleRiderIds('')
        setUploadedFile(null)
        await fetchRiderCount()
        if (view === 'manage') await fetchRiders()
        
        // Clear progress after 5 seconds
        setTimeout(() => setBulkProgress(null), 5000)
      } else {
        setBulkProgress(null)
        toast.error(data.error || 'Toevoegen mislukt')
      }
    } catch (error) {
      console.error('Error bulk adding:', error)
      setBulkProgress(null)
      toast.error('Fout bij bulk toevoegen')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const ids = text
        .split(/[\n,\s\t]+/)
        .map(id => id.trim())
        .filter(id => id && /^\d+$/.test(id))
        .join('\n')
      
      setMultipleRiderIds(ids)
      setUploadedFile(file)
      toast.success(`${ids.split('\n').length} Rider IDs geladen uit ${file.name}`)
    }
    reader.readAsText(file)
  }
  const handleRemoveRider = async (riderId: number) => {
    if (!confirm(`Rider ${riderId} verwijderen uit team?`)) return

    try {
      console.log(`🗑️  Removing rider ${riderId}...`)
      const response = await fetch(`/api/admin/riders/${riderId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      console.log('Remove response:', data)
      
      if (data.success) {
        toast.success(`Rider ${riderId} verwijderd`)
        await fetchRiderCount() // Refresh count
        await fetchRiders()
      } else {
        toast.error(data.error || 'Verwijderen mislukt')
      }
    } catch (error) {
      console.error('Error removing rider:', error)
      toast.error('Fout bij verwijderen')
    }
  }

  // Bulk delete selected riders
  const handleBulkDelete = async () => {
    if (selectedRiders.length === 0) {
      toast.error('Selecteer eerst riders om te verwijderen')
      return
    }

    if (!confirm(`${selectedRiders.length} riders verwijderen uit team?`)) return

    try {
      console.log(`🗑️  Bulk removing ${selectedRiders.length} riders...`)
      const response = await fetch('/api/admin/riders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_ids: selectedRiders })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(`${selectedRiders.length} riders verwijderd`)
        setSelectedRiders([])
        setIsSelectionMode(false)
        await fetchRiderCount()
        await fetchRiders()
      } else {
        toast.error(data.error || 'Bulk verwijderen mislukt')
      }
    } catch (error) {
      console.error('Error bulk removing:', error)
      toast.error('Fout bij bulk verwijderen')
    }
  }

  // Toggle rider selection
  const toggleRiderSelection = (riderId: number) => {
    setSelectedRiders(prev => 
      prev.includes(riderId) 
        ? prev.filter(id => id !== riderId)
        : [...prev, riderId]
    )
  }

  // Select all filtered riders
  const selectAllFiltered = () => {
    const filteredRiderIds = riders
      .filter(rider => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return (
          rider.rider_id.toString().includes(search) ||
          (rider.name && rider.name.toLowerCase().includes(search)) ||
          (rider.full_name && rider.full_name.toLowerCase().includes(search)) ||
          (rider.racing_name && rider.racing_name.toLowerCase().includes(search)) ||
          (rider.country_alpha3 && rider.country_alpha3.toLowerCase().includes(search))
        )
      })
      .map(r => r.rider_id)
    
    setSelectedRiders(filteredRiderIds)
  }

  // 🔒 US3: Entry code handler
  const handleEntryCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (entryCode.toUpperCase() === CORRECT_CODE) {
      setIsAuthenticated(true)
      sessionStorage.setItem('teamManagerAuth', 'true')
      toast.success('✅ Toegang verleend!')
    } else {
      toast.error('❌ Onjuiste code')
      setEntryCode('')
    }
  }

  // Check session storage on mount
  useEffect(() => {
    const auth = sessionStorage.getItem('teamManagerAuth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  // 🔒 US3: Show entry code screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-blue-700/40 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-center mb-2 bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 bg-clip-text text-transparent">
              Team Manager
            </h1>
            <p className="text-center text-white/70 mb-8">
              Voer de entry code in voor toegang
            </p>
            <form onSubmit={handleEntryCodeSubmit} className="space-y-4">
              <input
                type="text"
                value={entryCode}
                onChange={(e) => setEntryCode(e.target.value)}
                placeholder="Entry Code"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 transition-all text-center tracking-wider uppercase"
                autoComplete="off"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                🔓 Ontgrendel
              </button>
            </form>
            <button
              onClick={() => navigate('/')}
              className="w-full mt-4 py-3 bg-white/10 rounded-xl font-semibold text-white/70 hover:bg-white/20 transition-all"
            >
              ← Terug naar Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      {/* Compact Modern Header */}
      <div className="relative overflow-hidden mb-4 sm:mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-blue-600 to-orange-500 opacity-95"></div>
        <div className="relative px-3 py-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-lg rounded-xl shadow-xl flex-shrink-0">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">
                    ⚙️ Team Manager
                  </h1>
                  <p className="text-orange-100 text-sm font-semibold mt-0.5">
                    TeamNL Cloud9 Racing
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-lg rounded-lg border border-white/30 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              </div>
            </div>
            {/* Rider Count Badge */}
            <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 shadow-lg mt-3">
              <span className="text-white/80 text-sm font-medium">Active Team Members</span>
              <span className="text-white font-bold text-lg sm:text-xl lg:text-2xl">{riders.length}</span>
              <span className="text-white/60 hidden sm:inline">·</span>
              <span className="text-cyan-300 font-semibold text-xs sm:text-sm">{view === 'add' ? '➕ Adding Mode' : '⚙️ Management Mode'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* View Tabs - Match Racing Matrix Filter Style */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-2 inline-flex gap-2 mb-6 border border-white/20 shadow-lg">

          <button
            onClick={() => setView('add')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              view === 'add'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-white hover:bg-white/10'
            }`}
          >
            ➕ Toevoegen
          </button>
          <button
            onClick={() => setView('manage')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              view === 'manage'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-white hover:bg-white/10'
            }`}
          >
            👥 Beheren
          </button>
          <button
            onClick={() => setView('sync')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              view === 'sync'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-white hover:bg-white/10'
            }`}
          >
            🔄 Auto-Sync
          </button>
          <button
            onClick={() => setView('logs')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              view === 'logs'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-white hover:bg-white/10'
            }`}
          >
            📋 Logs
          </button>
        </div>

        {/* Add View */}
        {view === 'add' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Single Rider */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">1️⃣</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Enkele Rider</h3>
                <p className="text-sm text-gray-400">Voeg 1 rider toe</p>
              </div>
            </div>
            
            <input
              type="text"
              value={singleRiderId}
              onChange={(e) => setSingleRiderId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSingle()}
              placeholder="Bijv: 150437"
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 mb-4"
              disabled={loading}
            />
            
            <button
              onClick={handleAddSingle}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/50"
            >
              {loading ? 'Toevoegen...' : 'Voeg Toe'}
            </button>
          </div>

          {/* Multiple Riders */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">2️⃣</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Meerdere Riders</h3>
                <p className="text-sm text-gray-400">Lijst met IDs</p>
              </div>
            </div>
            
            <textarea
              value={multipleRiderIds}
              onChange={(e) => setMultipleRiderIds(e.target.value)}
              placeholder="150437&#10;123456&#10;789012"
              rows={5}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:border-purple-500 mb-4 font-mono text-sm resize-none"
              disabled={loading}
            />
            
            <button
              onClick={handleAddMultiple}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/50"
            >
              {loading ? 'Verwerken...' : `Voeg ${multipleRiderIds.split(/[\n,\s]+/).filter(id => id.trim() && /^\d+$/.test(id.trim())).length} Riders Toe`}
            </button>
          </div>

          {/* Bulk Upload */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">3️⃣</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Bulk Upload</h3>
                <p className="text-sm text-gray-400">.txt of .csv bestand</p>
              </div>
            </div>
            
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 mb-4 text-center hover:border-green-500 transition-colors">
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="text-gray-400">
                  {uploadedFile ? uploadedFile.name : 'Klik om bestand te selecteren'}
                </span>
                <span className="text-xs text-gray-500">TXT of CSV met Rider IDs</span>
              </label>
            </div>
            
            {multipleRiderIds && (
              <button
                onClick={handleAddMultiple}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-green-500/50"
              >
                {loading ? 'Uploaden...' : `Upload ${multipleRiderIds.split('\n').filter(id => id.trim()).length} Riders`}
              </button>
            )}
          </div>
          
          {/* Sync Monitor - Fixed Position */}
          {bulkProgress && (
            <div className="lg:col-span-3">
              <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/50 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {bulkProgress.isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-3 border-blue-400 border-t-transparent"></div>
                        Verwerken...
                      </>
                    ) : (
                      <>
                        ✅ Voltooid!
                      </>
                    )}
                  </h3>
                  <button
                    onClick={() => setBulkProgress(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-300 mb-2">
                    <span>Progress</span>
                    <span>{bulkProgress.processed} / {bulkProgress.total}</span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 ease-out"
                      style={{ width: `${(bulkProgress.processed / bulkProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-white">{bulkProgress.total}</div>
                    <div className="text-xs text-gray-400 mt-1">Totaal</div>
                  </div>
                  <div className="bg-green-900/30 rounded-xl p-4 text-center border border-green-500/30">
                    <div className="text-3xl font-bold text-green-400">{bulkProgress.synced}</div>
                    <div className="text-xs text-gray-400 mt-1">Toegevoegd</div>
                  </div>
                  <div className="bg-yellow-900/30 rounded-xl p-4 text-center border border-yellow-500/30">
                    <div className="text-3xl font-bold text-yellow-400">{bulkProgress.skipped}</div>
                    <div className="text-xs text-gray-400 mt-1">Overgeslagen</div>
                  </div>
                  <div className="bg-red-900/30 rounded-xl p-4 text-center border border-red-500/30">
                    <div className="text-3xl font-bold text-red-400">{bulkProgress.failed}</div>
                    <div className="text-xs text-gray-400 mt-1">Gefaald</div>
                  </div>
                </div>
                
                {!bulkProgress.isProcessing && (
                  <div className="mt-4 text-center text-sm text-green-400">
                    ✓ POST request succesvol verwerkt (60+ riders support OK)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Manage View */}
        {view === 'manage' && (
          <div>
            {/* Multi-Select Toolbar */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-4 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode)
                    setSelectedRiders([])
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    isSelectionMode 
                      ? 'bg-white text-purple-600 shadow-lg' 
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {isSelectionMode ? '✓ Selectie Actief' : '☐ Selectie Modus'}
                </button>
                
                {isSelectionMode && (
                  <>
                    <button
                      onClick={selectAllFiltered}
                      className="px-4 py-2 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-all"
                    >
                      Selecteer Alle{searchTerm ? ' Gefilterde' : ''}
                    </button>
                    <button
                      onClick={() => setSelectedRiders([])}
                      className="px-4 py-2 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-all"
                      disabled={selectedRiders.length === 0}
                    >
                      Deselecteer Alles
                    </button>
                    <div className="flex-1"></div>
                    <div className="text-white font-bold">
                      {selectedRiders.length} geselecteerd
                    </div>
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedRiders.length === 0}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      🗑️ Verwijder ({selectedRiders.length})
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* CSV Export Buttons */}
            <div className="bg-white rounded-xl shadow-lg p-4 mb-4 flex flex-wrap gap-3">
              <a
                href={`${import.meta.env.VITE_API_URL || ''}/api/riders/export/csv?format=ids_only`}
                download
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                📥 Export IDs (.txt)
              </a>
              <a
                href={`${import.meta.env.VITE_API_URL || ''}/api/riders/export/csv?format=full`}
                download
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                📊 Export Full CSV
              </a>
              <div className="ml-auto text-sm text-gray-600 flex items-center">
                <span className="font-semibold">{riders.length} riders</span>
              </div>
            </div>

            {/* Search Filter */}
            <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Zoek op naam, rider ID, of land..."
                  className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-lg text-gray-900"
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchTerm && (
                <div className="mt-2 text-sm text-gray-600">
                  {riders.filter(rider => 
                    rider.rider_id.toString().includes(searchTerm.toLowerCase()) ||
                    (rider.name && rider.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (rider.full_name && rider.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (rider.racing_name && rider.racing_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (rider.country_alpha3 && rider.country_alpha3.toLowerCase().includes(searchTerm.toLowerCase()))
                  ).length} resultaten gevonden
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-600 to-cyan-500">
                    <tr>
                      {isSelectionMode && (
                        <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider w-12">☐</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Rider</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">vELO</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Cat</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">FTP</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Races</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Wins</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Laatste Sync</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {riders
                      .filter(rider => {
                        if (!searchTerm) return true;
                        const search = searchTerm.toLowerCase();
                        return (
                          rider.rider_id.toString().includes(search) ||
                          (rider.name && rider.name.toLowerCase().includes(search)) ||
                          (rider.full_name && rider.full_name.toLowerCase().includes(search)) ||
                          (rider.racing_name && rider.racing_name.toLowerCase().includes(search)) ||
                          (rider.country_alpha3 && rider.country_alpha3.toLowerCase().includes(search))
                        );
                      })
                      .map((rider) => (
                      <tr key={rider.rider_id} className={`hover:bg-blue-50 transition-colors ${selectedRiders.includes(rider.rider_id) ? 'bg-purple-50' : ''}`}>
                        {isSelectionMode && (
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedRiders.includes(rider.rider_id)}
                              onChange={() => toggleRiderSelection(rider.rider_id)}
                              className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img 
                              src={rider.avatar_url || rider.image_src || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff`} 
                              alt="" 
                              className="w-12 h-12 rounded-full border-2 border-blue-200 object-cover" 
                              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff`; }}
                            />
                            <div>
                              <div className="font-bold text-gray-900">
                                {rider.full_name || rider.name || rider.racing_name || `Rider ${rider.rider_id}`}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-2">
                                {rider.country_alpha3 && (
                                  <span className="text-lg">{rider.country_alpha3 === 'NLD' ? '🇳🇱' : rider.country_alpha3 === 'USA' ? '🇺🇸' : rider.country_alpha3 === 'GBR' ? '🇬🇧' : '🌍'}</span>
                                )}
                                ID: {rider.rider_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-lg text-cyan-600">
                            {rider.velo_live ? Math.floor(rider.velo_live) : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full font-bold text-sm ${
                            rider.zwiftracing_category === 'A' ? 'bg-red-100 text-red-700' :
                            rider.zwiftracing_category === 'B' ? 'bg-orange-100 text-orange-700' :
                            rider.zwiftracing_category === 'C' ? 'bg-green-100 text-green-700' :
                            rider.zwiftracing_category === 'D' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {rider.zwiftracing_category || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-gray-900">
                            {rider.racing_ftp || rider.ftp_watts || '-'}<span className="text-gray-500 text-sm">W</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700 font-medium">{rider.race_finishes || 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700 font-medium">{rider.race_wins || 0}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500">
                            {rider.team_last_synced ? new Date(rider.team_last_synced).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Nooit'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoveRider(rider.rider_id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold text-sm shadow-md hover:shadow-lg"
                          >
                            Verwijder
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            
            {riders.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-xl mb-2">Nog geen riders in het team</p>
                <p className="text-sm">Voeg riders toe via de "Riders Toevoegen" tab</p>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Sync Logs View */}
        {view === 'sync' && (
          <div className="space-y-6">
            <SyncManager />
          </div>
        )}

        {view === 'logs' && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">📋 Sync Geschiedenis</h2>
              <button
                onClick={fetchSyncLogs}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                🔄 Ververs
              </button>
            </div>

            {logsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                <p className="text-gray-400 mt-4">Logs laden...</p>
              </div>
            ) : syncLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-xl mb-2">Nog geen sync logs</p>
                <p className="text-sm">Logs verschijnen hier na sync operaties</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Tijd</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Trigger</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Items</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Geslaagd</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Mislukt</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Duur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {syncLogs.map((log: any) => (
                      <>
                        <tr 
                          key={log.id} 
                          className="hover:bg-gray-700/30 cursor-pointer"
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {new Date(log.started_at).toLocaleDateString('nl-NL', { 
                              day: '2-digit', 
                              month: 'short', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">{log.sync_type}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              log.trigger_type === 'auto' ? 'bg-blue-900/50 text-blue-300' :
                              log.trigger_type === 'manual' ? 'bg-purple-900/50 text-purple-300' :
                              log.trigger_type === 'upload' ? 'bg-green-900/50 text-green-300' :
                              log.trigger_type === 'api' ? 'bg-orange-900/50 text-orange-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {log.trigger_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              log.status === 'success' ? 'bg-green-900/50 text-green-300' :
                              log.status === 'partial' ? 'bg-yellow-900/50 text-yellow-300' :
                              log.status === 'failed' ? 'bg-red-900/50 text-red-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">{log.total_items || 0}</td>
                          <td className="px-4 py-3 text-sm text-green-400 font-semibold">{log.success_count || 0}</td>
                          <td className="px-4 py-3 text-sm text-red-400 font-semibold">
                            {log.failed_count || 0}
                            {log.failed_count > 0 && expandedLogId !== log.id && (
                              <span className="ml-2 text-xs text-gray-500">▼</span>
                            )}
                            {log.failed_count > 0 && expandedLogId === log.id && (
                              <span className="ml-2 text-xs text-gray-500">▲</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}
                          </td>
                        </tr>
                        
                        {/* 🔍 US2: Expandable error details */}
                        {expandedLogId === log.id && log.metadata?.failed_riders_errors && log.metadata.failed_riders_errors.length > 0 && (
                          <tr key={`${log.id}-details`} className="bg-red-900/20">
                            <td colSpan={8} className="px-4 py-4">
                              <div className="space-y-2">
                                <div className="text-sm font-semibold text-red-300 mb-3 flex items-center gap-2">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  Failure Details ({log.metadata.failed_riders_errors.length} riders)
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  {log.metadata.failed_riders_errors.map((err: any, idx: number) => (
                                    <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-red-800/50">
                                      <div className="flex items-start justify-between mb-2">
                                        <span className="font-mono text-sm text-gray-300">Rider: {err.rider_id}</span>
                                        <span className="px-2 py-1 bg-red-800/50 text-red-200 rounded text-xs font-mono">
                                          {err.error_code}
                                        </span>
                                      </div>
                                      {err.error_details && err.error_details.length > 0 && (
                                        <ul className="text-xs text-gray-400 space-y-1 ml-4">
                                          {err.error_details.map((detail: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2">
                                              <span className="text-red-400">→</span>
                                              <span>{detail}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

