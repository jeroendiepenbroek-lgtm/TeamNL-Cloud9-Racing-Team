import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface TeamRider {
  id: number
  rider_id: number
  zwift_id: number | null
  added_at: string
  notes: string | null
  is_active: boolean
  last_synced: string | null
}

interface SyncConfig {
  auto_sync_enabled: string
  sync_interval_hours: string
}

interface SyncLog {
  id: number
  started_at: string
  completed_at: string | null
  status: string
  riders_synced: number
  riders_failed: number
  duration_seconds: number | null
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'team' | 'sync' | 'logs'>('team')
  const [teamRoster, setTeamRoster] = useState<TeamRider[]>([])
  const [newRiderId, setNewRiderId] = useState('')
  const [bulkRiderIds, setBulkRiderIds] = useState('')
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null)
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    loadTeamRoster()
    loadSyncConfig()
    loadSyncLogs()
  }, [])

  const loadTeamRoster = async () => {
    try {
      const res = await fetch('/api/admin/team/riders')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setTeamRoster(data)
    } catch (error) {
      console.error('Load roster error:', error)
      toast.error('Failed to load team roster')
    }
  }

  const loadSyncConfig = async () => {
    try {
      const res = await fetch('/api/admin/sync/config')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSyncConfig(data)
    } catch (error) {
      console.error('Load config error:', error)
    }
  }

  const loadSyncLogs = async () => {
    try {
      const res = await fetch('/api/admin/sync/logs?limit=20')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSyncLogs(data)
    } catch (error) {
      console.error('Load logs error:', error)
    }
  }

  const handleAddRider = async () => {
    const riderId = parseInt(newRiderId)
    if (!riderId) {
      toast.error('Enter valid rider ID')
      return
    }

    try {
      const res = await fetch('/api/admin/team/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_id: riderId })
      })
      
      if (!res.ok) throw new Error('Failed to add')
      toast.success('Rider added! Syncing...')
      setNewRiderId('')
      await loadTeamRoster()
    } catch (error) {
      console.error('Add rider error:', error)
      toast.error('Failed to add rider')
    }
  }

  const handleBulkImport = async () => {
    const ids = bulkRiderIds.split(/[,\\n]+/).map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    if (ids.length === 0) {
      toast.error('Enter valid rider IDs')
      return
    }

    try {
      const res = await fetch('/api/admin/team/riders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_ids: ids })
      })
      
      if (!res.ok) throw new Error('Failed')
      toast.success(`Added ${ids.length} riders!`)
      setBulkRiderIds('')
      await loadTeamRoster()
    } catch (error) {
      console.error('Bulk import error:', error)
      toast.error('Failed to bulk import')
    }
  }

  const handleDeleteRider = async (riderId: number) => {
    if (!confirm(`Remove rider ${riderId}?`)) return

    try {
      const res = await fetch(`/api/admin/team/riders/${riderId}`, {
        method: 'DELETE'
      })
      
      if (!res.ok) throw new Error('Failed')
      toast.success('Rider removed')
      await loadTeamRoster()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to remove rider')
    }
  }

  const handleToggleAutoSync = async () => {
    const newValue = syncConfig?.auto_sync_enabled === 'true' ? 'false' : 'true'
    
    try {
      const res = await fetch('/api/admin/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_sync_enabled: newValue })
      })
      
      if (!res.ok) throw new Error('Failed')
      toast.success(`Auto-sync ${newValue === 'true' ? 'enabled' : 'disabled'}`)
      await loadSyncConfig()
    } catch (error) {
      console.error('Toggle error:', error)
      toast.error('Failed to toggle')
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/admin/sync/trigger', {
        method: 'POST'
      })
      
      if (!res.ok) throw new Error('Failed')
      toast.success('Sync started! Check logs tab.')
      setTimeout(() => loadSyncLogs(), 3000)
    } catch (error) {
      console.error('Manual sync error:', error)
      toast.error('Failed to start sync')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">TeamNL Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          {['team', 'sync', 'logs'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 font-medium ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'team' ? 'Team Management' : tab === 'sync' ? 'Sync Config' : 'Sync Logs'}
            </button>
          ))}
        </div>

        {/* Team Management Tab */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Add Single Rider</h2>
              <div className="flex gap-4">
                <input
                  type="number"
                  value={newRiderId}
                  onChange={e => setNewRiderId(e.target.value)}
                  placeholder="Rider ID (e.g. 150437)"
                  className="flex-1 bg-gray-700 px-4 py-2 rounded"
                />
                <button
                  onClick={handleAddRider}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-medium"
                >
                  Add Rider
                </button>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Bulk Import</h2>
              <textarea
                value={bulkRiderIds}
                onChange={e => setBulkRiderIds(e.target.value)}
                placeholder="Enter rider IDs (comma or newline separated)"
                className="w-full bg-gray-700 px-4 py-2 rounded h-32"
              />
              <button
                onClick={handleBulkImport}
                className="mt-4 bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-medium"
              >
                Import All
              </button>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Team Roster ({teamRoster.length})</h2>
              <div className="space-y-2">
                {teamRoster.map(rider => (
                  <div key={rider.id} className="flex items-center justify-between bg-gray-700 p-4 rounded">
                    <div>
                      <span className="font-bold">Rider {rider.rider_id}</span>
                      {rider.last_synced && (
                        <span className="ml-4 text-sm text-gray-400">
                          Last synced: {new Date(rider.last_synced).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteRider(rider.rider_id)}
                      className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sync Config Tab */}
        {activeTab === 'sync' && syncConfig && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Auto-Sync Settings</h2>
              <button
                onClick={handleToggleAutoSync}
                className={`px-6 py-3 rounded font-medium ${
                  syncConfig.auto_sync_enabled === 'true'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {syncConfig.auto_sync_enabled === 'true' ? '✅ Enabled' : '❌ Disabled'}
              </button>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Manual Sync</h2>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded font-medium"
              >
                {isSyncing ? 'Syncing...' : '🔄 Trigger Manual Sync'}
              </button>
            </div>
          </div>
        )}

        {/* Sync Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Recent Sync Logs</h2>
            <div className="space-y-2">
              {syncLogs.map(log => (
                <div key={log.id} className="bg-gray-700 p-4 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`font-bold ${
                        log.status === 'success' ? 'text-green-400' :
                        log.status === 'running' ? 'text-blue-400' :
                        log.status === 'partial' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {log.status.toUpperCase()}
                      </span>
                      <span className="ml-4 text-sm text-gray-400">
                        {new Date(log.started_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <div>Synced: {log.riders_synced}</div>
                      <div>Failed: {log.riders_failed}</div>
                      {log.duration_seconds && <div>Duration: {log.duration_seconds}s</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
