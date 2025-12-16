import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Category colors (RacingMatrix stijl - lichte subtiele kleuren)
const CATEGORY_COLORS = {
  'A+': 'bg-red-100 text-red-900 border-red-300',
  'A': 'bg-red-50 text-red-800 border-red-200',
  'B': 'bg-green-50 text-green-800 border-green-200',
  'C': 'bg-blue-50 text-blue-800 border-blue-200',
  'D': 'bg-yellow-50 text-yellow-800 border-yellow-200',
}

// vELO Tiers (matching RacingMatrix)
const VELO_TIERS = [
  { rank: 1, name: 'Diamond', icon: '💎', min: 2200, max: null, color: 'from-cyan-300 to-blue-600', textColor: 'text-cyan-900', bgColor: 'bg-gradient-to-r from-cyan-300/20 to-blue-600/20' },
  { rank: 2, name: 'Platinum', icon: '⚪', min: 1900, max: 2200, color: 'from-gray-200 to-gray-500', textColor: 'text-gray-900', bgColor: 'bg-gradient-to-r from-gray-200/20 to-gray-500/20' },
  { rank: 3, name: 'Gold', icon: '🟡', min: 1650, max: 1900, color: 'from-yellow-300 to-yellow-600', textColor: 'text-yellow-900', bgColor: 'bg-gradient-to-r from-yellow-300/20 to-yellow-600/20' },
  { rank: 4, name: 'Silver', icon: '⚪', min: 1400, max: 1650, color: 'from-gray-300 to-gray-600', textColor: 'text-gray-900', bgColor: 'bg-gradient-to-r from-gray-300/20 to-gray-600/20' },
  { rank: 5, name: 'Bronze I', icon: '🟠', min: 1250, max: 1400, color: 'from-orange-300 to-orange-500', textColor: 'text-orange-900', bgColor: 'bg-gradient-to-r from-orange-300/20 to-orange-500/20' },
  { rank: 6, name: 'Bronze II', icon: '🟠', min: 1100, max: 1250, color: 'from-orange-400 to-orange-600', textColor: 'text-orange-900', bgColor: 'bg-gradient-to-r from-orange-400/20 to-orange-600/20' },
  { rank: 7, name: 'Bronze III', icon: '🟠', min: 950, max: 1100, color: 'from-orange-500 to-orange-700', textColor: 'text-orange-900', bgColor: 'bg-gradient-to-r from-orange-500/20 to-orange-700/20' },
  { rank: 8, name: 'Bronze IV', icon: '🟠', min: 850, max: 950, color: 'from-orange-300 to-orange-600', textColor: 'text-orange-900', bgColor: 'bg-gradient-to-r from-orange-300/20 to-orange-600/20' },
  { rank: 9, name: 'Bronze', icon: '🟠', min: 650, max: 850, color: 'from-orange-400 to-orange-700', textColor: 'text-orange-900', bgColor: 'bg-gradient-to-r from-orange-400/20 to-orange-700/20' },
  { rank: 10, name: 'Copper', icon: '🟤', min: 0, max: 650, color: 'from-orange-600 to-red-800', textColor: 'text-orange-100', bgColor: 'bg-gradient-to-r from-orange-600/20 to-red-800/20' },
]

const getVeloTier = (rating: number | null) => {
  if (!rating) return null
  return VELO_TIERS.find(tier => 
    rating >= tier.min && (!tier.max || rating < tier.max)
  )
}

interface Rider {
  rider_id: number
  name: string
  full_name: string
  category: string
  velo_live: number
  velo_30day: number | null
  country_alpha3: string
  avatar_url: string
  phenotype: string | null
  zwift_official_racing_score: number | null
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

export default function TeamBuilder({ hideHeader = false }: TeamBuilderProps) {
  const queryClient = useQueryClient()
  
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeRider, setActiveRider] = useState<Rider | null>(null)
  
  // New team form
  const [newTeam, setNewTeam] = useState({
    team_name: '',
    competition_type: 'category' as 'velo' | 'category',
    competition_name: '',
    velo_min_rank: 1,
    velo_max_rank: 3,
    velo_max_spread: 3,
    allowed_categories: ['A', 'B'],
    allow_category_up: true,
    min_riders: 4,
    max_riders: 8
  })
  
  // Fetch all teams
  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch('/api/teams')
      if (!res.ok) throw new Error('Failed to fetch teams')
      return res.json()
    }
  })
  
  // Fetch all riders
  const { data: ridersData } = useQuery({
    queryKey: ['riders'],
    queryFn: async () => {
      const res = await fetch('/api/riders')
      if (!res.ok) throw new Error('Failed to fetch riders')
      return res.json()
    }
  })
  
  // Fetch team lineup
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
  
  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (team: typeof newTeam) => {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(team)
      })
      if (!res.ok) throw new Error('Failed to create team')
      return res.json()
    },
    onSuccess: (data) => {
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
  
  // Add rider to team mutation
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
  
  // Remove rider from team mutation
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
  
  // Update team mutation
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
    onSuccess: (data) => {
      toast.success(`Team "${data.team.team_name}" updated!`)
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setShowEditModal(false)
      setSelectedTeam(data.team)
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })
  
  // Delete team mutation
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
  
  const teams: Team[] = teamsData?.teams || []
  const allRiders: Rider[] = ridersData?.riders || []
  const lineup: LineupRider[] = lineupData?.lineup || []
  
  // Filter riders based on search and team eligibility
  const filteredRiders = allRiders.filter(rider => {
    // Search filter
    const matchesSearch = !searchTerm || 
      rider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.rider_id.toString().includes(searchTerm)
    
    if (!matchesSearch) return false
    
    // Already in lineup
    if (lineup.some(l => l.rider_id === rider.rider_id)) return false
    
    // Team eligibility filter
    if (!selectedTeam) return true
    
    if (selectedTeam.competition_type === 'velo') {
      const velo = rider.velo_live
      return velo >= (selectedTeam.velo_min_rank || 1) && 
             velo <= (selectedTeam.velo_max_rank || 10)
    } else {
      return selectedTeam.allowed_categories?.includes(rider.category)
    }
  })
  
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
    setActiveRider(null)
    const { active, over } = event
    
    if (!over || !selectedTeam) return
    
    // Dropped on lineup area
    if (over.id === 'lineup-drop-zone') {
      const riderId = Number(active.id)
      handleAddRider(riderId)
    }
  }
  
  const getTeamStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500/20 text-green-400 border-green-500'
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
      case 'incomplete': return 'bg-blue-500/20 text-blue-400 border-blue-500'
      case 'overfilled': return 'bg-red-500/20 text-red-400 border-red-500'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500'
    }
  }
  
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Modern Hero Header with Glassmorphism (Racing Matrix Style) */}
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
                    <span className="truncate">TEAM BUILDER</span>
                  </h1>
                  <p className="text-orange-100 text-xs sm:text-sm lg:text-lg xl:text-xl font-semibold mt-1 sm:mt-2 truncate">
                    TeamNL Cloud9 Racing · Competition Teams
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = 'https://teamnl-cloud9-racing-team-production.up.railway.app/'}
                  className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-lg rounded-lg sm:rounded-xl border border-white/30 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg hover:shadow-xl"
                >
                  ← Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
        
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Teams List */}
            <div className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Teams</h2>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg font-semibold shadow-lg"
                  >
                    + New Team
                  </button>
                </div>
                
                <div className="space-y-3">
                  {teams.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <p>No teams yet</p>
                      <p className="text-sm">Create your first team!</p>
                    </div>
                  ) : (
                    teams.map(team => (
                      <div
                        key={team.team_id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedTeam?.team_id === team.team_id
                            ? 'bg-indigo-50 border-indigo-500 shadow-md'
                            : 'bg-gray-50 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <div 
                          onClick={() => setSelectedTeam(team)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg">{team.team_name}</h3>
                            <p className="text-sm text-gray-400">{team.competition_name}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                team.competition_type === 'velo' 
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}>
                                {team.competition_type === 'velo' ? '⚡ vELO' : '🏆 Category'}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full border ${getTeamStatusColor(team.team_status)}`}>
                                {team.team_status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{team.current_riders}</div>
                            <div className="text-xs text-gray-400">/{team.max_riders}</div>
                          </div>
                        </div>
                        
                        {team.competition_type === 'velo' && (
                          <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="text-xs text-gray-400">
                              vELO Range: {team.velo_min_rank}-{team.velo_max_rank}
                              {team.current_velo_spread !== null && (
                                <span className="ml-2">
                                  (Spread: {team.current_velo_spread})
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {team.competition_type === 'category' && team.allowed_categories && (
                          <div className="mt-3 pt-3 border-t border-gray-600">
                            <div className="text-xs text-gray-400">
                              Categories: {team.allowed_categories.join(', ')}
                            </div>
                          </div>
                        )}
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-600">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTeam(team);
                              setShowEditModal(true);
                            }}
                            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                          >
                            ✏️ Bewerk
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTeam(team.team_id);
                            }}
                            className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                          >
                            🗑️ Verwijder
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            {/* Middle: Current Lineup */}
            <div className="lg:col-span-1">
              {selectedTeam ? (
                <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {selectedTeam.team_name} Lineup
                  </h2>
                  
                  {/* Drag Drop Zone */}
                  <div
                    id="lineup-drop-zone"
                    className="min-h-[400px] border-2 border-dashed border-blue-500/30 rounded-xl p-4 bg-blue-500/5"
                  >
                    {lineup.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
                        <div className="text-6xl mb-4">👥</div>
                        <p className="text-lg font-semibold">No riders yet</p>
                        <p className="text-sm">Drag riders here or click to add</p>
                      </div>
                    ) : (
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
                    )}
                  </div>
                  
                  {/* Team Stats */}
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
            <div className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Available Riders</h2>
                
                {/* Search */}
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search riders..."
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-900"
                />
                
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
        
        {/* Edit Team Modal */}
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
        
        {/* Create Team Modal */}
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
        
        {/* Drag Overlay */}
        <DragOverlay>
          {activeRider && (
            <div className="bg-blue-500 text-white p-3 rounded-lg shadow-2xl opacity-90">
              {activeRider.name || activeRider.full_name}
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}

// Draggable Rider Card Component - STATE OF ART MODERN DESIGN
function DraggableRiderCard({ rider, onAdd }: { rider: Rider, onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rider.rider_id
  })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const velo30day = rider.velo_30day || rider.velo_live
  const veloTier = getVeloTier(velo30day)
  const categoryColor = CATEGORY_COLORS[rider.category as keyof typeof CATEGORY_COLORS] || 'bg-gray-500 text-white border-gray-400'
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative overflow-hidden bg-white hover:bg-gray-50 rounded-xl cursor-move border-2 border-gray-200 hover:border-indigo-400 hover:shadow-lg transition-all shadow-md ${isDragging ? 'scale-105 ring-4 ring-indigo-500/50 shadow-2xl' : ''}`}
    >
      {/* Tier Background Gradient */}
      {veloTier && (
        <div className={`absolute inset-0 bg-gradient-to-br ${veloTier.color} opacity-10 pointer-events-none`} />
      )}
      
      {/* Category Badge - TOP PROMINENT POSITION */}
      <div className="relative bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 px-4 py-2.5 border-b-2 border-gray-200">
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center justify-center px-3 py-1 text-sm font-bold rounded border ${categoryColor} shadow-sm min-w-[40px]`}>
            {rider.category}
          </span>
          {/* vELO Rank Badge */}
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-br ${veloTier?.color || 'from-gray-400 to-gray-600'} ${veloTier?.textColor || 'text-gray-800'} shadow-sm`}>
              {veloTier?.rank || '?'}
            </div>
            <span className="text-gray-700 text-base font-bold">
              {Math.floor(velo30day)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Card Body */}
      <div className="relative p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Avatar + Name */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <img 
                src={rider.avatar_url || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=6366f1&color=fff&size=56`}
                alt={rider.name}
                className="w-14 h-14 rounded-full border-2 border-gray-300 shadow-md flex-shrink-0"
                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=f97316&color=fff&size=56`; }}
              />
              {/* Country Flag Overlay */}
              {rider.country_alpha3 && (
                <div className="absolute -bottom-1 -right-1 text-xs">
                  {rider.country_alpha3}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Name - Bold & Clear */}
              <div className="font-bold text-gray-900 text-base truncate mb-1.5">
                {rider.name || rider.full_name}
              </div>
              
              {/* Stats Row: Phenotype + ZRS */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Phenotype */}
                {rider.phenotype && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 font-semibold text-xs shadow-sm">
                    🧬 {rider.phenotype}
                  </span>
                )}
                
                {/* ZRS */}
                {rider.zwift_official_racing_score && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-semibold text-xs shadow-sm">
                    ⚡ {rider.zwift_official_racing_score}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Right: Add Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAdd()
            }}
            className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  )
}

// Lineup Rider Card Component - Modern Design
function LineupRiderCard({ rider, onRemove }: { rider: LineupRider, onRemove: () => void }) {
  const velo30day = rider.velo_30day || rider.velo_live
  const veloTier = getVeloTier(velo30day)
  const categoryColor = CATEGORY_COLORS[rider.category as keyof typeof CATEGORY_COLORS] || 'bg-gray-500 text-white border-gray-400'
  
  return (
    <div className={`relative bg-gradient-to-br p-4 rounded-xl border-2 transition-all shadow-lg ${
      rider.is_valid 
        ? 'from-blue-900 to-indigo-950 border-orange-500/50 shadow-orange-500/10'
        : 'from-red-900/40 to-gray-900 border-red-500 shadow-red-500/20'
    }`}>
      {/* Position Badge */}
      <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-lg border-2 border-gray-900">
        {rider.lineup_position}
      </div>
      
      {/* Tier Background Gradient */}
      {veloTier && rider.is_valid && (
        <div className={`absolute inset-0 bg-gradient-to-r ${veloTier.color} opacity-5 rounded-xl pointer-events-none`} />
      )}
      
      <div className="relative flex items-center justify-between gap-3">
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img 
            src={rider.avatar_url || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=48`}
            alt={rider.name}
            className="w-12 h-12 rounded-full border-2 border-gray-600 shadow-md flex-shrink-0"
            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=48`; }}
          />
          
          <div className="flex-1 min-w-0">
            {/* Name */}
            <div className="font-bold text-white text-base truncate mb-2">
              {rider.name || rider.full_name}
            </div>
            
            {/* Stats Row 1: Category + vELO + Validation */}
            <div className="flex items-center gap-2.5 flex-wrap mb-2">
              {/* Category Badge - Prominent */}
              <span className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-md border-2 ${categoryColor} shadow-md`}>
                {rider.category}
              </span>
              
              {/* vELO Rank Badge + 30-day Value */}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-br ${veloTier?.color || 'from-gray-400 to-gray-600'} ${veloTier?.textColor || 'text-white'} shadow-md`}>
                  {veloTier?.rank || '?'}
                </div>
                <span className="text-white text-base font-bold">
                  {Math.floor(velo30day)}
                </span>
              </div>
              
              {/* Validation Status */}
              {rider.is_valid ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/20 text-green-300 rounded-md text-xs font-bold border border-green-500/30">
                  <span>✓</span> Valid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/20 text-red-300 rounded-md text-xs font-bold border border-red-500/30">
                  <span>✗</span> Invalid
                </span>
              )}
            </div>
            
            {/* Stats Row 2: Phenotype + ZRS 30-day */}
            <div className="flex items-center gap-2.5 flex-wrap text-sm">
              {/* Phenotype */}
              {rider.phenotype && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-md border border-purple-500/30 font-semibold">
                  {rider.phenotype}
                </span>
              )}
              
              {/* ZRS 30-day */}
              {rider.zwift_official_racing_score && (
                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-md border border-orange-500/30 font-semibold">
                  ZRS {rider.zwift_official_racing_score}
                </span>
              )}
            </div>
            
            {/* Validation Warning */}
            {!rider.is_valid && rider.validation_warning && (
              <div className="text-xs text-red-400 mt-2 flex items-start gap-1">
                <span className="flex-shrink-0">⚠️</span>
                <span>{rider.validation_warning}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Right: Remove Button */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg text-sm font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

// Edit Team Modal Component
function EditTeamModal({ 
  team, 
  onClose, 
  onSave,
  isLoading 
}: {
  team: Team
  onClose: () => void
  onSave: (updates: any) => void
  isLoading: boolean
}) {
  const [editedTeam, setEditedTeam] = useState({
    team_name: team.team_name,
    competition_name: team.competition_name,
    competition_type: team.competition_type,
    velo_min_rank: team.velo_min_rank || 1,
    velo_max_rank: team.velo_max_rank || 10,
    allowed_categories: team.allowed_categories || [],
    min_riders: team.min_riders || 1,
    max_riders: team.max_riders || 10
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">✏️ Bewerk Team</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Team Naam</label>
              <input
                type="text"
                value={editedTeam.team_name}
                onChange={(e) => setEditedTeam({...editedTeam, team_name: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Team naam..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Competitie Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEditedTeam({...editedTeam, competition_type: 'velo'})}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    editedTeam.competition_type === 'velo'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="font-bold">⚡ vELO</div>
                  <div className="text-xs text-gray-400">bijvoorbeeld: Club Ladder</div>
                </button>
                <button
                  type="button"
                  onClick={() => setEditedTeam({...editedTeam, competition_type: 'category'})}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    editedTeam.competition_type === 'category'
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="font-bold">🏆 Category</div>
                  <div className="text-xs text-gray-400">bijvoorbeeld: WTRL ZRL</div>
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Competitie Naam</label>
              <input
                type="text"
                value={editedTeam.competition_name}
                onChange={(e) => setEditedTeam({...editedTeam, competition_name: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="bijv. WTRL ZRL Division 1"
              />
            </div>
            
            {editedTeam.competition_type === 'velo' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min vELO Rank</label>
                  <input
                    type="number"
                    value={editedTeam.velo_min_rank}
                    onChange={(e) => setEditedTeam({...editedTeam, velo_min_rank: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max vELO Rank</label>
                  <input
                    type="number"
                    value={editedTeam.velo_max_rank}
                    onChange={(e) => setEditedTeam({...editedTeam, velo_max_rank: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    min="1"
                  />
                </div>
              </div>
            )}
            
            {editedTeam.competition_type === 'category' && (
              <div>
                <label className="block text-sm font-medium mb-2">Toegestane Categorieën</label>
                <div className="grid grid-cols-4 gap-2">
                  {['A+', 'A', 'B', 'C', 'D'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        const current = editedTeam.allowed_categories || [];
                        setEditedTeam({
                          ...editedTeam,
                          allowed_categories: current.includes(cat)
                            ? current.filter(c => c !== cat)
                            : [...current, cat]
                        });
                      }}
                      className={`px-3 py-2 rounded-lg font-bold transition-all ${
                        (editedTeam.allowed_categories || []).includes(cat)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 border border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Min Rijders</label>
                <input
                  type="number"
                  value={editedTeam.min_riders}
                  onChange={(e) => setEditedTeam({...editedTeam, min_riders: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Rijders</label>
                <input
                  type="number"
                  value={editedTeam.max_riders}
                  onChange={(e) => setEditedTeam({...editedTeam, max_riders: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  min="1"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Annuleer
            </button>
            <button
              onClick={() => onSave(editedTeam)}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg font-semibold shadow-lg transition-colors disabled:opacity-50"
              disabled={isLoading || !editedTeam.team_name.trim() || !editedTeam.competition_name.trim()}
            >
              {isLoading ? 'Opslaan...' : '💾 Wijzigingen Opslaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Team Modal Component
function CreateTeamModal({ 
  newTeam, 
  setNewTeam, 
  onClose, 
  onCreate,
  isLoading 
}: {
  newTeam: any
  setNewTeam: (team: any) => void
  onClose: () => void
  onCreate: () => void
  isLoading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl border-2 border-orange-500/50 shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Create New Team</h2>
        
        <div className="space-y-4">
          {/* Team Name */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Team Name *</label>
            <input
              type="text"
              value={newTeam.team_name}
              onChange={(e) => setNewTeam({ ...newTeam, team_name: e.target.value })}
              placeholder="e.g. TeamNL ZRL A/B"
              className="w-full px-4 py-2 bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>
          
          {/* Competition Type */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Competition Type *</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setNewTeam({ ...newTeam, competition_type: 'category' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  newTeam.competition_type === 'category'
                    ? 'bg-blue-500 border-blue-600 text-white shadow-lg'
                    : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400'
                }`}
              >
                <div className="text-2xl mb-2">🏆</div>
                <div className="font-bold">Category</div>
                <div className={`text-xs ${
                  newTeam.competition_type === 'category' ? 'text-blue-100' : 'text-gray-500'
                }`}>bijvoorbeeld: WTRL ZRL</div>
              </button>
              <button
                onClick={() => setNewTeam({ ...newTeam, competition_type: 'velo' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  newTeam.competition_type === 'velo'
                    ? 'bg-orange-500 border-orange-600 text-white shadow-lg'
                    : 'bg-white border-gray-300 text-gray-900 hover:border-orange-400'
                }`}
              >
                <div className="text-2xl mb-2">⚡</div>
                <div className="font-bold">vELO</div>
                <div className={`text-xs ${
                  newTeam.competition_type === 'velo' ? 'text-orange-100' : 'text-gray-500'
                }`}>bijvoorbeeld: Club Ladder</div>
              </button>
            </div>
          </div>
          
          {/* Competition Name */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Competition Name</label>
            <input
              type="text"
              value={newTeam.competition_name}
              onChange={(e) => setNewTeam({ ...newTeam, competition_name: e.target.value })}
              placeholder="e.g. WTRL ZRL Season 5"
              className="w-full px-4 py-2 bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </div>
          
          {/* vELO Settings */}
          {newTeam.competition_type === 'velo' && (
            <div className="space-y-4 p-4 bg-orange-50 rounded-lg border-2 border-orange-300">
              <h3 className="font-bold text-orange-700">vELO Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 text-gray-900 font-semibold">Min Rank</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTeam.velo_min_rank}
                    onChange={(e) => setNewTeam({ ...newTeam, velo_min_rank: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-900 font-semibold">Max Rank</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTeam.velo_max_rank}
                    onChange={(e) => setNewTeam({ ...newTeam, velo_max_rank: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="text-xs text-orange-700 font-semibold">
                Max spread: {newTeam.velo_max_rank - newTeam.velo_min_rank + 1} ranks
              </div>
            </div>
          )}
          
          {/* Category Settings */}
          {newTeam.competition_type === 'category' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <h3 className="font-bold text-blue-700">Category Settings</h3>
              <div>
                <label className="block text-sm mb-2 text-gray-900 font-semibold">Allowed Categories</label>
                <div className="flex gap-2">
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
                      className={`px-4 py-2 rounded-lg border-2 transition-all font-bold ${
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
          
          {/* Rider Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">Min Riders</label>
              <input
                type="number"
                min="1"
                value={newTeam.min_riders}
                onChange={(e) => setNewTeam({ ...newTeam, min_riders: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">Max Riders</label>
              <input
                type="number"
                min="1"
                value={newTeam.max_riders}
                onChange={(e) => setNewTeam({ ...newTeam, max_riders: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-white text-gray-900 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-lg font-bold border-2 border-gray-300 transition-all"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-bold shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            disabled={isLoading || !newTeam.team_name}
          >
            {isLoading ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  )
}
