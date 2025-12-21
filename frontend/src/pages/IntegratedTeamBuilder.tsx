import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, DragCancelEvent } from '@dnd-kit/core'
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
  teams?: Array<{ team_id: number; team_name: string }>
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
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null)
  const [draggedRider, setDraggedRider] = useState<Rider | null>(null)
  const queryClient = useQueryClient()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 10 },
    })
  )

  const { data: ridersData, isLoading: ridersLoading } = useQuery({
    queryKey: ['riders'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders`)
      if (!res.ok) throw new Error('Failed to fetch riders')
      return res.json()
    }
  })

  const { data: teamsData, isLoading: teamsLoading, refetch: refetchTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/teams`)
      if (!res.ok) throw new Error('Failed to fetch teams')
      const data = await res.json()
      return data.teams || []
    }
  })

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

  const handleDragStart = (event: any) => {
    const rider = event.active.data.current?.rider
    if (rider) setDraggedRider(rider)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    // Alleen droppen als er een valid drop target is
    if (over && active.data.current?.rider) {
      const rider = active.data.current.rider
      const teamIdMatch = over.id.toString().match(/team-(\d+)/)
      if (teamIdMatch) {
        const teamId = parseInt(teamIdMatch[1])
        
        // Check of rider al in dit specifieke team zit
        const riderTeams = rider.teams || []
        const alreadyInTeam = riderTeams.some((t: any) => t.team_id === teamId)
        
        if (alreadyInTeam) {
          toast.error(`${rider.full_name} zit al in dit team!`, {
            duration: 3000,
            icon: '⚠️'
          })
        } else {
          addRiderMutation.mutate({ teamId, riderId: rider.rider_id })
        }
      }
    } else if (active.data.current?.rider) {
      // Geen drop target: cancelled/released zonder actie
      const rider = active.data.current.rider
      toast.success(`${rider.full_name} niet toegevoegd - vrijgegeven`, {
        duration: 2000,
        icon: '✋'
      })
    }
    setDraggedRider(null)
  }

  const handleDragCancel = (event: DragCancelEvent) => {
    if (event.active.data.current?.rider) {
      const rider = event.active.data.current.rider
      toast.success(`${rider.full_name} drag geannuleerd`, {
        duration: 2000,
        icon: '🚫'
      })
    }
    setDraggedRider(null)
  }

  const handleOpenTeamDetail = (teamId: number) => {
    setSelectedTeamId(teamId)
  }

  const handleCloseTeamDetail = () => {
    setSelectedTeamId(null)
  }

  const handleToggleTeamExpand = (teamId: number) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null)
      setSidebarOpen(true)
    } else {
      setExpandedTeamId(teamId)
      setSidebarOpen(false)
    }
  }

  if (ridersLoading || teamsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-40">
          <div className="max-w-[1920px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">🏆 Team Builder</h1>
                <p className="text-slate-400 text-sm">Drag & drop riders om teams samen te stellen</p>
              </div>
              {!expandedTeamId ? (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {sidebarOpen ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                      Verberg Riders
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                      Toon Riders
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleToggleTeamExpand(expandedTeamId)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Sluit Team Detail
                </button>
              ) : (
                <button
                  onClick={handleCloseTeamDetail}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Terug naar Teams
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex max-w-[1920px] mx-auto relative">
          {/* Left Sidebar - Riders (altijd zichtbaar op desktop) */}
          {!expandedTeamId && (
            <RiderPassportSidebar
              riders={riders}
              isOpen={sidebarOpen}
            />
          )}

          {/* Drag Overlay - toont "Release to cancel" feedback */}
          {draggedRider && (
            <div className="fixed inset-0 z-30 pointer-events-none">
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-600 text-white text-sm shadow-2xl">
                <span className="font-semibold">💡 Sleep naar team</span>
                <span className="mx-2 text-slate-400">•</span>
                <span className="text-slate-300">Laat los om te annuleren</span>
              </div>
            </div>
          )}

          {/* Center - Team Cards (compacte badges) */}
          <main className={`flex-1 p-6 transition-all duration-300`}>
            {teams.length === 0 ? (
              <div className="text-center text-white py-20">
                <p className="text-xl">Geen teams gevonden</p>
                <p className="text-slate-400 mt-2">Maak eerst teams aan via Team Manager</p>
              </div>
            ) : expandedTeamId ? (
              <div className="max-w-4xl mx-auto">
                <TeamCard
                  key={expandedTeamId}
                  team={teams.find(t => t.team_id === expandedTeamId)!}
                  onOpenDetail={handleOpenTeamDetail}
                  isDragging={draggedRider !== null}
                  refetchTeams={refetchTeams}
                  isExpanded={true}
                  onToggleExpand={handleToggleTeamExpand}
                />
              </div>
            ) : (
              <div className={`grid gap-4 ${
                sidebarOpen && !selectedTeamId
                  ? 'grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' 
                  : selectedTeamId
                  ? 'grid-cols-2 xl:grid-cols-3'
                  : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
              }`}>
                {teams.map(team => (
                  <TeamCard
                    key={team.team_id}
                    team={team}
                    onOpenDetail={handleOpenTeamDetail}
                    isDragging={draggedRider !== null}
                    refetchTeams={refetchTeams}
                    onToggleExpand={handleToggleTeamExpand}
                  />
                ))}
              </div>
            )}
          </main>

          {/* Right Sidebar - Selected Team Lineup */}
          {selectedTeamId && !expandedTeamId && (
            <TeamLineupModal
              teamId={selectedTeamId}
              onClose={handleCloseTeamDetail}
            />
          )}
        </div>
      </div>
    </DndContext>
  )
}
