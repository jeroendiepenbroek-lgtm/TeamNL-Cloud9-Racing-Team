import { useQuery } from '@tanstack/react-query'
import { Activity, Users, Calendar, TrendingUp, Server, Zap, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

interface HealthCheck {
  status: string
  service: string
  timestamp: string
  version: string
  port: number
}

interface Stats {
  totalRiders: number
  activeRiders: number
  eventsTracked: number
  lastSync: string | null
}

const API_BASE = ''; // Empty = same origin (production), of http://localhost:3000 voor dev

export default function DashboardModern() {
  // Health check query
  const { data: health, isLoading: healthLoading } = useQuery<HealthCheck>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/health`)
      if (!res.ok) throw new Error('Health check failed')
      return res.json()
    },
    refetchInterval: 30000, // Elke 30 sec
    retry: 3,
  })

  // Stats query
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/stats`)
      if (!res.ok) throw new Error('Stats fetch failed')
      return res.json()
    },
    refetchInterval: 60000, // Elke minuut
  })

  const endpoints = [
    { name: 'Clubs', path: '/api/clubs/11818', method: 'GET', color: 'blue' },
    { name: 'Riders', path: '/api/riders', method: 'GET', color: 'purple' },
    { name: 'Events', path: '/api/events', method: 'GET', color: 'green' },
    { name: 'Results', path: '/api/results', method: 'GET', color: 'orange' },
    { name: 'Rider History', path: '/api/rider-history', method: 'GET', color: 'pink' },
    { name: 'Sync Logs', path: '/api/sync-logs', method: 'GET', color: 'indigo' },
  ]

  const isSystemHealthy = health?.status === 'ok'
  const statusColor = isSystemHealthy ? 'green' : 'red'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Hero Header with Glassmorphism */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-90"></div>
        <div className="absolute inset-0 backdrop-blur-3xl"></div>
        
        <div className="relative px-6 py-12 sm:px-12">
          <div className="max-w-7xl mx-auto">
            {/* Logo & Title */}
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-lg rounded-2xl shadow-xl">
                <Activity className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-white tracking-tight">
                  TeamNL Cloud9 Racing
                </h1>
                <p className="text-blue-100 text-lg font-medium mt-1">
                  Performance Dashboard · Real-time Monitoring
                </p>
              </div>
            </div>

            {/* System Status Banner */}
            <div className="mt-8 flex items-center justify-between bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-center gap-4">
                {healthLoading ? (
                  <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
                ) : (
                  <div className={`w-4 h-4 bg-${statusColor}-400 rounded-full animate-pulse shadow-lg shadow-${statusColor}-500/50`}></div>
                )}
                <div>
                  <div className="text-white font-bold text-lg">
                    {healthLoading ? 'Checking...' : isSystemHealthy ? 'System Online' : 'System Offline'}
                  </div>
                  <div className="text-blue-100 text-sm">
                    {health ? `v${health.version} · Port ${health.port} · ${health.service}` : 'Connecting...'}
                  </div>
                </div>
              </div>
              {health && (
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Clock className="w-4 h-4" />
                  Last check: {new Date(health.timestamp).toLocaleTimeString('nl-NL')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 sm:px-12">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Riders Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-white/20 transition-colors">
                  <Users className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <TrendingUp className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div className="text-gray-600 text-sm font-medium mb-1 group-hover:text-white/80 transition-colors">
                Team Members
              </div>
              <div className="text-3xl font-black text-gray-900 group-hover:text-white transition-colors">
                {statsLoading ? (
                  <div className="h-9 w-16 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  stats?.totalRiders ?? '-'
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500 group-hover:text-white/60 transition-colors">
                {stats?.activeRiders ?? 0} actief
              </div>
            </div>
          </div>

          {/* Active Riders Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-50 rounded-xl group-hover:bg-white/20 transition-colors">
                  <Zap className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <div className="text-gray-600 text-sm font-medium mb-1 group-hover:text-white/80 transition-colors">
                Active Users
              </div>
              <div className="text-3xl font-black text-gray-900 group-hover:text-white transition-colors">
                {statsLoading ? (
                  <div className="h-9 w-16 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  stats?.activeRiders ?? '-'
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500 group-hover:text-white/60 transition-colors">
                Recent activity
              </div>
            </div>
          </div>

          {/* Events Tracked Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-white/20 transition-colors">
                  <Calendar className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
                </div>
                <Activity className="w-5 h-5 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <div className="text-gray-600 text-sm font-medium mb-1 group-hover:text-white/80 transition-colors">
                Events Tracked
              </div>
              <div className="text-3xl font-black text-gray-900 group-hover:text-white transition-colors">
                {statsLoading ? (
                  <div className="h-9 w-16 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  stats?.eventsTracked ?? '-'
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500 group-hover:text-white/60 transition-colors">
                Upcoming races
              </div>
            </div>
          </div>

          {/* Last Sync Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-white/20 transition-colors">
                  <Server className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors" />
                </div>
                <Clock className="w-5 h-5 text-orange-600 group-hover:text-white transition-colors" />
              </div>
              <div className="text-gray-600 text-sm font-medium mb-1 group-hover:text-white/80 transition-colors">
                Last Sync
              </div>
              <div className="text-3xl font-black text-gray-900 group-hover:text-white transition-colors">
                {statsLoading ? (
                  <div className="h-9 w-16 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  stats?.lastSync ?? '-'
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500 group-hover:text-white/60 transition-colors">
                Auto-sync active
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints Grid */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Server className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">API Endpoints</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {endpoints.map((endpoint) => {
              const colorMap: Record<string, { bg: string; text: string; border: string; hover: string }> = {
                blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', hover: 'hover:border-blue-500' },
                purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', hover: 'hover:border-purple-500' },
                green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', hover: 'hover:border-green-500' },
                orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', hover: 'hover:border-orange-500' },
                pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', hover: 'hover:border-pink-500' },
                indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', hover: 'hover:border-indigo-500' },
              }
              const colors = colorMap[endpoint.color] || colorMap.blue

              return (
                <div
                  key={endpoint.path}
                  className={`group relative border-2 ${colors.border} ${colors.hover} rounded-xl p-5 transition-all duration-300 hover:shadow-lg cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 text-lg">{endpoint.name}</h3>
                    <span className={`px-3 py-1 ${colors.bg} ${colors.text} text-xs font-bold rounded-lg`}>
                      {endpoint.method}
                    </span>
                  </div>
                  <code className="text-xs text-gray-600 break-all block bg-gray-50 p-2 rounded-lg font-mono">
                    {endpoint.path}
                  </code>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Available</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* System Health Details */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
          </div>
          
          {healthLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : health ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Status</span>
                </div>
                <div className="text-2xl font-bold text-green-700">
                  {health.status === 'ok' ? '🟢 Online' : '🔴 Offline'}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <Server className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Service</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">{health.service}</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Version</span>
                </div>
                <div className="text-2xl font-bold text-purple-700">{health.version}</div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-5 border border-orange-200">
                <div className="flex items-center gap-3 mb-2">
                  <Server className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-600">Port</span>
                </div>
                <div className="text-2xl font-bold text-orange-700">{health.port}</div>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-5 border border-pink-200 md:col-span-2">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-pink-600" />
                  <span className="text-sm font-medium text-gray-600">Last Check</span>
                </div>
                <div className="text-2xl font-bold text-pink-700">
                  {new Date(health.timestamp).toLocaleString('nl-NL', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div>
                <div className="text-red-900 font-bold text-lg">Verbinding Mislukt</div>
                <div className="text-red-700 text-sm">Kan geen verbinding maken met de backend service</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
