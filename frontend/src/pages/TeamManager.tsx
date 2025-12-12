import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface Rider {
  rider_id: number
  name: string
  country: string
  velo_live: number | null
  category: string | null
  ftp: number | null
  weight: number | null
  avatar_url: string | null
  last_synced: string | null
}

export default function TeamManager() {
  const navigate = useNavigate()
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'add' | 'manage'>('add')
  
  // Add single rider
  const [singleRiderId, setSingleRiderId] = useState('')
  
  // Add multiple riders
  const [multipleRiderIds, setMultipleRiderIds] = useState('')
  
  // File upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  useEffect(() => {
    if (view === 'manage') {
      fetchRiders()
    }
  }, [view])

  const fetchRiders = async () => {
    try {
      const response = await fetch('/api/riders')
      const data = await response.json()
      if (data.success) {
        setRiders(data.riders)
      }
    } catch (error) {
      console.error('Error fetching riders:', error)
    }
  }

  const handleAddSingle = async () => {
    if (!singleRiderId.trim()) {
      toast.error('Voer een Rider ID in')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_ids: [parseInt(singleRiderId)] })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(`Rider ${singleRiderId} toegevoegd! ${data.results[0]?.synced ? '✓ Data gesynchroniseerd' : ''}`)
        setSingleRiderId('')
        if (view === 'manage') fetchRiders()
      } else {
        toast.error(data.error || 'Toevoegen mislukt')
      }
    } catch (error) {
      toast.error('Fout bij toevoegen rider')
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
      const response = await fetch('/api/admin/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_ids: ids })
      })
      
      const data = await response.json()
      
      if (data.success) {
        const synced = data.results.filter((r: any) => r.synced).length
        const failed = data.results.filter((r: any) => !r.synced).length
        toast.success(`${ids.length} riders verwerkt! ✓ ${synced} gesynchroniseerd${failed > 0 ? `, ${failed} gefaald` : ''}`)
        setMultipleRiderIds('')
        if (view === 'manage') fetchRiders()
      } else {
        toast.error(data.error || 'Toevoegen mislukt')
      }
    } catch (error) {
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
      const response = await fetch(`/api/admin/riders/${riderId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success(`Rider ${riderId} verwijderd`)
        fetchRiders()
      } else {
        toast.error('Verwijderen mislukt')
      }
    } catch (error) {
      toast.error('Fout bij verwijderen')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Team Manager
            </h1>
            <p className="text-gray-400 mt-2">Beheer je Racing Matrix riders</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all border border-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Terug naar Dashboard</span>
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setView('add')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              view === 'add'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700'
            }`}
          >
            ➕ Riders Toevoegen
          </button>
          <button
            onClick={() => setView('manage')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              view === 'manage'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 border border-gray-700'
            }`}
          >
            👥 Team Beheren ({riders.length})
          </button>
        </div>
      </div>

      {/* Add View */}
      {view === 'add' && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Rider</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Land</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">vELO</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Cat</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">FTP</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Laatste Sync</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {riders.map((rider) => (
                    <tr key={rider.rider_id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {rider.avatar_url && (
                            <img src={rider.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                          )}
                          <div>
                            <div className="font-semibold">{rider.name || `Rider ${rider.rider_id}`}</div>
                            <div className="text-sm text-gray-400">ID: {rider.rider_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-2xl">{rider.country || '🌍'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-cyan-400">{rider.velo_live || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-600/20 rounded-lg font-semibold">{rider.category || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono">{rider.ftp || '-'}W</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {rider.last_synced ? new Date(rider.last_synced).toLocaleString('nl-NL') : 'Nooit'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleRemoveRider(rider.rider_id)}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
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
  )
}
