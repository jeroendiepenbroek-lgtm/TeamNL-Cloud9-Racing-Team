import { useQuery } from '@tanstack/react-query'

interface HealthCheck {
  status: string
  service: string
  timestamp: string
  version: string
  port: number
}

const API_BASE = ''; // Empty = same origin (production), of http://localhost:3000 voor dev

interface DashboardProps {
  readOnly?: boolean
}

export default function Dashboard({ readOnly = false }: DashboardProps) {
  const { data: health, isLoading } = useQuery<HealthCheck>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/health`)
      if (!res.ok) throw new Error('Health check failed')
      return res.json()
    },
    refetchInterval: 30000, // Elke 30 sec
    retry: 3,
  })

  const endpoints = [
    { name: 'Clubs', path: '/api/clubs/11818', method: 'GET' },
    { name: 'Riders', path: '/api/riders', method: 'GET' },
    { name: 'Events', path: '/api/events', method: 'GET' },
    { name: 'Results', path: '/api/results', method: 'GET' },
    { name: 'Rider History', path: '/api/rider-history', method: 'GET' },
    { name: 'Sync Logs', path: '/api/sync-logs', method: 'GET' },
  ]

  return (
    <div className="space-y-6">
      {/* Archive Banner */}
      {readOnly && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
          <div className="flex items-center gap-2">
            <span className="text-amber-700 font-bold">📦 Archief Modus</span>
            <span className="text-amber-600 text-sm">Dit is een alleen-lezen versie voor referentie</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">TeamNL Cloud9 Racing Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Real-time monitoring van ZwiftRacing API integratie
        </p>
      </div>

      {/* Health Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
        {isLoading ? (
          <div className="animate-pulse">Loading...</div>
        ) : health ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                health.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {health.status === 'ok' ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Service:</span>
              <span className="text-gray-900 font-medium">{health.service}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Version:</span>
              <span className="text-gray-900 font-medium">{health.version}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Port:</span>
              <span className="text-gray-900 font-medium">{health.port}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Check:</span>
              <span className="text-gray-900 font-medium">
                {new Date(health.timestamp).toLocaleTimeString('nl-NL')}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-red-600">❌ Kan verbinding niet maken</div>
        )}
      </div>

      {/* API Endpoints */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API Endpoints</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.path}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{endpoint.name}</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  {endpoint.method}
                </span>
              </div>
              <code className="text-xs text-gray-600 break-all">{endpoint.path}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600">Total Riders</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">-</div>
          <div className="mt-2 text-xs text-gray-500">Sync data om te vullen</div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600">Events Tracked</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">-</div>
          <div className="mt-2 text-xs text-gray-500">Sync data om te vullen</div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-sm font-medium text-gray-600">Last Sync</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">-</div>
          <div className="mt-2 text-xs text-gray-500">Geen sync logs nog</div>
        </div>
      </div>
    </div>
  )
}
