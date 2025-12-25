import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import RiderPassportSidebar from '../components/RiderPassportSidebar.tsx'

// Category colors (STERKE ZICHTBARE KLEUREN - hoog contrast)
const CATEGORY_COLORS = {
  'A+': 'bg-red-600 text-white border-red-700',
  'A': 'bg-red-500 text-white border-red-600',
  'B': 'bg-green-600 text-white border-green-700',
  'C': 'bg-blue-600 text-white border-blue-700',
  'D': 'bg-yellow-500 text-gray-900 border-yellow-600',
}

// vELO Tiers (matching RacingMatrix exactly)
const VELO_TIERS = [
  { rank: 1, name: 'Diamond', icon: '💎', min: 2200, color: 'from-cyan-400 to-blue-500', textColor: 'text-cyan-100', bgColor: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20' },
  { rank: 2, name: 'Ruby', icon: '💍', min: 1900, max: 2200, color: 'from-red-500 to-pink-600', textColor: 'text-red-100', bgColor: 'bg-gradient-to-r from-red-500/20 to-pink-600/20' },
  { rank: 3, name: 'Emerald', icon: '💚', min: 1650, max: 1900, color: 'from-emerald-400 to-green-600', textColor: 'text-emerald-100', bgColor: 'bg-gradient-to-r from-emerald-400/20 to-green-600/20' },
  { rank: 4, name: 'Sapphire', icon: '💙', min: 1450, max: 1650, color: 'from-blue-400 to-indigo-600', textColor: 'text-blue-100', bgColor: 'bg-gradient-to-r from-blue-400/20 to-indigo-600/20' },
  { rank: 5, name: 'Amethyst', icon: '💜', min: 1300, max: 1450, color: 'from-purple-400 to-violet-600', textColor: 'text-purple-100', bgColor: 'bg-gradient-to-r from-purple-400/20 to-violet-600/20' },
  { rank: 6, name: 'Platinum', icon: '⚪', min: 1150, max: 1300, color: 'from-slate-300 to-slate-500', textColor: 'text-slate-100', bgColor: 'bg-gradient-to-r from-slate-400/20 to-slate-500/20' },
  { rank: 7, name: 'Gold', icon: '🟡', min: 1000, max: 1150, color: 'from-yellow-400 to-amber-600', textColor: 'text-yellow-900', bgColor: 'bg-gradient-to-r from-yellow-400/20 to-amber-600/20' },
  { rank: 8, name: 'Silver', icon: '⚫', min: 850, max: 1000, color: 'from-gray-300 to-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gradient-to-r from-gray-300/20 to-gray-500/20' },
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

export default function TeamBuilder({ hideHeader = false }: TeamBuilderProps) {
  const queryClient = useQueryClient()
  
  // 🔒 US1: Entry code protection (same as Team Manager)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [entryCode, setEntryCode] = useState('')
  const CORRECT_CODE = 'CLOUD9RACING' // Same code as Team Manager
  
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeRider, setActiveRider] = useState<Rider | null>(null)
  
  // 🎯 US2: Sidebar state for riders panel
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Optimized sensors for touch-first approach (iPhone/iPad + desktop)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimal distance before drag activates
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Shorter delay for faster response
        tolerance: 10, // Higher tolerance to prevent accidental drags
      },
    })
  )
  
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
  
  // US2: Reorder riders mutation
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
  
  const teams: Team[] = teamsData?.teams || []
  const allRiders: Rider[] = ridersData?.riders || []
  const lineup: LineupRider[] = lineupData?.lineup || []
  
  // 🔒 US1: Entry code handler
  const handleEntryCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (entryCode.toUpperCase() === CORRECT_CODE) {
      setIsAuthenticated(true)
      sessionStorage.setItem('teamBuilderAuth', 'true')
      toast.success('✅ Toegang verleend!')
    } else {
      toast.error('❌ Onjuiste code')
      setEntryCode('')
    }
  }
  
  // Check session storage on mount (US1)
  useEffect(() => {
    const auth = sessionStorage.getItem('teamBuilderAuth')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])
  
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
      // Convert vELO score to tier rank (1-10)
      const velo30day = rider.velo_30day || rider.velo_live
      const veloTier = getVeloTier(velo30day)
      const riderTierRank = veloTier?.rank || 10
      
      // Check if rider's tier is within allowed range
      return riderTierRank >= (selectedTeam.velo_min_rank || 1) && 
             riderTierRank <= (selectedTeam.velo_max_rank || 10)
    } else {
      const category = rider.zwift_official_category || rider.zwiftracing_category || 'D'
      return selectedTeam.allowed_categories?.includes(category)
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
  
  // 🎯 US2 & US3: Verbeterde drag-and-drop met reorder en cancel functionaliteit
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const riderId = Number(active.id)
    
    // US3: Als er geen drop target is, annuleer de drag vriendelijk
    if (!over) {
      setActiveRider(null)
      toast.success('Drag geannuleerd - rider niet toegevoegd', {
        duration: 2000,
        icon: '✋'
      })
      return
    }
    
    // US2: Check if reordering within lineup (both active and over are in lineup)
    const activeInLineup = lineup.find(r => r.rider_id === riderId)
    const overRiderId = Number(over.id)
    const overInLineup = lineup.find(r => r.rider_id === overRiderId)
    
    if (activeInLineup && overInLineup && riderId !== overRiderId) {
      // Reorder within lineup
      const oldIndex = lineup.findIndex(r => r.rider_id === riderId)
      const newIndex = lineup.findIndex(r => r.rider_id === overRiderId)
      
      // Create reordered array
      const reordered = [...lineup]
      const [movedItem] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, movedItem)
      
      // Update positions on backend
      reorderRidersMutation.mutate({
        teamId: selectedTeam!.team_id,
        riderIds: reordered.map(r => r.rider_id)
      })
      
      setActiveRider(null)
      return
    }
    
    // Dropped on lineup area (adding new rider)
    if (over.id === 'lineup-drop-zone' && selectedTeam) {
      handleAddRider(riderId)
    }
    
    setActiveRider(null)
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
  
  // 🔒 US1: Show entry code screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-blue-700/40 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-center mb-2 bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 bg-clip-text text-transparent">
              Team Builder
            </h1>
            <p className="text-center text-white/70 mb-8">
              Voer de entry code in voor toegang
            </p>
            <form onSubmit={handleEntryCodeSubmit} className="space-y-4">
              <input
                type="text"
                value={entryCode}
                onChange={(e) => setEntryCode(e.target.value)}
                placeholder="Entry Code"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/50 transition-all text-center tracking-wider uppercase"
                autoComplete="off"
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                🔓 Ontgrendel
              </button>
            </form>
            <button
              onClick={() => window.history.back()}
              className="w-full mt-4 py-3 bg-white/10 rounded-xl font-semibold text-white/70 hover:bg-white/20 transition-all"
            >
              ← Terug
            </button>
          </div>
        </div>
      </div>
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
        {/* 🎯 US2: Right Sidebar met Riders */}
        {isAuthenticated && (
          <RiderPassportSidebar
            riders={allRiders}
            isOpen={sidebarOpen}
            selectedTeam={selectedTeam || undefined}
            onClearTeamFilter={() => setSelectedTeam(null)}
            onAddRider={selectedTeam ? (riderId) => handleAddRider(riderId) : undefined}
          />
        )}
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
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
                  {/* 🎯 US2: Sidebar Toggle Button */}
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
                    className="px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg font-semibold shadow-lg whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">+ New Team</span>
                    <span className="sm:hidden">+ Team</span>
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
                        className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                          selectedTeam?.team_id === team.team_id
                            ? 'bg-indigo-50 border-indigo-500 shadow-md'
                            : 'bg-gray-50 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <div 
                          onClick={() => {
                            setSelectedTeam(team)
                            setSidebarOpen(true) // Open sidebar when team is selected
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base sm:text-lg truncate">{team.team_name}</h3>
                            <p className="text-xs sm:text-sm text-gray-400 truncate">{team.competition_name}</p>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                              <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                                team.competition_type === 'velo' 
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}>
                                {team.competition_type === 'velo' ? '⚡ vELO' : '🏆 Cat'}
                              </span>
                              <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border ${getTeamStatusColor(team.team_status)}`}>
                                {team.team_status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xl sm:text-2xl font-bold">{team.current_riders}</div>
                            <div className="text-xs text-gray-400">/{team.max_riders}</div>
                          </div>
                        </div>
                        
                        {team.competition_type === 'velo' && (
                          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-600">
                            <div className="text-[10px] sm:text-xs text-gray-400">
                              vELO: {team.velo_min_rank}-{team.velo_max_rank}
                              {team.current_velo_spread !== null && (
                                <span className="ml-1 sm:ml-2">
                                  (Spread: {team.current_velo_spread})
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {team.competition_type === 'category' && team.allowed_categories && (
                          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-600">
                            <div className="text-[10px] sm:text-xs text-gray-400">
                              Cat: {team.allowed_categories.join(', ')}
                            </div>
                          </div>
                        )}
                        </div>
                        <div className="flex gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-600">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTeam(team);
                              setShowEditModal(true);
                            }}
                            className="flex-1 px-3 py-2 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs sm:text-sm transition-colors min-h-[44px] sm:min-h-0 flex items-center justify-center"
                          >
                            <span className="hidden sm:inline">✏️ Bewerk</span>
                            <span className="sm:hidden">✏️</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTeam(team.team_id);
                            }}
                            className="flex-1 px-3 py-2 sm:py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs sm:text-sm transition-colors min-h-[44px] sm:min-h-0 flex items-center justify-center"
                          >
                            <span className="hidden sm:inline">🗑️ Verwijder</span>
                            <span className="sm:hidden">🗑️</span>
                          </button>
                        </div>
                      </div>
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
                  
                  {/* Drag Drop Zone */}
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
            <div className="xl:col-span-1">
              <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow-lg p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Riders</h2>
                
                {/* Search */}
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
      </div>
    </DndContext>
  )
}

// Lineup Drop Zone Component - Droppable area
function LineupDropZone({ children, lineup }: { children: React.ReactNode, lineup: LineupRider[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'lineup-drop-zone'
  })
  
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] border-2 border-dashed rounded-xl p-4 transition-all ${
        isOver 
          ? 'border-indigo-500 bg-indigo-500/20' 
          : 'border-blue-500/30 bg-blue-500/5'
      }`}
    >
      {lineup.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-lg font-semibold">No riders yet</p>
          <p className="text-sm">Drag riders here or click + Add button</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

// Draggable Rider Card - Modern Design
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
  
  // Gebruik de category van zwift_official_category (preferred) of zwiftracing_category
  const category = rider.zwift_official_category || rider.zwiftracing_category || 'D'
  const categoryColor = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'bg-gray-600 text-white border-gray-700'
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group relative bg-gradient-to-br from-white to-gray-50/50 hover:from-indigo-50/30 hover:to-purple-50/30 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-200 shadow-sm ${isDragging ? 'scale-105 ring-2 ring-indigo-400/50 shadow-2xl' : ''}`}
    >
      <div className="p-3 sm:p-4">
        {/* Drag Handle Area - Top and Middle sections */}
        <div {...listeners} className="cursor-move">
          {/* Top: Rider Name - Prominent */}
          <div className="mb-2 sm:mb-3">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {rider.name || rider.full_name}
            </h3>
          </div>
          
          {/* Middle: Avatar + Phenotype - Visual Focus */}
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="relative">
              <img 
                src={rider.avatar_url || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=6366f1&color=fff&size=64`}
                alt={rider.name}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-indigo-200 shadow-md"
                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=6366f1&color=fff&size=64`; }}
              />
              {/* Category Badge - Subtiel op avatar */}
              <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold rounded-md border ${categoryColor} shadow-md`}>
                {category}
              </div>
            </div>
            
            {rider.phenotype && (
              <div className="flex-1 min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1">Phenotype</div>
                <div className="text-base sm:text-lg font-bold text-purple-700 truncate">
                  {rider.phenotype}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Bottom: Stats - Subtiel en compact - NO DRAG HERE */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-200/60 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm flex-wrap">
            {/* vELO Tier Badge met cirkel en progressbar */}
            <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-br ${veloTier?.color || 'from-gray-400 to-gray-600'} shadow-sm`}>
              {/* Cirkel om tier nummer */}
              <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/30 backdrop-blur-sm border border-white/50 sm:border-2">
                <span className="font-black text-[10px] sm:text-xs text-white">{veloTier?.rank || '?'}</span>
              </div>
              {/* Score + Progressbar */}
              <div className="flex flex-col gap-0.5">
                <span className={`font-bold text-xs sm:text-sm leading-none ${veloTier?.textColor || 'text-white'}`}>{Math.floor(velo30day)}</span>
                {veloTier && veloTier.max && (
                  <div className="w-8 sm:w-12 h-0.5 sm:h-1 bg-black/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white/60 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((velo30day - veloTier.min) / (veloTier.max - veloTier.min)) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {rider.zwift_official_racing_score && (
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap">
                ZRS {rider.zwift_official_racing_score}
              </span>
            )}
          </div>
          
          {/* Add Button - Rechts onderin */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onAdd()
            }}
            className="px-2 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all whitespace-nowrap min-h-[40px] sm:min-h-0 flex items-center justify-center"
          >
            <span className="hidden sm:inline">+ Add</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Lineup Rider Card Component - Compact Design with Drag & Drop
function LineupRiderCard({ rider, onRemove }: { rider: LineupRider, onRemove: () => void }) {
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
  const category = rider.category || 'D'
  const categoryColor = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'bg-gray-500 text-white border-gray-400'
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative bg-gradient-to-br p-2.5 rounded-lg border transition-all shadow-md cursor-move ${
        rider.is_valid 
          ? 'from-blue-900/80 to-indigo-950/80 border-orange-500/40'
          : 'from-red-900/40 to-gray-900 border-red-500'
      } ${isDragging ? 'scale-105 ring-2 ring-indigo-400/50 shadow-2xl z-50' : ''}`}>
      {/* Position Badge - Smaller */}
      <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md border-2 border-gray-900">
        {rider.lineup_position}
      </div>
      
      <div className="relative flex items-center gap-2 sm:gap-2.5">
        {/* Avatar - Smaller */}
        <img 
          src={rider.avatar_url || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=36`}
          alt={rider.name}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-gray-600 shadow-sm flex-shrink-0"
          onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=36`; }}
        />
        
        {/* Name - Compact */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-xs sm:text-sm truncate">
            {rider.name || rider.full_name}
          </div>
        </div>
        
        {/* Stats - Wrap on mobile */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 flex-wrap">
          {/* Category Badge - Compact */}
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] sm:text-xs font-bold rounded border ${categoryColor}`}>
            {category}
          </span>
          
          {/* vELO Tier Badge met cirkel en progressbar - verberg progressbar op mobile */}
          <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-gradient-to-br ${veloTier?.color || 'from-gray-400 to-gray-600'} shadow-sm`}>
            {/* Cirkel om tier nummer */}
            <div className="flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/30 backdrop-blur-sm border border-white/50">
              <span className="font-black text-[10px] sm:text-xs text-white">{veloTier?.rank || '?'}</span>
            </div>
            {/* Score + Progressbar */}
            <div className="flex flex-col gap-0.5">
              <span className={`font-bold text-[10px] sm:text-xs leading-none ${veloTier?.textColor || 'text-white'}`}>{Math.floor(velo30day)}</span>
              {veloTier && veloTier.max && (
                <div className="hidden sm:block w-10 h-0.5 bg-black/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white/60 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((velo30day - veloTier.min) / (veloTier.max - veloTier.min)) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Phenotype - Hidden on mobile */}
          {rider.phenotype && (
            <span className="hidden sm:inline px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-semibold border border-purple-500/30">
              {rider.phenotype}
            </span>
          )}
          
          {/* Validation Icon - Compact */}
          {rider.is_valid ? (
            <span className="text-green-400 text-base sm:text-lg" title="Valid">✓</span>
          ) : (
            <span className="text-red-400 text-base sm:text-lg" title={rider.validation_warning || 'Invalid'}>✗</span>
          )}
        </div>
        
        {/* Remove Button - Compact */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 px-2 py-1.5 sm:py-1 bg-red-500/80 hover:bg-red-600 text-white rounded text-xs font-bold shadow-sm hover:shadow-md transition-all min-h-[40px] sm:min-h-0 flex items-center justify-center"
          title="Remove rider"
        >
          ✕
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
    velo_max_spread: team.velo_max_spread || 3,
    allowed_categories: team.allowed_categories || [],
    min_riders: team.min_riders || 1,
    max_riders: team.max_riders || 10
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">✏️ Bewerk Team</h2>
          
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Team Naam</label>
              <input
                type="text"
                value={editedTeam.team_name}
                onChange={(e) => setEditedTeam({...editedTeam, team_name: e.target.value})}
                className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Team naam..."
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Competitie Type</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setEditedTeam({...editedTeam, competition_type: 'velo'})}
                  className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all min-h-[60px] sm:min-h-0 ${
                    editedTeam.competition_type === 'velo'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="font-bold text-sm sm:text-base">⚡ vELO</div>
                  <div className="text-[10px] sm:text-xs text-gray-400">bijv: Club Ladder</div>
                </button>
                <button
                  type="button"
                  onClick={() => setEditedTeam({...editedTeam, competition_type: 'category'})}
                  className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all min-h-[60px] sm:min-h-0 ${
                    editedTeam.competition_type === 'category'
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="font-bold text-sm sm:text-base">🏆 Category</div>
                  <div className="text-[10px] sm:text-xs text-gray-400">bijv: WTRL ZRL</div>
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
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min vELO Rank</label>
                    <input
                      type="number"
                      value={editedTeam.velo_min_rank}
                      onChange={(e) => setEditedTeam({...editedTeam, velo_min_rank: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                      min="1"
                      max="10"
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
                      max="10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max vELO Spread</label>
                  <input
                    type="number"
                    value={editedTeam.velo_max_spread}
                    onChange={(e) => setEditedTeam({...editedTeam, velo_max_spread: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    min="1"
                    max="10"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Huidige spread: {editedTeam.velo_max_rank - editedTeam.velo_min_rank + 1} ranks
                  </div>
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
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Min Riders</label>
                <input
                  type="number"
                  value={editedTeam.min_riders}
                  onChange={(e) => setEditedTeam({...editedTeam, min_riders: parseInt(e.target.value)})}
                  className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Max Riders</label>
                <input
                  type="number"
                  value={editedTeam.max_riders}
                  onChange={(e) => setEditedTeam({...editedTeam, max_riders: parseInt(e.target.value)})}
                  className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  min="1"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 sm:py-2 text-sm sm:text-base bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors min-h-[48px] sm:min-h-0 flex items-center justify-center"
              disabled={isLoading}
            >
              Annuleer
            </button>
            <button
              onClick={() => onSave(editedTeam)}
              className="flex-1 px-4 py-3 sm:py-2 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg font-semibold shadow-lg transition-colors disabled:opacity-50 min-h-[48px] sm:min-h-0 flex items-center justify-center"
              disabled={isLoading || !editedTeam.team_name.trim() || !editedTeam.competition_name.trim()}
            >
              {isLoading ? 'Opslaan...' : '💾 Opslaan'}
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl border-2 border-orange-500/50 shadow-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">Nieuw Team</h2>
        
        <div className="space-y-3 sm:space-y-4">
          {/* Team Name */}
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
          
          {/* Competition Type */}
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
          
          {/* Competition Name */}
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
          
          {/* vELO Settings */}
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
          
          {/* Category Settings */}
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
          
          {/* Rider Limits */}
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
        
        {/* Actions */}
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
