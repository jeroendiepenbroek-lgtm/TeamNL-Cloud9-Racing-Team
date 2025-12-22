import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useDroppable } from '@dnd-kit/core'

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8080'

interface TeamLineupModalProps {
  teamId: number
  onClose: () => void
  isDragging?: boolean
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
  ftp_wkg?: number
  is_valid: boolean
  validation_warning?: string
}

interface TeamDetail {
  team_id: number
  team_name: string
  competition_type: string
  competition_name: string
  velo_min_rank?: number
  velo_max_rank?: number
  velo_max_spread?: number
  allowed_categories?: string[]
  min_riders: number
  max_riders: number
  lineup: LineupRider[]
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

export default function TeamLineupModal({ teamId, onClose, isDragging = false }: TeamLineupModalProps) {
  const queryClient = useQueryClient()

  const { data: teamData, isLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}`)
      if (!res.ok) throw new Error('Failed to fetch team')
      return res.json() as Promise<TeamDetail>
    }
  })

  // Maak sidebar droppable voor betere UX
  const { setNodeRef, isOver } = useDroppable({
    id: `lineup-sidebar-${teamId}`,
    data: { teamId, type: 'lineup-sidebar' }
  })

  const removeRiderMutation = useMutation({
    mutationFn: async (riderId: number) => {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/riders/${riderId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to remove rider')
      return res.json()
    },
    onSuccess: async () => {
      // Refetch maar behoud cache/scroll positie
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['teams'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['team', teamId], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['riders'], type: 'active' })
      ])
      toast.success('Rider verwijderd uit team')
    },
    onError: () => {
      toast.error('Kon rider niet verwijderen')
    }
  })

  if (isLoading || !teamData) {
    return (
      <aside ref={setNodeRef} className="fixed md:sticky right-0 top-0 md:top-[73px] w-full sm:w-80 lg:w-96 h-screen md:h-[calc(100vh-73px)] border-l border-slate-700/50 bg-slate-800/95 backdrop-blur-xl z-40 shadow-2xl shadow-black/50 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </aside>
    )
  }

  const team = teamData
  const canAddMore = team.lineup.length < team.max_riders
  const showDropIndicator = isOver && isDragging

  return (
    <aside 
      ref={setNodeRef}
      className={`fixed md:sticky right-0 top-0 md:top-[73px] w-full sm:w-96 lg:w-[450px] xl:w-[550px] h-screen md:h-[calc(100vh-73px)] border-l-4 bg-slate-800/95 backdrop-blur-xl z-40 shadow-2xl shadow-black/50 flex flex-col transition-all duration-300 ${
        showDropIndicator && canAddMore ? 'border-green-500 shadow-green-500/50' :
        showDropIndicator && !canAddMore ? 'border-red-500 shadow-red-500/50' :
        'border-slate-700/50'
      }`}>
      {/* Drop Indicator Overlay */}
      {showDropIndicator && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-50 ${
          canAddMore ? 'bg-green-500/20 backdrop-blur-sm' : 'bg-red-500/20 backdrop-blur-sm'
        }`}>
          <div className={`text-center p-6 rounded-xl bg-slate-900/90 border-2 border-dashed ${
            canAddMore ? 'border-green-400' : 'border-red-400'
          }`}>
            <p className={`text-2xl font-bold mb-2 ${
              canAddMore ? 'text-green-300' : 'text-red-300'
            }`}>
              {canAddMore ? '✓ Drop hier' : '✗ Team vol'}
            </p>
            {canAddMore && (
              <p className="text-white text-sm">
                {team.max_riders - team.lineup.length} plekken vrij
              </p>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-700 bg-slate-900/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{team.team_name}</h2>
              <p className="text-slate-400 mt-1 text-sm sm:text-base truncate">{team.competition_name}</p>
              <div className="flex items-center gap-2 sm:gap-3 mt-2 text-xs sm:text-sm flex-wrap">
                {team.competition_type === 'velo' && (
                  <>
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-600/30 text-blue-300 rounded whitespace-nowrap">
                      vELO: {team.velo_min_rank}-{team.velo_max_rank}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-600/30 text-purple-300 rounded whitespace-nowrap">
                      Spread: max {team.velo_max_spread}
                    </span>
                  </>
                )}
                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-600/50 text-slate-300 rounded">
                  {team.lineup.length}/{team.max_riders} riders
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-3xl leading-none flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {team.lineup.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p className="text-lg">Nog geen riders in dit team</p>
              <p className="mt-2 text-sm">Drag & drop riders om toe te voegen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {team.lineup.map(rider => {
                const tier = getVeloTier(rider.current_velo_rank || null)
                const ftpWkg = rider.ftp_wkg || (rider.racing_ftp && rider.weight_kg 
                  ? (rider.racing_ftp / rider.weight_kg).toFixed(2) 
                  : null)

                return (
                  <div
                    key={rider.rider_id}
                    className={`
                      relative bg-slate-900/50 rounded-lg p-3 sm:p-3 border-l-4
                      ${rider.is_valid ? 'border-l-green-600' : 'border-l-orange-600'}
                      hover:bg-slate-900/70 transition-colors
                    `}
                  >
                    {/* Compact Rider Card */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-slate-900 flex-shrink-0">
                        {rider.avatar_url ? (
                          <img 
                            src={rider.avatar_url} 
                            alt={rider.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl sm:text-2xl">👤</div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate text-xs sm:text-sm">{rider.full_name}</p>
                        <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-blue-600 rounded text-[10px] sm:text-xs font-bold text-white">
                            {rider.category}
                          </span>
                          {rider.current_velo_rank && tier && (
                            <span 
                              className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold text-white"
                              style={{ backgroundColor: tier.color }}
                              title={`${tier.name} Tier`}
                            >
                              T{tier.rank}
                            </span>
                          )}
                          {rider.current_velo_rank && (
                            <span className="text-[10px] sm:text-xs text-cyan-400 font-bold">
                              {Math.floor(rider.current_velo_rank)}
                            </span>
                          )}
                          {rider.racing_ftp && (
                            <span className="text-[10px] sm:text-xs text-slate-400 hidden sm:inline">
                              {rider.racing_ftp}W {ftpWkg && `• ${ftpWkg} W/kg`}
                            </span>
                          )}
                        </div>
                        
                        {/* Validation Warning */}
                        {!rider.is_valid && rider.validation_warning && (
                          <div className="text-[10px] sm:text-xs text-orange-400 mt-1">
                            ⚠️ {rider.validation_warning}
                          </div>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeRiderMutation.mutate(rider.rider_id)}
                        className="px-2 sm:px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs sm:text-sm rounded transition-colors flex-shrink-0 min-h-[44px] sm:min-h-0 flex items-center justify-center"
                        title="Verwijder uit team"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
