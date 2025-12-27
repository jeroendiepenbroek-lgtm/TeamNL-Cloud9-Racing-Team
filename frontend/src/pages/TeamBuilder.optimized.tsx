import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import RiderPassportSidebar from '../components/RiderPassportSidebar'
import TeamCard from '../components/TeamCard'
import EditTeamModal from '../components/EditTeamModal'
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
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
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
    queryKey: ['team-lineup', expandedTeamId],
    queryFn: async () => {
      if (!expandedTeamId) return null
      const res = await fetch(`/api/teams/${expandedTeamId}`)
      if (!res.ok) throw new Error('Failed to fetch lineup')
      return res.json()
    },
    enabled: !!expandedTeamId
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
      queryClient.invalidateQueries({ queryKey: ['team-lineup', expandedTeamId] })
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
      queryClient.invalidateQueries({ queryKey: ['team-lineup', expandedTeamId] })
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
  
  const handleAddRider = (teamId: number, riderId: number) => {
    const team = teams.find(t => t.team_id === teamId)
    if (!team) return
    
    // Get current lineup voor dit team
    const currentLineup = teamId === expandedTeamId ? (lineupData?.lineup || []) : []
    const nextPosition = currentLineup.length + 1
    
    addRiderMutation.mutate({
      teamId,
      riderId,
      position: nextPosition
    })
  }
  
  const handleRemoveRider = (teamId: number, riderId: number) => {
    removeRiderMutation.mutate({
      teamId,
      riderId
    })
  }
  
  const handleToggleExpand = (teamId: number) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null)
    } else {
      setExpandedTeamId(teamId)
    }
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
    
    // Check if dropped on a team card
    const teamMatch = over.id.toString().match(/^team-(\\d+)$/)
    if (teamMatch) {
      const teamId = parseInt(teamMatch[1])
      handleAddRider(teamId, riderId)
      setActiveRider(null)
      return
    }
    
    // Check if dropped on lineup drop zone
    if (over.id === 'lineup-drop-zone' && expandedTeamId) {
      handleAddRider(expandedTeamId, riderId)
      setActiveRider(null)
      return
    }
    
    // Reorder within lineup
    const lineup = lineupData?.lineup || []
    const activeInLineup = lineup.find((r: LineupRider) => r.rider_id === riderId)
    const overRiderId = Number(over.id)
    const overInLineup = lineup.find((r: LineupRider) => r.rider_id === overRiderId)
    
    if (activeInLineup && overInLineup && riderId !== overRiderId && expandedTeamId) {
      const oldIndex = lineup.findIndex((r: LineupRider) => r.rider_id === riderId)
      const newIndex = lineup.findIndex((r: LineupRider) => r.rider_id === overRiderId)
      
      const reordered = [...lineup]
      const [movedItem] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, movedItem)
      
      reorderRidersMutation.mutate({
        teamId: expandedTeamId,
        riderIds: reordered.map((r: LineupRider) => r.rider_id)
      })
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Modern 3-koloms layout */}
        <div className="flex h-screen">
          {/* Rechter Sidebar: Rider Pool (beschikbare riders) */}
          {isAuthenticated && (
            <RiderPassportSidebar
              riders={allRiders}
              isOpen={sidebarOpen}
              selectedTeam={expandedTeamId ? teams.find(t => t.team_id === expandedTeamId) : undefined}
              onClearTeamFilter={() => setExpandedTeamId(null)}
              onAddRider={expandedTeamId ? (riderId) => handleAddRider(expandedTeamId, riderId) : undefined}
            />
          )}
          
          {/* Main Content Area */}
          <div className="flex-1 min-w-0 flex flex-col">
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
          
          <div className="max-w-[2000px] mx-auto p-3 sm:p-4 lg:p-6">
            {/* Header met Create Team Button */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-3xl">🏆</span>
                  Jouw Teams
                </h2>
                <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Sleep riders vanuit de sidebar naar je teams</span>
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-3 sm:px-6 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Nieuw Team</span>
                <span className="sm:hidden">+</span>
              </button>
            </div>

            {teams.length === 0 ? (
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-dashed border-gray-300 shadow-lg p-12 text-center">
                <div className="inline-block p-6 bg-gradient-to-br from-orange-100 to-blue-100 rounded-full mb-6">
                  <div className="text-7xl">🏆</div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">Nog geen teams</h3>
                <p className="text-gray-600 mb-8 text-lg">Maak je eerste team aan om te beginnen met riders selecteren</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 inline-flex items-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nieuw Team Aanmaken
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Moderne instructie banner - Duidelijk uitleggen */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-xl border-2 border-white/20">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base mb-2 flex items-center gap-2">
                        💡 Twee secties, één doel
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                          <div className="font-bold mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-xs">←</span>
                            Rider Pool (links)
                          </div>
                          <p className="text-xs text-blue-100">Alle beschikbare riders. Sleep ze naar je team!</p>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3 backdrop-blur">
                          <div className="font-bold mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs">↓</span>
                            Team Lineup (hier)
                          </div>
                          <p className="text-xs text-blue-100">Riders in je team. Klik op team om te zien.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  {teams.map(team => {
                    const isExpanded = expandedTeamId === team.team_id
                    const teamLineup = isExpanded ? (lineupData?.lineup || []) : []
                    
                    return (
                      <div key={team.team_id} className="bg-white/95 backdrop-blur rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
                        {/* Team Card Header - Altijd zichtbaar */}
                        <TeamCard
                          team={team}
                          isDragging={activeRider !== null}
                          isExpanded={isExpanded}
                          onToggleExpand={handleToggleExpand}
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
                        
                        {/* Expanded Lineup Section */}
                        {isExpanded && (
                          <div className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 border-t-2 border-blue-300">
                            {/* Duidelijke header met uitleg */}
                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg p-3 mb-4 shadow-md">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <h3 className="text-base font-bold">Team Lineup - Riders in dit team</h3>
                                    <p className="text-xs text-green-100">Sleep riders uit de linker sidebar om toe te voegen</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="px-3 py-1.5 bg-white/20 backdrop-blur rounded-lg font-bold">
                                    {teamLineup.length}/{team.max_riders}
                                  </span>
                                  <span className="px-3 py-1.5 bg-white/20 backdrop-blur rounded-lg font-bold">
                                    ✓ {teamLineup.filter((r: LineupRider) => r.is_valid).length} valid
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {teamLineup.length === 0 ? (
                              <div className="bg-white border-2 border-dashed border-blue-300 rounded-xl p-8 text-center">
                                <div className="inline-block p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4">
                                  <div className="text-5xl">👥</div>
                                </div>
                                <p className="text-gray-700 font-semibold text-lg mb-2">Nog geen riders in dit team</p>
                                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mt-3">
                                  <div className="flex items-center gap-1.5 bg-orange-100 px-3 py-2 rounded-lg">
                                    <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">←</span>
                                    <span><strong>Sleep riders</strong> vanuit de linker sidebar</span>
                                  </div>
                                  <span className="text-gray-400">of</span>
                                  <div className="flex items-center gap-1.5 bg-blue-100 px-3 py-2 rounded-lg">
                                    <span><strong>Gebruik de + Add knop</strong> in de sidebar</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <LineupDropZone lineup={teamLineup}>
                                <SortableContext
                                  items={teamLineup.map((r: LineupRider) => r.rider_id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="space-y-3">
                                    {teamLineup.map((rider: LineupRider, index: number) => (
                                      <div key={rider.rider_id} className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                                          {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <LineupRiderCard
                                            rider={rider}
                                            onRemove={() => handleRemoveRider(team.team_id, rider.rider_id)}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </SortableContext>
                              </LineupDropZone>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl shadow-2xl border-2 border-white/50 transform rotate-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
                    {activeRider.avatar_url ? (
                      <img src={activeRider.avatar_url} alt={activeRider.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{activeRider.racing_name || activeRider.full_name}</p>
                    <p className="text-xs text-blue-100">
                      {activeRider.zwiftracing_category || activeRider.zwift_official_category} · vELO {activeRider.velo_live}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DragOverlay>
          </div>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl border-2 border-blue-500 shadow-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">Nieuw Team</h2>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm sm:text-base font-bold mb-1 sm:mb-2 text-gray-900">Team Naam *</label>
            <input
              type="text"
              value={newTeam.team_name}
              onChange={(e) => setNewTeam({ ...newTeam, team_name: e.target.value })}
              placeholder="bijv. TeamNL ZRL A/B"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm sm:text-base font-bold mb-1 sm:mb-2 text-gray-900">Competitie Type *</label>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <button
                onClick={() => setNewTeam({ ...newTeam, competition_type: 'category' })}
                className={`p-3 sm:p-4 rounded-lg border-3 transition-all min-h-[80px] sm:min-h-0 ${
                  newTeam.competition_type === 'category'
                    ? 'bg-blue-600 border-blue-700 text-white shadow-lg transform scale-105'
                    : 'bg-gray-50 border-gray-400 text-gray-900 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🏆</div>
                <div className="font-bold text-sm sm:text-base">Category</div>
                <div className={`text-[10px] sm:text-xs font-semibold ${
                  newTeam.competition_type === 'category' ? 'text-blue-100' : 'text-gray-600'
                }`}>bijv: WTRL ZRL</div>
              </button>
              <button
                onClick={() => setNewTeam({ ...newTeam, competition_type: 'velo' })}
                className={`p-3 sm:p-4 rounded-lg border-3 transition-all min-h-[80px] sm:min-h-0 ${
                  newTeam.competition_type === 'velo'
                    ? 'bg-orange-600 border-orange-700 text-white shadow-lg transform scale-105'
                    : 'bg-gray-50 border-gray-400 text-gray-900 hover:border-orange-500 hover:bg-orange-50'
                }`}
              >
                <div className="text-xl sm:text-2xl mb-1 sm:mb-2">⚡</div>
                <div className="font-bold text-sm sm:text-base">vELO</div>
                <div className={`text-[10px] sm:text-xs font-semibold ${
                  newTeam.competition_type === 'velo' ? 'text-orange-100' : 'text-gray-600'
                }`}>bijv: Club Ladder</div>
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm sm:text-base font-bold mb-1 sm:mb-2 text-gray-900">Competitie Naam</label>
            <input
              type="text"
              value={newTeam.competition_name}
              onChange={(e) => setNewTeam({ ...newTeam, competition_name: e.target.value })}
              placeholder="bijv. WTRL ZRL Season 5"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder-gray-500"
            />
          </div>
          
          {newTeam.competition_type === 'velo' && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-orange-50 rounded-lg border-2 border-orange-400">
              <h3 className="font-bold text-orange-800 text-sm sm:text-base">vELO Instellingen</h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm sm:text-base mb-1 sm:mb-2 text-gray-900 font-bold">Min Rank</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTeam.velo_min_rank}
                    onChange={(e) => setNewTeam({ ...newTeam, velo_min_rank: parseInt(e.target.value) })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base mb-1 sm:mb-2 text-gray-900 font-bold">Max Rank</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTeam.velo_max_rank}
                    onChange={(e) => setNewTeam({ ...newTeam, velo_max_rank: parseInt(e.target.value) })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  />
                </div>
              </div>
              <div className="text-xs sm:text-sm text-orange-800 font-bold bg-orange-100 px-3 py-2 rounded">
                Max spread: {newTeam.velo_max_rank - newTeam.velo_min_rank + 1} ranks
              </div>
            </div>
          )}
          
          {newTeam.competition_type === 'category' && (
            <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-blue-50 rounded-lg border-2 border-blue-400">
              <h3 className="font-bold text-blue-800 text-sm sm:text-base">Category Instellingen</h3>
              <div>
                <label className="block text-sm sm:text-base mb-1 sm:mb-2 text-gray-900 font-bold">Toegestane Categories</label>
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
                      className={`px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg border-3 transition-all font-bold min-h-[44px] sm:min-h-0 flex items-center justify-center ${
                        newTeam.allowed_categories.includes(cat)
                          ? 'bg-blue-600 border-blue-700 text-white shadow-lg transform scale-105'
                          : 'bg-gray-50 border-gray-400 text-gray-900 hover:border-blue-500 hover:bg-blue-50'
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
              <label className="block text-sm sm:text-base font-bold mb-1 sm:mb-2 text-gray-900">Min Riders</label>
              <input
                type="number"
                min="1"
                value={newTeam.min_riders}
                onChange={(e) => setNewTeam({ ...newTeam, min_riders: parseInt(e.target.value) })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-sm sm:text-base font-bold mb-1 sm:mb-2 text-gray-900">Max Riders</label>
              <input
                type="number"
                min="1"
                value={newTeam.max_riders}
                onChange={(e) => setNewTeam({ ...newTeam, max_riders: parseInt(e.target.value) })}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-white text-gray-900 border-2 border-gray-400 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 sm:gap-4 mt-4 sm:mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base bg-gray-300 text-gray-900 hover:bg-gray-400 rounded-lg font-bold border-2 border-gray-400 transition-all min-h-[48px] sm:min-h-0 flex items-center justify-center shadow-md"
            disabled={isLoading}
          >
            Annuleer
          </button>
          <button
            onClick={onCreate}
            className="flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[48px] sm:min-h-0 flex items-center justify-center"
            disabled={isLoading || !newTeam.team_name}
          >
            {isLoading ? 'Maken...' : 'Maak Team'}
          </button>
        </div>
      </div>
    </div>
  )
}
