import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8080'

// Default rider ID (150437 - JRøne)
const DEFAULT_RIDER_ID = 150437

interface RaceResult {
  event_id: number
  event_name: string
  event_date: string
  position: number
  category: string
  category_position: number
  avg_power: number
  avg_wkg: number
  time_seconds: number
  velo_before: number
  velo_after: number
  velo_change: number
  total_participants: number
}

interface RiderStats {
  total_races: number
  total_wins: number
  total_podiums: number
  podium_percentage: string
  avg_position: string
  velo_start: number | null
  velo_end: number | null
  velo_change_total: number
}

export default function RaceResults() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const riderIdParam = searchParams.get('rider') || DEFAULT_RIDER_ID.toString()
  const riderId = parseInt(riderIdParam)

  const [results, setResults] = useState<RaceResult[]>([])
  const [stats, setStats] = useState<RiderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRaceResults()
    loadRiderStats()
  }, [riderId])

  const loadRaceResults = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${API_BASE}/api/results/rider/${riderId}`)
      if (!res.ok) throw new Error('Failed to load results')

      const data = await res.json()
      setResults(data.results || [])
    } catch (err: any) {
      console.error('Error loading results:', err)
      setError(err.message)
      toast.error('Failed to load race results')
    } finally {
      setLoading(false)
    }
  }

  const loadRiderStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/results/rider/${riderId}/stats`)
      if (!res.ok) throw new Error('Failed to load stats')

      const data = await res.json()
      setStats(data.stats)
    } catch (err: any) {
      console.error('Error loading stats:', err)
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds) return '-'
    const min = Math.floor(seconds / 60)
    const sec = seconds % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getVeloChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500'
    if (change < 0) return 'text-red-500'
    return 'text-gray-400'
  }

  const getPositionBadge = (position: number) => {
    if (position === 1) return 'bg-yellow-500 text-white'
    if (position === 2) return 'bg-gray-300 text-gray-800'
    if (position === 3) return 'bg-orange-600 text-white'
    return 'bg-gray-600 text-white'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading race results...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ Error loading results</div>
          <div className="text-gray-400">{error}</div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-gray-400 hover:text-white mb-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-white">
                Race Results
              </h1>
              <p className="text-gray-400 mt-1">
                Rider {riderId} • Last 90 days
              </p>
            </div>

            {/* Stats Summary */}
            {stats && (
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{stats.total_races}</div>
                  <div className="text-sm text-gray-400">Races</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500">{stats.total_wins}</div>
                  <div className="text-sm text-gray-400">Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-500">{stats.total_podiums}</div>
                  <div className="text-sm text-gray-400">Podiums</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getVeloChangeColor(stats.velo_change_total)}`}>
                    {stats.velo_change_total > 0 ? '+' : ''}{stats.velo_change_total}
                  </div>
                  <div className="text-sm text-gray-400">vELO Δ</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {results.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <div className="text-6xl mb-4">🏁</div>
            <div className="text-xl">No race results found</div>
            <div className="text-sm mt-2">This rider hasn't raced in the last 90 days</div>
          </div>
        ) : (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr className="text-left text-gray-300 text-sm">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3 text-center">Pos</th>
                  <th className="px-4 py-3 text-center">Cat</th>
                  <th className="px-4 py-3 text-right">Power</th>
                  <th className="px-4 py-3 text-right">W/kg</th>
                  <th className="px-4 py-3 text-right">Time</th>
                  <th className="px-4 py-3 text-center">vELO</th>
                  <th className="px-4 py-3 text-right">Field</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {results.map((result) => (
                  <tr 
                    key={result.event_id} 
                    className="text-white hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {formatDate(result.event_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{result.event_name}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getPositionBadge(result.position)}`}>
                        {result.position}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium">{result.category}</span>
                      <div className="text-xs text-gray-500">P{result.category_position}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {result.avg_power}W
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {result.avg_wkg?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatTime(result.time_seconds)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-sm">
                        {result.velo_after}
                      </div>
                      <div className={`text-xs font-medium ${getVeloChangeColor(result.velo_change)}`}>
                        {result.velo_change > 0 ? '+' : ''}{result.velo_change}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">
                      {result.total_participants}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/race/${result.event_id}`)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
