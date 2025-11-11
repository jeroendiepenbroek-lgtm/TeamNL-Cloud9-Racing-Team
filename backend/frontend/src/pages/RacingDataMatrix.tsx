import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useFavorites } from '../hooks/useFavorites'

interface MatrixRider {
  rider_id: number
  name: string
  zp_category: string | null
  zp_ftp: number | null
  weight: number | null
  race_last_rating: number | null   // vELO Live (last/current rating)
  race_max30_rating: number | null  // vELO 30-day (max rating last 30 days)
  race_wins: number
  race_podiums: number | null
  race_finishes: number
  race_dnfs: number | null
  watts_per_kg: number | null
  // Power intervals - correcte veldnamen uit API (in watts)
  power_w5: number | null      // 5s in watts
  power_w15: number | null     // 15s in watts
  power_w30: number | null     // 30s in watts
  power_w60: number | null     // 1min in watts
  power_w120: number | null    // 2min in watts
  power_w300: number | null    // 5min in watts
  power_w1200: number | null   // 20min in watts
}

const API_BASE = ''

// vELO Tiers met moderne kleuren en rank numbers
const VELO_TIERS = [
  { rank: 1, name: 'Diamond', icon: '💎', min: 2200, color: 'from-cyan-400 to-blue-500', textColor: 'text-cyan-100', bgColor: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20' },
  { rank: 2, name: 'Ruby', icon: '💍', min: 1900, max: 2199, color: 'from-red-500 to-pink-600', textColor: 'text-red-100', bgColor: 'bg-gradient-to-r from-red-500/20 to-pink-600/20' },
  { rank: 3, name: 'Emerald', icon: '💚', min: 1650, max: 1899, color: 'from-emerald-400 to-green-600', textColor: 'text-emerald-100', bgColor: 'bg-gradient-to-r from-emerald-400/20 to-green-600/20' },
  { rank: 4, name: 'Sapphire', icon: '💙', min: 1450, max: 1649, color: 'from-blue-400 to-indigo-600', textColor: 'text-blue-100', bgColor: 'bg-gradient-to-r from-blue-400/20 to-indigo-600/20' },
  { rank: 5, name: 'Amethyst', icon: '💜', min: 1300, max: 1449, color: 'from-purple-400 to-violet-600', textColor: 'text-purple-100', bgColor: 'bg-gradient-to-r from-purple-400/20 to-violet-600/20' },
  { rank: 6, name: 'Platinum', icon: '⚪', min: 1150, max: 1299, color: 'from-slate-300 to-slate-500', textColor: 'text-slate-100', bgColor: 'bg-gradient-to-r from-slate-400/20 to-slate-500/20' },
  { rank: 7, name: 'Gold', icon: '🟡', min: 1000, max: 1149, color: 'from-yellow-400 to-amber-600', textColor: 'text-yellow-900', bgColor: 'bg-gradient-to-r from-yellow-400/20 to-amber-600/20' },
  { rank: 8, name: 'Silver', icon: '⚫', min: 850, max: 999, color: 'from-gray-300 to-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gradient-to-r from-gray-300/20 to-gray-500/20' },
  { rank: 9, name: 'Bronze', icon: '🟠', min: 650, max: 849, color: 'from-orange-400 to-orange-700', textColor: 'text-orange-900', bgColor: 'bg-gradient-to-r from-orange-400/20 to-orange-700/20' },
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

// Bereken vELO tier op basis van rating
const getVeloTier = (rating: number | null) => {
  if (!rating) return null
  return VELO_TIERS.find(tier => 
    rating >= tier.min && (!tier.max || rating <= tier.max)
  )
}

// Bereken W/kg voor interval
const calculateWkg = (watts: number | null, weight: number | null): number | null => {
  if (!watts || !weight || weight === 0) return null
  return watts / weight
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
              <span className="ml-2 text-xs text-gray-700">
                {option.icon && <span className="mr-1.5">{option.icon}</span>}
                {option.label}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RacingDataMatrix() {
  const [showLegend, setShowLegend] = useState(false)
  const [sortBy, setSortBy] = useState<keyof MatrixRider>('race_last_rating')
  const [sortDesc, setSortDesc] = useState(true)
  
  // Favorites
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)
  
  // Filters - multiselect
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [filterVeloLiveRanks, setFilterVeloLiveRanks] = useState<number[]>([])
  const [filterVelo30dayRanks, setFilterVelo30dayRanks] = useState<number[]>([])

  const { data: riders, isLoading, error } = useQuery<MatrixRider[]>({
    queryKey: ['matrixRiders'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders/team`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch riders')
      }
      const data = await res.json()
      // Handle zowel array als object met riders property
      return Array.isArray(data) ? data : (data.riders || [])
    },
    refetchInterval: 60000,
    retry: 3,
  })

  // Bereken team bests voor elk interval in W/kg (voor highlighting)
  const teamBests = useMemo(() => {
    if (!riders || riders.length === 0) return null
    
    // Helper functie om W/kg te berekenen
    const getWkg = (power: number | null, weight: number | null) => {
      if (!power || !weight || weight === 0) return 0
      return power / weight
    }
    
    return {
      power_w5: Math.max(...riders.map(r => getWkg(r.power_w5, r.weight))),
      power_w15: Math.max(...riders.map(r => getWkg(r.power_w15, r.weight))),
      power_w30: Math.max(...riders.map(r => getWkg(r.power_w30, r.weight))),
      power_w60: Math.max(...riders.map(r => getWkg(r.power_w60, r.weight))),
      power_w120: Math.max(...riders.map(r => getWkg(r.power_w120, r.weight))),
      power_w300: Math.max(...riders.map(r => getWkg(r.power_w300, r.weight))),
      power_w1200: Math.max(...riders.map(r => getWkg(r.power_w1200, r.weight))),
    }
  }, [riders])

  // Filter riders - multiselect logic + favorieten
  const filteredRiders = useMemo(() => {
    if (!riders) return []
    
    return riders.filter(rider => {
      // Favorites filter - als showOnlyFavorites aan staat, alleen favorieten tonen
      if (showOnlyFavorites && !favorites.includes(rider.rider_id)) {
        return false
      }
      
      // Category filter - if categories selected, rider must be in list
      if (filterCategories.length > 0 && !filterCategories.includes(rider.zp_category || '')) {
        return false
      }
      
      // vELO Live rank filter - if ranks selected, rider tier rank must be in list
      if (filterVeloLiveRanks.length > 0) {
        const tier = getVeloTier(rider.race_last_rating)
        if (!tier || !filterVeloLiveRanks.includes(tier.rank)) {
          return false
        }
      }
      
      // vELO 30-day rank filter - if ranks selected, rider tier rank must be in list
      if (filterVelo30dayRanks.length > 0) {
        const tier = getVeloTier(rider.race_max30_rating)
        if (!tier || !filterVelo30dayRanks.includes(tier.rank)) {
          return false
        }
      }
      
      return true
    })
  }, [riders, filterCategories, filterVeloLiveRanks, filterVelo30dayRanks, showOnlyFavorites, favorites])

  // Sorteer riders
  const sortedRiders = useMemo(() => {
    const sorted = [...filteredRiders].sort((a, b) => {
      let aVal: number
      let bVal: number
      
      // Special case: W/kg moet berekend worden
      if (sortBy === 'watts_per_kg') {
        aVal = (a.zp_ftp && a.weight) ? a.zp_ftp / a.weight : 0
        bVal = (b.zp_ftp && b.weight) ? b.zp_ftp / b.weight : 0
      } 
      // Power intervals: sorteer op W/kg in plaats van absolute watts
      else if (sortBy === 'power_w5' || sortBy === 'power_w15' || sortBy === 'power_w30' || 
               sortBy === 'power_w60' || sortBy === 'power_w120' || sortBy === 'power_w300' || 
               sortBy === 'power_w1200') {
        const aPower = a[sortBy as keyof MatrixRider] as number | null
        const bPower = b[sortBy as keyof MatrixRider] as number | null
        aVal = (aPower && a.weight) ? aPower / a.weight : 0
        bVal = (bPower && b.weight) ? bPower / b.weight : 0
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

  return (
    <div className="space-y-3 max-w-[98vw] mx-auto py-2">
      {/* Header met filters en legend button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="mr-2">📊</span>
            TEAM DASHBOARD | TEAMNL CLOUD9
          </h1>
          <p className="mt-0.5 text-xs text-gray-600">
            Showing {sortedRiders.length} of {riders?.length || 0} riders
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Category Filter - Dropdown */}
          <MultiSelectDropdown
            label="Categories"
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

          {/* vELO Live Filter - Dropdown */}
          <MultiSelectDropdown
            label="vELO Live"
            options={VELO_TIERS.map(tier => ({
              value: tier.rank,
              label: `${tier.name} (${tier.rank})`,
              icon: tier.icon,
            }))}
            selectedValues={filterVeloLiveRanks}
            onChange={setFilterVeloLiveRanks}
          />

          {/* vELO 30-day Filter - Dropdown */}
          <MultiSelectDropdown
            label="vELO 30-day"
            options={VELO_TIERS.map(tier => ({
              value: tier.rank,
              label: `${tier.name} (${tier.rank})`,
              icon: tier.icon,
            }))}
            selectedValues={filterVelo30dayRanks}
            onChange={setFilterVelo30dayRanks}
          />
          
          {/* Favorites Toggle */}
          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`px-3 py-2 rounded-lg transition-colors text-xs font-medium flex items-center gap-2 ${
              showOnlyFavorites 
                ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={showOnlyFavorites ? 'Toon alle riders' : 'Toon alleen favorieten'}
          >
            <span className="text-base">{showOnlyFavorites ? '⭐' : '☆'}</span>
            <span>{showOnlyFavorites ? 'Favorieten' : 'Alle Riders'}</span>
            {showOnlyFavorites && favorites.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/30 rounded text-xs">
                {favorites.length}
              </span>
            )}
          </button>
          
          {/* Clear Filters Button */}
          {(filterCategories.length > 0 || filterVeloLiveRanks.length > 0 || filterVelo30dayRanks.length > 0) && (
            <button
              onClick={() => {
                setFilterCategories([])
                setFilterVeloLiveRanks([])
                setFilterVelo30dayRanks([])
              }}
              className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-medium"
            >
              Clear Filters
            </button>
          )}
          
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <span>{showLegend ? '📖' : '📚'}</span>
            <span>{showLegend ? 'Hide' : 'Show'} Legend</span>
          </button>
        </div>
      </div>

      {/* Legend Panel - collapsible */}
      {showLegend && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 shadow-lg border border-indigo-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* vELO Tiers Legend */}
            <div>
              <h3 className="font-bold text-indigo-900 mb-3 flex items-center">
                <span className="mr-2">🏆</span>
                vELO Tiers
              </h3>
              <div className="space-y-2.5">
                {VELO_TIERS.map(tier => (
                  <div key={tier.name} className="flex items-center space-x-3">
                    {/* Rank Badge met tier kleuren */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-br ${tier.color} ${tier.textColor} shadow-md`}>
                      {tier.rank}
                    </div>
                    {/* Tier info */}
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-900">{tier.name}</span>
                      <span className="text-[10px] text-gray-600">
                        {tier.min}{tier.max ? `-${tier.max}` : '+'} vELO
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ZP Categories Legend */}
            <div>
              <h3 className="font-bold text-indigo-900 mb-3 flex items-center">
                <span className="mr-2">🚴</span>
                ZP Categories
              </h3>
              <div className="space-y-2">
                {Object.entries(ZP_CATEGORIES).map(([cat, style]) => (
                  <div key={cat} className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${style.color}`}>
                      {style.label}
                    </span>
                    <span className="text-xs text-gray-700">Category {cat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interval Highlights Legend */}
            <div>
              <h3 className="font-bold text-indigo-900 mb-3 flex items-center">
                <span className="mr-2">⚡</span>
                Interval Highlights (Team-Relative)
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-6 bg-yellow-300 rounded"></div>
                  <div>
                    <div className="text-xs font-medium">Gold</div>
                    <div className="text-xs text-gray-600">100% - Team Best voor dit interval</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-6 bg-gray-300 rounded"></div>
                  <div>
                    <div className="text-xs font-medium">Silver</div>
                    <div className="text-xs text-gray-600">95-99% van team best</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-6 bg-orange-300 rounded"></div>
                  <div>
                    <div className="text-xs font-medium">Bronze</div>
                    <div className="text-xs text-gray-600">90-94% van team best</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-600 italic">
                  💡 Hover over interval values to see absolute watts
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className="bg-white shadow-xl rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading racing data...</p>
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
          <div className="overflow-x-auto max-h-[calc(100vh-180px)] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white sticky top-0 z-20 shadow-md">
                {/* Group Headers Row */}
                <tr className="border-b border-slate-600">
                  <th rowSpan={2} className="px-2 py-0.5 text-center text-xs font-bold border-r border-slate-600" title="Favoriet">
                    ⭐
                  </th>
                  <th rowSpan={2} className="px-2 py-0.5 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('rider_id')}>
                    Rider ID
                  </th>
                  <th rowSpan={2} className="px-2 py-0.5 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('race_last_rating')}>
                    vELO Live {sortBy === 'race_last_rating' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th rowSpan={2} className="px-2 py-0.5 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('race_max30_rating')}>
                    vELO 30-day {sortBy === 'race_max30_rating' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th rowSpan={2} className="px-2 py-0.5 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 cursor-pointer hover:bg-slate-600" onClick={() => handleSort('name')}>
                    Rider Name
                  </th>
                  <th rowSpan={2} className="px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wider border-r border-slate-600">
                    Category
                  </th>
                  <th colSpan={2} className="px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wider bg-green-700 border-r border-slate-600">
                    zFTP
                  </th>
                  <th rowSpan={2} className="px-2 py-0.5 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600">
                    Weight
                  </th>
                  <th colSpan={4} className="px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wider bg-slate-600 border-r border-slate-600">
                    Race Stats
                  </th>
                  <th colSpan={7} className="px-2 py-0.5 text-center text-xs font-bold uppercase tracking-wider bg-indigo-700">
                    Power Intervals (W/kg)
                  </th>
                </tr>
                {/* Individual Column Headers Row */}
                <tr>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-green-600 bg-green-700 whitespace-nowrap" onClick={() => handleSort('zp_ftp')}>
                    FTP (W)
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-green-600 bg-green-700 whitespace-nowrap border-r border-slate-600" onClick={() => handleSort('watts_per_kg')}>
                    W/kg
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-500 whitespace-nowrap" onClick={() => handleSort('race_finishes')}>
                    Finishes
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-500 whitespace-nowrap" onClick={() => handleSort('race_wins')}>
                    Wins
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-500 whitespace-nowrap" onClick={() => handleSort('race_podiums')}>
                    Podiums
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-500 whitespace-nowrap border-r border-slate-600" onClick={() => handleSort('race_dnfs')}>
                    DNFs
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w5')}>
                    5s
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w15')}>
                    15s
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w30')}>
                    30s
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w60')}>
                    1m
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w120')}>
                    2m
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w300')}>
                    5m
                  </th>
                  <th className="px-2 py-0.5 text-right text-xs font-semibold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w1200')}>
                    20m
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRiders.map((rider) => {
                  const veloLiveTier = getVeloTier(rider.race_last_rating)
                  const zpCategory = rider.zp_category as keyof typeof ZP_CATEGORIES | null
                  
                  return (
                    <tr 
                      key={rider.rider_id} 
                      className={`hover:bg-gray-50 transition-colors ${veloLiveTier?.bgColor || ''}`}
                    >
                      <td className="px-2 py-0.5 whitespace-nowrap text-center">
                        <button
                          onClick={() => toggleFavorite(rider.rider_id)}
                          className="text-lg hover:scale-125 transition-transform"
                          title={isFavorite(rider.rider_id) ? 'Verwijder favoriet' : 'Voeg toe als favoriet'}
                        >
                          {isFavorite(rider.rider_id) ? '⭐' : '☆'}
                        </button>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-gray-700 font-mono text-xs">
                        {rider.rider_id}
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap">
                        <VeloBadge rating={rider.race_last_rating} />
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap">
                        <VeloBadge rating={rider.race_max30_rating} />
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap font-medium text-gray-900">
                        {rider.name}
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
                      <td className="px-2 py-0.5 whitespace-nowrap text-right font-bold text-gray-900 text-sm">
                        {rider.zp_ftp || '-'}
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right font-bold text-indigo-700 text-sm">
                        {rider.zp_ftp && rider.weight ? (rider.zp_ftp / rider.weight).toFixed(2) : '-'}
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right text-gray-700">
                        {rider.weight ? `${rider.weight.toFixed(1)}kg` : '-'}
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right text-gray-700 font-semibold">
                        {rider.race_finishes || 0}
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right font-bold text-green-700">
                        {rider.race_wins || 0}
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right font-semibold text-blue-700">
                        {rider.race_podiums || 0}
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right text-red-700">
                        {rider.race_dnfs || 0}
                      </td>
                      
                      {/* Power Intervals in W/kg met team-relative highlighting */}
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(calculateWkg(rider.power_w5, rider.weight), teamBests?.power_w5 || null)}`}
                          title={`${rider.power_w5 || 0}W`}
                        >
                          {calculateWkg(rider.power_w5, rider.weight)?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(calculateWkg(rider.power_w15, rider.weight), teamBests?.power_w15 || null)}`}
                          title={`${rider.power_w15 || 0}W`}
                        >
                          {calculateWkg(rider.power_w15, rider.weight)?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(calculateWkg(rider.power_w30, rider.weight), teamBests?.power_w30 || null)}`}
                          title={`${rider.power_w30 || 0}W`}
                        >
                          {calculateWkg(rider.power_w30, rider.weight)?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(calculateWkg(rider.power_w60, rider.weight), teamBests?.power_w60 || null)}`}
                          title={`${rider.power_w60 || 0}W`}
                        >
                          {calculateWkg(rider.power_w60, rider.weight)?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(calculateWkg(rider.power_w120, rider.weight), teamBests?.power_w120 || null)}`}
                          title={`${rider.power_w120 || 0}W`}
                        >
                          {calculateWkg(rider.power_w120, rider.weight)?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(calculateWkg(rider.power_w300, rider.weight), teamBests?.power_w300 || null)}`}
                          title={`${rider.power_w300 || 0}W`}
                        >
                          {calculateWkg(rider.power_w300, rider.weight)?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 whitespace-nowrap text-right">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${getTeamRelativePowerColor(calculateWkg(rider.power_w1200, rider.weight), teamBests?.power_w1200 || null)}`}
                          title={`${rider.power_w1200 || 0}W`}
                        >
                          {calculateWkg(rider.power_w1200, rider.weight)?.toFixed(2) || '-'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-gray-500">
        Data refreshes elke 60 seconden • Sorteer door op kolom headers te klikken
      </div>
    </div>
  )
}
