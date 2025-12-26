import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { getVeloTier } from '../constants/racing'
import RiderPassportSidebar from '../components/RiderPassportSidebar'
import TeamCard from '../components/TeamCard'
import EditTeamModal from '../components/EditTeamModal'
import DraggableRiderCard from '../components/DraggableRiderCard'
import LineupRiderCard from '../components/LineupRiderCard'
import LineupDropZone from '../components/LineupDropZone'
import EntryCodeLogin from '../components/EntryCodeLogin'

// ============================================================================
// 🎯 TYPES
// ============================================================================

interface Rider {
  rider_id: number
  name: string
  full_name: string
  zwift_official_category: string | null
  zwiftracing_category: string | null
  velo_live: number
  velo_30day: number | null
  country_alpha3: string
  avatar_url: string
  phenotype: string | null
  zwift_official_racing_score: number | null
  racing_name: string | null
  racing_ftp: number | null
  weight_kg: number | null
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
  allow_category_up?: boolean
  min_riders: number
  max_riders: number
  current_riders: number
  valid_riders: number
  invalid_riders: number
  current_velo_spread?: number
  team_status: 'incomplete' | 'ready' | 'warning' | 'overfilled'
}

interface LineupRider {
  rider_id: number
  lineup_id: number
  lineup_position: number
  name: string
  full_name: string
  country_alpha3: string
  avatar_url?: string
  category: string
  velo_live: number
  velo_30day: number | null
  phenotype: string | null
  zwift_official_racing_score: number | null
  is_valid: boolean
  validation_warning?: string
}

interface TeamBuilderProps {
  hideHeader?: boolean
}

interface NewTeam {
  team_name: string
  competition_type: 'velo' | 'category'
  competition_name: string
  velo_min_rank: number
  velo_max_rank: number
  velo_max_spread: number
  allowed_categories: string[]
  allow_category_up: boolean
  min_riders: number
  max_riders: number
}

// ============================================================================
// 🏗️ MAIN COMPONENT
// ============================================================================

export default function TeamBuilder({ hideHeader = false }: TeamBuilderProps) {
  const queryClient = useQueryClient()
  const CORRECT_CODE = 'CLOUD9RACING'
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [entryCode, setEntryCode] = useState('')
  
  // UI state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeRider, setActiveRider] = useState<Rider | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Form state
  const [newTeam, setNewTeam] = useState<NewTeam>({
    team_name: '',
    competition_type: 'category',
    competition_name: '',
    velo_min_rank: 1,
    velo_max_rank: 3,
    velo_max_spread: 3,
    allowed_categories: ['A', 'B'],
    allow_category_up: true,
    min_riders: 4,
    max_riders: 8
  })
  
  // ============================================================================
  // 🎮 SENSORS
  // ============================================================================
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 10,
      },
    })
  )
  
  // ============================================================================
  // 📡 QUERIES
  // ============================================================================
  
  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch('/api/teams')
      if (!res.ok) throw new Error('Failed to fetch teams')
      return res.json()
    }
  })
  
  const { data: ridersData } = useQuery({
    queryKey: ['riders'],
    queryFn: async () => {
      const res = await fetch('/api/riders')
      if (!res.ok) throw new Error('Failed to fetch riders')
      return res.json()
    }
  })
  
  const { data: lineupData } = useQuery({
    queryKey: ['team-lineup', selectedTeam?.team_id],
    queryFn: async () => {
      if (!selectedTeam) return null
      const res = await fetch(`/api/teams/${selectedTeam.team_id}`)
      if (!res.ok) throw new Error('Failed to fetch lineup')
      return res.json()
    },
    enabled: !!selectedTeam
  })
  
  // ============================================================================
  // 🔄 MUTATIONS
  // ============================================================================
  
  const createTeamMutation = useMutation({
    mutationFn: async (team: NewTeam) => {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(team)
      })
      if (!res.ok) throw new Error('Failed to create team')
      return res.json()
    },
    onSuccess: (data: any) => {
      toast.success(`Team "${data.team.team_name}" created!`)
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setShowCreateModal(false)
      setSelectedTeam(data.team)
      resetNewTeamForm()
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
  
  const addRiderMutation = useMutation({
    mutationFn: async ({ teamId, riderId, position }: { teamId: number, riderId: number, position?: number }) => {
      const res = await fetch(`/api/teams/${teamId}/riders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_id: riderId, lineup_position: position })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add rider')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team-lineup', selectedTeam?.team_id] })
      toast.success('Rider added to team!')
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
  
  const removeRiderMutation = useMutation({
    mutationFn: async ({ teamId, riderId }: { teamId: number, riderId: number }) => {
      const res = await fetch(`/api/teams/${teamId}/riders/${riderId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to remove rider')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team-lineup', selectedTeam?.team_id] })
      toast.success('Rider removed from team')
    }
  })
  
  const updateTeamMutation = useMutation({
    mutationFn: async ({ teamId, updates }: { teamId: number, updates: any }) => {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error('Failed to update team')
      return res.json()
    },
    onSuccess: (data: any) => {
      toast.success(`Team "${data.team.team_name}" updated!`)
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setShowEditModal(false)
      setSelectedTeam(data.team)
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
  
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete team')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Team deleted')
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setSelectedTeam(null)
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
  
  const reorderRidersMutation = useMutation({
    mutationFn: async ({ teamId, riderIds }: { teamId: number, riderIds: number[] }) => {
      const res = await fetch(`/api/teams/${teamId}/lineup/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_ids: riderIds })
      })
      if (!res.ok) throw new Error('Failed to reorder riders')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Lineup reordered!')
      queryClient.invalidateQueries({ queryKey: ['lineup', selectedTeam?.team_id] })
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
  
  // ============================================================================
  // 🧮 DATA PROCESSING
  // ============================================================================
  
  const teams: Team[] = teamsData?.teams || []
  const allRiders: Rider[] = ridersData?.riders || []
  const lineup: LineupRider[] = lineupData?.lineup || []
  
  const filteredRiders = allRiders.filter(rider => {
    const matchesSearch = !searchTerm || 
      rider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.rider_id.toString().includes(searchTerm)
    
    if (!matchesSearch) return false
    if (lineup.some(l => l.rider_id === rider.rider_id)) return false
    if (!selectedTeam) return true
    
    if (selectedTeam.competition_type === 'velo') {
      const velo30day = rider.velo_30day || rider.velo_live
      const veloTier = getVeloTier(velo30day)
      const riderTierRank = veloTier?.rank || 10
      return riderTierRank >= (selectedTeam.velo_min_rank || 1) && 
             riderTierRank <= (selectedTeam.velo_max_rank || 10)
    } else {
      const category = rider.zwift_official_category || rider.zwiftracing_category || 'D'
      return selectedTeam.allowed_categories?.includes(category)
    }
  })
  
  // ============================================================================
  // 🎬 HANDLERS
  // ============================================================================
  
  const handleEntryCodeSubmit = (code: string) => {
    if (code.toUpperCase() === CORRECT_CODE) {
      setIsAuthenticated(true)
      sessionStorage.setItem('teamBuilderAuth', 'true')
      toast.success('✅ Toegang verleend!')
    } else {
      toast.error('❌ Onjuiste code')
      setEntryCode('')
    }
  }
  
  const resetNewTeamForm = () => {
    setNewTeam({
      team_name: '',
      competition_type: 'category',
      competition_name: '',
      velo_min_rank: 1,
      velo_max_rank: 3,
      velo_max_spread: 3,
      allowed_categories: ['A', 'B'],
      allow_category_up: true,
      min_riders: 4,
      max_riders: 8
    })
  }
  
  const handleCreateTeam = () => {
    createTeamMutation.mutate(newTeam)
  }
  
  const handleEditTeam = (updates: any) => {
    if (!editingTeam) return
    updateTeamMutation.mutate({
      teamId: editingTeam.team_id,
      updates
    })
  }
  
  const handleDeleteTeam = (teamId: number) => {
    if (confirm('Weet je zeker dat je dit team wilt verwijderen? Alle lineup data wordt ook verwijderd.')) {
      deleteTeamMutation.mutate(teamId)
    }
  }
  
  const handleAddRider = (riderId: number) => {
    if (!selectedTeam) return
    const nextPosition = lineup.length + 1
    addRiderMutation.mutate({
      teamId: selectedTeam.team_id,
      riderId,
      position: nextPosition
    })
  }
  
  const handleRemoveRider = (riderId: number) => {
    if (!selectedTeam) return
    removeRiderMutation.mutate({
      teamId: selectedTeam.team_id,
      riderId
    })
  }
  
  const handleDragStart = (event: DragStartEvent) => {
    const rider = allRiders.find(r => r.rider_id === event.active.id)
    setActiveRider(rider || null)
  }
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const riderId = Number(active.id)
    
    if (!over) {
      setActiveRider(null)
      toast.success('Drag geannuleerd - rider niet toegevoegd', {
        duration: 2000,
        icon: '✋'
      })
      return
    }
    
    // Reorder within lineup
    const activeInLineup = lineup.find(r => r.rider_id === riderId)
    const overRiderId = Number(over.id)
    const overInLineup = lineup.find(r => r.rider_id === overRiderId)
    
    if (activeInLineup && overInLineup && riderId !== overRiderId) {
      const oldIndex = lineup.findIndex(r => r.rider_id === riderId)
      const newIndex = lineup.findIndex(r => r.rider_id === overRiderId)
      
      const reordered = [...lineup]
      const [movedItem] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, movedItem)
      
      reorderRidersMutation.mutate({
        teamId: selectedTeam!.team_id,
        riderIds: reordered.map(r => r.rider_id)
      })
      
      setActiveRider(null)
      return
    }
    
    // Add to team from TeamCard
    if (typeof over.id === 'string' && over.id.startsWith('team-')) {
      const teamId = Number(over.id.replace('team-', ''))
      addRiderMutation.mutate({ teamId, riderId })
      setActiveRider(null)
      return
    }
    
    // Add to lineup
    if (over.id === 'lineup-drop-zone' && selectedTeam) {
      handleAddRider(riderId)
    }
    
    setActiveRider(null)
  }
  
  // ============================================================================
  // 🪝 EFFECTS
  // ============================================================================
  
  useEffect(() => {
    const auth = sessionStorage.getItem('teamBuilderAuth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])
  
  // ============================================================================
  // 🎨 RENDER
  // ============================================================================
  
  if (!isAuthenticated) {
    return (
      <EntryCodeLogin
        onSubmit={handleEntryCodeSubmit}
        code={entryCode}
        setCode={setEntryCode}
      />
    )
  }
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
        {isAuthenticated && (
          <RiderPassportSidebar
            riders={allRiders}
            isOpen={sidebarOpen}
            selectedTeam={selectedTeam || undefined}
            onClearTeamFilter={() => setSelectedTeam(null)}
            onAddRider={selectedTeam ? (riderId) => handleAddRider(riderId) : undefined}
          />
        )}
        
        <div className="flex-1 min-w-0">
          {!hideHeader && (
            <div className="relative overflow-hidden mb-4 sm:mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-blue-600 to-orange-500 opacity-95"></div>
              <div className="relative px-3 py-4 sm:px-6 sm:py-6 lg:py-10">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4">
                    <div className="p-2 sm:p-3 lg:p-4 bg-white/20 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-2xl flex-shrink-0">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3">
                        <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">TEAM BUILDER</span>
                      </h1>
                      <p className="text-orange-100 text-xs sm:text-sm lg:text-lg xl:text-xl font-semibold mt-1 sm:mt-2 truncate">
                        TeamNL Cloud9 Racing · Beheer je teams
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-lg rounded-xl border-2 border-white/30 text-white font-bold text-sm transition-all shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span className="hidden sm:inline">{sidebarOpen ? 'Verberg Riders' : 'Toon Riders'}</span>
                        <span className="sm:hidden">{sidebarOpen ? '←' : '→'}</span>
                      </button>
                      <button
                        onClick={() => window.location.pathname = '/'}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 backdrop-blur-lg rounded-xl border-2 border-blue-400/50 text-white font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:scale-105"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="hidden sm:inline">Team Viewer</span>
                        <span className="sm:hidden">👁️</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              
              {/* Left: Teams List */}
              <div className="xl:col-span-1">
                <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-lg p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Teams</h2>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold shadow-lg whitespace-nowrap"
                    >
                      <span className="hidden sm:inline">+ New Team</span>
                      <span className="sm:hidden">+ Team</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {teams.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">
                        <p>No teams yet</p>
                        <p className="text-sm">Create your first team!</p>
                      </div>
                    ) : (
                      teams.map(team => (
                        <TeamCard
                          key={team.team_id}
                          team={team}
                          isDragging={activeRider !== null}
                          onEdit={() => {
                            setEditingTeam(team)
                            setShowEditModal(true)
                          }}
                          onDelete={() => handleDeleteTeam(team.team_id)}
                          onOpenDetail={() => {
                            setSelectedTeam(team)
                            setSidebarOpen(true)
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
              
              {/* Middle: Current Lineup */}
              <div className="xl:col-span-1">
                {selectedTeam ? (
                  <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-lg p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                        {selectedTeam.team_name} Lineup
                      </h2>
                      <button
                        onClick={() => {
                          setEditingTeam(selectedTeam)
                          setShowEditModal(true)
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                      >
                        ✏️ <span className="hidden sm:inline">Bewerk Team</span>
                      </button>
                    </div>
                    
                    <LineupDropZone lineup={lineup}>
                      <SortableContext
                        items={lineup.map(r => r.rider_id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {lineup.map(rider => (
                            <LineupRiderCard
                              key={rider.rider_id}
                              rider={rider}
                              onRemove={() => handleRemoveRider(rider.rider_id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </LineupDropZone>
                    
                    <div className="mt-4 p-4 bg-gray-700/30 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">Riders</div>
                          <div className="text-2xl font-bold">
                            {lineup.length} / {selectedTeam.max_riders}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400">Valid</div>
                          <div className="text-2xl font-bold text-green-400">
                            {lineup.filter(r => r.is_valid).length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-lg p-6 flex items-center justify-center h-full">
                    <div className="text-center text-gray-400">
                      <div className="text-6xl mb-4">🏆</div>
                      <p className="text-lg">Select a team to start building</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right: Available Riders */}
              <div className="xl:col-span-1">
                <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-lg p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Riders</h2>
                  
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Zoek riders..."
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-white border border-gray-300 rounded-lg mb-3 sm:mb-4 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-900"
                  />
                  
                  <div className="space-y-2 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                    {filteredRiders.map(rider => (
                      <DraggableRiderCard
                        key={rider.rider_id}
                        rider={rider}
                        onAdd={() => handleAddRider(rider.rider_id)}
                      />
                    ))}
                    
                    {filteredRiders.length === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        <p>No eligible riders found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Modals */}
          {showEditModal && editingTeam && (
            <EditTeamModal
              team={editingTeam}
              onClose={() => {
                setShowEditModal(false)
                setEditingTeam(null)
              }}
              onSave={handleEditTeam}
              isLoading={updateTeamMutation.isPending}
            />
          )}
          
          {showCreateModal && (
            <CreateTeamModal
              newTeam={newTeam}
              setNewTeam={setNewTeam}
              onClose={() => {
                setShowCreateModal(false)
                resetNewTeamForm()
              }}
              onCreate={handleCreateTeam}
              isLoading={createTeamMutation.isPending}
            />
          )}
          
          <DragOverlay>
            {activeRider && (
              <div className="bg-blue-500 text-white p-3 rounded-lg shadow-2xl opacity-90">
                {activeRider.name || activeRider.full_name}
              </div>
            )}
          </DragOverlay>
        </div>
      </div>
    </DndContext>
  )
}

// ============================================================================
// 🏗️ CREATE TEAM MODAL COMPONENT
// ============================================================================

interface CreateTeamModalProps {
  newTeam: NewTeam
  setNewTeam: (team: NewTeam) => void
  onClose: () => void
  onCreate: () => void
  isLoading: boolean
}

function CreateTeamModal({ newTeam, setNewTeam, onClose, onCreate, isLoading }: CreateTeamModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl border-2 border-orange-500/50 shadow-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">Nieuw Team</h2>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-gray-900">Team Naam *</label>
            <input
              type="text"
              value={newTeam.team_name}
              onChange={(e) => setNewTeam({ ...newTeam, team_name: e.target.value })}
              placeholder="bijv. TeamNL ZRL A/B"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-gray-900">Competitie Type *</label>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <button
                onClick={() => setNewTeam({ ...newTeam, competition_type: 'category' })}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all min-h-[80px] sm:min-h-0 ${
                  newTeam.competition_type === 'category'
                    ? 'bg-blue-500 border-blue-600 text-white shadow-lg'
                    : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400'
                }`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🏆</div>
                <div className="font-bold text-sm sm:text-base">Category</div>
                <div className={`text-[10px] sm:text-xs ${
                  newTeam.competition_type === 'category' ? 'text-blue-100' : 'text-gray-500'
                }`}>bijv: WTRL ZRL</div>
              </button>
              <button
                onClick={() => setNewTeam({ ...newTeam, competition_type: 'velo' })}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all min-h-[80px] sm:min-h-0 ${
                  newTeam.competition_type === 'velo'
                    ? 'bg-orange-500 border-orange-600 text-white shadow-lg'
                    : 'bg-white border-gray-300 text-gray-900 hover:border-orange-400'
                }`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">⚡</div>
                <div className="font-bold text-sm sm:text-base">vELO</div>
                <div className={`text-[10px] sm:text-xs ${
                  newTeam.competition_type === 'velo' ? 'text-orange-100' : 'text-gray-500'
                }`}>bijv: Club Ladder</div>
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-gray-900">Competitie Naam</label>
            <input
              type="text"
              value={newTeam.competition_name}
              onChange={(e) => setNewTeam({ ...newTeam, competition_name: e.target.value })}
              placeholder="bijv. WTRL ZRL Season 5"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>
          
          {newTeam.competition_type === 'velo' && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-orange-50 rounded-lg border-2 border-orange-300">
              <h3 className="font-bold text-orange-700 text-sm sm:text-base">vELO Instellingen</h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm mb-1 sm:mb-2 text-gray-900 font-semibold">Min Rank</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTeam.velo_min_rank}
                    onChange={(e) => setNewTeam({ ...newTeam, velo_min_rank: parseInt(e.target.value) })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm mb-1 sm:mb-2 text-gray-900 font-semibold">Max Rank</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTeam.velo_max_rank}
                    onChange={(e) => setNewTeam({ ...newTeam, velo_max_rank: parseInt(e.target.value) })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="text-[10px] sm:text-xs text-orange-700 font-semibold">
                Max spread: {newTeam.velo_max_rank - newTeam.velo_min_rank + 1} ranks
              </div>
            </div>
          )}
          
          {newTeam.competition_type === 'category' && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <h3 className="font-bold text-blue-700 text-sm sm:text-base">Category Instellingen</h3>
              <div>
                <label className="block text-xs sm:text-sm mb-1 sm:mb-2 text-gray-900 font-semibold">Toegestane Categories</label>
                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                  {['A+', 'A', 'B', 'C', 'D'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        const current = newTeam.allowed_categories
                        const updated = current.includes(cat)
                          ? current.filter((c: string) => c !== cat)
                          : [...current, cat]
                        setNewTeam({ ...newTeam, allowed_categories: updated })
                      }}
                      className={`px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base rounded-lg border-2 transition-all font-bold min-h-[44px] sm:min-h-0 flex items-center justify-center ${
                        newTeam.allowed_categories.includes(cat)
                          ? 'bg-blue-500 border-blue-600 text-white shadow-lg'
                          : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-gray-900">Min Riders</label>
              <input
                type="number"
                min="1"
                value={newTeam.min_riders}
                onChange={(e) => setNewTeam({ ...newTeam, min_riders: parseInt(e.target.value) })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-gray-900">Max Riders</label>
              <input
                type="number"
                min="1"
                value={newTeam.max_riders}
                onChange={(e) => setNewTeam({ ...newTeam, max_riders: parseInt(e.target.value) })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 sm:gap-4 mt-4 sm:mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-lg font-bold border-2 border-gray-300 transition-all min-h-[48px] sm:min-h-0 flex items-center justify-center"
            disabled={isLoading}
          >
            Annuleer
          </button>
          <button
            onClick={onCreate}
            className="flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-bold shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[48px] sm:min-h-0 flex items-center justify-center"
            disabled={isLoading || !newTeam.team_name}
          >
            {isLoading ? 'Maken...' : 'Maak Team'}
          </button>
        </div>
      </div>
    </div>
  )
}
