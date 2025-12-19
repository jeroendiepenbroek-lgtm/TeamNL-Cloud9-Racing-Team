import { useState, useMemo } from 'react'

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
  competition_type: 'velo' | 'category' | 'velo-based' | 'category-based'
  velo_min_rank?: number
  velo_max_rank?: number
  velo_max_spread?: number
  allowed_categories?: string[]
}

interface RiderPassportSidebarProps {
  riders: Rider[]
  isOpen: boolean
  onDragStart: (rider: Rider) => void
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

export default function RiderPassportSidebar({ riders, isOpen, onDragStart, selectedTeam, onClearTeamFilter }: RiderPassportSidebarProps) {
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
      if (hideAssigned && rider.team_id) return false
      
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

  const handleDragStart = (e: React.DragEvent, rider: Rider) => {
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(rider)
  }

  if (!isOpen) return null

  return (
    <aside className="w-80 border-r border-slate-700/50 bg-slate-800/30 h-[calc(100vh-73px)] sticky top-[73px] flex flex-col">
      {/* Sticky Filter Section */}
      <div className="sticky top-0 z-20 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="p-4 space-y-4">
          {/* Team Filter Indicator */}
          {selectedTeam && (
            <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
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
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filters - Horizontal Layout */}
          <div className="space-y-3">
            <div className="flex gap-2">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Alle Categorieën</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>

              {/* Tier Filter */}
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Alle vELO Tiers</option>
                {VELO_TIERS.map(tier => (
                  <option key={tier.rank} value={tier.name}>{tier.name}</option>
                ))}
              </select>
            </div>

            {/* Hide Assigned Toggle */}
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <input
                type="checkbox"
                checked={hideAssigned}
                onChange={(e) => setHideAssigned(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900/50 text-blue-600 focus:ring-blue-500"
              />
              Verberg toegewezen riders
            </label>
          </div>

        {/* Stats */}
          <div className="text-xs text-slate-400 pb-2">
            {filteredRiders.length} riders gevonden
          </div>
        </div>
      </div>

      {/* Scrollable Rider Cards */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {filteredRiders.map(rider => {
            const tier = getVeloTier(rider.velo_live)
            const category = rider.zwiftracing_category || rider.zwift_official_category
            const categoryColor = category ? (CATEGORY_COLORS[category] || '#666666') : '#666666'
            const ftpWkg = rider.racing_ftp && rider.weight_kg 
              ? (rider.racing_ftp / rider.weight_kg).toFixed(2) 
              : '-'

            return (
              <div
                key={rider.rider_id}
                draggable
                onDragStart={(e) => handleDragStart(e, rider)}
                className={`
                  p-3 rounded-lg border cursor-move transition-all
                  ${rider.team_id 
                    ? 'bg-slate-900/30 border-slate-600/50 opacity-60' 
                    : 'bg-slate-900/50 border-slate-600 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
                    {rider.avatar_url ? (
                      <img src={rider.avatar_url} alt={rider.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{rider.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {category && (
                        <span 
                          className="text-xs px-1.5 py-0.5 text-white rounded font-bold"
                          style={{ backgroundColor: categoryColor }}
                        >
                          {category}
                        </span>
                      )}
                      {tier && (
                        <span 
                          className="text-xs px-2 py-0.5 rounded font-bold text-white"
                          style={{ 
                            backgroundColor: tier.color,
                          }}
                          title={`${tier.name} Tier`}
                        >
                          {tier.rank}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>FTP: {rider.racing_ftp || '-'}W</span>
                      <span>•</span>
                      <span>{ftpWkg} W/kg</span>
                    </div>
                    {rider.team_id && (
                      <div className="mt-1 text-xs text-green-400">
                        ✓ {rider.team_name}
                      </div>
                    )}
                  </div>

                  {/* Drag Handle */}
                  <div className="text-slate-500 text-xl">
                    ⋮⋮
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
