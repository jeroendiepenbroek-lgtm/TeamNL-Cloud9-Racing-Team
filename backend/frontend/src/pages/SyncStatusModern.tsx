/**
 * Modern Sync Status Page - Mobile Responsive
 * Real-time metrics voor Rider & Event sync
 */

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Activity, Users, Calendar, Clock, TrendingUp, AlertCircle, CheckCircle2, Zap, Settings, Save, PlayCircle, PauseCircle } from 'lucide-react'

interface SyncMetrics {
  rider_sync: MetricItem | null
  results_sync: MetricItem | null
  near_event_sync: MetricItem | null
  far_event_sync: MetricItem | null
}

interface MetricItem {
  type: string
  timestamp: string
  status: 'success' | 'partial' | 'error' | 'running'
  records_processed: number
  details: string
  error_message: string | null
}

interface SyncLog {
  id: number
  endpoint: string
  status: string
  records_processed: number
  synced_at: string
  created_at: string
  error_message?: string | null
  message?: string | null
  details?: string
}

interface SyncConfig {
  nearEventThresholdMinutes: number
  nearEventSyncIntervalMinutes: number
  farEventSyncIntervalMinutes: number
  riderSyncEnabled: boolean
  riderSyncIntervalMinutes: number
  lookforwardHours: number
  checkIntervalMinutes: number
}

const API_BASE = ''

export default function SyncStatusModern() {
  const [triggeringSync, setTriggeringSync] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SyncConfig | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)

  // Fetch sync metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<SyncMetrics>({
    queryKey: ['sync-metrics'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sync-control/metrics`)
      if (!res.ok) throw new Error('Failed to fetch metrics')
      return res.json()
    },
    refetchInterval: 10000, // Every 10s
  })

  // Fetch sync logs
  const { data: logsResponse, isLoading: logsLoading, refetch: refetchLogs } = useQuery<{count: number, logs: SyncLog[]}>({
    queryKey: ['sync-logs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sync-logs?limit=20`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      return res.json()
    },
    refetchInterval: 5000, // Every 5s
  })
  
  const logs = logsResponse?.logs || []

  // Fetch sync config
  const { data: config, refetch: refetchConfig } = useQuery<SyncConfig>({
    queryKey: ['sync-config'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sync/config`)
      if (!res.ok) throw new Error('Failed to fetch config')
      return res.json()
    },
    refetchInterval: 30000, // Every 30s
  })

  const handleTriggerSync = async (type: 'riders' | 'results' | 'near-events' | 'far-events') => {
    setTriggeringSync(type)
    try {
      const endpoint = type === 'riders' ? '/api/sync-control/trigger/riders' : 
                      type === 'results' ? '/api/sync-control/trigger/results' :
                      type === 'near-events' ? '/api/sync-control/trigger/near-events' :
                      '/api/sync-control/trigger/far-events'
      
      const res = await fetch(endpoint, { method: 'POST' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Sync failed')
      }
      
      // Refresh data
      await Promise.all([refetchMetrics(), refetchLogs()])
    } catch (error) {
      console.error('Sync trigger failed:', error)
      alert(error instanceof Error ? error.message : 'Sync trigger failed')
    } finally {
      setTriggeringSync(null)
    }
  }

  const handleSaveConfig = async () => {
    if (!editingConfig) return
    
    setSavingConfig(true)
    try {
      const res = await fetch('/api/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConfig)
      })
      
      if (!res.ok) throw new Error('Failed to save config')
      
      await refetchConfig()
      setShowConfig(false)
      setEditingConfig(null)
    } catch (error) {
      console.error('Config save failed:', error)
    } finally {
      setSavingConfig(false)
    }
  }

  const handleToggleAutoSync = async (type: 'rider' | 'near' | 'far', enabled: boolean) => {
    if (!config) return
    
    const updatedConfig = { ...config }
    if (type === 'rider') {
      updatedConfig.riderSyncEnabled = enabled
    }
    // Note: Near/Far event sync is always enabled, only intervals change
    
    try {
      const res = await fetch('/api/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      })
      
      if (!res.ok) throw new Error('Failed to toggle auto-sync')
      await refetchConfig()
    } catch (error) {
      console.error('Auto-sync toggle failed:', error)
    }
  }

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    
    if (diffMin < 1) return 'Nu'
    if (diffMin < 60) return `${diffMin}min geleden`
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}u geleden`
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'from-green-500 to-emerald-600'
      case 'partial': return 'from-yellow-500 to-orange-600'
      case 'error': return 'from-red-500 to-red-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-5 h-5" />
      case 'partial': return <AlertCircle className="w-5 h-5" />
      case 'error': return <AlertCircle className="w-5 h-5" />
      default: return <Clock className="w-5 h-5" />
    }
  }

  // Helper: Parse details string for display values
  const parseDetails = (details: string | undefined) => {
    if (!details) return {}
    const parsed: Record<string, string> = {}
    
    // Match patterns like "Interval: 360min", "New: 5", "Far: 196"
    const patterns = details.match(/(\w+):\s*([^|]+)/g)
    patterns?.forEach(pattern => {
      const [key, value] = pattern.split(':').map(s => s.trim())
      parsed[key.toLowerCase()] = value
    })
    
    return parsed
  }

  // Helper: Render metric card content
  const renderMetricCard = (metric: MetricItem | null, type: 'rider' | 'near' | 'far') => {
    if (!metric) {
      return (
        <div className="text-center text-gray-500 text-xs sm:text-sm py-4">
          Geen sync data beschikbaar
        </div>
      )
    }

    const details = parseDetails(metric.details)
    
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3">
            <div className="text-[10px] sm:text-xs text-gray-600 mb-1">
              {type === 'rider' ? 'Records' : 'Signups'}
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-700">
              {metric.records_processed || 0}
            </div>
          </div>
          {(details.new || details.near || details.far) && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3">
              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">
                {details.new ? 'New' : details.near ? 'Near' : 'Far'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-green-700">
                {details.new || details.near || details.far}
              </div>
            </div>
          )}
        </div>

        {Object.keys(details).map(key => {
          if (['new', 'near', 'far'].includes(key)) return null
          return (
            <div key={key} className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-gray-600 capitalize">{key}</span>
              <span className="font-bold text-gray-900">{details[key]}</span>
            </div>
          )
        })}

        {metric.error_message && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
            {metric.error_message}
          </div>
        )}

        <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-gray-200">
          <span className="text-gray-500">Last sync</span>
          <span className="font-medium text-gray-700">{formatTimestamp(metric.timestamp)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden mb-4 sm:mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-95"></div>
        <div className="relative px-3 py-4 sm:px-6 sm:py-6 lg:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-lg rounded-xl sm:rounded-2xl flex-shrink-0">
                <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-4xl font-black text-white tracking-tight">
                  Sync Status
                </h1>
                <p className="text-blue-100 text-xs sm:text-sm lg:text-lg font-medium mt-0.5 sm:mt-1">
                  Real-time synchronisatie monitoring
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 space-y-4 sm:space-y-6">
        {/* Sync Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Rider Sync Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">Rider Sync</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">Club members</p>
                </div>
              </div>
              {metrics?.rider_sync && (
                <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${getStatusColor(metrics.rider_sync.status)}`}>
                  <div className="text-white">
                    {getStatusIcon(metrics.rider_sync.status)}
                  </div>
                </div>
              )}
            </div>

            {metricsLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </div>
            ) : (
              renderMetricCard(metrics?.rider_sync || null, 'rider')
            )}

            <button
              onClick={() => handleTriggerSync('riders')}
              disabled={triggeringSync === 'riders'}
              className="w-full mt-4 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {triggeringSync === 'riders' ? (
                <>
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Trigger Sync</span>
                </>
              )}
            </button>
          </div>

          {/* Results Sync Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-green-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">Results Sync</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">Race results</p>
                </div>
              </div>
              {metrics?.results_sync && (
                <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${getStatusColor(metrics.results_sync.status)}`}>
                  <div className="text-white">
                    {getStatusIcon(metrics.results_sync.status)}
                  </div>
                </div>
              )}
            </div>

            {metricsLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </div>
            ) : (
              renderMetricCard(metrics?.results_sync || null, 'rider')
            )}

            <button
              onClick={() => handleTriggerSync('results')}
              disabled={triggeringSync === 'results'}
              className="w-full mt-4 px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {triggeringSync === 'results' ? (
                <>
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Trigger Sync</span>
                </>
              )}
            </button>
          </div>

          {/* Near Event Sync Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-orange-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">Near Events</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">Starting soon</p>
                </div>
              </div>
              {metrics?.near_event_sync && (
                <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${getStatusColor(metrics.near_event_sync.status)}`}>
                  <div className="text-white">
                    {getStatusIcon(metrics.near_event_sync.status)}
                  </div>
                </div>
              )}
            </div>

            {metricsLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </div>
            ) : (
              renderMetricCard(metrics?.near_event_sync || null, 'near')
            )}

            <button
              onClick={() => handleTriggerSync('near-events')}
              disabled={triggeringSync === 'near-events'}
              className="w-full mt-4 px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {triggeringSync === 'near-events' ? (
                <>
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Trigger Sync</span>
                </>
              )}
            </button>
          </div>

          {/* Far Event Sync Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">Far Events</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">Future events</p>
                </div>
              </div>
              {metrics?.far_event_sync && (
                <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${getStatusColor(metrics.far_event_sync.status)}`}>
                  <div className="text-white">
                    {getStatusIcon(metrics.far_event_sync.status)}
                  </div>
                </div>
              )}
            </div>

            {metricsLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </div>
            ) : (
              renderMetricCard(metrics?.far_event_sync || null, 'far')
            )}

            <button
              onClick={() => handleTriggerSync('far-events')}
              disabled={triggeringSync === 'far-events'}
              className="w-full mt-4 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {triggeringSync === 'far-events' ? (
                <>
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Trigger Sync</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Auto-Sync Configuration */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg sm:rounded-xl">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Auto-Sync Configuratie</h2>
            </div>
            <button
              onClick={() => {
                setShowConfig(!showConfig)
                if (!showConfig && config) setEditingConfig(config)
              }}
              className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              {showConfig ? 'Verberg' : 'Bewerk'}
            </button>
          </div>

          {config && !showConfig && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Rider Sync Config */}
              <div className="border-2 border-blue-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900">Rider Sync</h3>
                  </div>
                  <button
                    onClick={() => handleToggleAutoSync('rider', !config.riderSyncEnabled)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      config.riderSyncEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {config.riderSyncEnabled ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-bold ${config.riderSyncEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {config.riderSyncEnabled ? 'Actief' : 'Gepauzeerd'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interval</span>
                    <span className="font-bold text-gray-900">{config.riderSyncIntervalMinutes}min</span>
                  </div>
                </div>
              </div>

              {/* Near Event Sync Config */}
              <div className="border-2 border-orange-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    <h3 className="font-bold text-gray-900">Near Events</h3>
                  </div>
                  <div className="p-1.5 rounded-lg bg-green-100">
                    <PlayCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="font-bold text-green-600">Actief</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interval</span>
                    <span className="font-bold text-gray-900">{config.nearEventSyncIntervalMinutes}min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Threshold</span>
                    <span className="font-bold text-gray-900">{config.nearEventThresholdMinutes}min</span>
                  </div>
                </div>
              </div>

              {/* Far Event Sync Config */}
              <div className="border-2 border-purple-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-gray-900">Far Events</h3>
                  </div>
                  <div className="p-1.5 rounded-lg bg-green-100">
                    <PlayCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="font-bold text-green-600">Actief</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interval</span>
                    <span className="font-bold text-gray-900">{config.farEventSyncIntervalMinutes}min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lookforward</span>
                    <span className="font-bold text-gray-900">{config.lookforwardHours}h</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showConfig && editingConfig && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rider Sync Settings */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Rider Sync
                  </h3>
                  <label className="block">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Auto-sync</span>
                      <input
                        type="checkbox"
                        checked={editingConfig.riderSyncEnabled}
                        onChange={(e) => setEditingConfig({ ...editingConfig, riderSyncEnabled: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 mb-2 block">Sync Interval (minuten)</span>
                    <input
                      type="number"
                      value={editingConfig.riderSyncIntervalMinutes}
                      onChange={(e) => setEditingConfig({ ...editingConfig, riderSyncIntervalMinutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                    />
                  </label>
                </div>

                {/* Event Sync Settings */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    Event Sync
                  </h3>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 mb-2 block">Near Event Interval (min)</span>
                    <input
                      type="number"
                      value={editingConfig.nearEventSyncIntervalMinutes}
                      onChange={(e) => setEditingConfig({ ...editingConfig, nearEventSyncIntervalMinutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      min="1"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 mb-2 block">Near Event Threshold (min)</span>
                    <input
                      type="number"
                      value={editingConfig.nearEventThresholdMinutes}
                      onChange={(e) => setEditingConfig({ ...editingConfig, nearEventThresholdMinutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      min="1"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 mb-2 block">Far Event Interval (min)</span>
                    <input
                      type="number"
                      value={editingConfig.farEventSyncIntervalMinutes}
                      onChange={(e) => setEditingConfig({ ...editingConfig, farEventSyncIntervalMinutes: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="1"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 mb-2 block">Lookforward Hours</span>
                    <input
                      type="number"
                      value={editingConfig.lookforwardHours}
                      onChange={(e) => setEditingConfig({ ...editingConfig, lookforwardHours: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="1"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {savingConfig ? 'Opslaan...' : 'Configuratie Opslaan'}
                </button>
                <button
                  onClick={() => {
                    setShowConfig(false)
                    setEditingConfig(null)
                  }}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sync History */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Sync Geschiedenis</h2>
          </div>

          {logsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold">Status</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold">Type</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold hidden sm:table-cell">Records</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold">Timestamp</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold hidden lg:table-cell">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log: SyncLog) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r ${getStatusColor(log.status)}`}>
                          <span className="text-white">{log.status === 'success' ? '✓' : log.status === 'error' ? '✗' : '⚠'}</span>
                          <span className="text-white capitalize hidden sm:inline">{log.status}</span>
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-900">
                        <div className="truncate max-w-[150px] sm:max-w-none">{log.endpoint}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-bold text-gray-700 hidden sm:table-cell">
                        {log.records_processed}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 whitespace-nowrap">
                        {formatTimestamp(log.synced_at)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-500 text-[10px] sm:text-xs hidden lg:table-cell">
                        {log.error_message ? (
                          <span className="text-red-600">{log.error_message}</span>
                        ) : log.details ? (
                          <span className="truncate block max-w-xs">{log.details}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm sm:text-base">Geen sync geschiedenis beschikbaar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
