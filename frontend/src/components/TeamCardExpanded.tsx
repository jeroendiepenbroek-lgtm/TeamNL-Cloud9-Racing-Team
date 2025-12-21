import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useDroppable } from '@dnd-kit/core'

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

interface LineupRider {
  rider_id: number
  name: string
  full_name: string
  avatar_url?: string
  category: string
  current_velo_rank?: number
  racing_ftp?: number
  zwift_official_racing_score?: number
  phenotype?: string
  weight_kg?: number
  is_valid: boolean
  validation_warning?: string
}

interface TeamCardExpandedProps {
  team: Team
  isDragging: boolean
  onCollapse: () => void
}

const VELO_TIERS = [
  { rank: 1, name: 'Diamond', min: 2200, color: '#22D3EE' },
  { rank: 2, name: 'Ruby', min: 1900, max: 2200, color: '#EF4444' },
  { rank: 3, name: 'Emerald', min: 1650, max: 1900, color: '#10B981' },
  { rank: 4, name: 'Sapphire', min: 1450, max: 1650, color: '#3B82F6' },
  { rank: 5, name: 'Amethyst', min: 1300, max: 1450, color: '#A855F7' },
  { rank: 6, name: 'Platinum', min: 1150, max: 1300, color: '#94A3B8' },
  { rank: 7, name: 'Gold', min: 1000, max: 1150, color: '#EAB308' },
  { rank: 8, name: 'Silver', min: 850, max: 1000, color: '#71717A' },
  { rank: 9, name: 'Bronze', min: 650, max: 850, color: '#F97316' },
  { rank: 10, name: 'Copper', min: 0, max: 650, color: '#DC2626' },
]

const getVeloTier = (rating: number | null) => {
  if (!rating) return null
  return VELO_TIERS.find(tier => 
    rating >= tier.min && (!tier.max || rating < tier.max)
  )
}

export default function TeamCardExpanded({ team, isDragging, onCollapse }: TeamCardExpandedProps) {
  const queryClient = useQueryClient()

  const { data: teamData, isLoading } = useQuery({
    queryKey: ['team', team.team_id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/teams/${team.team_id}`)
      if (!res.ok) throw new Error('Failed to fetch team')
      return res.json()
    }
  })

  const { setNodeRef, isOver } = useDroppable({
    id: `team-expanded-${team.team_id}`,
    data: { teamId: team.team_id, type: 'team-expanded' }
  })

  const removeRiderMutation = useMutation({
    mutationFn: async (riderId: number) => {
      const res = await fetch(`${API_BASE}/api/teams/${team.team_id}/riders/${riderId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to remove rider')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team', team.team_id] })
      queryClient.invalidateQueries({ queryKey: ['riders'] })
      toast.success('Rider verwijderd')
    }
  })

  const lineup: LineupRider[] = teamData?.lineup || []
  const canAddMore = lineup.length < team.max_riders
  const showDropIndicator = isOver && isDragging

  return (
    <div 
      ref={setNodeRef}
      className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border-2 transition-all duration-300 overflow-hidden ${
        showDropIndicator && canAddMore ? 'border-green-400 shadow-lg shadow-green-500/50' :
        showDropIndicator && !canAddMore ? 'border-red-400 shadow-lg shadow-red-500/50' :
        'border-orange-400'
      }`}
    >
      {/* Header */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{team.team_name}</h2>
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                lineup.length >= team.min_riders 
                  ? 'bg-green-600/30 text-green-300' 
                  : 'bg-yellow-600/30 text-yellow-300'
              }`}>
                {lineup.length}/{team.max_riders} riders
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">{team.competition_name}</p>
          </div>
          <button
            onClick={onCollapse}
            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Sluiten
          </button>
        </div>
      </div>

      {/* Drop Indicator Overlay */}
      {showDropIndicator && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-50 ${
          canAddMore ? 'bg-green-500/20 backdrop-blur-sm' : 'bg-red-500/20 backdrop-blur-sm'
        }`}>
          <div className={`p-6 rounded-xl bg-slate-900/90 border-2 border-dashed ${
            canAddMore ? 'border-green-400' : 'border-red-400'
          }`}>
            <p className={`text-2xl font-bold ${
              canAddMore ? 'text-green-300' : 'text-red-300'
            }`}>
              {canAddMore ? '✓ Drop hier' : '✗ Team vol'}
            </p>
            {canAddMore && (
              <p className="text-white text-sm mt-1">
                {team.max_riders - lineup.length} plekken vrij
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lineup Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
            <p>Loading riders...</p>
          </div>
        ) : lineup.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg">Nog geen riders</p>
            <p className="text-sm mt-2">Sleep riders hierheen</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {lineup.map(rider => {
              const tier = getVeloTier(rider.current_velo_rank || null)
              const wkg = rider.racing_ftp && rider.weight_kg 
                ? (rider.racing_ftp / rider.weight_kg).toFixed(1) 
                : '-'

              return (
                <div
                  key={rider.rider_id}
                  className={`relative p-3 rounded-lg border transition-all ${
                    rider.is_valid 
                      ? 'bg-slate-700/50 border-slate-600 hover:border-slate-500' 
                      : 'bg-red-900/20 border-red-500/50'
                  }`}
                >
                  {/* Avatar + Name */}
                  <div className="flex items-start gap-3 mb-2">
                    <img
                      src={rider.avatar_url || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=40`}
                      alt={rider.name}
                      className="w-12 h-12 rounded-full border-2 border-slate-600 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=40`
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm truncate">{rider.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          rider.category === 'A+' || rider.category === 'A' ? 'bg-red-500/30 text-red-300' :
                          rider.category === 'B' ? 'bg-green-500/30 text-green-300' :
                          rider.category === 'C' ? 'bg-blue-500/30 text-blue-300' :
                          'bg-yellow-500/30 text-yellow-300'
                        }`}>
                          {rider.category}
                        </span>
                        {tier && (
                          <span 
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white"
                            style={{ backgroundColor: tier.color }}
                          >
                            {tier.rank}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-1 text-xs mb-2">
                    <div className="text-center">
                      <div className="text-slate-400">FTP</div>
                      <div className="text-white font-bold">{rider.racing_ftp || '-'}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">W/kg</div>
                      <div className="text-white font-bold">{wkg}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">ZRS</div>
                      <div className="text-white font-bold">{rider.zwift_official_racing_score || '-'}</div>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeRiderMutation.mutate(rider.rider_id)}
                    className="w-full px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded text-xs font-semibold transition-all"
                  >
                    ✕ Verwijder
                  </button>

                  {/* Invalid warning */}
                  {!rider.is_valid && rider.validation_warning && (
                    <div className="absolute top-1 right-1 bg-red-500/90 text-white text-[10px] px-1.5 py-0.5 rounded">
                      ⚠️
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
