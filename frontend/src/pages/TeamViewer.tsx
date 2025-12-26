import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import TeamLineupModal from '../components/TeamLineupModal.tsx'

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8080'

interface Team {
  team_id: number
  team_name: string
  competition_type: 'velo' | 'category'
  competition_name: string
  velo_min_rank?: number
  velo_max_rank?: number
  velo_max_spread?: number
  allowed_categories?: string[]
  allow_category_up?: boolean
  min_riders: number
  max_riders: number
  current_riders: number
  valid_riders: number
  invalid_riders: number
  current_velo_spread?: number
  team_status: 'incomplete' | 'ready' | 'warning' | 'overfilled'
}

interface TeamViewerProps {
  hideHeader?: boolean
}

export default function TeamViewer({ hideHeader = false }: TeamViewerProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [favoriteTeams, setFavoriteTeams] = useState<Set<number>>(() => {
    const stored = localStorage.getItem('favoriteTeams')
    return stored ? new Set(JSON.parse(stored)) : new Set()
  })
  const [sortBy, setSortBy] = useState<'name' | 'riders' | 'status'>('name')

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('favoriteTeams', JSON.stringify(Array.from(favoriteTeams)))
  }, [favoriteTeams])
  
  // Fetch all teams
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/teams`)
      if (!res.ok) throw new Error('Failed to fetch teams')
      const data = await res.json()
      return data.teams || []
    }
  })
  
  const rawTeams: Team[] = teamsData || []
  
  // Sort teams
  const teams = [...rawTeams].sort((a, b) => {
    const aFav = favoriteTeams.has(a.team_id)
    const bFav = favoriteTeams.has(b.team_id)
    if (aFav && !bFav) return -1
    if (!aFav && bFav) return 1
    
    if (sortBy === 'name') return a.team_name.localeCompare(b.team_name)
    if (sortBy === 'riders') return b.current_riders - a.current_riders
    if (sortBy === 'status') {
      const statusOrder = { ready: 0, warning: 1, incomplete: 2, overfilled: 3 }
      return statusOrder[a.team_status] - statusOrder[b.team_status]
    }
    return 0
  })
  
  const toggleFavorite = (teamId: number) => {
    setFavoriteTeams(prev => {
      const newSet = new Set(prev)
      if (newSet.has(teamId)) {
        newSet.delete(teamId)
      } else {
        newSet.add(teamId)
      }
      return newSet
    })
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      {/* Header */}
      {!hideHeader && (
        <div className="relative overflow-hidden mb-4 sm:mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-blue-600 to-orange-500 opacity-95"></div>
          <div className="relative px-3 py-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 backdrop-blur-lg rounded-xl shadow-xl flex-shrink-0">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                      👥 Team Lineup
                    </h1>
                    <p className="text-orange-100 text-sm font-semibold mt-0.5">
                      TeamNL Cloud9 Racing
                    </p>
                  </div>
                </div>
                
                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-lg rounded-lg px-3 py-2 border border-white/20">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'riders' | 'status')}
                    className="bg-transparent text-white text-sm font-semibold cursor-pointer focus:outline-none"
                  >
                    <option value="name" className="bg-gray-900">Naam</option>
                    <option value="riders" className="bg-gray-900">Riders</option>
                    <option value="status" className="bg-gray-900">Status</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-8">
        {teamsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
              <p className="text-white text-lg">Teams laden...</p>
            </div>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-500/50 mb-4">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-xl font-bold text-white mb-2">Geen teams gevonden</p>
            <p className="text-slate-400">Gebruik Team Builder om teams aan te maken</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teams.map(team => (
              <TeamCard
                key={team.team_id}
                team={team}
                isFavorite={favoriteTeams.has(team.team_id)}
                onToggleFavorite={() => toggleFavorite(team.team_id)}
                onClick={() => setSelectedTeamId(team.team_id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Team Detail Modal */}
      {selectedTeamId && (
        <TeamLineupModal
          teamId={selectedTeamId}
          onClose={() => setSelectedTeamId(null)}
        />
      )}
    </div>
  )
}

// Team Card Component
function TeamCard({ team, isFavorite, onToggleFavorite, onClick }: {
  team: Team
  isFavorite: boolean
  onToggleFavorite: () => void
  onClick: () => void
}) {
  const STATUS_COLORS = {
    incomplete: 'border-yellow-500/50 bg-yellow-500/10',
    ready: 'border-green-500/50 bg-green-500/10',
    warning: 'border-orange-500/50 bg-orange-500/10',
    overfilled: 'border-red-500/50 bg-red-500/10',
  }

  const STATUS_ICONS = {
    incomplete: '⏳',
    ready: '✅',
    warning: '⚠️',
    overfilled: '🚫',
  }

  return (
    <div
      className={`
        relative bg-slate-800/50 backdrop-blur-sm rounded-xl border-2 
        transition-all duration-300 overflow-hidden cursor-pointer
        hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20
        ${STATUS_COLORS[team.team_status]}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-4 bg-slate-900/50">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-bold text-white flex-1 line-clamp-2">
            {team.team_name}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-2xl">{STATUS_ICONS[team.team_status]}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
              className="text-2xl hover:scale-125 transition-transform"
              title={isFavorite ? 'Verwijder van favorieten' : 'Voeg toe aan favorieten'}
            >
              {isFavorite ? '⭐' : '☆'}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-3">{team.competition_name}</p>
        
        {/* Stats */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {team.competition_type === 'velo' ? (
              <span className="text-xs font-semibold px-2 py-1 bg-blue-600/30 text-blue-300 rounded">
                vELO {team.velo_min_rank}-{team.velo_max_rank}
              </span>
            ) : (
              team.allowed_categories && (
                <span className="text-xs font-semibold px-2 py-1 bg-orange-600/30 text-orange-300 rounded">
                  {team.allowed_categories.join(',')}
                </span>
              )
            )}
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded ${
            team.current_riders >= team.min_riders 
              ? 'bg-green-600/30 text-green-300' 
              : 'bg-yellow-600/30 text-yellow-300'
          }`}>
            {team.current_riders}/{team.max_riders}
          </span>
        </div>
        
        {/* Validation Status */}
        {team.current_riders > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Validatie:</span>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓ {team.valid_riders}</span>
                {team.invalid_riders > 0 && (
                  <span className="text-red-400">✗ {team.invalid_riders}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
