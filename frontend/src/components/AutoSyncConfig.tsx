import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface SyncConfig {
  enabled: boolean
  interval_minutes: number
  last_sync_at: string | null
  next_sync_at: string | null
}

interface SyncStatus {
  is_syncing: boolean
  current_job: {
    started_at: string
    progress: number
    status: string
  } | null
}

export default function AutoSyncConfig() {
  const [config, setConfig] = useState<SyncConfig | null>(null)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [tempInterval, setTempInterval] = useState(60)

  useEffect(() => {
    loadConfig()
    loadStatus()
    
    // Poll status every 10 seconds
    const interval = setInterval(loadStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/sync-config')
      if (!res.ok) throw new Error('Failed to load config')
      const data = await res.json()
      setConfig(data)
      setTempInterval(data.interval_minutes)
    } catch (error) {
      console.error('Load config error:', error)
      toast.error('Failed to load sync config')
    } finally {
      setIsLoading(false)
    }
  }

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/admin/sync-status')
      if (!res.ok) return
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      console.error('Load status error:', error)
    }
  }

  const updateConfig = async (updates: Partial<SyncConfig>) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/sync-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!res.ok) throw new Error('Failed to update')
      
      const data = await res.json()
      setConfig(data)
      toast.success('Config updated!')
    } catch (error) {
      console.error('Update config error:', error)
      toast.error('Failed to update config')
    } finally {
      setIsSaving(false)
    }
  }

  const triggerManualSync = async () => {
    try {
      const res = await fetch('/api/admin/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_type: 'manual' })
      })
      
      if (!res.ok) throw new Error('Failed to trigger')
      
      toast.success('Manual sync started!')
      setTimeout(loadStatus, 1000)
    } catch (error) {
      console.error('Trigger sync error:', error)
      toast.error('Failed to start sync')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
        <p className="text-red-400">Failed to load sync configuration</p>
      </div>
    )
  }

  const getNextSyncCountdown = () => {
    if (!config.next_sync_at) return null
    const next = new Date(config.next_sync_at).getTime()
    const now = Date.now()
    const diff = next - now
    if (diff < 0) return 'Syncing soon...'
    
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {status?.is_syncing && (
        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <div>
                <h3 className="text-lg font-bold text-blue-400">Sync in Progress</h3>
                <p className="text-sm text-gray-400">
                  Started {new Date(status.current_job!.started_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <span className="text-2xl font-bold text-blue-400">
              {status.current_job!.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${status.current_job!.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Auto-Sync Toggle */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Automatic Sync
            </h3>
            <p className="text-gray-400 text-sm">
              {config.enabled 
                ? `Syncs every ${config.interval_minutes} minutes`
                : 'Disabled - manual sync only'}
            </p>
          </div>
          <button
            onClick={() => updateConfig({ enabled: !config.enabled })}
            disabled={isSaving}
            className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
              config.enabled ? 'bg-blue-600' : 'bg-gray-600'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${
                config.enabled ? 'translate-x-12' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {config.enabled && config.next_sync_at && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Next sync in:</span>
              <span className="font-mono text-blue-400 text-lg font-bold">
                {getNextSyncCountdown()}
              </span>
            </div>
          </div>
        )}

        {config.last_sync_at && (
          <div className="mt-2 text-xs text-gray-500">
            Last synced: {new Date(config.last_sync_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Interval Configuration */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Sync Interval
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5"
              max="1440"
              step="5"
              value={tempInterval}
              onChange={(e) => setTempInterval(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="font-mono text-2xl font-bold text-blue-400 w-24 text-right">
              {tempInterval}m
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[5, 15, 30, 60, 120, 360, 720, 1440].map(minutes => (
              <button
                key={minutes}
                onClick={() => setTempInterval(minutes)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  tempInterval === minutes
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {minutes >= 1440 ? '24h' : minutes >= 60 ? `${minutes/60}h` : `${minutes}m`}
              </button>
            ))}
          </div>

          {tempInterval !== config.interval_minutes && (
            <button
              onClick={() => updateConfig({ interval_minutes: tempInterval })}
              disabled={isSaving}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-bold transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Interval'}
            </button>
          )}

          <div className="text-xs text-gray-500 text-center">
            Valid range: 5 minutes to 24 hours (1440 minutes)
          </div>
        </div>
      </div>

      {/* Manual Sync */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-xl border border-gray-700">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Manual Sync
        </h3>
        
        <p className="text-gray-400 text-sm mb-4">
          Trigger an immediate sync independent of the automatic schedule
        </p>
        
        <button
          onClick={triggerManualSync}
          disabled={status?.is_syncing || isSaving}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
        >
          {status?.is_syncing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Syncing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Now
            </>
          )}
        </button>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
