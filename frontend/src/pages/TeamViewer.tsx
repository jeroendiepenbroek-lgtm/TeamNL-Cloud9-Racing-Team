import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import RiderPassportCard from '../components/RiderPassportCard'

interface Team {
  team_id: number
  team_name: string
  competition_type: 'velo' | 'category'
  competition_name: string
  current_riders: number
  team_status: 'incomplete' | 'ready' | 'warning' | 'overfilled'
}

interface LineupRider {
  rider_id: number
  name: string
  full_name: string
  avatar_url?: string
  category: string
  velo_live?: number
  current_velo_rank?: number // Legacy field name
  velo_30day: number | null
  phenotype: string | null
  zwift_official_racing_score: number | null
  racing_ftp?: number | null
  ftp_watts?: number | null // Legacy field name
  weight_kg: number | null
  lineup_position: number
}

interface TeamViewerProps {
  hideHeader?: boolean
}

export default function TeamViewer({ hideHeader = false }: TeamViewerProps) {
  // Fetch all teams
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch('/api/teams')
      if (!res.ok) throw new Error('Failed to fetch teams')
      const data = await res.json()
      return data.teams || []
    }
  })
  
  const teams: Team[] = teamsData || []
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header */}
      {!hideHeader && (
      <div className="relative overflow-hidden mb-4 sm:mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-orange-400 to-blue-500 opacity-95"></div>
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
              <button
                onClick={() => window.location.pathname = '/team-builder'}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 backdrop-blur-lg rounded-lg border border-orange-400/30 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Team Builder</span>
                <span className="sm:hidden">⚙️</span>
              </button>
            </div>
          </div>
        </div>
      </div>      )}      
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {teamsLoading ? (
          <div className="text-center text-gray-600 py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4">Teams laden...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <p className="text-xl mb-4">Geen teams gevonden</p>
            <button
              onClick={() => window.location.pathname = '/team-competition'}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold shadow-lg"
            >
              + Nieuw Team Aanmaken
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map(team => (
              <TeamCard key={team.team_id} team={team} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Team Card with Riders - Collapsible
function TeamCard({ team }: { team: Team }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const { data: lineupData, isLoading } = useQuery({
    queryKey: ['team-lineup', team.team_id],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${team.team_id}`)
      if (!res.ok) throw new Error('Failed to fetch lineup')
      const data = await res.json()
      
      // Debug logging - eerste rider data
      if (data.lineup && data.lineup.length > 0) {
        console.log(`📊 Team ${team.team_name} - First rider:`, {
          name: data.lineup[0].name,
          velo_live: data.lineup[0].velo_live,
          velo_30day: data.lineup[0].velo_30day,
          racing_ftp: data.lineup[0].racing_ftp,
          weight_kg: data.lineup[0].weight_kg,
          allFields: Object.keys(data.lineup[0])
        })
      }
      
      return data
    },
    enabled: isExpanded // Only fetch when expanded
  })
  
  const lineup: LineupRider[] = lineupData?.lineup || []
  
  const statusColor = {
    'ready': 'bg-green-500/20 text-green-300 border-green-500/50',
    'incomplete': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
    'warning': 'bg-orange-500/20 text-orange-300 border-orange-500/50',
    'overfilled': 'bg-red-500/20 text-red-300 border-red-500/50'
  }[team.team_status]
  
  return (
    <div className="bg-gradient-to-br from-blue-900/80 to-indigo-950/80 backdrop-blur rounded-xl border border-orange-500/30 shadow-xl overflow-hidden">
      {/* Team Header - Clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
      >
        <div className="text-left flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white">{team.team_name}</h2>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusColor}`}>
              {team.current_riders} riders
            </span>
          </div>
          <p className="text-gray-400 text-sm">{team.competition_name}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {team.competition_type === 'velo' ? '🎯 vELO-based' : '📊 Category-based'}
            </span>
          </div>
        </div>
        
        {/* Expand/Collapse Icon */}
        <div className="text-white text-2xl flex-shrink-0 ml-4">
          {isExpanded ? '▼' : '▶'}
        </div>
      </button>
      
      {/* Riders Passports - Collapsible */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-4 border-t border-gray-700">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Riders laden...</div>
          ) : !lineup || !Array.isArray(lineup) || lineup.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>Nog geen riders toegevoegd</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-6 justify-center" style={{ minWidth: 'min-content' }}>
                {lineup.map((rider) => (
                  <RiderPassportCard
                    key={rider.rider_id}
                    rider={{
                      rider_id: rider.rider_id,
                      racing_name: rider.name,
                      full_name: rider.full_name,
                      zwift_official_category: rider.category,
                      zwiftracing_category: null,
                      country_alpha3: 'NLD',
                      velo_live: rider.velo_live || rider.current_velo_rank || 0,
                      velo_30day: rider.velo_30day || 0,
                      racing_ftp: rider.racing_ftp || rider.ftp_watts || 0,
                      ftp_watts: rider.ftp_watts || rider.racing_ftp || 0,
                      weight_kg: rider.weight_kg,
                      height_cm: 175,
                      age: 0,
                      zwift_official_racing_score: rider.zwift_official_racing_score,
                      avatar_url: rider.avatar_url || '',
                      phenotype: rider.phenotype,
                      power_5s: 0,
                      power_15s: 0,
                      power_30s: 0,
                      power_60s: 0,
                      power_120s: 0,
                      power_300s: 0,
                      power_1200s: 0,
                    }}
                    showFavorite={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
