import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// Category colors (aangepast voor donkere achtergrond - zichtbare kleuren)
const CATEGORY_COLORS = {
  'A+': 'bg-red-500 text-white border-red-400',
  'A': 'bg-red-600 text-white border-red-500',
  'B': 'bg-green-500 text-white border-green-400',
  'C': 'bg-blue-500 text-white border-blue-400',
  'D': 'bg-yellow-500 text-white border-yellow-400',
}

// vELO Tiers (matching RacingMatrix exactly)
const VELO_TIERS = [
  { rank: 1, name: 'Diamond', icon: '💎', min: 2200, max: null, color: 'from-cyan-400 to-blue-500', textColor: 'text-cyan-100' },
  { rank: 2, name: 'Ruby', icon: '💍', min: 1900, max: 2200, color: 'from-red-500 to-pink-600', textColor: 'text-red-100' },
  { rank: 3, name: 'Emerald', icon: '💚', min: 1650, max: 1900, color: 'from-emerald-400 to-green-600', textColor: 'text-emerald-100' },
  { rank: 4, name: 'Sapphire', icon: '💙', min: 1450, max: 1650, color: 'from-blue-400 to-indigo-600', textColor: 'text-blue-100' },
  { rank: 5, name: 'Amethyst', icon: '💜', min: 1300, max: 1450, color: 'from-purple-400 to-violet-600', textColor: 'text-purple-100' },
  { rank: 6, name: 'Platinum', icon: '⚪', min: 1150, max: 1300, color: 'from-slate-300 to-slate-500', textColor: 'text-slate-100' },
  { rank: 7, name: 'Gold', icon: '🟡', min: 1000, max: 1150, color: 'from-yellow-400 to-amber-600', textColor: 'text-yellow-900' },
  { rank: 8, name: 'Silver', icon: '⚫', min: 850, max: 1000, color: 'from-gray-300 to-gray-500', textColor: 'text-gray-700' },
  { rank: 9, name: 'Bronze', icon: '🟠', min: 650, max: 850, color: 'from-orange-400 to-orange-700', textColor: 'text-orange-900' },
  { rank: 10, name: 'Copper', icon: '🟤', min: 0, max: 650, color: 'from-orange-600 to-red-800', textColor: 'text-orange-100' },
]

const getVeloTier = (rating: number | null) => {
  if (!rating) return null
  return VELO_TIERS.find(tier => 
    rating >= tier.min && (!tier.max || rating < tier.max)
  )
}

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      {/* Header */}
      {!hideHeader && (
      <div className="relative overflow-hidden mb-4 sm:mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-blue-600 to-orange-500 opacity-95"></div>
        <div className="relative px-3 py-4 sm:px-6 sm:py-6 lg:py-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              <div className="p-2 sm:p-3 lg:p-4 bg-white/20 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl flex-shrink-0">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3">
                  <span className="truncate">TEAM VIEWER</span>
                </h1>
                <p className="text-orange-100 text-xs sm:text-sm lg:text-lg xl:text-xl font-semibold mt-1 sm:mt-2 truncate">
                  TeamNL Cloud9 Racing · Team Overzicht
                </p>
              </div>
              <button
                onClick={() => window.location.pathname = '/team-competition'}
                className="px-3 py-2 sm:px-4 sm:py-2.5 bg-green-500/20 hover:bg-green-500/30 backdrop-blur-lg rounded-lg sm:rounded-xl border border-green-400/50 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl"
              >
                ✏️ Builder
              </button>
              <button
                onClick={() => window.location.pathname = '/'}
                className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-lg rounded-lg sm:rounded-xl border border-white/30 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl"
              >
                ← Dashboard
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
      
      {/* Riders Table - Collapsible */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-700">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Riders laden...</div>
          ) : !lineup || !Array.isArray(lineup) || lineup.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>Nog geen riders toegevoegd</p>
            </div>
          ) : (
            <RidersTable lineup={lineup} />
          )}
        </div>
      )}
    </div>
  )
}

// Riders Table - Table Row Design
function RidersTable({ lineup }: { lineup: LineupRider[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">#</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Rider</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 uppercase">Cat</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 uppercase">vELO Live</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 uppercase">vELO 30-day</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 uppercase" colSpan={2}>Racing FTP</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-400 uppercase">Phenotype</th>
          </tr>
          <tr className="border-b border-gray-700/50">
            <th colSpan={5}></th>
            <th className="px-3 py-1 text-right text-[10px] font-medium text-gray-500 uppercase">FTP (W)</th>
            <th className="px-3 py-1 text-right text-[10px] font-medium text-gray-500 uppercase">W/kg</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lineup
            .sort((a, b) => (a.lineup_position || 999) - (b.lineup_position || 999))
            .map(rider => (
              <RiderRow key={rider.rider_id} rider={rider} />
            ))}
        </tbody>
      </table>
    </div>
  )
}

// Rider Row Component
function RiderRow({ rider }: { rider: LineupRider }) {
  // Handle both old and new field names
  const veloLive = rider.velo_live || rider.current_velo_rank || 0
  const velo30day = rider.velo_30day || veloLive
  const racingFtp = rider.racing_ftp || rider.ftp_watts
  
  const veloLiveTier = getVeloTier(veloLive)
  const velo30dayTier = getVeloTier(velo30day)
  const categoryColor = CATEGORY_COLORS[rider.category as keyof typeof CATEGORY_COLORS] || 'bg-gray-500 text-white border-gray-400'
  const ftpWkg = racingFtp && rider.weight_kg ? (racingFtp / rider.weight_kg).toFixed(1) : null
  
  return (
    <tr className="border-b border-gray-700/30 hover:bg-blue-900/30 transition-colors">
      {/* Position */}
      <td className="px-3 py-3 text-center">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
          {rider.lineup_position}
        </div>
      </td>
      
      {/* Rider (Avatar + Name) */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <img 
            src={rider.avatar_url || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=40`}
            alt={rider.name}
            className="w-10 h-10 rounded-full border-2 border-gray-600 shadow-md flex-shrink-0"
            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=40`; }}
          />
          <span className="font-semibold text-white">{rider.name || rider.full_name}</span>
        </div>
      </td>
      
      {/* Category */}
      <td className="px-3 py-3 text-center">
        <span className={`inline-block px-3 py-1 text-sm font-bold rounded border ${categoryColor}`}>
          {rider.category}
        </span>
      </td>
      
      {/* vELO Live Badge (Tier + Score) */}
      <td className="px-3 py-3 text-center">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-br ${veloLiveTier?.color || 'from-gray-400 to-gray-600'} ${veloLiveTier?.textColor || 'text-white'} shadow-md border border-white/20`}>
          <span className="font-bold text-xs">#{veloLiveTier?.rank || '?'}</span>
          <span className="font-bold text-sm">{veloLive?.toFixed(0) || 'N/A'}</span>
        </div>
      </td>
      
      {/* vELO 30-day Badge (Tier + Score) */}
      <td className="px-3 py-3 text-center">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-br ${velo30dayTier?.color || 'from-gray-400 to-gray-600'} ${velo30dayTier?.textColor || 'text-white'} shadow-md border border-white/20`}>
          <span className="font-bold text-xs">#{velo30dayTier?.rank || '?'}</span>
          <span className="font-bold text-sm">{velo30day?.toFixed(0) || 'N/A'}</span>
        </div>
      </td>
      
      {/* Racing FTP - Watts */}
      <td className="px-3 py-3 text-right">
        <span className="text-white font-semibold">{racingFtp || '-'}</span>
      </td>
      
      {/* zFTP - W/kg */}
      <td className="px-3 py-3 text-right">
        <span className="text-white font-semibold">{ftpWkg || '-'}</span>
      </td>
      
      {/* Phenotype */}
      <td className="px-3 py-3 text-center">
        {rider.phenotype ? (
          <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 text-sm font-semibold">
            {rider.phenotype}
          </span>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>
    </tr>
  )
}
