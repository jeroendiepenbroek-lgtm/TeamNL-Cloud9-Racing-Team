import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

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
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [autoSyncInterval, setAutoSyncInterval] = useState(60) // minutes
  const [syncConfig, setSyncConfig] = useState<{
    lastRun: string | null
    nextRun: string | null
  }>({ lastRun: null, nextRun: null })
  const [view, setView] = useState<'add' | 'manage'>('add')
  
  // Add single rider
  const [singleRiderId, setSingleRiderId] = useState('')
  
  // Add multiple riders
  const [multipleRiderIds, setMultipleRiderIds] = useState('')
  
  // File upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // Initial load of rider count + sync config
  useEffect(() => {
    fetchRiderCount()
    fetchSyncConfig()
  }, [])

  useEffect(() => {
    if (view === 'manage') {
      fetchRiders()
    }
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

  // Fetch server-side sync config
  const fetchSyncConfig = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/sync-config`)
      const data = await response.json()
      setAutoSyncEnabled(data.enabled)
      setAutoSyncInterval(data.intervalMinutes)
      setSyncConfig({ lastRun: data.lastRun, nextRun: data.nextRun })
    } catch (error) {
      console.error('Failed to fetch sync config:', error)
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
    try {
      console.log(`➕ Adding ${ids.length} riders...`)
      const response = await fetch('/api/admin/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_ids: ids })
      })
      
      const data = await response.json()
      console.log('Bulk add response:', data)
      
      if (data.success) {
        const synced = data.results.filter((r: any) => r.synced).length
        const failed = data.results.filter((r: any) => !r.synced).length
        toast.success(`${ids.length} riders verwerkt! ✓ ${synced} gesynchroniseerd${failed > 0 ? `, ${failed} gefaald` : ''}`)
        setMultipleRiderIds('')
        await fetchRiderCount() // Refresh count
        if (view === 'manage') await fetchRiders()
      } else {
        toast.error(data.error || 'Toevoegen mislukt')
      }
    } catch (error) {
      console.error('Error bulk adding:', error)
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
  const handleSyncAll = useCallback(async () => {
    setSyncing(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/sync-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`✅ ${result.synced} riders gesynchroniseerd!`)
        await fetchRiders() // Refresh data
        // Update only lastRun time, keep interval settings unchanged
        setSyncConfig(prev => ({ ...prev, lastRun: new Date().toISOString() }))
      } else {
        toast.error('Sync mislukt: ' + result.error)
      }
    } catch (error: any) {
      console.error('Sync error:', error)
      toast.error('Sync fout: ' + error.message)
    } finally {
      setSyncing(false)
    }
  }, [])

  // Update server-side sync config
  const updateSyncConfig = async (enabled: boolean, intervalMinutes: number) => {
    try {
      console.log(`⚙️ Updating sync config: enabled=${enabled}, interval=${intervalMinutes}`)
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/sync-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, intervalMinutes })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Update state met de response van server
        setAutoSyncEnabled(result.config.enabled)
        setAutoSyncInterval(result.config.intervalMinutes)
        setSyncConfig({ lastRun: result.config.lastRun, nextRun: result.config.nextRun })
        console.log(`✅ Config updated:`, result.config)
        toast.success(`⚙️ Auto-sync ${enabled ? 'ingeschakeld' : 'uitgeschakeld'}${enabled ? ` (${intervalMinutes} min)` : ''}`)
      } else {
        toast.error('Config update mislukt')
      }
    } catch (error: any) {
      console.error('Config update error:', error)
      toast.error('Config fout: ' + error.message)
    }
  }

  // Handle auto-sync toggle
  const handleAutoSyncToggle = async (enabled: boolean) => {
    await updateSyncConfig(enabled, autoSyncInterval)
  }

  // Handle interval change
  const handleIntervalChange = async (intervalMinutes: number) => {
    await updateSyncConfig(autoSyncEnabled, intervalMinutes)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      {/* Hero Header - Match Racing Matrix */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-blue-700/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Logo + Title */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3">
                    <span className="truncate">TEAM MANAGER</span>
                  </h1>
                  <p className="text-blue-100 text-xs sm:text-sm lg:text-lg xl:text-xl font-semibold mt-1 sm:mt-2 truncate">
                    TeamNL Cloud9 Racing · Rider Management
                  </p>
                </div>
              </div>
              {/* Server-Side Sync Controls + Back Button */}
              <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-lg rounded-lg px-3 py-2 border border-white/30">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSyncEnabled}
                        onChange={(e) => handleAutoSyncToggle(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs sm:text-sm font-medium text-white">Server Auto-Sync</span>
                    </label>
                    <select
                      value={autoSyncInterval}
                      onChange={(e) => handleIntervalChange(Number(e.target.value))}
                      disabled={!autoSyncEnabled}
                      className="text-xs sm:text-sm border-l border-white/30 pl-2 bg-transparent focus:outline-none text-white font-medium disabled:opacity-50"
                    >
                      <option value={5} className="text-gray-900">5m (test)</option>
                      <option value={15} className="text-gray-900">15m</option>
                      <option value={30} className="text-gray-900">30m</option>
                      <option value={60} className="text-gray-900">1u</option>
                      <option value={120} className="text-gray-900">2u</option>
                      <option value={240} className="text-gray-900">4u</option>
                    </select>
                  </div>
                  {syncConfig.nextRun && (
                    <div className="text-xs text-white/70 px-2">
                      Volgende sync: {new Date(syncConfig.nextRun).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSyncAll}
                  disabled={syncing}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 rounded-lg sm:rounded-xl text-white font-semibold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-1.5 sm:gap-2"
                >
                  {syncing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden sm:inline">Syncing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="hidden sm:inline">Sync</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-lg rounded-lg sm:rounded-xl border border-white/30 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-1.5 sm:gap-2"
                  title="Back to Dashboard"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              </div>
            </div>
            {/* Stats Bar */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 bg-white/10 backdrop-blur-lg rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 lg:px-5 lg:py-3 border border-white/20 shadow-xl mt-3 sm:mt-4">
              <span className="text-white/80 text-xs sm:text-sm font-medium">Active Team Members</span>
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
            ➕ Riders Toevoegen
          </button>
          <button
            onClick={() => setView('manage')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              view === 'manage'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-white hover:bg-white/10'
            }`}
          >
            👥 Team Beheren
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
        </div>
        )}

        {/* Manage View */}
        {view === 'manage' && (
          <div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-600 to-cyan-500">
                    <tr>
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
                    {riders.map((rider) => (
                      <tr key={rider.rider_id} className="hover:bg-blue-50 transition-colors">
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
                                {rider.full_name || rider.racing_name || `Rider ${rider.rider_id}`}
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
                            {rider.velo_live ? Math.round(rider.velo_live) : '-'}
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
      </div>
    </div>
  )
}

