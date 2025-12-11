import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

interface AdminUser {
  id: number
  email: string
  full_name: string
}

interface SyncConfig {
  auto_sync_enabled: string
  sync_interval_hours: string
  last_sync_timestamp: string
}

interface SyncLog {
  id: number
  started_at: string
  completed_at: string | null
  status: string
  riders_synced: number
  riders_failed: number
  error_message: string | null
  triggered_by: string
  duration_seconds: number | null
}

interface TeamRider {
  id: number
  rider_id: number
  zwift_id: number | null
  added_at: string
  added_by: string | null
  notes: string | null
  is_active: boolean
  last_synced: string | null
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'team' | 'sync' | 'logs'>('team')
  
  // Team Management
  const [teamRoster, setTeamRoster] = useState<TeamRider[]>([])
  const [newRiderId, setNewRiderId] = useState('')
  const [bulkRiderIds, setBulkRiderIds] = useState('')
  
  // Sync Config
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null)
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    verifyAuth()
  }, [])

  const verifyAuth = async () => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      navigate('/admin/login')
      return
    }

    try {
      const res = await fetch('/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error('Invalid token')
      
      const data = await res.json()
      setAdmin(data.admin)
      
      // Load initial data
      await Promise.all([
        loadTeamRoster(),
        loadSyncConfig(),
        loadSyncLogs()
      ])
    } catch (error) {
      localStorage.removeItem('admin_token')
      navigate('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const loadTeamRoster = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/team/roster', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTeamRoster(data)
      }
    } catch (error) {
      console.error('Failed to load roster:', error)
    }
  }

  const loadSyncConfig = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/sync/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSyncConfig(data)
      }
    } catch (error) {
      console.error('Failed to load sync config:', error)
    }
  }

  const loadSyncLogs = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/sync/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSyncLogs(data)
      }
    } catch (error) {
      console.error('Failed to load sync logs:', error)
    }
  }

  const handleAddRider = async (e: React.FormEvent) => {
    e.preventDefault()
    const riderId = parseInt(newRiderId)
    if (isNaN(riderId)) {
      toast.error('Invalid rider ID')
      return
    }

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/team/riders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rider_id: riderId })
      })

      if (res.ok) {
        toast.success(`Rider ${riderId} added to team`)
        setNewRiderId('')
        await loadTeamRoster()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add rider')
      }
    } catch (error) {
      toast.error('Failed to add rider')
    }
  }

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault()
    const ids = bulkRiderIds
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id))

    if (ids.length === 0) {
      toast.error('No valid rider IDs')
      return
    }

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/team/riders/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rider_ids: ids })
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.added} riders added to team`)
        setBulkRiderIds('')
        await loadTeamRoster()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to bulk import')
      }
    } catch (error) {
      toast.error('Failed to bulk import')
    }
  }

  const handleRemoveRider = async (riderId: number) => {
    if (!confirm(`Remove rider ${riderId} from team?`)) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/team/riders/${riderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        toast.success(`Rider ${riderId} removed`)
        await loadTeamRoster()
      } else {
        toast.error('Failed to remove rider')
      }
    } catch (error) {
      toast.error('Failed to remove rider')
    }
  }

  const handleUpdateSyncConfig = async (key: string, value: string) => {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/sync/config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [key]: value })
      })

      if (res.ok) {
        toast.success('Sync config updated')
        await loadSyncConfig()
      } else {
        toast.error('Failed to update config')
      }
    } catch (error) {
      toast.error('Failed to update config')
    }
  }

  const handleTriggerSync = async () => {
    if (isSyncing) return
    setIsSyncing(true)

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/sync/trigger', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        toast.success('Sync started!')
        // Reload logs after 2 seconds
        setTimeout(() => {
          loadSyncLogs()
          setIsSyncing(false)
        }, 2000)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to start sync')
        setIsSyncing(false)
      }
    } catch (error) {
      toast.error('Failed to start sync')
      setIsSyncing(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">🔐 Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">Logged in as {admin?.email}</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              View Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('team')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'team'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Team Management
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'sync'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Auto-Sync Config
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-6 py-3 font-semibold transition ${
                activeTab === 'logs'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sync Logs
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'team' && (
          <div className="space-y-6">
            {/* Add Single Rider */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Add Single Rider</h2>
              <form onSubmit={handleAddRider} className="flex gap-4">
                <input
                  type="text"
                  value={newRiderId}
                  onChange={(e) => setNewRiderId(e.target.value)}
                  placeholder="Rider ID (e.g. 150437)"
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
                >
                  Add Rider
                </button>
              </form>
            </div>

            {/* Bulk Import */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Bulk Import Riders</h2>
              <form onSubmit={handleBulkImport} className="space-y-4">
                <textarea
                  value={bulkRiderIds}
                  onChange={(e) => setBulkRiderIds(e.target.value)}
                  placeholder="Enter rider IDs separated by commas (e.g. 150437, 123456, 789012)"
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                >
                  Bulk Import
                </button>
              </form>
            </div>

            {/* Team Roster */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Team Roster ({teamRoster.length} riders)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-4 text-gray-400 font-semibold">Rider ID</th>
                      <th className="text-left py-2 px-4 text-gray-400 font-semibold">Added</th>
                      <th className="text-left py-2 px-4 text-gray-400 font-semibold">Last Synced</th>
                      <th className="text-right py-2 px-4 text-gray-400 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamRoster.map((rider) => (
                      <tr key={rider.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="py-3 px-4 text-white font-mono">{rider.rider_id}</td>
                        <td className="py-3 px-4 text-gray-400 text-sm">
                          {new Date(rider.added_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-sm">
                          {rider.last_synced 
                            ? new Date(rider.last_synced).toLocaleString()
                            : 'Never'
                          }
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRemoveRider(rider.rider_id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sync' && syncConfig && (
          <div className="space-y-6">
            {/* Sync Controls */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Sync Configuration</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">Auto-Sync</h3>
                    <p className="text-gray-400 text-sm">Automatically sync team data</p>
                  </div>
                  <button
                    onClick={() => handleUpdateSyncConfig('auto_sync_enabled', 
                      syncConfig.auto_sync_enabled === 'true' ? 'false' : 'true'
                    )}
                    className={`px-6 py-2 rounded-lg font-semibold transition ${
                      syncConfig.auto_sync_enabled === 'true'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {syncConfig.auto_sync_enabled === 'true' ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">Sync Interval</h3>
                    <p className="text-gray-400 text-sm">How often to sync (1-24 hours)</p>
                  </div>
                  <select
                    value={syncConfig.sync_interval_hours}
                    onChange={(e) => handleUpdateSyncConfig('sync_interval_hours', e.target.value)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600"
                  >
                    {[1,2,3,4,6,8,12,24].map(hours => (
                      <option key={hours} value={hours}>{hours} hour{hours > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <button
                    onClick={handleTriggerSync}
                    disabled={isSyncing}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition"
                  >
                    {isSyncing ? 'Syncing...' : 'Trigger Manual Sync Now'}
                  </button>
                </div>
              </div>
            </div>

            {/* Last Sync Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Last Sync</h2>
              <p className="text-gray-400">
                {syncConfig.last_sync_timestamp !== '0'
                  ? new Date(parseInt(syncConfig.last_sync_timestamp) * 1000).toLocaleString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Sync Logs</h2>
              <button
                onClick={loadSyncLogs}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Refresh
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-4 text-gray-400 font-semibold">Started</th>
                    <th className="text-left py-2 px-4 text-gray-400 font-semibold">Status</th>
                    <th className="text-right py-2 px-4 text-gray-400 font-semibold">Synced</th>
                    <th className="text-right py-2 px-4 text-gray-400 font-semibold">Failed</th>
                    <th className="text-right py-2 px-4 text-gray-400 font-semibold">Duration</th>
                    <th className="text-left py-2 px-4 text-gray-400 font-semibold">By</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(log.started_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.status === 'success' ? 'bg-green-600/20 text-green-400' :
                          log.status === 'failed' ? 'bg-red-600/20 text-red-400' :
                          log.status === 'partial' ? 'bg-yellow-600/20 text-yellow-400' :
                          'bg-blue-600/20 text-blue-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-green-400">{log.riders_synced}</td>
                      <td className="py-3 px-4 text-right text-red-400">{log.riders_failed}</td>
                      <td className="py-3 px-4 text-right text-gray-400 text-sm">
                        {log.duration_seconds ? `${log.duration_seconds}s` : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">{log.triggered_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
