import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DndContext, DragEndEvent, DragStartEvent, closestCenter, DragOverlay, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import RiderPassportSidebar from '../components/RiderPassportSidebar.tsx'
import TeamLineupModal from '../components/TeamLineupModal.tsx'
import TeamBuilderCard from '../components/TeamCard.tsx'
import { TeamCreationModal } from '../components/TeamCreationModal.tsx'

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8080'

// Category colors for rider badges
const CATEGORY_COLORS_MAP: {[key: string]: string} = {
  'A+': '#FF0000',
  'A': '#FF0000',
  'B': '#4CAF50',
  'C': '#0000FF',
  'D': '#FF1493',
  'E': '#808080'
}

// vELO Tiers for sidebar
const VELO_TIERS_SIDEBAR = [
  { rank: 1, name: 'Diamond', min: 2200, color: '#22D3EE' },
  { rank: 2, name: 'Ruby', min: 1900, max: 2200, color: '#EF4444' },
  { rank: 3, name: 'Emerald', min: 1650, max: 1900, color: '#10B981' },
  { rank: 4, name: 'Sapphire', min: 1450, max: 1650, color: '#3B82F6' },
  { rank: 5, name: 'Amethyst', min: 1300, max: 1450, color: '#A855F7' },
  { rank: 6, name: 'Platinum', min: 1150, max: 1300, color: '#94A3B8' },
  { rank: 7, name: 'Gold', min: 1000, max: 1150, color: '#EAB308' },
  { rank: 8, name: 'Silver', min: 850, max: 1000, color: '#71717A' },
  { rank: 9, name: 'Bronze', min: 650, max: 850, color: '#F97316' },
  { rank: 10, name: 'Copper', min: 0, max: 650, color: '#DC2626' },
]

const getVeloTierSidebar = (rating: number | null) => {
  if (!rating) return null
  return VELO_TIERS_SIDEBAR.find(tier => 
    rating >= tier.min && (!tier.max || rating < tier.max)
  )
}

// Team Expanded Sidebar Component
function TeamExpandedSidebar({ team, onClose, isDragging, onRemoveRider }: { 
  team: Team; 
  onClose: () => void;
  isDragging: boolean;
  onRemoveRider?: (teamId: number, riderId: number) => void;
}) {
  const { data: lineupData } = useQuery({
    queryKey: ['team', team.team_id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/teams/${team.team_id}`)
      if (!res.ok) throw new Error('Failed to fetch team')
      const data = await res.json()
      // Backend returns { success, team, lineup }
      return data
    }
  })

  const lineup = lineupData?.lineup || []
  const canAddMore = team.current_riders < team.max_riders

  // Use @dnd-kit droppable for touch support
  const { setNodeRef, isOver } = useDroppable({
    id: `sidebar-team-${team.team_id}`,
    data: { teamId: team.team_id, type: 'team-sidebar' }
  })

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] lg:hidden"
        onClick={onClose}
      />
      
      <div 
        ref={setNodeRef}
        className={`
          fixed z-[100000] bg-slate-900/98 backdrop-blur-lg shadow-2xl transition-all duration-300
          
          // Mobile: Bottom sheet met rounded top en safe-area support
          lg:hidden
          bottom-0 left-0 right-0
          max-h-[85vh] rounded-t-3xl
          pb-safe
          ${isOver && canAddMore ? 'border-t-4 border-green-500 shadow-green-500/50' : 
            isOver && !canAddMore ? 'border-t-4 border-red-500 shadow-red-500/50' :
            'border-t-4 border-orange-500'}
            
          // Desktop: Right sidebar - Breder voor betere overzicht
          lg:block lg:right-0 lg:top-0 lg:bottom-0 lg:left-auto
          lg:w-[550px] xl:w-[600px] lg:rounded-none lg:border-t-0 lg:border-l-4
          ${isOver && canAddMore ? 'lg:border-green-500 lg:shadow-green-500/50' : 
            isOver && !canAddMore ? 'lg:border-red-500 lg:shadow-red-500/50' :
            'lg:border-orange-500'}
        `}
        data-sidebar-team={team.team_id}
      >
        {/* Mobile: Drag handle */}
        <div className="lg:hidden flex justify-center pt-2 pb-1">
          <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 p-3 sm:p-4 flex items-center justify-between shadow-lg z-10 lg:rounded-none rounded-t-3xl">
          <div className="flex-1 min-w-0 mr-2">
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">{team.team_name}</h3>
            <p className="text-xs text-orange-100 mt-0.5">
              {team.current_riders}/{team.max_riders} riders
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      {/* Drag & Drop Indicator */}
      {isOver && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-50 ${
          canAddMore 
            ? 'bg-green-500/20 backdrop-blur-sm' 
            : 'bg-red-500/20 backdrop-blur-sm'
        }`}>
          <div className="text-center p-8 rounded-xl bg-slate-900/80 border-2 border-dashed backdrop-blur-md">
            <p className={`text-3xl font-bold mb-2 ${canAddMore ? 'text-green-300' : 'text-red-300'}`}>
              {canAddMore ? '✓ Drop hier' : '✗ Team vol'}
            </p>
            {canAddMore ? (
              <p className="text-white text-lg">
                Nog {team.max_riders - team.current_riders} plek{team.max_riders - team.current_riders !== 1 ? 'ken' : ''} vrij
              </p>
            ) : (
              <p className="text-white text-lg">
                Maximum van {team.max_riders} riders bereikt
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mobile: Touch indicator when dragging - no button needed with @dnd-kit */}
      {isDragging && canAddMore && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent z-[100001] pointer-events-none">
          <div className="w-full bg-green-600/90 text-white px-6 py-4 rounded-xl text-xl font-bold shadow-2xl border-2 border-green-400 animate-pulse text-center">
            ⬇️ Sleep hier om toe te voegen
          </div>
        </div>
      )}

      {/* Content - Scrollable area */}
      <div className="overflow-y-auto max-h-[calc(85vh-80px)] lg:max-h-none lg:h-[calc(100vh-80px)] p-4 pb-8">
        {/* Drop Zone Hint when dragging */}
        {isDragging && canAddMore && (
          <div className="mb-4 p-3 sm:p-4 border-2 border-dashed border-green-500 bg-green-500/10 rounded-lg animate-pulse">
            <p className="text-green-400 text-center font-semibold text-sm sm:text-base">
              ⬇️ Sleep rider hierheen om toe te voegen
            </p>
          </div>
        )}
        
        {lineup.length === 0 ? (
          <div className={`h-48 flex items-center justify-center border-2 border-dashed rounded-lg transition-all ${
            isDragging && canAddMore 
              ? 'border-green-500 bg-green-500/10' 
              : 'border-slate-600'
          }`}>
            <div className="text-center">
              <p className="text-slate-400 text-sm">
                {isDragging && canAddMore ? '⬇️ Drop hier om toe te voegen' : 'Geen riders'}
              </p>
              <p className="text-slate-500 text-xs mt-1">Minimaal {team.min_riders} riders</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {lineup.map((rider: any) => {
              const tier = getVeloTierSidebar(rider.velo_live || rider.current_velo_rank)
              const category = rider.category
              const categoryColor = category ? (CATEGORY_COLORS_MAP[category] || '#666666') : '#666666'
              const ftpWkg = rider.racing_ftp && rider.weight_kg 
                ? (rider.racing_ftp / rider.weight_kg).toFixed(2) 
                : '-'

              return (
                <div
                  key={rider.rider_id}
                  className="p-3 rounded-xl border-2 bg-slate-800/80 border-slate-700 active:bg-slate-700/80 transition-all group touch-manipulation"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar - Larger on mobile */}
                    <div className="w-12 h-12 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden bg-slate-700 flex-shrink-0 ring-2 ring-slate-600">
                      {rider.avatar_url ? (
                        <img src={rider.avatar_url} alt={rider.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-xs lg:text-sm font-bold text-white truncate">{rider.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {category && (
                          <span 
                            className="text-[11px] px-2 py-1 text-white rounded-md font-bold shadow-sm"
                            style={{ backgroundColor: categoryColor }}
                          >
                            {category}
                          </span>
                        )}
                        {tier && (
                          <span 
                            className="text-[11px] px-2 py-1 rounded-md font-bold text-white shadow-sm"
                            style={{ backgroundColor: tier.color }}
                            title={`${tier.name} Tier`}
                          >
                            vELO {tier.rank}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-300">
                        <span className="font-medium">{rider.racing_ftp || rider.ftp_watts || '-'}W</span>
                        <span>•</span>
                        <span className="font-medium">{ftpWkg} W/kg</span>
                      </div>
                    </div>

                    {/* Delete Button - Only show in Team Builder mode */}
                    {onRemoveRider && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveRider(team.team_id, rider.rider_id)
                        }}
                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-3 rounded-xl bg-red-500/20 active:bg-red-500/40 border-2 border-red-500/50 active:border-red-500 text-red-400 active:text-red-300 transition-all flex-shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center touch-manipulation"
                        title="Verwijder rider"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      </div>
    </>
  )
}

// Category colors (aangepast voor donkere achtergrond - zichtbare kleuren)
const CATEGORY_COLORS = {
  'A+': 'bg-red-500 text-white border-red-400',
  'A': 'bg-red-600 text-white border-red-500',
  'B': 'bg-green-500 text-white border-green-400',
  'C': 'bg-blue-500 text-white border-blue-400',
  'D': 'bg-yellow-500 text-white border-yellow-400',
}

// vELO Tiers (matching RacingMatrix exactly)
const VELO_TIERS = [
  { rank: 1, name: 'Diamond', min: 2200, max: null, color: 'from-cyan-400 to-blue-500', textColor: 'text-cyan-100' },
  { rank: 2, name: 'Ruby', min: 1900, max: 2200, color: 'from-red-500 to-pink-600', textColor: 'text-red-100' },
  { rank: 3, name: 'Emerald', min: 1650, max: 1900, color: 'from-emerald-400 to-green-600', textColor: 'text-emerald-100' },
  { rank: 4, name: 'Sapphire', min: 1450, max: 1650, color: 'from-blue-400 to-indigo-600', textColor: 'text-blue-100' },
  { rank: 5, name: 'Amethyst', min: 1300, max: 1450, color: 'from-purple-400 to-violet-600', textColor: 'text-purple-100' },
  { rank: 6, name: 'Platinum', min: 1150, max: 1300, color: 'from-slate-300 to-slate-500', textColor: 'text-slate-100' },
  { rank: 7, name: 'Gold', min: 1000, max: 1150, color: 'from-yellow-400 to-amber-600', textColor: 'text-yellow-900' },
  { rank: 8, name: 'Silver', min: 850, max: 1000, color: 'from-gray-300 to-gray-500', textColor: 'text-gray-700' },
  { rank: 9, name: 'Bronze', min: 650, max: 850, color: 'from-orange-400 to-orange-700', textColor: 'text-orange-900' },
  { rank: 10, name: 'Copper', min: 0, max: 650, color: 'from-orange-600 to-red-800', textColor: 'text-orange-100' },
]

const getVeloTier = (rating: number | null) => {
  if (!rating) return null
  return VELO_TIERS.find(tier => 
    rating >= tier.min && (!tier.max || rating < tier.max)
  )
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

interface LineupRider {
  rider_id: number
  name: string
  full_name: string
  avatar_url?: string
  category: string
  velo_live?: number
  current_velo_rank?: number // Legacy field name
  velo_30day: number | null
  phenotype: string | null
  zwift_official_racing_score: number | null
  racing_ftp?: number | null
  ftp_watts?: number | null // Legacy field name
  ftp_wkg?: number | null
  weight_kg?: number | null
  height_cm?: number | null
  age?: number | null
  country_alpha3?: string | null
  // Power intervals for spider chart
  power_5s?: number | null
  power_15s?: number | null
  power_30s?: number | null
  power_60s?: number | null
  power_120s?: number | null
  power_300s?: number | null
  power_1200s?: number | null
  power_5s_wkg?: number | null
  power_15s_wkg?: number | null
  power_30s_wkg?: number | null
  power_60s_wkg?: number | null
  power_120s_wkg?: number | null
  power_300s_wkg?: number | null
  power_1200s_wkg?: number | null
  lineup_position?: number
}

interface TeamViewerProps {
  hideHeader?: boolean
}

export default function TeamViewer({ hideHeader = false }: TeamViewerProps) {
  // 🔒 US1: Entry code protection (same as Team Manager)
  const [isBuilderAuthenticated, setIsBuilderAuthenticated] = useState(false)
  const [showBuilderLogin, setShowBuilderLogin] = useState(false)
  const [builderEntryCode, setBuilderEntryCode] = useState('')
  const BUILDER_CODE = 'CLOUD9RACING' // Same code as Team Manager
  
  const [showTeamBuilder, setShowTeamBuilder] = useState(false)
  const [showTeamCreationModal, setShowTeamCreationModal] = useState(false)
  const [selectedTeamForFiltering, setSelectedTeamForFiltering] = useState<number | null>(null)
  const [favoriteTeams, setFavoriteTeams] = useState<Set<number>>(() => {
    // Load favorites from localStorage
    const stored = localStorage.getItem('favoriteTeams')
    return stored ? new Set(JSON.parse(stored)) : new Set()
  })
  const [sortBy, setSortBy] = useState<'name' | 'riders' | 'status'>('name')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [draggedRider, setDraggedRider] = useState<any>(null)
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  // Optimized sensors for touch-first approach (iPhone/iPad + desktop)
  const sensors = useSensors(
    // PointerSensor for desktop (mouse) - very responsive
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimal distance before drag activates
      },
    }),
    // TouchSensor for mobile/tablet - balanced responsiveness
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // Shorter delay (100ms) for faster response
        tolerance: 10, // Higher tolerance to prevent accidental drags during scrolling
      },
    })
  )

  // 🔒 US1: Check builder authentication on mount
  useEffect(() => {
    const auth = sessionStorage.getItem('teamBuilderAuth')
    if (auth === 'true') {
      setIsBuilderAuthenticated(true)
    }
  }, [])

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('favoriteTeams', JSON.stringify(Array.from(favoriteTeams)))
  }, [favoriteTeams])
  
  // Fetch all teams
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch('/api/teams')
      if (!res.ok) throw new Error('Failed to fetch teams')
      const data = await res.json()
      return data.teams || []
    }
  })
  
  const rawTeams: Team[] = teamsData || []
  
  // Sort teams
  const teams = [...rawTeams].sort((a, b) => {
    // Favorites first
    const aFav = favoriteTeams.has(a.team_id)
    const bFav = favoriteTeams.has(b.team_id)
    if (aFav && !bFav) return -1
    if (!aFav && bFav) return 1
    
    // Then by sort criteria
    if (sortBy === 'name') return a.team_name.localeCompare(b.team_name)
    if (sortBy === 'riders') return b.current_riders - a.current_riders
    if (sortBy === 'status') {
      const statusOrder = { ready: 0, warning: 1, incomplete: 2, overfilled: 3 }
      return statusOrder[a.team_status] - statusOrder[b.team_status]
    }
    return 0
  })
  
  const toggleFavorite = (teamId: number) => {
    setFavoriteTeams(prev => {
      const newSet = new Set(prev)
      if (newSet.has(teamId)) {
        newSet.delete(teamId)
      } else {
        newSet.add(teamId)
      }
      return newSet
    })
  }

  // Fetch all riders voor team builder
  const { data: ridersData, isLoading: ridersLoading } = useQuery({
    queryKey: ['riders'],
    queryFn: async () => {
      const res = await fetch('/api/riders')
      if (!res.ok) throw new Error('Failed to fetch riders')
      return res.json()
    },
    enabled: showTeamBuilder
  })

  // Add rider to team mutation
  const addRiderMutation = useMutation({
    mutationFn: async ({ teamId, riderId }: { teamId: number; riderId: number }) => {
      const res = await fetch(`/api/teams/${teamId}/riders`, {
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
      queryClient.invalidateQueries({ queryKey: ['team-lineup', teamId] })
      queryClient.invalidateQueries({ queryKey: ['riders'] })
      toast.success('Rider toegevoegd aan team!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // Remove rider from team mutation
  const removeRiderMutation = useMutation({
    mutationFn: async ({ teamId, riderId }: { teamId: number; riderId: number }) => {
      const res = await fetch(`/api/teams/${teamId}/riders/${riderId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove rider')
      }
      return res.json()
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team', teamId] })
      toast.success('Rider verwijderd uit team!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // Delete team mutation
  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete team')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team verwijderd!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleDeleteTeam = (teamId: number, teamName: string) => {
    if (confirm(`Weet je zeker dat je team "${teamName}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      deleteTeamMutation.mutate(teamId)
    }
  }

  // 🔒 US1: Entry code handler for Team Builder access
  const handleBuilderEntryCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (builderEntryCode.toUpperCase() === BUILDER_CODE) {
      setIsBuilderAuthenticated(true)
      sessionStorage.setItem('teamBuilderAuth', 'true')
      setShowBuilderLogin(false)
      setBuilderEntryCode('')
      setShowTeamBuilder(true)
      toast.success('✅ Toegang verleend tot Team Builder!')
    } else {
      toast.error('❌ Onjuiste toegangscode')
      setBuilderEntryCode('')
    }
  }

  // 🔒 US1: Handle Team Builder toggle with authentication
  const handleTeamBuilderToggle = () => {
    if (!isBuilderAuthenticated) {
      setShowBuilderLogin(true)
    } else {
      setShowTeamBuilder(!showTeamBuilder)
    }
  }

  // Riders kan array zijn OF object met riders property
  const riders = Array.isArray(ridersData) ? ridersData : (ridersData?.riders || [])

  // @dnd-kit handlers for touch support
  const handleDndDragStart = useCallback((event: DragStartEvent) => {
    const riderId = Number(event.active.id)
    const rider = riders.find((r: any) => r.rider_id === riderId)
    console.log('handleDndDragStart called', { riderId, rider: rider?.racing_name })
    setDraggedRider(rider || null)
  }, [riders])

  const handleDndDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    console.log('handleDndDragEnd called', { active: active.id, over: over?.id, draggedRider })
    
    // 🎯 US3: Verbeterde cancel functionaliteit - als geen drop target, vriendelijk bericht
    if (!over) {
      if (draggedRider) {
        toast.success(`${draggedRider.racing_name || draggedRider.full_name} - drag geannuleerd`, {
          duration: 2000,
          icon: '✋'
        })
      }
      setDraggedRider(null)
      return
    }
    
    if (!draggedRider) {
      setDraggedRider(null)
      return
    }

    // Extract team ID from droppable ID
    let targetTeamId: number | null = null
    
    if (typeof over.id === 'string') {
      if (over.id.startsWith('team-')) {
        targetTeamId = Number(over.id.replace('team-', ''))
      } else if (over.id.startsWith('sidebar-team-')) {
        targetTeamId = Number(over.id.replace('sidebar-team-', ''))
      }
    } else {
      targetTeamId = Number(over.id)
    }

    if (targetTeamId) {
      console.log('Adding rider to team', { teamId: targetTeamId, riderId: draggedRider.rider_id })
      addRiderMutation.mutate({ teamId: targetTeamId, riderId: draggedRider.rider_id })
    }
    
    setDraggedRider(null)
  }, [draggedRider, addRiderMutation])

  const handleOpenTeamDetail = (teamId: number) => {
    console.log('🔵 TeamViewer: Opening team detail sidebar for team:', teamId)
    // Close expanded view if open
    if (expandedTeamId) {
      console.log('  Closing expanded team view:', expandedTeamId)
      setExpandedTeamId(null)
    }
    console.log('  Setting selectedTeamId to:', teamId)
    setSelectedTeamId(teamId)
  }

  const handleCloseTeamDetail = () => {
    console.log('🔴 TeamViewer: Closing team detail sidebar')
    setSelectedTeamId(null)
  }
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDndDragStart}
      onDragEnd={handleDndDragEnd}
    >
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      {/* Header */}
      {!hideHeader && (
      <div className="relative overflow-hidden mb-4 sm:mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-blue-600 to-orange-500 opacity-95"></div>
        <div className="relative px-3 py-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-lg rounded-xl shadow-xl flex-shrink-0">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">
                    👥 Team Lineup
                  </h1>
                  <p className="text-orange-100 text-sm font-semibold mt-0.5">
                    TeamNL Cloud9 Racing
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-lg rounded-lg px-3 py-2 border border-white/20">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'riders' | 'status')}
                    className="bg-transparent text-white text-sm font-semibold cursor-pointer focus:outline-none"
                  >
                    <option value="name" className="bg-gray-900">Naam</option>
                    <option value="riders" className="bg-gray-900">Riders</option>
                    <option value="status" className="bg-gray-900">Status</option>
                  </select>
                </div>
                
                {/* Team Builder Toggle - Met entry code beveiliging */}
                <button
                  onClick={handleTeamBuilderToggle}
                  className={`flex items-center gap-2 px-4 py-2 backdrop-blur-lg rounded-lg border font-bold text-sm transition-all shadow-lg hover:shadow-xl ${
                    showTeamBuilder
                      ? 'bg-orange-500 border-orange-400 text-white'
                      : 'bg-orange-500/20 border-orange-400/30 text-white hover:bg-orange-500/30'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="hidden sm:inline">{showTeamBuilder ? 'Sluiten' : 'Team Builder'}</span>
                  <span className="sm:hidden">{showTeamBuilder ? '✖' : '🏗️'}</span>
                  {!isBuilderAuthenticated && (
                    <span className="text-xs">🔒</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>      )}
      
      {/* 🔒 US1: Entry Code Login Modal */}
      {showBuilderLogin && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100000] px-4">
          <div className="max-w-md w-full">
            <div className="bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-blue-700/40 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-center text-white mb-2">
                🔒 Team Builder
              </h2>
              <p className="text-center text-blue-100 mb-6">
                Voer de toegangscode in
              </p>
              
              <form onSubmit={handleBuilderEntryCodeSubmit} className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={builderEntryCode}
                    onChange={(e) => setBuilderEntryCode(e.target.value)}
                    placeholder="Toegangscode"
                    className="w-full px-4 py-3 bg-white/10 border-2 border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/60 backdrop-blur-sm"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBuilderLogin(false)
                      setBuilderEntryCode('')
                    }}
                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 border-2 border-white/30 rounded-xl text-white font-semibold transition-all"
                  >
                    Annuleer
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl text-white font-bold shadow-lg transition-all"
                  >
                    Toegang
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 transition-all duration-300">
        {teamsLoading ? (
          <div className="text-center text-gray-600 py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4">Teams laden...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <p className="text-xl mb-4">Geen teams gevonden</p>
            <button
              onClick={() => window.location.pathname = '/team-competition'}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold shadow-lg"
            >
              + Nieuw Team Aanmaken
            </button>
          </div>
        ) : (
          <>
            {/* Team Builder Integration - Volledig Geïntegreerd */}
            {showTeamBuilder && (
              <div className="mb-8 bg-slate-800/50 backdrop-blur-xl rounded-2xl border-2 border-orange-500/50 shadow-2xl overflow-hidden">
                {/* Sticky Header */}
                <div className="sticky top-0 z-30 bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">🏆 Team Builder</h3>
                      <p className="text-orange-100 text-sm">Sleep riders naar je teams</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowTeamCreationModal(true)}
                      className="px-4 py-2 bg-white hover:bg-white/90 text-orange-600 rounded-lg font-bold border border-white shadow-lg transition-all text-sm flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Nieuw Team
                    </button>
                    <button
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold border border-white/20 transition-all text-sm"
                    >
                      {sidebarOpen ? '← Verberg Sidebar' : '→ Toon Sidebar'}
                    </button>
                    <button
                      onClick={() => setShowTeamBuilder(false)}
                      className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all hover:rotate-90 duration-300"
                      title="Sluiten"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex">
                  {ridersLoading ? (
                    <div className="flex-1 text-center text-white py-20">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
                      <p>Riders laden...</p>
                    </div>
                  ) : (
                    <>
                      {/* Sidebar met Riders */}
                      <RiderPassportSidebar
                        riders={riders}
                        isOpen={sidebarOpen}
                        selectedTeam={selectedTeamForFiltering ? teams.find(t => t.team_id === selectedTeamForFiltering) : null}
                        onClearTeamFilter={() => setSelectedTeamForFiltering(null)}
                      />

                      {/* Team Cards Grid */}
                      <div className={`flex-1 p-6 transition-all duration-300`}>
                        {teams.length === 0 ? (
                          <div className="text-center text-white py-20">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-500/50 mb-4">
                              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                            <p className="text-xl font-bold mb-2">Geen teams gevonden</p>
                            <p className="text-slate-400 mb-6">Klik op 'Nieuw Team' om te beginnen</p>
                            <button
                              onClick={() => setShowTeamCreationModal(true)}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Nieuw Team Aanmaken
                            </button>
                          </div>
                        ) : (
                          <div className={`grid gap-4 sm:gap-6 items-start transition-all duration-300 ${
                            expandedTeamId 
                              ? 'grid-cols-1 lg:grid-cols-2' 
                              : 'grid-cols-1 md:grid-cols-2 2xl:grid-cols-3'
                          }`}>
                            {teams.map(team => (
                              <TeamBuilderCard
                                key={team.team_id}
                                team={team}
                                onOpenDetail={handleOpenTeamDetail}
                                onDelete={() => handleDeleteTeam(team.team_id, team.team_name)}
                                onSelectForFiltering={(teamId) => {
                                  setSelectedTeamForFiltering(teamId === selectedTeamForFiltering ? null : teamId)
                                }}
                                isSelectedForFiltering={team.team_id === selectedTeamForFiltering}
                                isDragging={draggedRider !== null}
                                isExpanded={team.team_id === expandedTeamId}
                                onToggleExpand={(teamId) => {
                                  setExpandedTeamId(expandedTeamId === teamId ? null : teamId)
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {/* Team Cards List */}
            <div className="space-y-6">
              {teams.map(team => (
                <TeamCard 
                  key={team.team_id} 
                  team={team}
                  isFavorite={favoriteTeams.has(team.team_id)}
                  toggleFavorite={toggleFavorite}
                  isExpanded={team.team_id === expandedTeamId}
                  onToggleExpand={() => {
                    setExpandedTeamId(expandedTeamId === team.team_id ? null : team.team_id)
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fixed Right Sidebar for Expanded Team */}
      {expandedTeamId && teams.find(t => t.team_id === expandedTeamId) && (
        <TeamExpandedSidebar
          team={teams.find(t => t.team_id === expandedTeamId)!}
          onClose={() => setExpandedTeamId(null)}
          isDragging={showTeamBuilder && draggedRider !== null}
          onRemoveRider={showTeamBuilder ? (teamId, riderId) => {
            removeRiderMutation.mutate({ teamId, riderId })
          } : undefined}
        />
      )}

      {/* Team Lineup Detail Modal - Fixed Right Sidebar */}
      {selectedTeamId && (
        <div className="fixed right-0 top-0 bottom-0 z-[100]">
          <TeamLineupModal
            teamId={selectedTeamId}
            onClose={handleCloseTeamDetail}
          />
        </div>
      )}

      {/* Team Creation Modal */}
      <TeamCreationModal
        isOpen={showTeamCreationModal}
        onClose={() => setShowTeamCreationModal(false)}
        onTeamCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['teams'] })
          setShowTeamCreationModal(false)
        }}
      />

      {/* DragOverlay for visual feedback */}
      <DragOverlay>
        {draggedRider ? (
          <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-2xl border-2 border-blue-400 opacity-90">
            <div className="font-bold">{draggedRider.racing_name || draggedRider.full_name}</div>
            <div className="text-sm">
              {draggedRider.zwiftracing_category || draggedRider.zwift_official_category} • vELO {draggedRider.velo_live}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  )
}

// Team Card with Riders - Collapsible (Modernized with Favorite)
function TeamCard({ team, isFavorite, toggleFavorite, isExpanded, onToggleExpand }: { 
  team: Team; 
  isFavorite: boolean; 
  toggleFavorite: (teamId: number) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const [viewMode, setViewMode] = useState<'matrix' | 'passports'>('matrix')
  const [passportSize, setPassportSize] = useState<'compact' | 'full'>('compact')
  
  const { data: lineupData, isLoading } = useQuery({
    queryKey: ['team-lineup', team.team_id],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${team.team_id}`)
      if (!res.ok) throw new Error('Failed to fetch lineup')
      const data = await res.json()
      
      // Debug logging - eerste rider data
      if (data.lineup && data.lineup.length > 0) {
        console.log(`📊 Team ${team.team_name} - First rider:`, {
          name: data.lineup[0].name,
          velo_live: data.lineup[0].velo_live,
          velo_30day: data.lineup[0].velo_30day,
          racing_ftp: data.lineup[0].racing_ftp,
          weight_kg: data.lineup[0].weight_kg,
          allFields: Object.keys(data.lineup[0])
        })
      }
      
      return data
    },
    enabled: isExpanded // Only fetch when expanded
  })
  
  const lineup: LineupRider[] = lineupData?.lineup || []
  
  const statusColor = {
    'ready': 'bg-green-500/20 text-green-300 border-green-500/50',
    'incomplete': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
    'warning': 'bg-orange-500/20 text-orange-300 border-orange-500/50',
    'overfilled': 'bg-red-500/20 text-red-300 border-red-500/50'
  }[team.team_status]
  
  return (
    <div className={`bg-gradient-to-br from-blue-900/80 to-indigo-950/80 backdrop-blur rounded-xl shadow-xl transition-all duration-300 overflow-hidden ${
      isExpanded 
        ? 'border-2 border-orange-400 shadow-orange-500/30 shadow-2xl ring-2 ring-orange-500/20' 
        : 'border border-orange-500/30 hover:border-orange-400/50 hover:shadow-2xl'
    }`}>
      {/* Team Header - Clickable */}
      <div className="p-3 sm:p-4 lg:p-6 relative">
        <button
          onClick={() => onToggleExpand?.()}
          className={`w-full flex items-center justify-between rounded-lg p-2 sm:p-3 -m-2 sm:-m-3 transition-all duration-200 ${
            isExpanded ? 'bg-orange-500/10' : 'hover:bg-white/5'
          }`}
        >
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-1">
              {/* Favorite Star Button - Links van teamnaam */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(team.team_id) }}
                className="flex-shrink-0 w-8 h-8 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 transition-all hover:scale-110 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                title={isFavorite ? 'Verwijder van favorieten' : 'Toevoegen aan favorieten'}
              >
                <span className={`text-lg sm:text-xl transition-transform ${isFavorite ? 'scale-110' : ''}`}>
                  {isFavorite ? '⭐' : '☆'}
                </span>
              </button>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate flex-1">{team.team_name}</h2>
              <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold border ${statusColor} whitespace-nowrap flex-shrink-0`}>
                {team.current_riders}
              </span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm truncate">{team.competition_name}</p>
            <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase">
                {team.competition_type === 'velo' ? '🎯 vELO' : '📊 Cat'}
              </span>
            </div>
          </div>
          
          {/* Expand/Collapse Icon with Animation */}
          <div className={`text-white text-xl sm:text-2xl flex-shrink-0 ml-2 sm:ml-4 transition-all duration-300 ${
            isExpanded ? 'rotate-90 text-orange-400' : 'text-gray-400 group-hover:text-white'
          }`}>
            ▶
          </div>
        </button>

        {/* View Toggles - Only visible when expanded */}
        {isExpanded && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-700">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-lg rounded-lg p-1 border border-white/20">
              <button
                onClick={(e) => { e.stopPropagation(); setViewMode('matrix') }}
                className={`flex-1 sm:flex-initial px-2 sm:px-3 py-2 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all min-h-[44px] sm:min-h-0 flex items-center justify-center ${
                  viewMode === 'matrix'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                📊 Matrix
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setViewMode('passports') }}
                className={`flex-1 sm:flex-initial px-2 sm:px-3 py-2 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all min-h-[44px] sm:min-h-0 flex items-center justify-center ${
                  viewMode === 'passports'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                🎴 Passports
              </button>
            </div>

            {/* Passport Size Toggle - Only show when passports mode */}
            {viewMode === 'passports' && (
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur-lg rounded-lg p-1 border border-white/20">
                <button
                  onClick={(e) => { e.stopPropagation(); setPassportSize('compact') }}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3 py-2 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all min-h-[44px] sm:min-h-0 flex items-center justify-center ${
                    passportSize === 'compact'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  📋 Compact
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setPassportSize('full') }}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3 py-2 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all min-h-[44px] sm:min-h-0 flex items-center justify-center ${
                    passportSize === 'full'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  📄 Full
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Riders Table - Collapsible with smooth animation */}
      <div 
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 pt-2 border-t border-orange-500/20">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
              <p className="mt-3">Riders laden...</p>
            </div>
          ) : !lineup || !Array.isArray(lineup) || lineup.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>Nog geen riders toegevoegd</p>
            </div>
          ) : viewMode === 'passports' ? (
            passportSize === 'full' ? (
              <RidersPassportsFull lineup={lineup} />
            ) : (
              <RidersPassportsCompact lineup={lineup} />
            )
          ) : (
            <RidersTable lineup={lineup} />
          )}
        </div>
      </div>
    </div>
  )
}

// Riders Passports - Full Size Cards - EXACT COPY van Passport Gallery met flip & spider chart
function RidersPassportsFull({ lineup }: { lineup: LineupRider[] }) {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())
  const [tierMaxValues, setTierMaxValues] = useState<{[tier: number]: any}>({})

  // Helper function voor vELO tiers
  const getVeloTier = (veloLive: number | null) => {
    if (!veloLive) return { tier: 10, name: 'Copper', color: '#B87333', border: '#8B5A1F' }
    if (veloLive >= 2200) return { tier: 1, name: 'Diamond', color: '#00D4FF', border: '#0099CC' }
    if (veloLive >= 1900) return { tier: 2, name: 'Ruby', color: '#E61E50', border: '#B30F3A' }
    if (veloLive >= 1650) return { tier: 3, name: 'Emerald', color: '#50C878', border: '#2E9356' }
    if (veloLive >= 1450) return { tier: 4, name: 'Sapphire', color: '#0F52BA', border: '#0A3680' }
    if (veloLive >= 1300) return { tier: 5, name: 'Amethyst', color: '#9966CC', border: '#6B4A99' }
    if (veloLive >= 1150) return { tier: 6, name: 'Platinum', color: '#E5E4E2', border: '#B8B7B5' }
    if (veloLive >= 1000) return { tier: 7, name: 'Gold', color: '#FFD700', border: '#CCA700' }
    if (veloLive >= 850) return { tier: 8, name: 'Silver', color: '#C0C0C0', border: '#8C8C8C' }
    if (veloLive >= 650) return { tier: 9, name: 'Bronze', color: '#CD7F32', border: '#995F26' }
    return { tier: 10, name: 'Copper', color: '#B87333', border: '#8B5A1F' }
  }

  const getCategoryColor = (cat: string) => {
    const colors: {[key: string]: string} = {
      'A+': '#FF0000', 'A': '#FF0000', 'B': '#4CAF50',
      'C': '#0000FF', 'D': '#FF1493', 'E': '#808080'
    }
    return colors[cat] || '#666'
  }

  const getFlagUrl = (countryCode: string) => {
    const alpha3ToAlpha2: { [key: string]: string} = {
      'NLD': 'nl', 'BEL': 'be', 'GBR': 'gb', 'USA': 'us', 'DEU': 'de',
      'FRA': 'fr', 'ITA': 'it', 'ESP': 'es', 'AUS': 'au', 'CAN': 'ca',
      'DNK': 'dk', 'SWE': 'se', 'NOR': 'no', 'FIN': 'fi', 'POL': 'pl'
    }
    const alpha2 = alpha3ToAlpha2[countryCode?.toUpperCase()]
    return alpha2 ? `https://flagcdn.com/w80/${alpha2}.png` : null
  }

  const toggleFlip = (riderId: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(riderId)) {
        newSet.delete(riderId)
      } else {
        newSet.add(riderId)
      }
      return newSet
    })
  }

  // Calculate tier max values for spider chart normalization
  useEffect(() => {
    const maxByTier: {[tier: number]: any} = {}
    
    lineup.forEach(rider => {
      const tierData = getVeloTier(rider.current_velo_rank || rider.velo_live || null)
      if (!tierData) return
      const tier = tierData.tier
      
      if (!maxByTier[tier]) {
        maxByTier[tier] = {
          power_5s: 0, power_15s: 0, power_30s: 0, power_60s: 0,
          power_120s: 0, power_300s: 0, power_1200s: 0
        }
      }
      
      // Update max values (note: lineup might not have all power fields, we'll use defaults if missing)
      maxByTier[tier].power_5s = Math.max(maxByTier[tier].power_5s, rider.power_5s || 0)
      maxByTier[tier].power_15s = Math.max(maxByTier[tier].power_15s, rider.power_15s || 0)
      maxByTier[tier].power_30s = Math.max(maxByTier[tier].power_30s, rider.power_30s || 0)
      maxByTier[tier].power_60s = Math.max(maxByTier[tier].power_60s, rider.power_60s || 0)
      maxByTier[tier].power_120s = Math.max(maxByTier[tier].power_120s, rider.power_120s || 0)
      maxByTier[tier].power_300s = Math.max(maxByTier[tier].power_300s, rider.power_300s || 0)
      maxByTier[tier].power_1200s = Math.max(maxByTier[tier].power_1200s, rider.power_1200s || 0)
    })
    
    setTierMaxValues(maxByTier)
  }, [lineup])

  // Draw spider charts for flipped cards
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    
    ;[50, 150, 300].forEach(delay => {
      const timer = setTimeout(() => {
        flippedCards.forEach(riderId => {
          const canvas = document.getElementById(`spider-${riderId}`) as HTMLCanvasElement
          if (canvas) {
            const rider = lineup.find(r => r.rider_id === riderId)
            if (rider) {
              drawSpiderChartForRider(canvas, rider)
            }
          }
        })
      }, delay)
      timers.push(timer)
    })
    
    return () => timers.forEach(t => clearTimeout(t))
  }, [flippedCards, lineup, tierMaxValues])

  const drawSpiderChartForRider = (canvas: HTMLCanvasElement, rider: LineupRider) => {
    setTimeout(() => {
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = canvas.width
      const height = canvas.height
      const centerX = width / 2
      const centerY = height / 2
      const radius = Math.min(width, height) / 2 - 20

      const tierData = getVeloTier(rider.current_velo_rank || rider.velo_live || null)
      if (!tierData) return
      const tier = tierData.tier
      const tierMax = tierMaxValues[tier] || {
        power_5s: 1500, power_15s: 1200, power_30s: 1000, power_60s: 800,
        power_120s: 600, power_300s: 500, power_1200s: 400
      }

      const powerData = [
        { label: '5s', value: rider.power_5s || 0, max: tierMax.power_5s || 1 },
        { label: '15s', value: rider.power_15s || 0, max: tierMax.power_15s || 1 },
        { label: '30s', value: rider.power_30s || 0, max: tierMax.power_30s || 1 },
        { label: '1m', value: rider.power_60s || 0, max: tierMax.power_60s || 1 },
        { label: '2m', value: rider.power_120s || 0, max: tierMax.power_120s || 1 },
        { label: '5m', value: rider.power_300s || 0, max: tierMax.power_300s || 1 },
        { label: '20m', value: rider.power_1200s || 0, max: tierMax.power_1200s || 1 }
      ]

      const numPoints = powerData.length
      const angleStep = (Math.PI * 2) / numPoints

      ctx.clearRect(0, 0, width, height)

      // Draw grid circles
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath()
        ctx.arc(centerX, centerY, (radius * i) / 5, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Draw axes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      powerData.forEach((_, i) => {
        const angle = i * angleStep - Math.PI / 2
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(x, y)
        ctx.stroke()

        const labelX = centerX + Math.cos(angle) * (radius + 15)
        const labelY = centerY + Math.sin(angle) * (radius + 15)
        ctx.fillStyle = '#FFD700'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(powerData[i].label, labelX, labelY)
      })

      // Draw data polygon
      ctx.beginPath()
      powerData.forEach((data, i) => {
        const angle = i * angleStep - Math.PI / 2
        const normalized = Math.min((data.value || 0) / data.max, 1)
        const r = radius * normalized
        const x = centerX + Math.cos(angle) * r
        const y = centerY + Math.sin(angle) * r
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.closePath()
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'
      ctx.fill()
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw data points
      powerData.forEach((data, i) => {
        const angle = i * angleStep - Math.PI / 2
        const normalized = Math.min((data.value || 0) / data.max, 1)
        const r = radius * normalized
        const x = centerX + Math.cos(angle) * r
        const y = centerY + Math.sin(angle) * r
        
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#FFD700'
        ctx.fill()
      })
    }, 100)
  }

  return (
    <div className="overflow-x-auto pb-4 scroll-smooth">
      <div className="flex gap-6 px-2" style={{ minWidth: 'min-content' }}>
        {lineup.map(rider => {
          const veloLiveTier = getVeloTier(rider.current_velo_rank || rider.velo_live || null)
          const category = rider.category || 'D'
          const categoryColor = getCategoryColor(category)
          const wkg = rider.racing_ftp && rider.weight_kg ? (rider.racing_ftp / rider.weight_kg).toFixed(1) : '-'
          const veloLive = Math.floor(rider.current_velo_rank || rider.velo_live || 0)
          const velo30day = Math.floor(rider.velo_30day || veloLive)
          const isFlipped = flippedCards.has(rider.rider_id)
          const flagUrl = getFlagUrl(rider.country_alpha3 || '')
          const heightCm = rider.height_cm ? Math.round(rider.height_cm) : '-'

          return (
            <div
              key={rider.rider_id}
              className="flex-shrink-0 cursor-pointer"
              style={{ width: '300px', perspective: '1000px' }}
              onClick={() => toggleFlip(rider.rider_id)}
            >
              <div 
                className="relative w-full h-[520px] transition-transform duration-700"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* VOORKANT */}
                <div 
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-gray-900 to-blue-900 border-4 border-orange-400 shadow-xl p-2"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                {/* Header with tier badge and category */}
                <div
                  className="h-16 rounded-t-lg relative mb-12"
                  style={{
                    background: veloLiveTier 
                      ? `linear-gradient(135deg, ${veloLiveTier.color} 0%, ${veloLiveTier.border} 100%)` 
                      : '#666',
                    clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)'
                  }}
                >
                  <div
                    className="absolute top-2 left-3 w-10 h-10 rounded-full flex items-center justify-center border-3"
                    style={{
                      background: veloLiveTier?.color || '#666',
                      borderColor: veloLiveTier?.border || '#fff',
                      borderWidth: '3px',
                      borderStyle: 'solid'
                    }}
                    title={veloLiveTier?.name}
                  >
                    <span className="text-2xl font-black text-white drop-shadow-lg">{veloLiveTier?.tier || '?'}</span>
                  </div>
                  <div
                    className="absolute top-2 left-14 w-10 h-10 rounded-full flex items-center justify-center border-3 border-white"
                    style={{ background: categoryColor }}
                  >
                    <span className="text-2xl font-black text-white drop-shadow-lg">{category}</span>
                  </div>
                  <div className="absolute top-2 right-3 text-center">
                    <div className="text-xs font-bold text-gray-900 uppercase">ZRS</div>
                    <div className="text-lg font-black text-gray-900">{rider.zwift_official_racing_score || '-'}</div>
                  </div>
                </div>

                {/* Avatar */}
                <img
                  src={rider.avatar_url || 'https://via.placeholder.com/100?text=No+Avatar'}
                  alt={rider.name}
                  className="absolute top-12 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-3 border-orange-400 object-cover bg-gray-700 shadow-xl"
                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/100?text=No+Avatar' }}
                />

                {/* Name and Flag */}
                <div className="text-center mb-2 mt-3">
                  <h2 className="text-sm font-black text-white uppercase drop-shadow-lg mb-1 px-1 leading-tight">
                    {rider.name || rider.full_name || 'Unknown'}
                  </h2>
                  <div className="flex items-center justify-center gap-1">
                    {flagUrl && (
                      <img
                        src={flagUrl}
                        alt={rider.country_alpha3 || ''}
                        className="w-8 h-6 rounded shadow"
                      />
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-3 px-2">
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
                    <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">zFTP</div>
                    <div className="text-lg font-black text-white">{rider.racing_ftp || '-'}<span className="text-sm text-white/70">W</span></div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
                    <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">Wgt</div>
                    <div className="text-lg font-black text-white">{rider.weight_kg || '-'}<span className="text-sm text-white/70">kg</span></div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
                    <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">W/kg</div>
                    <div className="text-lg font-black text-white">{wkg}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
                    <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">Hgt</div>
                    <div className="text-lg font-black text-white">{heightCm}<span className="text-sm text-white/70">cm</span></div>
                  </div>
                  <div></div>
                  <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
                    <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">Age</div>
                    <div className="text-lg font-black text-white">{rider.age || '-'}<span className="text-sm text-white/70">yr</span></div>
                  </div>
                </div>

                {/* Velo Ranks */}
                <div className="grid grid-cols-2 gap-2 px-2 mb-3">
                  <div
                    className="rounded-lg p-2 text-center border-2"
                    style={{ 
                      background: 'rgba(255,255,255,0.1)', 
                      borderColor: veloLiveTier?.color || '#666'
                    }}
                  >
                    <div className="text-xs font-bold uppercase" style={{ color: veloLiveTier?.color || '#999' }}>Velo Live</div>
                    <div className="text-lg font-black text-white">{veloLive || '-'}</div>
                  </div>
                  <div
                    className="rounded-lg p-2 text-center border-2"
                    style={{ 
                      background: 'rgba(255,255,255,0.1)', 
                      borderColor: veloLiveTier?.color || '#666'
                    }}
                  >
                    <div className="text-xs font-bold uppercase" style={{ color: veloLiveTier?.color || '#999' }}>Velo 30d</div>
                    <div className="text-lg font-black text-white">{velo30day || '-'}</div>
                  </div>
                </div>

                {/* Phenotype Bar */}
                {rider.phenotype && (
                  <div className="mx-2 mb-3 bg-white/10 rounded-lg p-3 border border-white/20 text-center">
                    <div className="text-xs text-yellow-400 font-bold uppercase">Phenotype</div>
                    <div className="text-lg font-bold text-white capitalize">{rider.phenotype}</div>
                  </div>
                )}

                <div className="text-center text-xs text-yellow-400/80 uppercase tracking-wide font-bold mt-auto mb-2">
                  🔄 Klik voor intervals
                </div>
              </div>

              {/* BACK */}
              <div
                className="absolute w-full h-full backface-hidden rounded-xl bg-gradient-to-br from-gray-900 to-blue-900 border-4 border-orange-400 shadow-xl p-3 flex flex-col"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                <h3 className="text-yellow-400 text-base font-black uppercase mb-2 tracking-wide text-center">Power Profile</h3>
                
                {/* Spider Chart */}
                <div className="flex justify-center mb-3">
                  <canvas
                    ref={(canvas) => {
                      if (canvas && isFlipped) {
                        requestAnimationFrame(() => {
                          drawSpiderChartForRider(canvas, rider)
                        })
                      }
                    }}
                    id={`spider-${rider.rider_id}`}
                    width="240"
                    height="200"
                    className="spider-chart"
                    data-rider-id={rider.rider_id}
                  />
                </div>

                {/* Power Intervals Grid - Compact 2 columns */}
                <div className="grid grid-cols-2 gap-1.5 px-3">
                  {[
                    { label: '5s', power: rider.power_5s, wkg: rider.power_5s_wkg },
                    { label: '15s', power: rider.power_15s, wkg: rider.power_15s_wkg },
                    { label: '30s', power: rider.power_30s, wkg: rider.power_30s_wkg },
                    { label: '1m', power: rider.power_60s, wkg: rider.power_60s_wkg },
                    { label: '2m', power: rider.power_120s, wkg: rider.power_120s_wkg },
                    { label: '5m', power: rider.power_300s, wkg: rider.power_300s_wkg },
                    { label: '20m', power: rider.power_1200s, wkg: rider.power_1200s_wkg }
                  ].map(interval => (
                    <div key={interval.label} className="bg-white/10 border border-white/20 rounded p-1.5 text-center">
                      <div className="text-[10px] text-yellow-400 font-bold leading-tight">{interval.label}</div>
                      <div className="text-xs font-black text-white leading-tight mt-0.5">
                        {interval.power ? Math.round(interval.power) + 'W' : '-'}
                      </div>
                      <div className="text-[10px] text-yellow-400/80 font-black leading-tight">
                        {interval.wkg ? interval.wkg.toFixed(1) : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Riders Passports - Compact Size (mini cards 220px)
function RidersPassportsCompact({ lineup }: { lineup: LineupRider[] }) {
  // Helper function voor vELO tiers
  const getVeloTier = (veloLive: number | null) => {
    if (!veloLive) return { tier: 10, name: 'Copper', color: '#B87333', border: '#8B5A1F' }
    if (veloLive >= 2200) return { tier: 1, name: 'Diamond', color: '#00D4FF', border: '#0099CC' }
    if (veloLive >= 1900) return { tier: 2, name: 'Ruby', color: '#E61E50', border: '#B30F3A' }
    if (veloLive >= 1650) return { tier: 3, name: 'Emerald', color: '#50C878', border: '#2E9356' }
    if (veloLive >= 1450) return { tier: 4, name: 'Sapphire', color: '#0F52BA', border: '#0A3680' }
    if (veloLive >= 1300) return { tier: 5, name: 'Amethyst', color: '#9966CC', border: '#6B4A99' }
    if (veloLive >= 1150) return { tier: 6, name: 'Platinum', color: '#E5E4E2', border: '#B8B7B5' }
    if (veloLive >= 1000) return { tier: 7, name: 'Gold', color: '#FFD700', border: '#CCA700' }
    if (veloLive >= 850) return { tier: 8, name: 'Silver', color: '#C0C0C0', border: '#8C8C8C' }
    if (veloLive >= 650) return { tier: 9, name: 'Bronze', color: '#CD7F32', border: '#995F26' }
    return { tier: 10, name: 'Copper', color: '#B87333', border: '#8B5A1F' }
  }

  const getCategoryColor = (cat: string) => {
    const colors: {[key: string]: string} = {
      'A+': '#FF0000', 'A': '#FF0000', 'B': '#4CAF50',
      'C': '#0000FF', 'D': '#FF1493', 'E': '#808080'
    }
    return colors[cat] || '#666'
  }

  return (
    <div className="overflow-x-auto pb-4 scroll-smooth">
      <div className="flex gap-4 px-2" style={{ minWidth: 'min-content' }}>
        {lineup.map(rider => {
          const veloLive = Math.floor(rider.current_velo_rank || rider.velo_live || 0)
          const veloLiveTier = getVeloTier(veloLive)
          const category = rider.category || 'D'
          const categoryColor = getCategoryColor(category)
          const wkg = rider.racing_ftp && rider.weight_kg ? (rider.racing_ftp / rider.weight_kg).toFixed(1) : '-'

          return (
            <div
              key={rider.rider_id}
              className="flex-shrink-0 w-[220px] bg-gradient-to-br from-gray-900 to-blue-900 border-2 border-orange-400 rounded-lg shadow-lg overflow-hidden relative"
            >
              {/* Header with tier and category */}
              <div
                className="h-12 rounded-t-lg relative mb-8"
                style={{
                  background: veloLiveTier 
                    ? `linear-gradient(135deg, ${veloLiveTier.color} 0%, ${veloLiveTier.border} 100%)` 
                    : '#666',
                  clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)'
                }}
              >
                <div
                  className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center border-2"
                  style={{ 
                    background: veloLiveTier?.color || '#666',
                    borderColor: veloLiveTier?.border || '#fff'
                  }}
                  title={veloLiveTier?.name}
                >
                  <span className="text-sm font-black text-white drop-shadow-lg">{veloLiveTier?.tier || '?'}</span>
                </div>
                <div
                  className="absolute top-2 left-11 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white"
                  style={{ background: categoryColor }}
                >
                  <span className="text-sm font-black text-white drop-shadow-lg">{category}</span>
                </div>
                <div className="absolute top-2 right-2 text-center">
                  <div className="text-[10px] font-bold text-gray-900 uppercase">ZRS</div>
                  <div className="text-sm font-black text-gray-900">{rider.zwift_official_racing_score || '-'}</div>
                </div>
              </div>

              {/* Avatar - z-index 10 */}
              <img
                src={rider.avatar_url || 'https://via.placeholder.com/60?text=No+Avatar'}
                alt={rider.name}
                className="absolute top-9 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border-2 border-orange-400 object-cover bg-gray-700 shadow-xl z-10"
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/60?text=No+Avatar' }}
              />

              {/* Name - z-index 20 (voor avatar) */}
              <div className="text-center px-2 mb-2 mt-1 relative z-20">
                <h3 className="text-xs font-bold text-white leading-tight truncate drop-shadow-lg">
                  {rider.name || rider.full_name || 'Unknown'}
                </h3>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-1 px-2 pb-2">
                <div className="bg-white/10 rounded p-1 text-center">
                  <div className="text-[9px] text-yellow-400 font-bold">FTP</div>
                  <div className="text-xs font-black text-white">{rider.racing_ftp || rider.ftp_watts || '-'}</div>
                </div>
                <div className="bg-white/10 rounded p-1 text-center">
                  <div className="text-[9px] text-yellow-400 font-bold">W/kg</div>
                  <div className="text-xs font-black text-white">{wkg}</div>
                </div>
                <div 
                  className="bg-white/10 rounded p-1 text-center border"
                  style={{ borderColor: veloLiveTier?.color || '#666' }}
                >
                  <div className="text-[9px] font-bold" style={{ color: veloLiveTier?.color || '#999' }}>vELO</div>
                  <div className="text-xs font-black text-white">{veloLive || '-'}</div>
                </div>
              </div>

              {/* Phenotype */}
              {rider.phenotype && (
                <div className="px-2 pb-2">
                  <div className="bg-purple-500/20 rounded px-2 py-1 text-center">
                    <span className="text-[10px] font-bold text-purple-300">{rider.phenotype}</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Riders Table - Table Row Design met sorteer functionaliteit
function RidersTable({ lineup }: { lineup: LineupRider[] }) {
  type SortKey = 'position' | 'name' | 'category' | 'veloLive' | 'velo30day' | 'ftp' | 'zrs' | 'phenotype'
  const [sortKey, setSortKey] = useState<SortKey>('position')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }
  
  const sortedLineup = [...lineup].sort((a, b) => {
    let comparison = 0
    const catOrder: Record<string, number> = { 'A+': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4 }
    
    if (sortKey === 'position') {
      comparison = (a.lineup_position || 999) - (b.lineup_position || 999)
    } else if (sortKey === 'name') {
      comparison = (a.name || '').localeCompare(b.name || '')
    } else if (sortKey === 'category') {
      const aVal = catOrder[a.category || 'D'] ?? 5
      const bVal = catOrder[b.category || 'D'] ?? 5
      comparison = aVal - bVal
    } else if (sortKey === 'veloLive') {
      const aVal = a.velo_live || a.current_velo_rank || 0
      const bVal = b.velo_live || b.current_velo_rank || 0
      comparison = bVal - aVal
    } else if (sortKey === 'velo30day') {
      const aVal = a.velo_30day || 0
      const bVal = b.velo_30day || 0
      comparison = bVal - aVal
    } else if (sortKey === 'ftp') {
      const aVal = a.racing_ftp || a.ftp_watts || 0
      const bVal = b.racing_ftp || b.ftp_watts || 0
      comparison = bVal - aVal
    } else if (sortKey === 'zrs') {
      const aVal = a.zwift_official_racing_score || 0
      const bVal = b.zwift_official_racing_score || 0
      comparison = bVal - aVal
    } else if (sortKey === 'phenotype') {
      comparison = (a.phenotype || '').localeCompare(b.phenotype || '')
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })
  
  const SortableHeader = ({ label, sortKeyValue, align = 'left', colSpan }: { label: string; sortKeyValue: SortKey; align?: 'left' | 'center'; colSpan?: number }) => (
    <th 
      onClick={() => handleSort(sortKeyValue)}
      className={`px-3 py-2 text-${align} text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-orange-400 transition-colors select-none`}
      colSpan={colSpan}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>
        {label}
        {sortKey === sortKeyValue && (
          <span className="text-orange-400">{sortDirection === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  )
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <SortableHeader label="#" sortKeyValue="position" />
            <SortableHeader label="Rider" sortKeyValue="name" />
            <SortableHeader label="Cat" sortKeyValue="category" align="center" />
            <SortableHeader label="vELO Live" sortKeyValue="veloLive" align="center" />
            <SortableHeader label="vELO 30-day" sortKeyValue="velo30day" align="center" />
            <SortableHeader label="zFTP" sortKeyValue="ftp" align="center" colSpan={2} />
            <SortableHeader label="ZRS" sortKeyValue="zrs" align="center" />
            <SortableHeader label="Phenotype" sortKeyValue="phenotype" align="center" />
          </tr>
          <tr className="border-b border-gray-700/50">
            <th colSpan={5}></th>
            <th className="px-3 py-1 text-right text-[10px] font-medium text-gray-500 uppercase">FTP (W)</th>
            <th className="px-3 py-1 text-right text-[10px] font-medium text-gray-500 uppercase">W/kg</th>
            <th colSpan={2}></th>
          </tr>
        </thead>
        <tbody>
          {sortedLineup.map(rider => (
            <RiderRow key={rider.rider_id} rider={rider} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Rider Row Component
function RiderRow({ rider }: { rider: LineupRider }) {
  // Handle both old and new field names
  const veloLive = rider.velo_live || rider.current_velo_rank || 0
  const velo30day = rider.velo_30day || veloLive
  const racingFtp = rider.racing_ftp || rider.ftp_watts
  
  const veloLiveTier = getVeloTier(veloLive)
  const velo30dayTier = getVeloTier(velo30day)
  const categoryColor = CATEGORY_COLORS[rider.category as keyof typeof CATEGORY_COLORS] || 'bg-gray-500 text-white border-gray-400'
  const ftpWkg = racingFtp && rider.weight_kg ? (racingFtp / rider.weight_kg).toFixed(1) : null
  
  return (
    <tr className="border-b border-gray-700/30 hover:bg-blue-900/30 transition-colors">
      {/* Position */}
      <td className="px-3 py-3 text-center">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
          {rider.lineup_position}
        </div>
      </td>
      
      {/* Rider (Avatar + Name) */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <img 
            src={rider.avatar_url || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=40`}
            alt={rider.name}
            className="w-10 h-10 rounded-full border-2 border-gray-600 shadow-md flex-shrink-0"
            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=40`; }}
          />
          <span className="font-semibold text-white">{rider.name || rider.full_name}</span>
        </div>
      </td>
      
      {/* Category */}
      <td className="px-3 py-3 text-center">
        <span className={`inline-block px-3 py-1 text-sm font-bold rounded border ${categoryColor}`}>
          {rider.category}
        </span>
      </td>
      
      {/* vELO Live Badge met cirkel en progressbar */}
      <td className="px-3 py-3 text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br ${veloLiveTier?.color || 'from-gray-400 to-gray-600'} shadow-md`}>
          {/* Cirkel om tier nummer */}
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm border-2 border-white/50">
            <span className="font-black text-xs text-white">{veloLiveTier?.rank || '?'}</span>
          </div>
          {/* Score + Progressbar */}
          <div className="flex flex-col gap-0.5">
            <span className={`font-bold text-sm leading-none ${veloLiveTier?.textColor || 'text-white'}`}>{veloLive ? Math.floor(veloLive) : 'N/A'}</span>
            {veloLiveTier && veloLiveTier.max && veloLive && (
              <div className="w-12 h-1 bg-black/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/60 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((veloLive - veloLiveTier.min) / (veloLiveTier.max - veloLiveTier.min)) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </td>
      
      {/* vELO 30-day Badge met cirkel en progressbar */}
      <td className="px-3 py-3 text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br ${velo30dayTier?.color || 'from-gray-400 to-gray-600'} shadow-md`}>
          {/* Cirkel om tier nummer */}
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm border-2 border-white/50">
            <span className="font-black text-xs text-white">{velo30dayTier?.rank || '?'}</span>
          </div>
          {/* Score + Progressbar */}
          <div className="flex flex-col gap-0.5">
            <span className={`font-bold text-sm leading-none ${velo30dayTier?.textColor || 'text-white'}`}>{velo30day ? Math.floor(velo30day) : 'N/A'}</span>
            {velo30dayTier && velo30dayTier.max && velo30day && (
              <div className="w-12 h-1 bg-black/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/60 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((velo30day - velo30dayTier.min) / (velo30dayTier.max - velo30dayTier.min)) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </td>
      
      {/* zFTP - Watts */}
      <td className="px-3 py-3 text-right">
        <span className="text-white font-semibold">{racingFtp || '-'}</span>
      </td>
      
      {/* zFTP - W/kg */}
      <td className="px-3 py-3 text-right">
        <span className="text-white font-semibold">{ftpWkg || '-'}</span>
      </td>
      
      {/* ZRS (Zwift Racing Score) */}
      <td className="px-3 py-3 text-center">
        <span className="text-white font-semibold">{rider.zwift_official_racing_score || '-'}</span>
      </td>
      
      {/* Phenotype */}
      <td className="px-3 py-3 text-center">
        {rider.phenotype ? (
          <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 text-sm font-semibold">
            {rider.phenotype}
          </span>
        ) : (
          <span className="text-gray-500">-</span>
        )}
      </td>
    </tr>
  )
}
