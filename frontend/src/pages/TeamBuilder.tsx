import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Rider {
  rider_id: number
  name: string
  full_name: string
  category: string
  velo_live: number
  country_alpha3: string
  avatar_url: string
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

interface LineupRider extends Rider {
  lineup_id: number
  lineup_position: number
  is_valid: boolean
  validation_warning?: string
}

export default function TeamBuilder() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeRider, setActiveRider] = useState<Rider | null>(null)
  
  // New team form
  const [newTeam, setNewTeam] = useState({
    team_name: '',
    competition_type: 'category' as 'velo' | 'category',
    competition_name: '',
    velo_min_rank: 1,
    velo_max_rank: 3,
    allowed_categories: ['A', 'B'],
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
      allowed_categories: ['A', 'B'],
      min_riders: 4,
      max_riders: 8
    })
  }
  
  const handleCreateTeam = () => {
    createTeamMutation.mutate(newTeam)
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 py-6 px-4 sm:px-6 shadow-2xl">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
                  🏆 Team Builder
                </h1>
                <p className="text-blue-100 mt-2">Create competition teams with vELO or category validation</p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Teams List */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Teams</h2>
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
                      <button
                        key={team.team_id}
                        onClick={() => setSelectedTeam(team)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedTeam?.team_id === team.team_id
                            ? 'bg-blue-500/20 border-blue-500'
                            : 'bg-gray-700/30 border-gray-600 hover:border-gray-500'
                        }`}
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
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            {/* Middle: Current Lineup */}
            <div className="lg:col-span-1">
              {selectedTeam ? (
                <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
                  <h2 className="text-xl font-bold mb-4">
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
                <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6 flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    <div className="text-6xl mb-4">🏆</div>
                    <p className="text-lg">Select a team to start building</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right: Available Riders */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-bold mb-4">Available Riders</h2>
                
                {/* Search */}
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search riders..."
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg mb-4 focus:outline-none focus:border-blue-500"
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

// Draggable Rider Card Component
function DraggableRiderCard({ rider, onAdd }: { rider: Rider, onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rider.rider_id
  })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-700/50 hover:bg-gray-700 p-3 rounded-lg cursor-move border border-gray-600 hover:border-blue-500 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {rider.avatar_url && (
            <img 
              src={rider.avatar_url} 
              alt={rider.name}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <div className="font-semibold text-sm">
              {rider.name || rider.full_name}
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <span>{rider.country_alpha3}</span>
              <span>•</span>
              <span>Cat: {rider.category}</span>
              <span>•</span>
              <span>vELO: {rider.velo_live}</span>
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-xs font-semibold"
        >
          + Add
        </button>
      </div>
    </div>
  )
}

// Lineup Rider Card Component
function LineupRiderCard({ rider, onRemove }: { rider: LineupRider, onRemove: () => void }) {
  return (
    <div className={`p-3 rounded-lg border-2 ${
      rider.is_valid
        ? 'bg-green-500/10 border-green-500/30'
        : 'bg-red-500/10 border-red-500/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-gray-400">
            #{rider.lineup_position}
          </div>
          {rider.avatar_url && (
            <img 
              src={rider.avatar_url} 
              alt={rider.name}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <div className="font-semibold">
              {rider.name || rider.full_name}
            </div>
            <div className="text-xs text-gray-400">
              Cat: {rider.category} • vELO: {rider.velo_live}
            </div>
            {!rider.is_valid && rider.validation_warning && (
              <div className="text-xs text-red-400 mt-1">
                ⚠️ {rider.validation_warning}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500 rounded text-xs font-semibold text-red-400"
        >
          Remove
        </button>
      </div>
    </div>
  )
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
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Create New Team</h2>
        
        <div className="space-y-4">
          {/* Team Name */}
          <div>
            <label className="block text-sm font-semibold mb-2">Team Name *</label>
            <input
              type="text"
              value={newTeam.team_name}
              onChange={(e) => setNewTeam({ ...newTeam, team_name: e.target.value })}
              placeholder="e.g. TeamNL ZRL A/B"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          
          {/* Competition Type */}
          <div>
            <label className="block text-sm font-semibold mb-2">Competition Type *</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setNewTeam({ ...newTeam, competition_type: 'category' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  newTeam.competition_type === 'category'
                    ? 'bg-blue-500/20 border-blue-500'
                    : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-2">🏆</div>
                <div className="font-bold">Category</div>
                <div className="text-xs text-gray-400">WTRL ZRL</div>
              </button>
              <button
                onClick={() => setNewTeam({ ...newTeam, competition_type: 'velo' })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  newTeam.competition_type === 'velo'
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-2">⚡</div>
                <div className="font-bold">vELO</div>
                <div className="text-xs text-gray-400">Club Ladder</div>
              </button>
            </div>
          </div>
          
          {/* Competition Name */}
          <div>
            <label className="block text-sm font-semibold mb-2">Competition Name</label>
            <input
              type="text"
              value={newTeam.competition_name}
              onChange={(e) => setNewTeam({ ...newTeam, competition_name: e.target.value })}
              placeholder="e.g. WTRL ZRL Season 5"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          
          {/* vELO Settings */}
          {newTeam.competition_type === 'velo' && (
            <div className="space-y-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <h3 className="font-bold text-purple-300">vELO Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">Min Rank</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTeam.velo_min_rank}
                    onChange={(e) => setNewTeam({ ...newTeam, velo_min_rank: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Max Rank</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newTeam.velo_max_rank}
                    onChange={(e) => setNewTeam({ ...newTeam, velo_max_rank: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                </div>
              </div>
              <div className="text-xs text-purple-300">
                Max spread: {newTeam.velo_max_rank - newTeam.velo_min_rank + 1} ranks
              </div>
            </div>
          )}
          
          {/* Category Settings */}
          {newTeam.competition_type === 'category' && (
            <div className="space-y-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <h3 className="font-bold text-blue-300">Category Settings</h3>
              <div>
                <label className="block text-sm mb-2">Allowed Categories</label>
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
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        newTeam.allowed_categories.includes(cat)
                          ? 'bg-blue-500/30 border-blue-500'
                          : 'bg-gray-700/50 border-gray-600'
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
              <label className="block text-sm font-semibold mb-2">Min Riders</label>
              <input
                type="number"
                min="1"
                value={newTeam.min_riders}
                onChange={(e) => setNewTeam({ ...newTeam, min_riders: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Max Riders</label>
              <input
                type="number"
                min="1"
                value={newTeam.max_riders}
                onChange={(e) => setNewTeam({ ...newTeam, max_riders: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
              />
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg font-semibold shadow-lg disabled:opacity-50"
            disabled={isLoading || !newTeam.team_name}
          >
            {isLoading ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  )
}
