import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

// Category colors (aangepast voor donkere achtergrond - zichtbare kleuren)
const CATEGORY_COLORS = {
  'A+': 'bg-red-500 text-white border-red-400',
  'A': 'bg-red-600 text-white border-red-500',
  'B': 'bg-green-500 text-white border-green-400',
  'C': 'bg-blue-500 text-white border-blue-400',
  'D': 'bg-yellow-500 text-white border-yellow-400',
}

// vELO Tiers (matching RacingMatrix)
const VELO_TIERS = [
  { rank: 1, name: 'Diamond', icon: '💎', min: 2200, max: null, color: 'from-cyan-300 to-blue-600', textColor: 'text-cyan-900' },
  { rank: 2, name: 'Platinum', icon: '⚪', min: 1900, max: 2200, color: 'from-gray-200 to-gray-500', textColor: 'text-gray-900' },
  { rank: 3, name: 'Gold', icon: '🟡', min: 1650, max: 1900, color: 'from-yellow-300 to-yellow-600', textColor: 'text-yellow-900' },
  { rank: 4, name: 'Silver', icon: '⚪', min: 1400, max: 1650, color: 'from-gray-300 to-gray-600', textColor: 'text-gray-900' },
  { rank: 5, name: 'Bronze I', icon: '🟠', min: 1250, max: 1400, color: 'from-orange-300 to-orange-500', textColor: 'text-orange-900' },
  { rank: 6, name: 'Bronze II', icon: '🟠', min: 1100, max: 1250, color: 'from-orange-400 to-orange-600', textColor: 'text-orange-900' },
  { rank: 7, name: 'Bronze III', icon: '🟠', min: 950, max: 1100, color: 'from-orange-500 to-orange-700', textColor: 'text-orange-900' },
  { rank: 8, name: 'Bronze IV', icon: '🟠', min: 850, max: 950, color: 'from-orange-300 to-orange-600', textColor: 'text-orange-900' },
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
  velo_live: number
  velo_30day: number | null
  phenotype: string | null
  ftp_watts: number | null
  weight_kg: number | null
  lineup_position: number
}

export default function TeamViewer() {
  const navigate = useNavigate()
  
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="relative overflow-hidden mb-4 sm:mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-95"></div>
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
                <p className="text-blue-100 text-xs sm:text-sm lg:text-lg xl:text-xl font-semibold mt-1 sm:mt-2 truncate">
                  TeamNL Cloud9 Racing · Team Overzicht
                </p>
              </div>
              <button
                onClick={() => navigate('/team-builder')}
                className="px-3 py-2 sm:px-4 sm:py-2.5 bg-green-500/20 hover:bg-green-500/30 backdrop-blur-lg rounded-lg sm:rounded-xl border border-green-400/50 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl"
              >
                ✏️ Builder
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-lg rounded-lg sm:rounded-xl border border-white/30 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl"
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
      
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
              onClick={() => navigate('/team-builder')}
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

// Team Card with Riders
function TeamCard({ team }: { team: Team }) {
  const { data: lineupData, isLoading } = useQuery({
    queryKey: ['team-lineup', team.team_id],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${team.team_id}`)
      if (!res.ok) throw new Error('Failed to fetch lineup')
      return res.json()
    }
  })
  
  const lineup: LineupRider[] = lineupData?.lineup || []
  
  const statusColor = {
    'ready': 'bg-green-500/20 text-green-300 border-green-500/50',
    'incomplete': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
    'warning': 'bg-orange-500/20 text-orange-300 border-orange-500/50',
    'overfilled': 'bg-red-500/20 text-red-300 border-red-500/50'
  }[team.team_status]
  
  return (
    <div className="bg-gradient-to-br from-blue-900/80 to-indigo-950/80 backdrop-blur rounded-xl border border-orange-500/30 p-6 shadow-xl">
      {/* Team Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">{team.team_name}</h2>
          <p className="text-gray-400 text-sm">{team.competition_name}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {team.competition_type === 'velo' ? '🎯 vELO-based' : '📊 Category-based'}
            </span>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusColor}`}>
              {team.current_riders} riders
            </span>
          </div>
        </div>
      </div>
      
      {/* Riders Grid */}
      {isLoading ? (
        <div className="text-center text-gray-400 py-8">Riders laden...</div>
      ) : lineup.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Nog geen riders toegevoegd</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lineup
            .sort((a, b) => (a.lineup_position || 999) - (b.lineup_position || 999))
            .map(rider => (
              <RiderCard key={rider.rider_id} rider={rider} />
            ))}
        </div>
      )}
    </div>
  )
}

// Compact Rider Card
function RiderCard({ rider }: { rider: LineupRider }) {
  const velo30day = rider.velo_30day || rider.velo_live
  const veloTier = getVeloTier(velo30day)
  const categoryColor = CATEGORY_COLORS[rider.category as keyof typeof CATEGORY_COLORS] || 'bg-gray-500 text-white border-gray-400'
  const ftpWkg = rider.ftp_watts && rider.weight_kg ? (rider.ftp_watts / rider.weight_kg).toFixed(1) : null
  
  return (
    <div className="relative bg-gradient-to-br from-blue-900 to-indigo-950 rounded-lg p-4 border border-orange-500/30 shadow-lg hover:shadow-xl hover:border-orange-400 hover:shadow-orange-500/10 transition-all">
      {/* Position Badge */}
      {rider.lineup_position && (
        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md border-2 border-gray-900">
          {rider.lineup_position}
        </div>
      )}
      
      <div className="flex items-start gap-3">
        {/* Small Avatar */}
        <img 
          src={rider.avatar_url || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=40`}
          alt={rider.name}
          className="w-10 h-10 rounded-full border-2 border-gray-600 shadow-md flex-shrink-0"
          onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=40`; }}
        />
        
        <div className="flex-1 min-w-0">
          {/* Name */}
          <div className="font-bold text-white text-sm truncate mb-2">
            {rider.name || rider.full_name}
          </div>
          
          {/* Stats Grid */}
          <div className="space-y-2">
            {/* Row 1: Category + vELO */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded border ${categoryColor}`}>
                {rider.category}
              </span>
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] bg-gradient-to-br ${veloTier?.color || 'from-gray-400 to-gray-600'} ${veloTier?.textColor || 'text-white'} shadow-sm`}>
                  {veloTier?.rank || '?'}
                </div>
                <span className="text-white text-xs font-semibold">{Math.floor(velo30day)}</span>
              </div>
            </div>
            
            {/* Row 2: vELO Live + 30-day */}
            <div className="text-xs text-gray-300 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-gray-400">vELO Live:</span>
                <span className="font-semibold">{rider.velo_live?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">vELO 30d:</span>
                <span className="font-semibold">{velo30day?.toFixed(1) || 'N/A'}</span>
              </div>
            </div>
            
            {/* Row 3: FTP */}
            {rider.ftp_watts && (
              <div className="text-xs text-gray-300 space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">FTP:</span>
                  <span className="font-semibold">{rider.ftp_watts}W {ftpWkg && `(${ftpWkg} w/kg)`}</span>
                </div>
              </div>
            )}
            
            {/* Row 4: Phenotype */}
            {rider.phenotype && (
              <div className="mt-2">
                <span className="inline-block px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 text-xs font-semibold">
                  {rider.phenotype}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
