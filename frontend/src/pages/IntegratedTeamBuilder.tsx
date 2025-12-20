import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import TeamCard from '../components/TeamCard.tsx'
import RiderPassportSidebar from '../components/RiderPassportSidebar.tsx'
import TeamLineupModal from '../components/TeamLineupModal.tsx'

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8080'

interface Rider {
  rider_id: number
  racing_name: string
  full_name: string
  zwift_official_category: string | null
  zwiftracing_category: string | null
  country_alpha3: string
  velo_live: number
  velo_30day: number
  racing_ftp: number
  weight_kg: number
  avatar_url: string
  phenotype: string | null
  team_id?: number | null
  team_name?: string | null
}

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

export default function IntegratedTeamBuilder() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [draggedRider, setDraggedRider] = useState<Rider | null>(null)
  const queryClient = useQueryClient()

  // Fetch all riders
  const { data: ridersData, isLoading: ridersLoading } = useQuery({
    queryKey: ['riders'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders`)
      if (!res.ok) throw new Error('Failed to fetch riders')
      return res.json()
    }
  })

  // Fetch all teams
  const { data: teamsData, isLoading: teamsLoading, refetch: refetchTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/teams`)
      if (!res.ok) throw new Error('Failed to fetch teams')
      const data = await res.json()
      return data.teams || []
    }
  })

  // Add rider to team mutation
  const addRiderMutation = useMutation({
    mutationFn: async ({ teamId, riderId }: { teamId: number; riderId: number }) => {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}/riders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_id: riderId })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add rider')
      }
      return res.json()
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
      toast.success('Rider toegevoegd aan team!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const riders: Rider[] = ridersData || []
  const teams: Team[] = teamsData || []

  const handleDragStart = (rider: Rider) => {
    setDraggedRider(rider)
  }

  const handleDrop = (teamId: number) => {
    if (draggedRider) {
      addRiderMutation.mutate({ teamId, riderId: draggedRider.rider_id })
      setDraggedRider(null)
    }
  }

  const handleOpenTeamDetail = (teamId: number) => {
    setSelectedTeamId(teamId)
  }

  const handleCloseTeamDetail = () => {
    setSelectedTeamId(null)
  }

  if (ridersLoading || teamsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">🏆 Team Builder</h1>
              <p className="text-slate-400 text-sm">Drag & drop riders om teams samen te stellen</p>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {sidebarOpen ? '← Verberg Riders' : '→ Toon Riders'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex max-w-[1920px] mx-auto">
        {/* Sidebar: Rider Passport Gallery */}
        <RiderPassportSidebar
          riders={riders}
          isOpen={sidebarOpen}
          onDragStart={handleDragStart}
        />

        {/* Main: Team Cards Grid */}
        <main className={`flex-1 p-6 transition-all duration-300 ${sidebarOpen ? 'ml-0' : ''}`}>
          {teams.length === 0 ? (
            <div className="text-center text-white py-20">
              <p className="text-xl">Geen teams gevonden</p>
              <p className="text-slate-400 mt-2">Maak eerst teams aan via Team Manager</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
              {teams.map(team => (
                <TeamCard
                  key={team.team_id}
                  team={team}
                  onDrop={handleDrop}
                  onOpenDetail={handleOpenTeamDetail}
                  isDragging={draggedRider !== null}
                  refetchTeams={refetchTeams}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Team Lineup Detail Modal */}
      {selectedTeamId && (
        <TeamLineupModal
          teamId={selectedTeamId}
          onClose={handleCloseTeamDetail}
        />
      )}
    </div>
  )
}
