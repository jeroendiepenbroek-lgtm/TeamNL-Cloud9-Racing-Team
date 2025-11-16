/**
 * Modern Sync Status Page - Mobile Responsive
 * Real-time metrics voor Rider & Event sync
 */

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Activity, Users, Calendar, Clock, TrendingUp, AlertCircle, CheckCircle2, Zap } from 'lucide-react'

interface SyncMetrics {
  rider_sync: RiderSyncMetrics | null
  near_event_sync: EventSyncMetrics | null
  far_event_sync: EventSyncMetrics | null
}

interface RiderSyncMetrics {
  type: 'RIDER_SYNC'
  timestamp: string
  interval_minutes: number
  riders_processed: number
  riders_updated: number
  riders_new: number
  duration_ms: number
  status: 'success' | 'partial' | 'error'
  error_count: number
}

interface EventSyncMetrics {
  type: 'NEAR_EVENT_SYNC' | 'FAR_EVENT_SYNC'
  timestamp: string
  interval_minutes: number
  threshold_minutes: number
  events_scanned: number
  events_near: number
  events_far: number
  signups_synced: number
  duration_ms: number
  status: 'success' | 'partial' | 'error'
  error_count: number
}

interface SyncLog {
  id: number
  endpoint: string
  status: string
  records_processed: number
  synced_at: string
  error_message?: string
  details?: string
}

const API_BASE = ''

export default function SyncStatusModern() {
  const [triggeringSync, setTriggeringSync] = useState<string | null>(null)

  // Fetch sync metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<SyncMetrics>({
    queryKey: ['sync-metrics'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sync/metrics`)
      if (!res.ok) throw new Error('Failed to fetch metrics')
      return res.json()
    },
    refetchInterval: 10000, // Every 10s
  })

  // Fetch sync logs
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQuery<SyncLog[]>({
    queryKey: ['sync-logs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sync-logs?limit=20`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      return res.json()
    },
    refetchInterval: 5000, // Every 5s
  })

  const handleTriggerSync = async (type: 'riders' | 'near-events' | 'far-events') => {
    setTriggeringSync(type)
    try {
      const endpoint = type === 'riders' ? '/api/sync/riders' : 
                      type === 'near-events' ? '/api/sync/events/near' :
                      '/api/sync/events/far'
      
      const res = await fetch(endpoint, { method: 'POST' })
      if (!res.ok) throw new Error('Sync failed')
      
      // Refresh data
      await Promise.all([refetchMetrics(), refetchLogs()])
    } catch (error) {
      console.error('Sync trigger failed:', error)
    } finally {
      setTriggeringSync(null)
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
            ) : metrics?.rider_sync ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3">
                    <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Total Riders</div>
                    <div className="text-xl sm:text-2xl font-black text-blue-700">{metrics.rider_sync.riders_processed}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3">
                    <div className="text-[10px] sm:text-xs text-gray-600 mb-1">New</div>
                    <div className="text-xl sm:text-2xl font-black text-green-700">{metrics.rider_sync.riders_new}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Updated</span>
                  <span className="font-bold text-gray-900">{metrics.rider_sync.riders_updated}</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Interval</span>
                  <span className="font-bold text-gray-900">{metrics.rider_sync.interval_minutes}min</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-bold text-gray-900">{formatDuration(metrics.rider_sync.duration_ms)}</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Last sync</span>
                  <span className="font-medium text-gray-700">{formatTimestamp(metrics.rider_sync.timestamp)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 text-xs sm:text-sm py-4">
                Geen sync data beschikbaar
              </div>
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
            ) : metrics?.near_event_sync ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-3">
                    <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Near Events</div>
                    <div className="text-xl sm:text-2xl font-black text-orange-700">{metrics.near_event_sync.events_near}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-3">
                    <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Signups</div>
                    <div className="text-xl sm:text-2xl font-black text-purple-700">{metrics.near_event_sync.signups_synced}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Threshold</span>
                  <span className="font-bold text-gray-900">{metrics.near_event_sync.threshold_minutes}min</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Interval</span>
                  <span className="font-bold text-gray-900">{metrics.near_event_sync.interval_minutes}min</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-bold text-gray-900">{formatDuration(metrics.near_event_sync.duration_ms)}</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Last sync</span>
                  <span className="font-medium text-gray-700">{formatTimestamp(metrics.near_event_sync.timestamp)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 text-xs sm:text-sm py-4">
                Geen sync data beschikbaar
              </div>
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
            ) : metrics?.far_event_sync ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-3">
                    <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Far Events</div>
                    <div className="text-xl sm:text-2xl font-black text-purple-700">{metrics.far_event_sync.events_far}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3">
                    <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Signups</div>
                    <div className="text-xl sm:text-2xl font-black text-blue-700">{metrics.far_event_sync.signups_synced}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Threshold</span>
                  <span className="font-bold text-gray-900">{metrics.far_event_sync.threshold_minutes}min</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Interval</span>
                  <span className="font-bold text-gray-900">{metrics.far_event_sync.interval_minutes}min</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-bold text-gray-900">{formatDuration(metrics.far_event_sync.duration_ms)}</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-500">Last sync</span>
                  <span className="font-medium text-gray-700">{formatTimestamp(metrics.far_event_sync.timestamp)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 text-xs sm:text-sm py-4">
                Geen sync data beschikbaar
              </div>
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
