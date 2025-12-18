import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useFavorites } from '../hooks/useFavorites'

interface MatrixRider {
  // Identity
  rider_id: number
  full_name: string
  racing_name: string | null
  first_name: string | null
  last_name: string | null
  
  // vELO Scores (from ZwiftRacing)
  velo_live: number | null        // Current rating
  velo_30day: number | null       // 30-day max
  velo_90day: number | null       // 90-day max (peak)
  
  // Racing Metrics
  zwift_official_racing_score: number | null
  zwift_official_category: string | null
  phenotype: string | null        // Sprinter, Climber, etc.
  zwiftracing_category: string | null  // A, B, C, D
  race_count: number | null
  
  // Race Results Statistics
  race_wins: number | null
  race_podiums: number | null
  race_finishes: number | null
  race_dnfs: number | null
  win_rate_pct: number | null
  podium_rate_pct: number | null
  dnf_rate_pct: number | null
  
  // Power Curve - Absolute (watts)
  racing_ftp: number | null
  power_5s: number | null
  power_15s: number | null
  power_30s: number | null
  power_60s: number | null
  power_120s: number | null
  power_300s: number | null
  power_1200s: number | null
  
  // Power Curve - Relative (w/kg)
  power_5s_wkg: number | null
  power_15s_wkg: number | null
  power_30s_wkg: number | null
  power_60s_wkg: number | null
  power_120s_wkg: number | null
  power_300s_wkg: number | null
  power_1200s_wkg: number | null
  
  // Physical
  weight_kg: number | null
  height_cm: number | null
  ftp_watts: number | null
  
  // Avatar & Visual
  avatar_url: string | null
  avatar_url_large: string | null
  
  // Social Stats
  followers_count: number | null
  followees_count: number | null
  rideons_given: number | null
  
  // Demographics
  age: number | null
  is_male: boolean | null
  country_code: string | null
  country_alpha3: string | null
  
  // Achievements
  achievement_level: number | null
  total_distance_km: number | null
  total_elevation_m: number | null
  
  // Status
  currently_riding: boolean | null
  current_world: number | null
  
  // Sync tracking
  racing_data_updated: string | null
  profile_data_updated: string | null
  data_completeness: 'complete' | 'racing_only' | 'profile_only' | null
}

// vELO Tiers met moderne kleuren en rank numbers (correcte ranges - bovenkant EXCLUSIEF)
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

// ZP Categories met subtiele kleuren
const ZP_CATEGORIES = {
  'A+': { color: 'bg-red-100 text-red-900 border-red-300', label: 'A+' },
  'A': { color: 'bg-red-50 text-red-800 border-red-200', label: 'A' },
  'B': { color: 'bg-green-50 text-green-800 border-green-200', label: 'B' },
  'C': { color: 'bg-blue-50 text-blue-800 border-blue-200', label: 'C' },
  'D': { color: 'bg-yellow-50 text-yellow-800 border-yellow-200', label: 'D' },
}

// Team-relative Power Colors - highlighting relatief t.o.v. team beste prestatie per interval
const getTeamRelativePowerColor = (value: number | null, teamBest: number | null): string => {
  if (!value || !teamBest || teamBest === 0) return 'text-gray-700' // No background
  
  const percentage = (value / teamBest) * 100
  
  if (percentage >= 100) return 'bg-yellow-300 text-yellow-900 font-bold' // Gold: Team Best
  if (percentage >= 95) return 'bg-gray-300 text-gray-800 font-semibold' // Silver: Near Best (95-99%)
  if (percentage >= 90) return 'bg-orange-300 text-orange-900' // Bronze: Good (90-94%)
  
  return 'text-gray-700' // Below 90% - no background, blends with table
}

// Bereken vELO tier op basis van rating (range is min-max, max is EXCLUSIEF)
const getVeloTier = (rating: number | null) => {
  if (!rating) return null
  return VELO_TIERS.find(tier => 
    rating >= tier.min && (!tier.max || rating < tier.max)
  )
}

// Bereken progress binnen tier range
const getTierProgress = (rating: number, tier: typeof VELO_TIERS[0]): number => {
  if (!tier.max) return 100 // Diamond heeft geen max
  const range = tier.max - tier.min
  const progress = rating - tier.min
  return Math.min(100, Math.max(0, (progress / range) * 100))
}

// Moderne vELO Badge Component
const VeloBadge = ({ rating }: { rating: number | null }) => {
  if (!rating) return <span className="text-gray-400">-</span>
  
  const tier = getVeloTier(rating)
  if (!tier) return <span className="text-gray-400">{Math.floor(rating)}</span>
  
  const progress = getTierProgress(rating, tier)
  
  return (
    <div className="flex items-center gap-1.5">
      {/* Rank Circle Badge */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-br ${tier.color} ${tier.textColor} shadow-md`}>
        {tier.rank}
      </div>
      
      {/* Rating with Progress Bar */}
      <div className="flex flex-col min-w-[60px]">
        <div className="font-bold text-gray-900 text-xs">
          {Math.floor(rating)}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1 mt-0.5">
          <div 
            className={`h-1 rounded-full bg-gradient-to-r ${tier.color}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          {tier.name}
        </div>
      </div>
    </div>
  )
}

// Multi-select Dropdown Component
interface MultiSelectDropdownProps<T extends string | number> {
  label: string
  options: { value: T; label: string; icon?: string }[]
  selectedValues: T[]
  onChange: (values: T[]) => void
}

function MultiSelectDropdown<T extends string | number>({ 
  label, 
  options, 
  selectedValues, 
  onChange 
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (value: T) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  // Helper om badge te renderen voor vELO tiers
  const renderVeloBadge = (option: { value: T; label: string; icon?: string }) => {
    const tier = VELO_TIERS.find(t => t.rank === option.value)
    if (!tier) return null
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-gradient-to-br ${tier.color} ${tier.textColor} shadow-sm`}>
          {tier.rank}
        </div>
        <span className="text-xs font-medium text-gray-800">{tier.name}</span>
      </div>
    )
  }

  // Helper om badge te renderen voor ZP categories
  const renderCategoryBadge = (option: { value: T; label: string; icon?: string }) => {
    const categoryStyle = ZP_CATEGORIES[option.value as keyof typeof ZP_CATEGORIES]
    if (!categoryStyle) return null
    
    return (
      <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${categoryStyle.color}`}>
        {categoryStyle.label}
      </span>
    )
  }

  // Bepaal of dit een vELO of Category dropdown is
  const isVeloDropdown = label.includes('vELO')
  const isCategoryDropdown = label.includes('ZP-category')

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 bg-white hover:bg-gray-50 transition-colors min-w-[160px] flex items-center justify-between"
      >
        <span className="font-medium text-gray-700">
          {label}
          {selectedValues.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold">
              {selectedValues.length}
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div className="ml-2">
                {isVeloDropdown ? renderVeloBadge(option) : 
                 isCategoryDropdown ? renderCategoryBadge(option) : 
                 <span className="text-xs text-gray-700">{option.label}</span>}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RacingDataMatrixModern() {
  const navigate = useNavigate()
  const [showLegend, setShowLegend] = useState(false)
  const [sortBy, setSortBy] = useState<keyof MatrixRider>('velo_live')
  const [sortDesc, setSortDesc] = useState(true)
  
  // Search
  const [searchTerm, setSearchTerm] = useState('')
  
  // Favorites
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  
  // Filters - multiselect
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [filterVeloLiveRanks, setFilterVeloLiveRanks] = useState<number[]>([])
  const [filterVelo30dayRanks, setFilterVelo30dayRanks] = useState<number[]>([])
  const [filterTeamIds, setFilterTeamIds] = useState<number[]>([])

  // Fetch teams from Team Builder
  const { data: teams } = useQuery<any[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch('/api/teams')
      if (!response.ok) return []
      const data = await response.json()
      return data.teams || []
    },
    staleTime: 60000, // Cache for 1 minute
  })

  // Fetch team lineups for filtered teams
  const { data: teamLineups } = useQuery<any[]>({
    queryKey: ['teamLineups', filterTeamIds],
    queryFn: async () => {
      if (filterTeamIds.length === 0) return []
      const allRiderIds = new Set<number>()
      for (const teamId of filterTeamIds) {
        const response = await fetch(`/api/teams/${teamId}`)
        if (response.ok) {
          const data = await response.json()
          data.lineup?.forEach((l: any) => allRiderIds.add(l.rider_id))
        }
      }
      return Array.from(allRiderIds)
    },
    enabled: filterTeamIds.length > 0,
    staleTime: 60000,
  })

  const { data: riders, isLoading, error, refetch } = useQuery<MatrixRider[]>({
    queryKey: ['matrixRiders'],
    queryFn: async () => {
      // Use backend API endpoint - same source as Team Manager for consistency
      const response = await fetch('/api/riders')
      if (!response.ok) throw new Error('Failed to fetch riders')
      const data = await response.json()
      return data.riders || []
    },
    refetchInterval: 30000, // 30 seconds for faster team updates
    retry: 3,
  })

  // Filter riders - multiselect logic + favorieten + search
  const filteredRiders = useMemo(() => {
    if (!riders) return []
    
    return riders.filter(rider => {
      // Search filter - zoek op naam (gebruik full_name of racing_name)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const fullName = rider.full_name?.toLowerCase() || ''
        const racingName = rider.racing_name?.toLowerCase() || ''
        if (!fullName.includes(searchLower) && !racingName.includes(searchLower)) {
          return false
        }
      }
      
      // Favorites filter - als showOnlyFavorites aan staat, alleen favorieten tonen
      if (showOnlyFavorites && !favorites.includes(rider.rider_id)) {
        return false
      }
      
      // Team filter - alleen rijders in geselecteerde teams
      if (filterTeamIds.length > 0 && teamLineups) {
        if (!teamLineups.includes(rider.rider_id)) {
          return false
        }
      }
      
      // Category filter - if categories selected, rider must be in list
      if (filterCategories.length > 0 && !filterCategories.includes(rider.zwiftracing_category || '')) {
        return false
      }
      
      // vELO Live rank filter - if ranks selected, rider tier rank must be in list
      if (filterVeloLiveRanks.length > 0) {
        const tier = getVeloTier(rider.velo_live)
        if (!tier || !filterVeloLiveRanks.includes(tier.rank)) {
          return false
        }
      }
      
      // vELO 30-day rank filter - if ranks selected, rider tier rank must be in list
      if (filterVelo30dayRanks.length > 0) {
        const tier = getVeloTier(rider.velo_30day)
        if (!tier || !filterVelo30dayRanks.includes(tier.rank)) {
          return false
        }
      }
      
      return true
    })
  }, [riders, searchTerm, filterCategories, filterVeloLiveRanks, filterVelo30dayRanks, filterTeamIds, teamLineups, showOnlyFavorites, favorites])

  // Bereken team bests voor elk interval in W/kg (voor highlighting) - dynamisch gebaseerd op gefilterde riders
  const teamBests = useMemo(() => {
    if (!filteredRiders || filteredRiders.length === 0) return null
    
    return {
      power_5s_wkg: Math.max(...filteredRiders.map(r => r.power_5s_wkg || 0)),
      power_15s_wkg: Math.max(...filteredRiders.map(r => r.power_15s_wkg || 0)),
      power_30s_wkg: Math.max(...filteredRiders.map(r => r.power_30s_wkg || 0)),
      power_60s_wkg: Math.max(...filteredRiders.map(r => r.power_60s_wkg || 0)),
      power_120s_wkg: Math.max(...filteredRiders.map(r => r.power_120s_wkg || 0)),
      power_300s_wkg: Math.max(...filteredRiders.map(r => r.power_300s_wkg || 0)),
      power_1200s_wkg: Math.max(...filteredRiders.map(r => r.power_1200s_wkg || 0)),
    }
  }, [filteredRiders])

  // Sorteer riders
  const sortedRiders = useMemo(() => {
    const sorted = [...filteredRiders].sort((a, b) => {
      let aVal: number
      let bVal: number
      
      // Power intervals: gebruik direct de _wkg velden (zijn al berekend in database)
      if (sortBy === 'power_5s_wkg' || sortBy === 'power_15s_wkg' || sortBy === 'power_30s_wkg' || 
          sortBy === 'power_60s_wkg' || sortBy === 'power_120s_wkg' || sortBy === 'power_300s_wkg' || 
          sortBy === 'power_1200s_wkg') {
        aVal = a[sortBy as keyof MatrixRider] as number || 0
        bVal = b[sortBy as keyof MatrixRider] as number || 0
      } 
      else {
        const aRaw = a[sortBy]
        const bRaw = b[sortBy]
        aVal = typeof aRaw === 'number' ? aRaw : 0
        bVal = typeof bRaw === 'number' ? bRaw : 0
      }
      
      return sortDesc ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1)
    })
    return sorted
  }, [filteredRiders, sortBy, sortDesc])

  const handleSort = (column: keyof MatrixRider) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc)
    } else {
      setSortBy(column)
      setSortDesc(true)
    }
  }

  const handleToggleFavorite = (riderId: number, riderName: string) => {
    toggleFavorite(riderId)
    if (isFavorite(riderId)) {
      toast.success(`${riderName} verwijderd van favorieten`, { icon: '☆' })
    } else {
      toast.success(`${riderName} toegevoegd aan favorieten`, { icon: '⭐' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900 pb-8">
      {/* Modern Compact Header */}
      <div className="relative overflow-hidden mb-4 sm:mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-green-900 to-red-900 opacity-95"></div>
        <div className="relative px-3 py-4 sm:px-6">
          <div className="max-w-[98vw] mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-lg rounded-xl shadow-xl flex-shrink-0">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">
                    📊 Performance Matrix
                  </h1>
                  <p className="text-orange-100 text-sm font-semibold mt-0.5">
                    TeamNL Cloud9 Racing
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { refetch(); toast.success('Dashboard ververst!'); }}
                  className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 backdrop-blur-lg rounded-lg border border-green-400/30 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Ververs</span>
                </button>
                <button
                  onClick={() => navigate('/team-manager')}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-lg rounded-lg border border-white/30 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="hidden sm:inline">Team</span>
                </button>
              </div>
            </div>
            {/* Rider Count Badge */}
            <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 shadow-lg mt-3">
              <span className="text-white/80 text-sm font-medium">Showing</span>
              <span className="text-white font-bold text-lg">{sortedRiders.length}</span>
              <span className="text-white/80 text-sm font-medium">of</span>
              <span className="text-white font-bold text-lg">{riders?.length || 0}</span>
              <span className="text-white/80 text-sm font-medium">riders</span>
              {searchTerm && (
                <>
                  <span className="text-white/60 hidden sm:inline">·</span>
                  <span className="text-cyan-300 font-semibold text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">🔍 "{searchTerm}"</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-[98vw] mx-auto px-2 sm:px-4">
        {/* Filter Controls */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Search Bar */}
          <div className="relative flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder="🔍 Zoek..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-auto px-2 sm:px-3 py-1.5 sm:py-2 pl-7 sm:pl-8 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white sm:min-w-[200px]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm sm:text-base"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Team Filter - Dropdown met team namen */}
          {teams && teams.length > 0 && (
            <MultiSelectDropdown
              label="🏆 Teams"
              options={teams.map(team => ({
                value: team.team_id,
                label: team.team_name,
                icon: team.competition_type === 'velo' ? '⚡' : '🏆'
              }))}
              selectedValues={filterTeamIds}
              onChange={setFilterTeamIds}
            />
          )}
          
          {/* ZP Category Filter - Dropdown met badge icons */}
          <MultiSelectDropdown
            label="ZP-category"
            options={[
              { value: 'A+', label: 'A+' },
              { value: 'A', label: 'A' },
              { value: 'B', label: 'B' },
              { value: 'C', label: 'C' },
              { value: 'D', label: 'D' },
            ]}
            selectedValues={filterCategories}
            onChange={setFilterCategories}
          />

          {/* vELO Live Filter - Dropdown met tier badges */}
          <MultiSelectDropdown
            label="vELO Live"
            options={VELO_TIERS.map(tier => ({
              value: tier.rank,
              label: tier.name,
            }))}
            selectedValues={filterVeloLiveRanks}
            onChange={setFilterVeloLiveRanks}
          />

          {/* vELO 30-day Filter - Dropdown met tier badges */}
          <MultiSelectDropdown
            label="vELO 30-day"
            options={VELO_TIERS.map(tier => ({
              value: tier.rank,
              label: tier.name,
            }))}
            selectedValues={filterVelo30dayRanks}
            onChange={setFilterVelo30dayRanks}
          />
          
          {/* Favorites Toggle */}
          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 sm:gap-2 flex-shrink-0 ${
              showOnlyFavorites 
                ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={showOnlyFavorites ? 'Toon alle riders' : 'Toon alleen favorieten'}
          >
            <span className="text-sm sm:text-base">{showOnlyFavorites ? '⭐' : '☆'}</span>
            <span className="hidden sm:inline">{showOnlyFavorites ? 'Favorieten' : 'Alle Riders'}</span>
            {showOnlyFavorites && favorites.length > 0 && (
              <span className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 bg-white/30 rounded text-[10px] sm:text-xs">
                {favorites.length}
              </span>
            )}
          </button>
          
          {/* Clear Filters Button - compact on mobile */}
          <button
            onClick={() => {
              const totalFilters = filterCategories.length + filterVeloLiveRanks.length + filterVelo30dayRanks.length + filterTeamIds.length
              setFilterCategories([])
              setFilterVeloLiveRanks([])
              setFilterVelo30dayRanks([])
              setFilterTeamIds([])
              if (totalFilters > 0) {
                toast.success(`${totalFilters} filter${totalFilters > 1 ? 's' : ''} verwijderd`, { icon: '🗑️' })
              }
            }}
            disabled={filterCategories.length === 0 && filterVeloLiveRanks.length === 0 && filterVelo30dayRanks.length === 0 && filterTeamIds.length === 0}
            className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 sm:gap-2 flex-shrink-0 ${
              filterCategories.length > 0 || filterVeloLiveRanks.length > 0 || filterVelo30dayRanks.length > 0 || filterTeamIds.length > 0
                ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="Verwijder alle filters"
          >
            <span className="text-sm sm:text-base">🗑️</span>
            <span className="hidden sm:inline">Clear</span>
            {(filterCategories.length > 0 || filterVeloLiveRanks.length > 0 || filterVelo30dayRanks.length > 0 || filterTeamIds.length > 0) && (
              <span className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 bg-white/30 rounded text-[10px] sm:text-xs font-bold">
                {filterCategories.length + filterVeloLiveRanks.length + filterVelo30dayRanks.length + filterTeamIds.length}
              </span>
            )}
          </button>
          
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center gap-1 sm:gap-2 font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg flex-shrink-0"
            >
              <span>{showLegend ? '📖' : '📚'}</span>
              <span className="hidden sm:inline">{showLegend ? 'Hide' : 'Show'} Legend</span>
              <span className="sm:hidden">Legend</span>
            </button>
          </div>
        </div>
      </div>

        {/* Legend Panel - Modern */}
        {showLegend && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-xl border-2 border-indigo-100 mb-4 sm:mb-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px]">
            {/* Info */}
            <div className="flex items-center text-blue-700 bg-blue-50 px-2 py-1 rounded">
              <span className="mr-1">ℹ️</span>
              <span>Highlights relatief aan zichtbare riders</span>
            </div>

            {/* vELO Tiers - inline */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">🏆 vELO:</span>
              {VELO_TIERS.map(tier => (
                <div key={tier.name} className="flex items-center gap-1">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] bg-gradient-to-br ${tier.color} ${tier.textColor}`}>
                    {tier.rank}
                  </div>
                  <span className="text-gray-600">{tier.name}</span>
                </div>
              ))}
            </div>

            {/* ZP Categories - inline */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">🚴 ZP:</span>
              {Object.entries(ZP_CATEGORIES).map(([cat, style]) => (
                <span key={cat} className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border ${style.color}`}>
                  {style.label}
                </span>
              ))}
            </div>

            {/* Power Highlights - inline */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">⚡ Power:</span>
              <div className="flex items-center gap-1">
                <div className="w-6 h-3 bg-yellow-300 rounded-sm"></div>
                <span className="text-gray-600">Gold (100%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-3 bg-gray-300 rounded-sm"></div>
                <span className="text-gray-600">Silver (95-99%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-3 bg-orange-300 rounded-sm"></div>
                <span className="text-gray-600">Bronze (90-94%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className="bg-white shadow-xl rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            {/* Skeleton Loader */}
            <div className="animate-pulse space-y-3">
              {/* Header Skeleton */}
              <div className="h-8 bg-slate-700 rounded"></div>
              <div className="h-8 bg-slate-600 rounded"></div>
              {/* Rows Skeleton */}
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex gap-2">
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  <div className="h-8 bg-gray-100 rounded flex-1"></div>
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  <div className="h-8 bg-gray-100 rounded flex-1"></div>
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-500 text-sm mt-6">Loading racing data...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-red-600 text-lg font-medium mb-2">Error loading data</p>
            <p className="text-gray-600 text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Reload Page
            </button>
          </div>
        ) : !riders || riders.length === 0 ? (
          <div className="p-12 text-center max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🚴</div>
            <p className="text-gray-800 text-xl font-bold mb-2">Geen riders in database</p>
            <p className="text-gray-600 text-sm mb-6">
              De database moet eerst gesynchroniseerd worden met ZwiftRacing.app data.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm font-medium text-blue-900 mb-2">📋 Synchronisatie stappen:</p>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Ga naar de <a href="/sync" className="underline font-medium">Sync pagina</a></li>
                <li>Klik op "Sync Riders" om TeamNL Cloud9 riders op te halen</li>
                <li>Wacht tot synchronisatie voltooid is</li>
                <li>Kom terug naar deze Matrix pagina</li>
              </ol>
            </div>
          </div>
        ) : sortedRiders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-600 text-lg font-medium mb-2">Geen riders gevonden</p>
            <p className="text-gray-500 text-sm">Probeer andere filter instellingen of klik "Clear Filters"</p>
          </div>
        ) : (
          <div className="relative">
            {/* Mobile Scroll Hint - Persistent en beter zichtbaar */}
            <div className="lg:hidden absolute inset-y-0 right-0 flex items-center pointer-events-none z-20">
              <div className="bg-gradient-to-l from-indigo-600 via-indigo-600/90 to-transparent text-white px-3 py-2 text-[10px] sm:text-xs font-bold rounded-l-xl shadow-lg animate-pulse">
                <div className="flex items-center gap-1">
                  <span className="hidden sm:inline">Swipe →</span>
                  <span className="sm:hidden">→</span>
                </div>
              </div>
            </div>
            
            {/* Horizontal Scroll Container met verbeterde mobile support */}
            <div className="overflow-x-auto max-h-[calc(100vh-180px)] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-200">
              <table className="w-full text-[11px] min-w-[1400px]">
              <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white sticky top-0 z-20 shadow-md">
                {/* Group Headers Row */}
                <tr className="border-b border-slate-600">
                  <th rowSpan={2} className="px-1 sm:px-2 py-1 text-center text-[10px] sm:text-xs font-bold border-r border-slate-600" title="Favoriet">
                    ⭐
                  </th>
                  <th rowSpan={2} className="px-1 sm:px-2 py-1 text-left text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider border-r border-slate-600 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('rider_id')}>
                    ID
                  </th>
                  <th rowSpan={2} className="px-1 sm:px-2 py-1 text-left text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider border-r border-slate-600 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('velo_live')}>
                    <span className="hidden sm:inline">vELO Live</span>
                    <span className="sm:hidden">Live</span> {sortBy === 'velo_live' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th rowSpan={2} className="px-1 sm:px-2 py-1 text-left text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider border-r border-slate-600 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('velo_30day')}>
                    <span className="hidden sm:inline">vELO 30-day</span>
                    <span className="sm:hidden">30d</span> {sortBy === 'velo_30day' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th rowSpan={2} className="px-2 sm:px-3 py-1 text-left text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider border-r border-slate-600 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('full_name')}>
                    Rider Name
                  </th>
                  <th rowSpan={2} className="px-1 sm:px-2 py-1 text-center text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider border-r border-slate-600">
                    Cat
                  </th>
                  <th rowSpan={2} className="px-1 sm:px-2 py-1 text-center text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider bg-orange-600 border-r border-slate-600 cursor-pointer hover:bg-orange-500" onClick={() => handleSort('zwift_official_racing_score')} title="Zwift Official Racing Score">
                    <span className="hidden sm:inline">ZRS</span>
                    <span className="sm:hidden">⚡</span>
                  </th>
                  <th colSpan={2} className="px-1 sm:px-2 py-1 text-center text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider bg-green-700 border-r border-slate-600">
                    zFTP
                  </th>
                  <th rowSpan={2} className="px-1 sm:px-2 py-1 text-right text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider border-r border-slate-600">
                    <span className="hidden sm:inline">Weight</span>
                    <span className="sm:hidden">kg</span>
                  </th>
                  <th colSpan={4} className="px-1 sm:px-2 py-1 text-center text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider bg-slate-600 border-r border-slate-600">
                    Race Stats
                  </th>
                  <th colSpan={7} className="px-1 sm:px-2 py-1 text-center text-[10px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider bg-indigo-700">
                    Power (W/kg)
                  </th>
                </tr>
                {/* Individual Column Headers Row */}
                <tr>
                  <th className="px-1 sm:px-2 py-1 text-right text-[10px] sm:text-xs font-semibold uppercase tracking-tight cursor-pointer hover:bg-green-600 bg-green-700 whitespace-nowrap" onClick={() => handleSort('racing_ftp')}>
                    FTP
                  </th>
                  <th className="px-1 sm:px-2 py-1 text-right text-[10px] sm:text-xs font-semibold uppercase tracking-tight bg-green-700 whitespace-nowrap border-r border-slate-600">
                    W/kg
                  </th>
                  <th className="px-1 sm:px-2 py-1 text-right text-[10px] sm:text-xs font-semibold uppercase tracking-tight cursor-pointer hover:bg-slate-500 whitespace-nowrap" onClick={() => handleSort('race_finishes')}>
                    <span className="hidden sm:inline">Finishes</span>
                    <span className="sm:hidden">Fin</span>
                  </th>
                  <th className="px-1 sm:px-2 py-1 text-right text-[10px] sm:text-xs font-semibold uppercase tracking-tight cursor-pointer hover:bg-green-500 whitespace-nowrap" onClick={() => handleSort('race_wins')}>
                    <span className="hidden sm:inline">Wins</span>
                    <span className="sm:hidden">W</span>
                  </th>
                  <th className="px-1 sm:px-2 py-1 text-right text-[10px] sm:text-xs font-semibold uppercase tracking-tight cursor-pointer hover:bg-blue-500 whitespace-nowrap" onClick={() => handleSort('race_podiums')}>
                    <span className="hidden sm:inline">Podiums</span>
                    <span className="sm:hidden">Pod</span>
                  </th>
                  <th className="px-1 sm:px-2 py-1 text-right text-[10px] sm:text-xs font-semibold uppercase tracking-tight cursor-pointer hover:bg-red-500 whitespace-nowrap border-r border-slate-600" onClick={() => handleSort('race_dnfs')}>
                    DNF
                  </th>
                  <th className="px-2 py-1 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-tight bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap min-w-[48px]" onClick={() => handleSort('power_5s_wkg')}>
                    5s
                  </th>
                  <th className="px-2 py-1 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-tight bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap min-w-[48px]" onClick={() => handleSort('power_15s_wkg')}>
                    15s
                  </th>
                  <th className="px-2 py-1 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-tight bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap min-w-[48px]" onClick={() => handleSort('power_30s_wkg')}>
                    30s
                  </th>
                  <th className="px-2 py-1 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-tight bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap min-w-[48px]" onClick={() => handleSort('power_60s_wkg')}>
                    1m
                  </th>
                  <th className="px-2 py-1 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-tight bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap min-w-[48px]" onClick={() => handleSort('power_120s_wkg')}>
                    2m
                  </th>
                  <th className="px-2 py-1 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-tight bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap min-w-[48px]" onClick={() => handleSort('power_300s_wkg')}>
                    5m
                  </th>
                  <th className="px-2 py-1 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-tight bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap min-w-[48px]" onClick={() => handleSort('power_1200s_wkg')}>
                    20m
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRiders.map((rider, index) => {
                  const veloLiveTier = getVeloTier(rider.velo_live)
                  const zpCategory = rider.zwift_official_category as keyof typeof ZP_CATEGORIES | null
                  
                  return (
                    <tr 
                      key={rider.rider_id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } ${veloLiveTier?.bgColor || ''}`}
                    >
                      <td className="px-1 sm:px-2 py-1 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleToggleFavorite(rider.rider_id, rider.full_name)}
                          className="text-base sm:text-lg p-1 sm:p-2 -m-1 sm:-m-2 hover:scale-125 transition-transform touch-manipulation"
                          title={isFavorite(rider.rider_id) ? 'Verwijder favoriet' : 'Voeg toe als favoriet'}
                          aria-label={isFavorite(rider.rider_id) ? 'Verwijder favoriet' : 'Voeg toe als favoriet'}
                        >
                          {isFavorite(rider.rider_id) ? '⭐' : '☆'}
                        </button>
                      </td>
                      <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <img 
                            src={rider.avatar_url || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=32`}
                            alt=""
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-gray-300 object-cover"
                            onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=32`; }}
                          />
                          <span className="text-gray-700 font-mono text-[10px] sm:text-xs">{rider.rider_id}</span>
                        </div>
                      </td>
                      <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                        <VeloBadge rating={rider.velo_live} />
                      </td>
                      <td className="px-1 sm:px-2 py-1 whitespace-nowrap">
                        <VeloBadge rating={rider.velo_30day} />
                      </td>
                      <td className="px-2 sm:px-3 py-1 whitespace-nowrap font-semibold text-gray-900 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <span>{rider.full_name}</span>
                          {rider.rider_id === 150437 && (
                            <a 
                              href="https://www.youtube.com/@CloudRacer-9/streams" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all hover:scale-105 shadow-sm hover:shadow-md"
                              title="Race livestreams op YouTube"
                            >
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                              <span className="text-[10px] font-bold text-white tracking-wide">STREAMS</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-center">
                        {zpCategory && ZP_CATEGORIES[zpCategory] ? (
                          <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-md border ${ZP_CATEGORIES[zpCategory].color}`}>
                            {ZP_CATEGORIES[zpCategory].label}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-center" title={rider.zwift_official_racing_score ? `Zwift Official Racing Score: ${Math.round(rider.zwift_official_racing_score)}` : 'No official score'}>
                        {rider.zwift_official_racing_score ? (
                          <span className={`inline-block px-2 py-1 text-xs font-bold rounded-md ${
                            rider.zwift_official_racing_score >= 700 ? 'bg-red-100 text-red-900 border border-red-300' :
                            rider.zwift_official_racing_score >= 600 ? 'bg-orange-100 text-orange-900 border border-orange-300' :
                            rider.zwift_official_racing_score >= 500 ? 'bg-yellow-100 text-yellow-900 border border-yellow-300' :
                            rider.zwift_official_racing_score >= 400 ? 'bg-green-100 text-green-900 border border-green-300' :
                            rider.zwift_official_racing_score >= 300 ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                            'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}>
                            {Math.round(rider.zwift_official_racing_score)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right font-bold text-gray-900 text-sm">
                        {rider.racing_ftp || '-'}
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right font-bold text-indigo-700 text-sm">
                        {rider.racing_ftp && rider.weight_kg ? (rider.racing_ftp / rider.weight_kg).toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-right text-gray-700 text-sm font-medium">
                        {rider.weight_kg ? `${rider.weight_kg.toFixed(1)}kg` : '-'}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right text-gray-700 font-semibold text-sm">
                        {rider.race_finishes || 0}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right font-bold text-green-600 text-sm" title={`Win rate: ${rider.win_rate_pct || 0}%`}>
                        {rider.race_wins || 0}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right font-semibold text-blue-600 text-sm" title={`Podium rate: ${rider.podium_rate_pct || 0}%`}>
                        {rider.race_podiums || 0}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-right text-red-600 text-sm" title={`DNF rate: ${rider.dnf_rate_pct || 0}%`}>
                        {rider.race_dnfs || 0}
                      </td>
                      
                      {/* Power Intervals in W/kg met team-relative highlighting */}
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(rider.power_5s_wkg, teamBests?.power_5s_wkg || null)}`}
                          title={`${rider.power_5s || 0}W`}
                        >
                          {rider.power_5s_wkg?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(rider.power_15s_wkg, teamBests?.power_15s_wkg || null)}`}
                          title={`${rider.power_15s || 0}W`}
                        >
                          {rider.power_15s_wkg?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(rider.power_30s_wkg, teamBests?.power_30s_wkg || null)}`}
                          title={`${rider.power_30s || 0}W`}
                        >
                          {rider.power_30s_wkg?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(rider.power_60s_wkg, teamBests?.power_60s_wkg || null)}`}
                          title={`${rider.power_60s || 0}W`}
                        >
                          {rider.power_60s_wkg?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(rider.power_120s_wkg, teamBests?.power_120s_wkg || null)}`}
                          title={`${rider.power_120s || 0}W`}
                        >
                          {rider.power_120s_wkg?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(rider.power_300s_wkg, teamBests?.power_300s_wkg || null)}`}
                          title={`${rider.power_300s || 0}W`}
                        >
                          {rider.power_300s_wkg?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(rider.power_1200s_wkg, teamBests?.power_1200s_wkg || null)}`}
                          title={`${rider.power_1200s || 0}W`}
                        >
                          {rider.power_1200s_wkg?.toFixed(2) || '-'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

        {/* Footer info */}
        <div className="text-center text-sm text-gray-600 bg-white rounded-xl shadow-md p-4 mt-6">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-green-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Data refreshes elke 60 seconden</span>
            <span className="text-gray-400">·</span>
            <span>Sorteer door op kolom headers te klikken</span>
          </div>
        </div>
      </div>
    </div>
  )
}
