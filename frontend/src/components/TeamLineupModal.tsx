import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8080'

interface TeamLineupModalProps {
  teamId: number
  onClose: () => void
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

export default function TeamLineupModal({ teamId, onClose }: TeamLineupModalProps) {
  const queryClient = useQueryClient()

  const { data: teamData, isLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}`)
      if (!res.ok) throw new Error('Failed to fetch team')
      return res.json() as Promise<TeamDetail>
    }
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-slate-800 rounded-xl p-8">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    )
  }

  const team = teamData

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">{team.team_name}</h2>
              <p className="text-slate-400 mt-1">{team.competition_name}</p>
              <div className="flex items-center gap-3 mt-2 text-sm">
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
                <span className="px-2 py-1 bg-slate-600/50 text-slate-300 rounded">
                  {team.lineup.length}/{team.max_riders} riders
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-3xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {team.lineup.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p className="text-xl">Nog geen riders in dit team</p>
              <p className="mt-2">Drag & drop riders vanuit de sidebar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {team.lineup.map(rider => {
                const tier = getVeloTier(rider.current_velo_rank || null)
                const ftpWkg = rider.ftp_wkg || (rider.racing_ftp && rider.weight_kg 
                  ? (rider.racing_ftp / rider.weight_kg).toFixed(2) 
                  : null)

                return (
                  <div
                    key={rider.rider_id}
                    className={`
                      relative bg-slate-900/50 rounded-xl overflow-hidden border-2 
                      ${rider.is_valid ? 'border-green-600/50' : 'border-orange-600/50'}
                    `}
                  >
                    {/* Passport Card */}
                    <div className="aspect-[3/4] relative">
                      {/* Avatar */}
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        {rider.avatar_url ? (
                          <img 
                            src={rider.avatar_url} 
                            alt={rider.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-8xl opacity-20">👤</span>
                        )}
                      </div>

                      {/* Info Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <p className="font-bold text-lg truncate">{rider.full_name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-1 bg-blue-600 rounded text-sm font-bold">
                            {rider.category}
                          </span>
                          {rider.current_velo_rank && tier && (
                            <span 
                              className="px-2 py-1 rounded text-sm font-bold"
                              style={{
                                backgroundColor: tier.color,
                                color: '#fff'
                              }}
                              title={`${tier.name} Tier`}
                            >
                              {tier.rank}
                            </span>
                          )}
                          {rider.current_velo_rank && (
                            <span className="text-sm text-cyan-400 font-bold">
                              {Math.floor(rider.current_velo_rank)}
                            </span>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                          {rider.racing_ftp && (
                            <div className="bg-black/50 rounded px-2 py-1">
                              <span className="text-slate-400">FTP:</span>
                              <span className="ml-1 font-bold">{rider.racing_ftp}W</span>
                            </div>
                          )}
                          {ftpWkg && (
                            <div className="bg-black/50 rounded px-2 py-1">
                              <span className="text-slate-400">W/kg:</span>
                              <span className="ml-1 font-bold">{ftpWkg}</span>
                            </div>
                          )}
                          {rider.zwift_official_racing_score && (
                            <div className="bg-black/50 rounded px-2 py-1">
                              <span className="text-slate-400">ZRS:</span>
                              <span className="ml-1 font-bold">{Math.round(rider.zwift_official_racing_score)}</span>
                            </div>
                          )}
                          {rider.phenotype && (
                            <div className="bg-black/50 rounded px-2 py-1 truncate">
                              <span className="font-bold">{rider.phenotype}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Validation Warning */}
                      {!rider.is_valid && rider.validation_warning && (
                        <div className="absolute top-2 left-2 right-2 bg-orange-600/90 text-white text-xs p-2 rounded">
                          ⚠️ {rider.validation_warning}
                        </div>
                      )}
                    </div>

                    {/* Remove Button */}
                    <div className="p-2 bg-slate-900/80">
                      <button
                        onClick={() => removeRiderMutation.mutate(rider.rider_id)}
                        className="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                      >
                        🗑️ Verwijder
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
