import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

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
  min_riders: number
  max_riders: number
  current_riders: number
  valid_riders: number
  invalid_riders: number
  team_status: 'incomplete' | 'ready' | 'warning' | 'overfilled'
}

interface TeamLineup {
  rider_id: number
  name: string
  avatar_url?: string
  category: string
  current_velo_rank?: number
  racing_ftp?: number
  weight_kg?: number
}

interface TeamCardProps {
  team: Team
  onDrop: (teamId: number) => void
  onOpenDetail: (teamId: number) => void
  onDelete?: () => void
  onSelectForFiltering?: (teamId: number) => void
  isSelectedForFiltering?: boolean
  isDragging: boolean
  isExpanded?: boolean
  onToggleExpand?: (teamId: number) => void
  refetchTeams?: () => void
}

const STATUS_COLORS = {
  incomplete: 'border-yellow-500 bg-yellow-500/10',
  ready: 'border-green-500 bg-green-500/10',
  warning: 'border-orange-500 bg-orange-500/10',
  overfilled: 'border-red-500 bg-red-500/10',
}

const STATUS_ICONS = {
  incomplete: '⏳',
  ready: '✅',
  warning: '⚠️',
  overfilled: '🚫',
}

export default function TeamCard({ team, onDrop, onOpenDetail, onDelete, onSelectForFiltering, isSelectedForFiltering, isDragging, isExpanded = false, onToggleExpand, refetchTeams }: TeamCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  // Fetch team lineup
  const { data: lineupData, refetch } = useQuery({
    queryKey: ['team', team.team_id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/teams/${team.team_id}`)
      if (!res.ok) throw new Error('Failed to fetch team')
      return res.json()
    }
  })

  const lineup: TeamLineup[] = lineupData?.lineup || []

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDrop(team.team_id)
  }

  const canAddMore = team.current_riders < team.max_riders

  return (
    <div
      className={`
        relative bg-slate-800/50 backdrop-blur-sm rounded-xl border-2 
        transition-all duration-300 overflow-hidden
        ${isDragOver && canAddMore ? 'border-green-400 shadow-lg shadow-green-500/50 scale-105' : STATUS_COLORS[team.team_status]}
        ${isDragOver && !canAddMore ? 'border-red-400 shadow-lg shadow-red-500/50' : ''}
        ${isDragging && canAddMore ? 'hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/30' : ''}
        ${isSelectedForFiltering ? 'ring-4 ring-orange-500 border-orange-500' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div 
        className="p-4 border-b border-slate-700/50 bg-slate-900/50 cursor-pointer hover:bg-slate-900/70 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          // Altijd expand/collapse als de functie beschikbaar is
          if (onToggleExpand) {
            onToggleExpand(team.team_id)
          }
          // EN ook altijd filtering als de functie beschikbaar is
          if (onSelectForFiltering) {
            onSelectForFiltering(team.team_id)
          }
        }}
        title={onToggleExpand ? "Klik om uit/in te vouwen en riders te filteren" : "Klik om riders te filteren voor dit team"}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {onToggleExpand && (
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white truncate">
                  {team.team_name}
                </h3>
                {isSelectedForFiltering && (
                  <span className="text-xs font-bold px-2 py-0.5 bg-orange-500 text-white rounded-full animate-pulse">
                    FILTERING
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">{team.competition_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 hover:border-red-500 text-red-400 hover:text-red-300 transition-all"
                title="Team verwijderen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <span className="text-2xl">{STATUS_ICONS[team.team_status]}</span>
          </div>
        </div>

        {/* Team Constraints */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {team.competition_type === 'velo' && (
            <>
              <span className="px-2 py-1 bg-blue-600/30 text-blue-300 rounded">
                vELO: {team.velo_min_rank}-{team.velo_max_rank}
              </span>
              <span className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded">
                Spread: max {team.velo_max_spread}
              </span>
            </>
          )}
          {team.competition_type === 'category' && team.allowed_categories && (
            <span className="px-2 py-1 bg-orange-600/30 text-orange-300 rounded">
              Cat: {team.allowed_categories.join(', ')}
            </span>
          )}
          <span className={`px-2 py-1 rounded ${
            team.current_riders >= team.min_riders 
              ? 'bg-green-600/30 text-green-300' 
              : 'bg-yellow-600/30 text-yellow-300'
          }`}>
            {team.current_riders}/{team.max_riders} riders
          </span>
        </div>
      </div>

      {/* Collapsible Content */}
      <div 
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ 
          maxHeight: isExpanded ? '2000px' : '0px',
          opacity: isExpanded ? 1 : 0
        }}
      >
        {/* Passport Grid */}
        <div className="p-4">
        {lineup.length === 0 ? (
          <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-lg">
            <div className="text-center">
              <p className="text-slate-400 text-sm">Sleep riders hierheen</p>
              <p className="text-slate-500 text-xs mt-1">Minimaal {team.min_riders} riders</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {lineup.slice(0, 12).map((rider) => {
              const getCategoryColor = (cat: string) => {
                if (cat === 'A+' || cat === 'A') return '#FF0000'
                if (cat === 'B') return '#4CAF50'
                if (cat === 'C') return '#0000FF'
                if (cat === 'D') return '#FF1493'
                if (cat === 'E') return '#808080'
                return '#666666'
              }
              
              const VELO_TIERS = [
                { rank: 1, name: 'Diamond', min: 2200, color: '#22D3EE', border: '#3B82F6' },
                { rank: 2, name: 'Ruby', min: 1900, max: 2200, color: '#EF4444', border: '#EC4899' },
                { rank: 3, name: 'Emerald', min: 1650, max: 1900, color: '#10B981', border: '#059669' },
                { rank: 4, name: 'Sapphire', min: 1450, max: 1650, color: '#3B82F6', border: '#2563EB' },
                { rank: 5, name: 'Amethyst', min: 1300, max: 1450, color: '#A855F7', border: '#9333EA' },
                { rank: 6, name: 'Platinum', min: 1150, max: 1300, color: '#94A3B8', border: '#64748B' },
                { rank: 7, name: 'Gold', min: 1000, max: 1150, color: '#EAB308', border: '#CA8A04' },
                { rank: 8, name: 'Silver', min: 850, max: 1000, color: '#71717A', border: '#52525B' },
                { rank: 9, name: 'Bronze', min: 650, max: 850, color: '#F97316', border: '#EA580C' },
                { rank: 10, name: 'Copper', min: 0, max: 650, color: '#DC2626', border: '#B91C1C' },
              ]
              
              const getVeloTier = (rating: number | null) => {
                if (!rating) return null
                return VELO_TIERS.find(tier => 
                  rating >= tier.min && (!tier.max || rating < tier.max)
                )
              }
              
              const tier = getVeloTier(rider.current_velo_rank || null)
              const ftpWkg = rider.racing_ftp && rider.weight_kg 
                ? (rider.racing_ftp / rider.weight_kg).toFixed(2) 
                : '-'
              
              return (
                <div
                  key={rider.rider_id}
                  className="p-2 rounded-lg border bg-slate-900/50 border-slate-600 hover:border-slate-500 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
                      {rider.avatar_url ? (
                        <img src={rider.avatar_url} alt={rider.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{rider.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span 
                          className="text-[10px] px-1.5 py-0.5 text-white rounded font-bold"
                          style={{ backgroundColor: getCategoryColor(rider.category) }}
                        >
                          {rider.category || 'N/A'}
                        </span>
                        {tier && (
                          <span 
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white"
                            style={{ 
                              backgroundColor: tier.color,
                            }}
                            title={`${tier.name} Tier`}
                          >
                            {tier.rank}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                        <span>FTP: {rider.racing_ftp || '-'}W</span>
                        <span>•</span>
                        <span>{ftpWkg} W/kg</span>
                      </div>
                    </div>
                    
                    {/* Delete Button - US1: Geen confirm, blijf op pagina */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        try {
                          const res = await fetch(`${API_BASE}/api/teams/${team.team_id}/riders/${rider.rider_id}`, {
                            method: 'DELETE'
                          })
                          if (res.ok) {
                            // Refresh beide queries om data te updaten zonder reload
                            await refetch()
                            refetchTeams?.()
                          }
                        } catch (error) {
                          console.error('Delete failed:', error)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 hover:border-red-500 text-red-400 hover:text-red-300"
                      title="Verwijder rider uit team"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Add more placeholder spots if needed */}
            {Array.from({ length: Math.min(team.max_riders - lineup.length, 12 - lineup.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="p-2 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center h-14"
              >
                <span className="text-slate-600 text-xl">+</span>
              </div>
            ))}
          </div>
        )}

        {lineup.length > 12 && (
          <div className="mt-2 text-center text-xs text-slate-400">
            +{lineup.length - 12} meer riders
          </div>
        )}
      </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-700/50 bg-slate-900/30">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetail(team.team_id) }}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            📋 Open Team LINE-UP
          </button>
        </div>
      </div>

      {/* Drag Over Indicator */}
      {isDragOver && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${
          canAddMore 
            ? 'bg-green-500/20 backdrop-blur-sm' 
            : 'bg-red-500/20 backdrop-blur-sm'
        }`}>
          <div className="text-center">
            <p className={`text-2xl font-bold ${canAddMore ? 'text-green-300' : 'text-red-300'}`}>
              {canAddMore ? '✓ Drop hier' : '✗ Team vol'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
