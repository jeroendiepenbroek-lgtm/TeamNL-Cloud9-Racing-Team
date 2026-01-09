import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8080'

interface RaceEvent {
  event_id: number
  event_name: string
  event_date: string
  world: string
  route: string
  distance_km: number
  elevation_m: number
}

interface RaceResultDetail {
  event_id: number
  rider_id: number
  rider_name: string
  position: number
  category: string
  category_position: number
  avg_power: number
  avg_wkg: number
  time_seconds: number
  velo_before: number | null
  velo_after: number | null
  velo_change: number | null
  team_name: string | null
}

export default function RaceDetails() {
  const navigate = useNavigate()
  const { eventId } = useParams<{ eventId: string }>()
  
  const [event, setEvent] = useState<RaceEvent | null>(null)
  const [results, setResults] = useState<RaceResultDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    if (eventId) {
      loadRaceDetails()
    }
  }, [eventId])

  const loadRaceDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`${API_BASE}/api/results/event/${eventId}`)
      if (!res.ok) throw new Error('Failed to load race details')

      const data = await res.json()
      setEvent(data.event)
      setResults(data.results || [])
    } catch (err: any) {
      console.error('Error loading race details:', err)
      setError(err.message)
      toast.error('Failed to load race details')
    } finally {
      setLoading(false)
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
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPositionBadge = (position: number) => {
    if (position === 1) return 'bg-yellow-500 text-white'
    if (position === 2) return 'bg-gray-300 text-gray-800'
    if (position === 3) return 'bg-orange-600 text-white'
    return 'bg-gray-600 text-white'
  }

  const getVeloChangeColor = (change: number | null) => {
    if (!change) return 'text-gray-400'
    if (change > 0) return 'text-green-500'
    if (change < 0) return 'text-red-500'
    return 'text-gray-400'
  }

  const categories = ['all', ...new Set(results.map(r => r.category))].sort()
  const filteredResults = selectedCategory === 'all' 
    ? results 
    : results.filter(r => r.category === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading race details...</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ Error loading race</div>
          <div className="text-gray-400">{error || 'Event not found'}</div>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go Back
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
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            {event.event_name}
          </h1>
          
          <div className="flex flex-wrap gap-6 text-gray-300">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(event.event_date)}
            </div>
            
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {event.world} - {event.route}
            </div>
            
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {event.distance_km?.toFixed(1)} km • {event.elevation_m}m elevation
            </div>
            
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {results.length} participants
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
              {cat !== 'all' && (
                <span className="ml-2 text-xs opacity-75">
                  ({results.filter(r => r.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr className="text-left text-gray-300 text-sm">
                <th className="px-4 py-3 text-center">Pos</th>
                <th className="px-4 py-3">Rider</th>
                <th className="px-4 py-3 text-center">Cat</th>
                <th className="px-4 py-3 text-right">Power</th>
                <th className="px-4 py-3 text-right">W/kg</th>
                <th className="px-4 py-3 text-right">Time</th>
                <th className="px-4 py-3 text-center">vELO</th>
                <th className="px-4 py-3">Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredResults.map((result) => (
                <tr 
                  key={`${result.event_id}-${result.rider_id}`}
                  className="text-white hover:bg-gray-700/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/results?rider=${result.rider_id}`)}
                >
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getPositionBadge(result.position)}`}>
                      {result.position}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{result.rider_name}</div>
                    <div className="text-xs text-gray-500">ID: {result.rider_id}</div>
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
                    {result.velo_after ? (
                      <>
                        <div className="text-sm">{result.velo_after}</div>
                        <div className={`text-xs font-medium ${getVeloChangeColor(result.velo_change)}`}>
                          {result.velo_change && result.velo_change > 0 ? '+' : ''}{result.velo_change || ''}
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {result.team_name || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
