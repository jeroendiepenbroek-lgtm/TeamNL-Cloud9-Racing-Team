import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, DragCancelEvent, useDroppable } from '@dnd-kit/core'
import TeamCard from '../components/TeamCard.tsx'
import TeamCardExpanded from '../components/TeamCardExpanded.tsx'
import RiderPassportSidebar from '../components/RiderPassportSidebar.tsx'
import TeamLineupModal from '../components/TeamLineupModal.tsx'
import EditTeamModal from '../components/EditTeamModal.tsx'

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
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null)
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
      queryClient.invalidateQueries({ queryKey: ['riders'] }) // Update riders array met nieuwe teams
      toast.success('Rider toegevoegd aan team!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const updateTeamMutation = useMutation({
    mutationFn: async ({ teamId, updates }: { teamId: number; updates: any }) => {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error('Failed to update team')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team bijgewerkt!')
      setEditingTeamId(null)
    },
    onError: () => {
      toast.error('Kon team niet bijwerken')
    }
  })

  const handleEditTeam = (updates: any) => {
    if (!editingTeamId) return
    updateTeamMutation.mutate({
      teamId: editingTeamId,
      updates
    })
  }

  const riders: Rider[] = ridersData || []
  const teams: Team[] = teamsData || []

  const handleDragStart = (event: any) => {
    const rider = event.active.data.current?.rider
    if (rider) setDraggedRider(rider)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('🎯 DragEnd:', { activeId: active.id, overId: over?.id, overData: over?.data })
    
    if (over && active.data.current?.rider) {
      const rider = active.data.current.rider
      const overId = over.id.toString()
      console.log('✅ Rider dropped:', rider.full_name, 'on:', overId)
      
      // Check voor cancel zone
      if (overId === 'cancel-drop-zone') {
        toast.success(`${rider.full_name} niet toegevoegd - geannuleerd`, {
          duration: 2000,
          icon: '✋'
        })
        setDraggedRider(null)
        return
      }
      
      // Check voor team drop (normale card, sidebar of expanded)
      const teamIdMatch = overId.match(/team-(\d+)/)
      const sidebarMatch = overId.match(/lineup-sidebar-(\d+)/)
      const expandedMatch = overId.match(/team-expanded-(\d+)/)
      
      if (teamIdMatch || sidebarMatch || expandedMatch) {
        const teamId = parseInt((teamIdMatch || sidebarMatch || expandedMatch)![1])
        
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
      // Geen drop target: vrijgegeven zonder actie
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
    console.log('🔵 Opening team detail sidebar for team:', teamId)
    // Close expanded view als die open is
    if (expandedTeamId) {
      console.log('  Closing expanded view:', expandedTeamId)
      setExpandedTeamId(null)
    }
    // Ensure sidebar is open when opening team detail
    setSidebarOpen(true)
    console.log('  Setting selectedTeamId to:', teamId)
    setSelectedTeamId(teamId)
  }

  const handleCloseTeamDetail = () => {
    setSelectedTeamId(null)
  }

  const handleToggleTeamExpand = (teamId: number) => {
    // Close sidebar als die open is
    if (selectedTeamId) {
      setSelectedTeamId(null)
    }
    
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null)
      setSidebarOpen(true)
    } else {
      setExpandedTeamId(teamId)
      setSidebarOpen(false)
    }
  }

  // Cancel Drop Zone Component
  const CancelDropZone = () => {
    const { setNodeRef, isOver } = useDroppable({
      id: 'cancel-drop-zone'
    })

    if (!draggedRider) return null

    return (
      <div 
        ref={setNodeRef}
        className={`fixed top-20 left-0 right-0 z-40 pointer-events-auto transition-all ${
          isOver ? 'scale-105' : 'scale-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className={`backdrop-blur-sm border-2 border-dashed rounded-xl p-6 text-center transition-all ${
            isOver 
              ? 'bg-red-500/30 border-red-400 shadow-lg shadow-red-500/50' 
              : 'bg-orange-500/20 border-orange-400'
          }`}>
            <p className={`text-lg font-bold mb-1 transition-colors ${
              isOver ? 'text-red-300' : 'text-orange-300'
            }`}>
              {isOver ? '🗑️ Drop om te annuleren' : '✋ Annuleer Zone'}
            </p>
            <p className={`text-sm transition-colors ${
              isOver ? 'text-red-200' : 'text-orange-200'
            }`}>
              {isOver ? 'Laat los om drag te annuleren' : 'Sleep hierheen om te annuleren'}
            </p>
          </div>
        </div>
      </div>
    )
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
              )}
            </div>
          </div>
        </header>

        <div className="flex max-w-[1920px] mx-auto relative overflow-visible">
          {/* Left Sidebar - Riders (altijd zichtbaar op desktop) */}
          {!expandedTeamId && (
            <RiderPassportSidebar
              riders={riders}
              isOpen={sidebarOpen}
              selectedTeam={selectedTeamId ? teams.find(t => t.team_id === selectedTeamId) : null}
              onAddRider={(riderId) => {
                if (!selectedTeamId) {
                  toast.error('Selecteer eerst een team')
                  return
                }
                addRiderMutation.mutate({ teamId: selectedTeamId, riderId })
              }}
            />
          )}

          {/* Cancel Drop Zone - Droppable voor annuleren */}
          <CancelDropZone />

          {/* Bottom Helper Text */}
          {draggedRider && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-slate-800/95 backdrop-blur-sm rounded-xl border-2 border-blue-500/50 text-white text-sm shadow-2xl z-30 pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="font-semibold">💡 Sleep naar team</span>
                <span className="text-slate-400">•</span>
                <span className="text-blue-300">naar cancel zone</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">of laat ergens anders los</span>
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
              <TeamCardExpanded
                key={expandedTeamId}
                team={teams.find(t => t.team_id === expandedTeamId)!}
                isDragging={draggedRider !== null}
                onCollapse={() => handleToggleTeamExpand(expandedTeamId)}
              />
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
                    onEdit={() => setEditingTeamId(team.team_id)}
                    isDragging={draggedRider !== null}
                    refetchTeams={refetchTeams}
                    onToggleExpand={handleToggleTeamExpand}
                  />
                ))}
              </div>
            )}
          </main>

          {/* Right Sidebar - Selected Team Lineup met droppable support */}
          {selectedTeamId && (() => {
            console.log('🟢 Rendering TeamLineupModal for team:', selectedTeamId)
            return (
              <div className="fixed md:static inset-y-0 right-0 md:flex-shrink-0 h-screen z-50">
                <TeamLineupModal
                  teamId={selectedTeamId}
                  onClose={handleCloseTeamDetail}
                  isDragging={draggedRider !== null}
                />
              </div>
            )
          })()}

          {/* Edit Team Modal */}
          {editingTeamId && (() => {
            const editingTeam = teams.find(t => t.team_id === editingTeamId)
            if (!editingTeam) return null
            return (
              <EditTeamModal
                team={editingTeam}
                onClose={() => setEditingTeamId(null)}
                onSave={handleEditTeam}
                isLoading={updateTeamMutation.isPending}
              />
            )
          })()}
        </div>
      </div>
    </DndContext>
  )
}
