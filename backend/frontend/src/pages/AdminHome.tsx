import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface AdminTileProps {
  icon: string
  title: string
  description: string
  to: string
  gradient: string
}

function AdminTile({ icon, title, description, to, gradient }: AdminTileProps) {
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden bg-gradient-to-br ${gradient} rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105`}
    >
      <div className="p-8">
        {/* Icon */}
        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        
        {/* Title */}
        <h3 className="text-2xl font-bold text-white mb-2">
          {title}
        </h3>
        
        {/* Description */}
        <p className="text-white/90 text-sm leading-relaxed">
          {description}
        </p>
        
        {/* Arrow indicator */}
        <div className="absolute bottom-4 right-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all duration-300">
          →
        </div>
      </div>
      
      {/* Decorative background */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
    </Link>
  )
}

interface AdminStats {
  teamMembers: number
  lastSync: string
}

export default function AdminHome() {
  const { user, accessStatus } = useAuth()
  const [stats, setStats] = React.useState<AdminStats | null>(null)
  const [loading, setLoading] = React.useState(true)

  // Fetch admin stats
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats')
        if (!response.ok) throw new Error('Failed to fetch stats')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching admin stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    
    // Refresh stats elke 30 seconden
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">Je moet ingelogd zijn om deze pagina te zien</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            Admin Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Welkom, <span className="font-semibold text-blue-600">{user.email}</span>
          </p>
          {accessStatus?.roles && (
            <div className="mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {accessStatus.roles.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Admin: Team Management Only */}
        <div className="max-w-2xl mx-auto mb-12">
          <AdminTile
            icon="🚴"
            title="Team Management"
            description="Voeg team members toe via Zwift ID - Data wordt automatisch gesynchroniseerd van ZwiftRacing API"
            to="/riders"
            gradient="from-blue-500 to-blue-700"
          />
        </div>

        {/* Team Stats */}
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Team Overview</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              <p className="text-gray-600 mt-2">Loading stats...</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">
                  {stats?.teamMembers ?? '--'}
                </div>
                <div className="text-lg text-gray-600">Actieve Team Members</div>
                {stats?.lastSync && (
                  <div className="mt-4 text-sm text-gray-400">
                    Last sync: {stats.lastSync}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Back to Racing Matrix */}
        <div className="mt-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow hover:shadow-md transition text-gray-700 font-medium"
          >
            ← Terug naar Racing Matrix
          </Link>
        </div>
      </div>
    </div>
  )
}
