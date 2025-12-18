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
  const [viewMode, setViewMode] = useState<'matrix' | 'passports'>('matrix')
  
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
        <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-green-900 to-red-900 opacity-95"></div>
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
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur-lg rounded-lg p-1 border border-white/20">
                  <button
                    onClick={() => setViewMode('matrix')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      viewMode === 'matrix'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    📊 Matrix
                  </button>
                  <button
                    onClick={() => setViewMode('passports')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      viewMode === 'passports'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    🎴 Passports
                  </button>
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
              <TeamCard key={team.team_id} team={team} viewMode={viewMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Team Card with Riders - Collapsible
function TeamCard({ team, viewMode }: { team: Team; viewMode: 'matrix' | 'passports' }) {
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
          ) : viewMode === 'passports' ? (
            <RidersPassports lineup={lineup} />
          ) : (
            <RidersTable lineup={lineup} />
          )}
        </div>
      )}
    </div>
  )
}

// Riders Passports - Horizontal Scroll with Mini Cards
function RidersPassports({ lineup }: { lineup: LineupRider[] }) {
  const getVeloTier = (rating: number | null) => {
    if (!rating) return null
    return VELO_TIERS.find(tier => 
      rating >= tier.min && (!tier.max || rating < tier.max)
    )
  }



  return (
    <div className="overflow-x-auto pb-4 scroll-smooth">
      <div className="flex gap-4 px-2" style={{ minWidth: 'min-content' }}>
        {lineup.map(rider => {
          const veloLiveTier = getVeloTier(rider.velo_live || null)
          const category = rider.category || 'D'
          const categoryColors: {[key: string]: string} = {
            'A+': '#FF0000', 'A': '#FF0000', 'B': '#4CAF50',
            'C': '#0000FF', 'D': '#FF1493', 'E': '#808080'
          }
          const categoryColor = categoryColors[category] || '#666'
          const wkg = rider.racing_ftp && rider.weight_kg ? (rider.racing_ftp / rider.weight_kg).toFixed(1) : '-'

          return (
            <div
              key={rider.rider_id}
              className="flex-shrink-0 w-[220px] bg-gradient-to-br from-gray-900 to-blue-900 border-2 border-yellow-400 rounded-lg shadow-lg overflow-hidden"
            >
              {/* Header with tier and category */}
              <div
                className="h-12 relative"
                style={{
                  background: veloLiveTier ? `linear-gradient(135deg, ${veloLiveTier.color.split(' ')[0].replace('from-', '')} 0%, ${veloLiveTier.color.split(' ')[2].replace('to-', '')} 100%)` : '#666',
                  clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 100%)'
                }}
              >
                <div className="flex items-center justify-between px-2 py-1">
                  {veloLiveTier && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white"
                      style={{ background: veloLiveTier.color.split(' ')[0].replace('from-', '') }}
                    >
                      <span className="text-sm font-black text-white">{veloLiveTier.rank}</span>
                    </div>
                  )}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white"
                    style={{ background: categoryColor }}
                  >
                    <span className="text-sm font-black text-white">{category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-900">ZRS</div>
                    <div className="text-sm font-black text-gray-900">{rider.zwift_official_racing_score || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Avatar */}
              <div className="flex justify-center -mt-6 mb-2">
                <img
                  src={rider.avatar_url || 'https://via.placeholder.com/60?text=No+Avatar'}
                  alt={rider.name}
                  className="w-16 h-16 rounded-full border-2 border-yellow-400 object-cover bg-gray-700 shadow-lg"
                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/60?text=No+Avatar' }}
                />
              </div>

              {/* Name */}
              <div className="text-center px-2 mb-2">
                <h3 className="text-xs font-bold text-white leading-tight truncate">
                  {rider.name || rider.full_name || 'Unknown'}
                </h3>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-1 px-2 pb-2">
                <div className="bg-white/10 rounded p-1 text-center">
                  <div className="text-[9px] text-yellow-400 font-bold">FTP</div>
                  <div className="text-xs font-black text-white">{rider.racing_ftp || rider.ftp_watts || '-'}</div>
                </div>
                <div className="bg-white/10 rounded p-1 text-center">
                  <div className="text-[9px] text-yellow-400 font-bold">W/kg</div>
                  <div className="text-xs font-black text-white">{wkg}</div>
                </div>
                <div className="bg-white/10 rounded p-1 text-center">
                  <div className="text-[9px] text-yellow-400 font-bold">vELO</div>
                  <div className="text-xs font-black text-white">{Math.floor(rider.velo_live || 0)}</div>
                </div>
              </div>

              {/* Phenotype */}
              {rider.phenotype && (
                <div className="px-2 pb-2">
                  <div className="bg-purple-500/20 rounded px-2 py-1 text-center">
                    <span className="text-[10px] font-bold text-purple-300">{rider.phenotype}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Riders Table - Table Row Design met sorteer functionaliteit
function RidersTable({ lineup }: { lineup: LineupRider[] }) {
  type SortKey = 'position' | 'name' | 'category' | 'veloLive' | 'velo30day' | 'ftp' | 'zrs' | 'phenotype'
  const [sortKey, setSortKey] = useState<SortKey>('position')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }
  
  const sortedLineup = [...lineup].sort((a, b) => {
    let comparison = 0
    const catOrder: Record<string, number> = { 'A+': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4 }
    
    if (sortKey === 'position') {
      comparison = (a.lineup_position || 999) - (b.lineup_position || 999)
    } else if (sortKey === 'name') {
      comparison = (a.name || '').localeCompare(b.name || '')
    } else if (sortKey === 'category') {
      const aVal = catOrder[a.category || 'D'] ?? 5
      const bVal = catOrder[b.category || 'D'] ?? 5
      comparison = aVal - bVal
    } else if (sortKey === 'veloLive') {
      const aVal = a.velo_live || a.current_velo_rank || 0
      const bVal = b.velo_live || b.current_velo_rank || 0
      comparison = bVal - aVal
    } else if (sortKey === 'velo30day') {
      const aVal = a.velo_30day || 0
      const bVal = b.velo_30day || 0
      comparison = bVal - aVal
    } else if (sortKey === 'ftp') {
      const aVal = a.racing_ftp || a.ftp_watts || 0
      const bVal = b.racing_ftp || b.ftp_watts || 0
      comparison = bVal - aVal
    } else if (sortKey === 'zrs') {
      const aVal = a.zwift_official_racing_score || 0
      const bVal = b.zwift_official_racing_score || 0
      comparison = bVal - aVal
    } else if (sortKey === 'phenotype') {
      comparison = (a.phenotype || '').localeCompare(b.phenotype || '')
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })
  
  const SortableHeader = ({ label, sortKeyValue, align = 'left', colSpan }: { label: string; sortKeyValue: SortKey; align?: 'left' | 'center'; colSpan?: number }) => (
    <th 
      onClick={() => handleSort(sortKeyValue)}
      className={`px-3 py-2 text-${align} text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-orange-400 transition-colors select-none`}
      colSpan={colSpan}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>
        {label}
        {sortKey === sortKeyValue && (
          <span className="text-orange-400">{sortDirection === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  )
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <SortableHeader label="#" sortKeyValue="position" />
            <SortableHeader label="Rider" sortKeyValue="name" />
            <SortableHeader label="Cat" sortKeyValue="category" align="center" />
            <SortableHeader label="vELO Live" sortKeyValue="veloLive" align="center" />
            <SortableHeader label="vELO 30-day" sortKeyValue="velo30day" align="center" />
            <SortableHeader label="zFTP" sortKeyValue="ftp" align="center" colSpan={2} />
            <SortableHeader label="ZRS" sortKeyValue="zrs" align="center" />
            <SortableHeader label="Phenotype" sortKeyValue="phenotype" align="center" />
          </tr>
          <tr className="border-b border-gray-700/50">
            <th colSpan={5}></th>
            <th className="px-3 py-1 text-right text-[10px] font-medium text-gray-500 uppercase">FTP (W)</th>
            <th className="px-3 py-1 text-right text-[10px] font-medium text-gray-500 uppercase">W/kg</th>
            <th colSpan={2}></th>
          </tr>
        </thead>
        <tbody>
          {sortedLineup.map(rider => (
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
      
      {/* vELO Live Badge met cirkel en progressbar */}
      <td className="px-3 py-3 text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br ${veloLiveTier?.color || 'from-gray-400 to-gray-600'} shadow-md`}>
          {/* Cirkel om tier nummer */}
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm border-2 border-white/50">
            <span className="font-black text-xs text-white">{veloLiveTier?.rank || '?'}</span>
          </div>
          {/* Score + Progressbar */}
          <div className="flex flex-col gap-0.5">
            <span className={`font-bold text-sm leading-none ${veloLiveTier?.textColor || 'text-white'}`}>{veloLive?.toFixed(0) || 'N/A'}</span>
            {veloLiveTier && veloLiveTier.max && veloLive && (
              <div className="w-12 h-1 bg-black/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/60 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((veloLive - veloLiveTier.min) / (veloLiveTier.max - veloLiveTier.min)) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </td>
      
      {/* vELO 30-day Badge met cirkel en progressbar */}
      <td className="px-3 py-3 text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br ${velo30dayTier?.color || 'from-gray-400 to-gray-600'} shadow-md`}>
          {/* Cirkel om tier nummer */}
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm border-2 border-white/50">
            <span className="font-black text-xs text-white">{velo30dayTier?.rank || '?'}</span>
          </div>
          {/* Score + Progressbar */}
          <div className="flex flex-col gap-0.5">
            <span className={`font-bold text-sm leading-none ${velo30dayTier?.textColor || 'text-white'}`}>{velo30day?.toFixed(0) || 'N/A'}</span>
            {velo30dayTier && velo30dayTier.max && velo30day && (
              <div className="w-12 h-1 bg-black/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/60 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((velo30day - velo30dayTier.min) / (velo30dayTier.max - velo30dayTier.min)) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </td>
      
      {/* zFTP - Watts */}
      <td className="px-3 py-3 text-right">
        <span className="text-white font-semibold">{racingFtp || '-'}</span>
      </td>
      
      {/* zFTP - W/kg */}
      <td className="px-3 py-3 text-right">
        <span className="text-white font-semibold">{ftpWkg || '-'}</span>
      </td>
      
      {/* ZRS (Zwift Racing Score) */}
      <td className="px-3 py-3 text-center">
        <span className="text-white font-semibold">{rider.zwift_official_racing_score || '-'}</span>
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
