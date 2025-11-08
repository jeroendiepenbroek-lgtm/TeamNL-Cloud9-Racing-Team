import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

interface HealthCheck {
  status: string
  service: string
  timestamp: string
  version: string
  port: number
}

interface TeamRider {
  rider_id: number
  name: string
  zp_category: string | null
  zp_ftp: number | null
  race_current_rating: number | null
  race_wins: number
  watts_per_kg: number | null
}

const API_BASE = ''; // Empty = same origin (production)

export default function Dashboard() {
  const { data: health } = useQuery<HealthCheck>({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/health`)
      if (!res.ok) throw new Error('Health check failed')
      return res.json()
    },
    refetchInterval: 30000,
    retry: 3,
  })

  const { data: riders, isLoading: ridersLoading } = useQuery<TeamRider[]>({
    queryKey: ['teamRiders'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders/team`)
      if (!res.ok) throw new Error('Failed to fetch riders')
      return res.json()
    },
    refetchInterval: 60000,
  })

  const teamStats = riders ? {
    totalRiders: riders.length,
    avgRating: Math.round(riders.reduce((sum, r) => sum + (r.race_current_rating || 0), 0) / riders.length) || 0,
    avgFTP: Math.round(riders.filter(r => r.zp_ftp).reduce((sum, r) => sum + (r.zp_ftp || 0), 0) / riders.filter(r => r.zp_ftp).length) || 0,
    totalWins: riders.reduce((sum, r) => sum + r.race_wins, 0),
    categoryA: riders.filter(r => r.zp_category === 'A').length,
    categoryB: riders.filter(r => r.zp_category === 'B').length,
    categoryC: riders.filter(r => r.zp_category === 'C').length,
  } : null

  const topRiders = riders 
    ? [...riders]
        .sort((a, b) => (b.race_current_rating || 0) - (a.race_current_rating || 0))
        .slice(0, 5)
    : []

  return (
    <div className="space-y-6">
      {/* Hero Header met CloudRacer branding */}
      <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-700 shadow-xl rounded-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">CLOUDRACER COMMAND CENTER</h1>
            <p className="mt-3 text-blue-100 text-lg">
              🚴 TeamNL Cloud9 Racing | Real-time Performance Analytics
            </p>
          </div>
          <div className="text-6xl">⚡</div>
        </div>
        {health && (
          <div className="mt-4 flex items-center space-x-4 text-sm">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span>System Online</span>
            </span>
            <span className="opacity-75">|</span>
            <span>v{health.version}</span>
            <span className="opacity-75">|</span>
            <span>{new Date(health.timestamp).toLocaleTimeString('nl-NL')}</span>
          </div>
        )}
      </div>

      {/* Team Stats Cards - Modern glassmorphism design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow border-t-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">Team Riders</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {ridersLoading ? '...' : teamStats?.totalRiders || 0}
              </div>
            </div>
            <div className="text-4xl">🚴</div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            A: {teamStats?.categoryA || 0} | B: {teamStats?.categoryB || 0} | C: {teamStats?.categoryC || 0}
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow border-t-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">Avg Rating</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {ridersLoading ? '...' : teamStats?.avgRating || '-'}
              </div>
            </div>
            <div className="text-4xl">📊</div>
          </div>
          <div className="mt-3 text-xs text-gray-500">ZwiftPower ranking</div>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow border-t-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">Avg FTP</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {ridersLoading ? '...' : teamStats?.avgFTP || '-'}
                <span className="text-lg text-gray-500">W</span>
              </div>
            </div>
            <div className="text-4xl">⚡</div>
          </div>
          <div className="mt-3 text-xs text-gray-500">Team average power</div>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-shadow border-t-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-600">Total Wins</div>
              <div className="mt-2 text-3xl font-bold text-yellow-600">
                {ridersLoading ? '...' : teamStats?.totalWins || 0}
              </div>
            </div>
            <div className="text-4xl">🏆</div>
          </div>
          <div className="mt-3 text-xs text-gray-500">Combined victories</div>
        </div>
      </div>

      {/* Top Riders Leaderboard */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <span className="mr-2">🏅</span>
            Top 5 Riders by Rating
          </h2>
        </div>
        <div className="p-6">
          {ridersLoading ? (
            <div className="text-center py-8 text-gray-500">Loading riders...</div>
          ) : topRiders.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-5xl mb-4">🚴</div>
              <p className="text-gray-600">No riders yet</p>
              <Link 
                to="/riders" 
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Rider
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {topRiders.map((rider, index) => (
                <div 
                  key={rider.rider_id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`text-2xl font-bold ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-orange-600' :
                      'text-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{rider.name}</div>
                      <div className="text-sm text-gray-500">
                        Cat: {rider.zp_category || '?'} | 
                        FTP: {rider.zp_ftp || '-'}W |
                        W/kg: {rider.watts_per_kg?.toFixed(2) || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {rider.race_current_rating ? Math.round(rider.race_current_rating) : '-'}
                    </div>
                    <div className="text-xs text-gray-500">Rating</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          to="/riders"
          className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-all hover:scale-105 cursor-pointer group"
        >
          <div className="text-center">
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">👥</div>
            <h3 className="text-lg font-semibold text-gray-900">Manage Riders</h3>
            <p className="mt-2 text-sm text-gray-600">Add, sync, and view all team members</p>
          </div>
        </Link>

        <Link 
          to="/sync"
          className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-all hover:scale-105 cursor-pointer group"
        >
          <div className="text-center">
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">🔄</div>
            <h3 className="text-lg font-semibold text-gray-900">Sync Data</h3>
            <p className="mt-2 text-sm text-gray-600">Update rider stats from ZwiftRacing API</p>
          </div>
        </Link>

        <Link 
          to="/events"
          className="bg-white shadow-lg rounded-xl p-6 hover:shadow-xl transition-all hover:scale-105 cursor-pointer group"
        >
          <div className="text-center">
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">🏁</div>
            <h3 className="text-lg font-semibold text-gray-900">Events & Results</h3>
            <p className="mt-2 text-sm text-gray-600">Track race history and performance</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
