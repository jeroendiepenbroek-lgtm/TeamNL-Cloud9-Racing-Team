import { useState, useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'

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
  teams?: Array<{ team_id: number; team_name: string }> // US2: Multiple teams
}

interface Team {
  team_id: number
  team_name: string
  competition_type: 'velo' | 'category' | 'velo-based' | 'category-based'
  velo_min_rank?: number
  velo_max_rank?: number
  velo_max_spread?: number
  allowed_categories?: string[]
}

interface RiderPassportSidebarProps {
  riders: Rider[]
  isOpen: boolean
  selectedTeam?: Team | null
  onClearTeamFilter?: () => void
}

const VELO_TIERS = [
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

const CATEGORY_COLORS: {[key: string]: string} = {
  'A+': '#FF0000',
  'A': '#FF0000',
  'B': '#4CAF50',
  'C': '#0000FF',
  'D': '#FF1493',
  'E': '#808080'
}

const getVeloTier = (rating: number | null) => {
  if (!rating) return null
  return VELO_TIERS.find(tier => 
    rating >= tier.min && (!tier.max || rating < tier.max)
  )
}

export default function RiderPassportSidebar({ riders, isOpen, selectedTeam, onClearTeamFilter }: RiderPassportSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedTier, setSelectedTier] = useState<string>('')
  const [hideAssigned, setHideAssigned] = useState(false)

  const filteredRiders = useMemo(() => {
    return riders.filter(rider => {
      // Search filter
      if (searchQuery && !rider.full_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      
      // Category filter
      if (selectedCategory) {
        const category = rider.zwiftracing_category || rider.zwift_official_category
        if (category !== selectedCategory) return false
      }
      
      // Tier filter
      if (selectedTier) {
        const tier = getVeloTier(rider.velo_live)
        if (!tier || tier.name !== selectedTier) return false
      }
      
      // Hide assigned riders
      if (hideAssigned && rider.teams && rider.teams.length > 0) return false
      
      // Team-based filtering (US4)
      if (selectedTeam) {
        const category = rider.zwiftracing_category || rider.zwift_official_category
        const veloRank = getVeloTier(rider.velo_live)?.rank
        
        if (selectedTeam.competition_type === 'velo' || selectedTeam.competition_type === 'velo-based') {
          // vELO-based filtering
          if (selectedTeam.velo_min_rank && veloRank && veloRank < selectedTeam.velo_min_rank) return false
          if (selectedTeam.velo_max_rank && veloRank && veloRank > selectedTeam.velo_max_rank) return false
        } else if (selectedTeam.competition_type === 'category' || selectedTeam.competition_type === 'category-based') {
          // Category-based filtering
          if (selectedTeam.allowed_categories && category && !selectedTeam.allowed_categories.includes(category)) {
            return false
          }
        }
      }
      
      return true
    })
  }, [riders, searchQuery, selectedCategory, selectedTier, hideAssigned, selectedTeam])

  if (!isOpen) return null

  return (
    <aside className={`
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
      md:translate-x-0
      fixed md:sticky 
      left-0 top-0 md:top-[73px]
      w-full sm:w-80
      h-screen md:h-[calc(100vh-73px)]
      border-r border-slate-700/50 
      bg-slate-800/30 
      backdrop-blur-xl
      z-30 md:z-auto
      transition-transform duration-300
      flex flex-col
    `}>
      {/* Sticky Filter Section */}
      <div className="sticky top-0 z-20 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="p-2 space-y-1.5">
          {/* Team Filter Indicator */}
          {selectedTeam && (
            <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-orange-400">🎯 FILTERING OP TEAM</span>
                <button
                  onClick={onClearTeamFilter}
                  className="text-orange-400 hover:text-orange-300 text-xs font-semibold"
                >
                  ✕ Wis filter
                </button>
              </div>
              <div className="text-sm font-semibold text-white">{selectedTeam.team_name}</div>
              <div className="text-xs text-orange-200 mt-1">
                {selectedTeam.competition_type === 'velo' || selectedTeam.competition_type === 'velo-based' 
                  ? `vELO Tier ${selectedTeam.velo_min_rank}-${selectedTeam.velo_max_rank}` 
                  : `Categorieën: ${selectedTeam.allowed_categories?.join(', ')}`
                }
              </div>
            </div>
          )}

          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="🔍 Zoek rider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filters - Compact Layout */}
          <div className="flex gap-1.5">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 px-2 py-1 text-xs bg-slate-900/50 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Cat</option>
              <option value="A+">A+</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>

            {/* vELO Filter */}
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="flex-1 px-2 py-1 text-xs bg-slate-900/50 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">vELO</option>
              {VELO_TIERS.map(tier => (
                <option key={tier.rank} value={tier.name}>{tier.rank}</option>
              ))}
            </select>

            {/* Verberg toegewezen riders */}
            <label className="flex items-center gap-1 text-xs text-white cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={hideAssigned}
                onChange={(e) => setHideAssigned(e.target.checked)}
                className="w-3 h-3 rounded border-slate-600 bg-slate-900/50 text-blue-600 focus:ring-0"
              />
              <span className="text-[10px]">Verberg toegewezen</span>
            </label>
          </div>

        {/* Stats */}
          <div className="text-[10px] text-slate-400">
            {filteredRiders.length} riders
          </div>
        </div>
      </div>

      {/* Scrollable Rider Cards */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1.5">
          {filteredRiders.map(rider => (
            <DraggableRiderCard key={rider.rider_id} rider={rider} />
          ))}
        </div>
      </div>
    </aside>
  )
}

// Draggable Rider Card Component with @dnd-kit
function DraggableRiderCard({ rider }: { rider: Rider }) {
  const tier = getVeloTier(rider.velo_live)
  const category = rider.zwiftracing_category || rider.zwift_official_category
  const categoryColor = category ? (CATEGORY_COLORS[category] || '#666666') : '#666666'
  const ftpWkg = rider.racing_ftp && rider.weight_kg 
    ? (rider.racing_ftp / rider.weight_kg).toFixed(2) 
    : '-'

  // US1: Always allow dragging (multiple teams)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: rider.rider_id,
    disabled: false, // US1: Always enabled for multiple team assignments
    data: { rider, type: 'rider' }
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.85 : 1,
    transition: isDragging ? 'none' : 'all 0.2s ease-out',
    cursor: 'grab', // US1: Always draggable
    // Force GPU acceleration for smoother touch dragging
    willChange: isDragging ? 'transform' : 'auto',
    // Touch-action to prevent conflicts
    touchAction: 'none',
  }

  const hasTeams = rider.teams && rider.teams.length > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        p-2 rounded-lg border transition-all relative
        bg-slate-900/50 border-slate-600 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 cursor-grab active:cursor-grabbing
        ${isDragging ? 'ring-4 ring-blue-500 shadow-2xl z-50' : ''}
        ${hasTeams ? 'border-l-4 border-l-green-500' : ''}
      `}
    >
      <div className="flex items-center gap-2" {...attributes} {...listeners}>
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
          {rider.avatar_url ? (
            <img src={rider.avatar_url} alt={rider.full_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{rider.full_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {category && (
              <span 
                className="text-[10px] px-1.5 py-0.5 text-white rounded font-bold"
                style={{ backgroundColor: categoryColor }}
              >
                {category}
              </span>
            )}
            {tier && (
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white"
                style={{ 
                  backgroundColor: tier.color,
                }}
                title={`${tier.name} Tier`}
              >
                {tier.rank}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
            <span>FTP: {rider.racing_ftp || '-'}W</span>
            <span>•</span>
            <span>{ftpWkg} W/kg</span>
          </div>
          {/* US2: Show teams rider is assigned to */}
          {hasTeams && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {rider.teams!.map((team, idx) => (
                <span
                  key={`${team.team_id}-${idx}`}
                  className="text-[9px] px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded border border-green-600/30"
                  title={team.team_name}
                >
                  {team.team_name.length > 15 ? team.team_name.substring(0, 15) + '...' : team.team_name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Drag Handle - US1: Always visible */}
        <div className="text-slate-500 text-xl">
          ⋮⋮
        </div>
      </div>
    </div>
  )
}
