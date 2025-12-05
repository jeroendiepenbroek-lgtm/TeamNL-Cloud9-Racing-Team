/**
 * Sync Service Monitor
 * Real-time monitoring van auto-sync scheduler en manual triggers
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Clock, CheckCircle, XCircle, Play, Pause, Zap, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

interface SyncLog {
  id: number
  sync_type: string
  status: 'success' | 'failed' | 'running'
  riders_synced: number
  errors_count: number
  started_at: string
  completed_at: string | null
  duration_ms: number | null
}

interface SyncStatus {
  is_running: boolean
  last_sync: string | null
  next_sync: string | null
  auto_sync_enabled: boolean
  sync_interval_minutes: number
}

const API_BASE = ''

export default function SyncServiceMonitor() {
  const queryClient = useQueryClient()
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch sync status
  const { data: status, isLoading: statusLoading } = useQuery<SyncStatus>({
    queryKey: ['syncStatus'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/team/sync/status`)
      if (!res.ok) throw new Error('Failed to fetch sync status')
      return res.json()
    },
    refetchInterval: autoRefresh ? 5000 : false, // Refresh elke 5 seconden als enabled
  })

  // Fetch recent sync logs
  const { data: logs = [], isLoading: logsLoading } = useQuery<SyncLog[]>({
    queryKey: ['syncLogs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/team/sync/logs?limit=20`)
      if (!res.ok) throw new Error('Failed to fetch sync logs')
      return res.json()
    },
    refetchInterval: autoRefresh ? 10000 : false,
  })

  // Manual sync trigger
  const triggerSync = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/team/sync/trigger`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Sync failed')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Manual sync gestart!')
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] })
      queryClient.invalidateQueries({ queryKey: ['syncLogs'] })
    },
    onError: (error: Error) => {
      toast.error(`Sync fout: ${error.message}`)
    },
  })

  // Toggle auto-sync
  const toggleAutoSync = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch(`${API_BASE}/api/team/sync/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error('Failed to toggle auto-sync')
      return res.json()
    },
    onSuccess: (_, enabled) => {
      toast.success(enabled ? 'Auto-sync ingeschakeld' : 'Auto-sync uitgeschakeld')
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] })
    },
    onError: (error: Error) => {
      toast.error(`Fout: ${error.message}`)
    },
  })

  const formatDuration = (ms: number | null) => {
    if (!ms) return '--'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--'
    const date = new Date(dateStr)
    return date.toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTimeUntilNext = (nextSync: string | null) => {
    if (!nextSync) return '--'
    const ms = new Date(nextSync).getTime() - Date.now()
    if (ms < 0) return 'Nu'
    const minutes = Math.floor(ms / 60000)
    if (minutes < 60) return `${minutes}min`
    return `${Math.floor(minutes / 60)}u ${minutes % 60}min`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Sync Service Monitor</h1>
              <p className="text-sm text-gray-400">Real-time sync monitoring en controle</p>
            </div>
          </div>

          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
              autoRefresh
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Sync Status */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Sync Status</h3>
            </div>
            {statusLoading ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {status?.is_running ? (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-400 font-semibold">Running</span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-400">Idle</span>
                    </>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Last Sync</div>
                  <div className="text-sm text-white font-mono">{formatDate(status?.last_sync || null)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Next Sync</div>
                  <div className="text-sm text-white font-mono">
                    {status?.next_sync ? `In ${getTimeUntilNext(status.next_sync)}` : '--'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auto-Sync Control */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Auto-Sync</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Enabled</span>
                <button
                  onClick={() => toggleAutoSync.mutate(!status?.auto_sync_enabled)}
                  disabled={toggleAutoSync.isPending}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    status?.auto_sync_enabled
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                  }`}
                >
                  {status?.auto_sync_enabled ? (
                    <div className="flex items-center gap-2">
                      <Pause className="w-4 h-4" />
                      ON
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      OFF
                    </div>
                  )}
                </button>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Interval</div>
                <div className="text-2xl font-bold text-blue-400">
                  {status?.sync_interval_minutes || 60} min
                </div>
              </div>
            </div>
          </div>

          {/* Manual Trigger */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Manual Sync</h3>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Trigger een handmatige sync van alle team members
              </p>
              <button
                onClick={() => triggerSync.mutate()}
                disabled={triggerSync.isPending || status?.is_running}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {triggerSync.isPending ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Sync Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sync Logs */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Recent Sync Logs</h2>
            <p className="text-sm text-gray-400">Laatste 20 sync operaties</p>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
              <span className="ml-3 text-gray-400">Loading logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">Geen logs beschikbaar</h3>
              <p className="text-gray-500">Trigger een sync om te starten</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-300">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-300">Type</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-gray-300">Riders</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-gray-300">Errors</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-300">Started</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-300">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="px-6 py-4">
                        {log.status === 'success' ? (
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-semibold">Success</span>
                          </div>
                        ) : log.status === 'running' ? (
                          <div className="flex items-center gap-2 text-blue-400">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-semibold">Running</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-400">
                            <XCircle className="w-5 h-5" />
                            <span className="text-sm font-semibold">Failed</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                          {log.sync_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-white font-semibold">{log.riders_synced}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-semibold ${log.errors_count > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                          {log.errors_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400 font-mono">{formatDate(log.started_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-400 font-mono">{formatDuration(log.duration_ms)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
