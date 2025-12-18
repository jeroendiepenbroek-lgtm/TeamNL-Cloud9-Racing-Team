import { useState, useEffect, useRef } from 'react'
import { useFavorites } from '../hooks/useFavorites'
import toast from 'react-hot-toast'

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
  height_cm: number
  age: number
  zwift_official_racing_score: number
  avatar_url: string
  phenotype: string | null
  power_5s: number
  power_15s: number
  power_30s: number
  power_60s: number
  power_120s: number
  power_300s: number
  power_1200s: number
  power_5s_wkg: number
  power_15s_wkg: number
  power_30s_wkg: number
  power_60s_wkg: number
  power_120s_wkg: number
  power_300s_wkg: number
  power_1200s_wkg: number
  team_id?: number | null
  team_name?: string | null
}

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8080'

// vELO Tiers (matching Racing Matrix)
const VELO_TIERS = [
  { rank: 1, name: 'Diamond', icon: '💎', min: 2200, color: '#00D4FF', border: '#0099CC' },
  { rank: 2, name: 'Ruby', icon: '♦️', min: 1900, max: 2200, color: '#E61E50', border: '#B30F3A' },
  { rank: 3, name: 'Emerald', icon: '💚', min: 1650, max: 1900, color: '#50C878', border: '#2E9356' },
  { rank: 4, name: 'Sapphire', icon: '💙', min: 1450, max: 1650, color: '#0F52BA', border: '#0A3680' },
  { rank: 5, name: 'Amethyst', icon: '💜', min: 1300, max: 1450, color: '#9966CC', border: '#6B4A99' },
  { rank: 6, name: 'Platinum', icon: '⚪', min: 1150, max: 1300, color: '#E5E4E2', border: '#B8B7B5' },
  { rank: 7, name: 'Gold', icon: '🟡', min: 1000, max: 1150, color: '#FFD700', border: '#CCA700' },
  { rank: 8, name: 'Silver', icon: '⚫', min: 850, max: 1000, color: '#C0C0C0', border: '#8C8C8C' },
  { rank: 9, name: 'Bronze', icon: '🟠', min: 650, max: 850, color: '#CD7F32', border: '#995F26' },
  { rank: 10, name: 'Copper', icon: '🟤', min: 0, max: 650, color: '#B87333', border: '#8B5A1F' },
]

// ZP Categories
const ZP_CATEGORIES = {
  'A+': { color: 'bg-red-100 text-red-900 border-red-300', label: 'A+' },
  'A': { color: 'bg-red-50 text-red-800 border-red-200', label: 'A' },
  'B': { color: 'bg-green-50 text-green-800 border-green-200', label: 'B' },
  'C': { color: 'bg-blue-50 text-blue-800 border-blue-200', label: 'C' },
  'D': { color: 'bg-yellow-50 text-yellow-800 border-yellow-200', label: 'D' },
}

// Multi-select Dropdown Component (from Racing Matrix)
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
        <div 
          className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shadow-sm"
          style={{ 
            background: tier.color,
            borderColor: tier.border,
            borderWidth: '2px',
            borderStyle: 'solid'
          }}
        >
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
  const isCategoryDropdown = label.includes('Category')

  return (
    <div className="relative z-[9999]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 border border-white/30 rounded-lg text-xs focus:ring-2 focus:ring-yellow-400 bg-white/15 text-white hover:bg-white/20 transition-colors w-full flex items-center justify-between font-bold"
      >
        <span>
          {label}
          {selectedValues.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-400 text-gray-900 rounded text-[10px] font-bold">
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
        <div className="absolute z-[10000] mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-400"
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

export default function RiderPassportGallery() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [filteredRiders, setFilteredRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [filterVeloLiveRanks, setFilterVeloLiveRanks] = useState<number[]>([])
  const [filterVelo30dayRanks, setFilterVelo30dayRanks] = useState<number[]>([])
  const [filterTeams, setFilterTeams] = useState<number[]>([])
  const [teams, setTeams] = useState<{team_id: number, team_name: string}[]>([])
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())
  const [tierMaxValues, setTierMaxValues] = useState<{[tier: number]: {[key: string]: number}}>({})

  // Favorites
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false)

  useEffect(() => {
    loadRiders()
    loadTeams()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [riders, searchTerm, filterCategories, filterVeloLiveRanks, filterVelo30dayRanks, filterTeams, showOnlyFavorites, favorites])

  const loadRiders = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/riders`)
      const data = await response.json()
      const loadedRiders = data.riders || []
      setRiders(loadedRiders)
      
      // Calculate tier max values for spider chart normalization
      const tierMaxes: {[tier: number]: {[key: string]: number}} = {}
      loadedRiders.forEach((r: Rider) => {
        const tier = getVeloTier(r.velo_live).tier
        if (!tierMaxes[tier]) {
          tierMaxes[tier] = {
            power_5s: 0, power_15s: 0, power_30s: 0, power_60s: 0,
            power_120s: 0, power_300s: 0, power_1200s: 0
          }
        }
        tierMaxes[tier].power_5s = Math.max(tierMaxes[tier].power_5s, r.power_5s || 0)
        tierMaxes[tier].power_15s = Math.max(tierMaxes[tier].power_15s, r.power_15s || 0)
        tierMaxes[tier].power_30s = Math.max(tierMaxes[tier].power_30s, r.power_30s || 0)
        tierMaxes[tier].power_60s = Math.max(tierMaxes[tier].power_60s, r.power_60s || 0)
        tierMaxes[tier].power_120s = Math.max(tierMaxes[tier].power_120s, r.power_120s || 0)
        tierMaxes[tier].power_300s = Math.max(tierMaxes[tier].power_300s, r.power_300s || 0)
        tierMaxes[tier].power_1200s = Math.max(tierMaxes[tier].power_1200s, r.power_1200s || 0)
      })
      setTierMaxValues(tierMaxes)
      
      setLoading(false)
    } catch (err) {
      setError('Fout bij laden van riders')
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/teams`)
      const data = await response.json()
      setTeams(data.teams || [])
    } catch (err) {
      console.error('Error loading teams:', err)
    }
  }

  const applyFilters = () => {
    let filtered = riders

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.racing_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Favorites filter
    if (showOnlyFavorites && favorites.length > 0) {
      filtered = filtered.filter(r => favorites.includes(r.rider_id))
    }

    // Category filter - multiselect
    if (filterCategories.length > 0) {
      filtered = filtered.filter(r => {
        const category = r.zwift_official_category || r.zwiftracing_category || 'D'
        return filterCategories.includes(category)
      })
    }

    // vELO Live filter - multiselect
    if (filterVeloLiveRanks.length > 0) {
      filtered = filtered.filter(r => {
        const tier = getVeloTier(r.velo_live).tier
        return filterVeloLiveRanks.includes(tier)
      })
    }

    // vELO 30-day filter - multiselect
    if (filterVelo30dayRanks.length > 0) {
      filtered = filtered.filter(r => {
        const tier = getVeloTier(r.velo_30day).tier
        return filterVelo30dayRanks.includes(tier)
      })
    }

    // Team filter - multiselect
    if (filterTeams.length > 0) {
      filtered = filtered.filter(r => {
        return r.team_id && filterTeams.includes(r.team_id)
      })
    }

    setFilteredRiders(filtered)
  }

  const getFlagUrl = (countryCode: string) => {
    const alpha3ToAlpha2: { [key: string]: string } = {
      'NLD': 'nl', 'BEL': 'be', 'GBR': 'gb', 'USA': 'us', 'DEU': 'de',
      'FRA': 'fr', 'ITA': 'it', 'ESP': 'es', 'AUS': 'au', 'CAN': 'ca',
      'DNK': 'dk', 'SWE': 'se', 'NOR': 'no', 'FIN': 'fi', 'POL': 'pl',
      'CHE': 'ch', 'AUT': 'at', 'JPN': 'jp', 'NZL': 'nz', 'ZAF': 'za',
      'BRA': 'br', 'MEX': 'mx', 'PRT': 'pt', 'CZE': 'cz', 'SVK': 'sk',
      'HUN': 'hu', 'ROU': 'ro', 'BGR': 'bg', 'HRV': 'hr', 'SVN': 'si',
      'IRL': 'ie', 'LUX': 'lu', 'ISL': 'is', 'LTU': 'lt', 'LVA': 'lv',
      'EST': 'ee', 'GRC': 'gr', 'TUR': 'tr', 'UKR': 'ua', 'RUS': 'ru',
      'ARG': 'ar', 'CHL': 'cl', 'COL': 'co', 'PER': 'pe', 'URY': 'uy',
      'VEN': 've', 'CHN': 'cn', 'KOR': 'kr', 'TWN': 'tw', 'THA': 'th',
      'SGP': 'sg', 'MYS': 'my', 'IDN': 'id', 'PHL': 'ph', 'VNM': 'vn',
      'IND': 'in', 'PAK': 'pk', 'ISR': 'il', 'SAU': 'sa', 'ARE': 'ae'
    }
    const alpha2 = alpha3ToAlpha2[countryCode?.toUpperCase()]
    return alpha2 ? `https://flagcdn.com/w80/${alpha2}.png` : null
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'A+': '#FF0000', 'A': '#FF0000', 'B': '#4CAF50',
      'C': '#0000FF', 'D': '#FF1493', 'E': '#808080'
    }
    return colors[category] || '#666'
  }

  const getVeloTier = (veloLive: number) => {
    if (!veloLive) return { tier: 10, name: 'Copper', color: '#B87333', border: '#8B5A1F', emoji: '🟤' }
    if (veloLive >= 2200) return { tier: 1, name: 'Diamond', color: '#00D4FF', border: '#0099CC', emoji: '💎' }
    if (veloLive >= 1900) return { tier: 2, name: 'Ruby', color: '#E61E50', border: '#B30F3A', emoji: '♦️' }
    if (veloLive >= 1650) return { tier: 3, name: 'Emerald', color: '#50C878', border: '#2E9356', emoji: '💚' }
    if (veloLive >= 1450) return { tier: 4, name: 'Sapphire', color: '#0F52BA', border: '#0A3680', emoji: '💙' }
    if (veloLive >= 1300) return { tier: 5, name: 'Amethyst', color: '#9966CC', border: '#6B4A99', emoji: '💜' }
    if (veloLive >= 1150) return { tier: 6, name: 'Platinum', color: '#E5E4E2', border: '#B8B7B5', emoji: '⚪' }
    if (veloLive >= 1000) return { tier: 7, name: 'Gold', color: '#FFD700', border: '#CCA700', emoji: '🥇' }
    if (veloLive >= 850) return { tier: 8, name: 'Silver', color: '#C0C0C0', border: '#8C8C8C', emoji: '⚪' }
    if (veloLive >= 650) return { tier: 9, name: 'Bronze', color: '#CD7F32', border: '#995F26', emoji: '🥉' }
    return { tier: 10, name: 'Copper', color: '#B87333', border: '#8B5A1F', emoji: '🟤' }
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

  const renderCard = (
    rider: Rider,
    category: string,
    flagUrl: string | null,
    categoryColor: string,
    veloLive: number,
    velo30day: number,
    veloTier: { tier: number; name: string; color: string; border: string; emoji: string },
    heightCm: string | number,
    wkg: string,
    isFlipped: boolean
  ) => (
    <div
      key={rider.rider_id}
      className="perspective-1000 cursor-pointer snap-center flex-shrink-0 flex-shrink-0 snap-center"
      onClick={() => toggleFlip(rider.rider_id)}
      style={{ perspective: '1000px', width: '300px' }}
    >
      <div
        className={`relative w-full h-[520px] transition-transform duration-600 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* FRONT */}
        <div
          className="absolute w-full h-full backface-hidden rounded-xl bg-gradient-to-br from-gray-900 to-blue-900 border-4 border-yellow-400 shadow-xl p-2"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Header with tier badge and category */}
          <div
            className="h-16 rounded-t-lg relative mb-12"
            style={{
              background: `linear-gradient(135deg, ${veloTier.color} 0%, ${veloTier.border} 100%)`,
              clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)'
            }}
          >
            <div
              className="absolute top-2 left-3 w-10 h-10 rounded-full flex items-center justify-center border-3"
              style={{
                background: veloTier.color,
                borderColor: veloTier.border,
                borderWidth: '3px',
                borderStyle: 'solid'
              }}
              title={veloTier.name}
            >
              <span className="text-2xl font-black text-white drop-shadow-lg">{veloTier.tier}</span>
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

          {/* Favorite Star - Positioned below header, right side */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              toggleFavorite(rider.rider_id)
            }}
            className="absolute top-[72px] right-3 z-20 text-2xl transition-transform hover:scale-125 active:scale-95 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.6)] border-2 border-yellow-400"
            style={{ boxShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 10px rgba(255, 215, 0, 0.4)' }}
            title={isFavorite(rider.rider_id) ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite(rider.rider_id) ? '⭐' : '☆'}
          </button>

          {/* Avatar */}
          <img
            src={rider.avatar_url || 'https://via.placeholder.com/100?text=No+Avatar'}
            alt={rider.racing_name}
            className="absolute top-12 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-3 border-yellow-400 object-cover bg-gray-700 shadow-xl"
            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/100?text=No+Avatar' }}
          />

          {/* Name and Flag */}
          <div className="text-center mb-2 mt-3">
            <h2 className="text-sm font-black text-white uppercase drop-shadow-lg mb-1 px-1 leading-tight">
              {rider.racing_name || rider.full_name || 'Unknown'}
            </h2>
            <div className="flex items-center justify-center gap-1">
              {flagUrl && (
                <img
                  src={flagUrl}
                  alt={rider.country_alpha3}
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
              style={{ background: 'rgba(255,255,255,0.1)', borderColor: veloTier.color }}
            >
              <div className="text-xs font-bold uppercase" style={{ color: veloTier.color }}>Velo Live</div>
              <div className="text-lg font-black text-white">{veloLive || '-'}</div>
            </div>
            <div
              className="rounded-lg p-2 text-center border-2"
              style={{ background: 'rgba(255,255,255,0.1)', borderColor: veloTier.color }}
            >
              <div className="text-xs font-bold uppercase" style={{ color: veloTier.color }}>Velo 30d</div>
              <div className="text-lg font-black text-white">{velo30day || '-'}</div>
            </div>
          </div>

          {/* Phenotype Bar - Moved below vELO */}
          {rider.phenotype && (
            <div className="mx-2 mb-3 bg-white/10 rounded-lg p-3 border border-white/20 text-center">
              <div className="text-xs text-yellow-400 font-bold uppercase">Phenotype</div>
              <div className="text-lg font-bold text-white capitalize">{rider.phenotype}</div>
            </div>
          )}

          <div className="text-center text-xs text-yellow-400/80 uppercase tracking-wide font-bold mt-2">
            🔄 Klik voor intervals
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute w-full h-full backface-hidden rounded-xl bg-gradient-to-br from-gray-900 to-blue-900 border-4 border-yellow-400 shadow-xl p-3 flex flex-col"
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
                if (canvas && flippedCards.has(rider.rider_id)) {
                  // Direct render via ref callback voor desktop reliability
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

  // Draw spider charts voor alle geflipte cards
  useEffect(() => {
    // Multiple timeouts voor verschillende render cycles
    const timers: NodeJS.Timeout[] = []
    
    // Probeer meerdere keren met verschillende delays
    ;[50, 150, 300].forEach(delay => {
      const timer = setTimeout(() => {
        flippedCards.forEach(riderId => {
          const canvas = document.getElementById(`spider-${riderId}`) as HTMLCanvasElement
          if (canvas) {
            const rider = filteredRiders.find(r => r.rider_id === riderId)
            if (rider) {
              drawSpiderChartForRider(canvas, rider)
            }
          }
        })
      }, delay)
      timers.push(timer)
    })
    
    return () => timers.forEach(t => clearTimeout(t))
  }, [flippedCards, filteredRiders, tierMaxValues])

  const drawSpiderChartForRider = (canvas: HTMLCanvasElement, rider: Rider) => {
    setTimeout(() => {
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = canvas.width
      const height = canvas.height
      const centerX = width / 2
      const centerY = height / 2
      const radius = Math.min(width, height) / 2 - 20

      // Get rider's tier and tier max values
      const tier = getVeloTier(rider.velo_live).tier
      const tierMax = tierMaxValues[tier] || {
        power_5s: 1500, power_15s: 1200, power_30s: 1000, power_60s: 800,
        power_120s: 600, power_300s: 500, power_1200s: 400
      }

      // Power data (normalized to tier's best rider = 100%)
      const powerData = [
        { label: '5s', value: rider.power_5s, max: tierMax.power_5s || 1 },
        { label: '15s', value: rider.power_15s, max: tierMax.power_15s || 1 },
        { label: '30s', value: rider.power_30s, max: tierMax.power_30s || 1 },
        { label: '1m', value: rider.power_60s, max: tierMax.power_60s || 1 },
        { label: '2m', value: rider.power_120s, max: tierMax.power_120s || 1 },
        { label: '5m', value: rider.power_300s, max: tierMax.power_300s || 1 },
        { label: '20m', value: rider.power_1200s, max: tierMax.power_1200s || 1 }
      ]

      const numPoints = powerData.length
      const angleStep = (Math.PI * 2) / numPoints

      // Clear canvas
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

        // Draw labels
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

  const stats = {
    total: filteredRiders.length
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading riders...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{
      background: 'linear-gradient(135deg, #7f1d1d 0%, #166534 50%, #7f1d1d 100%)'
    }}>
      {/* Modern Compact Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            🎴 Rider Passports
          </h1>
          <div className="bg-white/10 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg font-semibold text-sm border border-white/20">
            {stats.total} riders
          </div>
        </div>
      </div>

      {/* Compact Search + Filters Row */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-3 shadow-lg">
          <div className="space-y-3">
            {/* Search Bar */}
            <div>
              <input
                type="text"
                placeholder="🔍 Zoek rider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/15 text-white placeholder-white/50 border border-white/30 focus:border-yellow-400 focus:outline-none font-semibold text-sm"
              />
            </div>

            {/* Filter Buttons Row */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Category Filter */}
              <div className="min-w-[140px]">
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
              </div>

              {/* vELO Live Filter */}
              <div className="min-w-[160px]">
                <MultiSelectDropdown
                label="vELO Live"
                options={VELO_TIERS.map(tier => ({
                  value: tier.rank,
                  label: tier.name,
                }))}
                  selectedValues={filterVeloLiveRanks}
                  onChange={setFilterVeloLiveRanks}
                />
              </div>

              {/* vELO 30-day Filter */}
              <div className="min-w-[160px]">
                <MultiSelectDropdown
                label="vELO 30-day"
                options={VELO_TIERS.map(tier => ({
                  value: tier.rank,
                  label: tier.name,
                }))}
                  selectedValues={filterVelo30dayRanks}
                  onChange={setFilterVelo30dayRanks}
                />
              </div>

              {/* Team Filter */}
              <div className="min-w-[160px]">
                <MultiSelectDropdown
                  label="Team"
                  options={teams.map(team => ({
                    value: team.team_id,
                    label: team.team_name,
                  }))}
                  selectedValues={filterTeams}
                  onChange={setFilterTeams}
                />
              </div>

              {/* Favorites Toggle */}
              <button
                onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 sm:gap-2 flex-shrink-0 ${
                  showOnlyFavorites 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                    : 'bg-white/15 text-white/80 hover:bg-white/20 border border-white/30'
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

              {/* Clear Filters Button */}
              <button
                onClick={() => {
                  const totalFilters = filterCategories.length + filterVeloLiveRanks.length + filterVelo30dayRanks.length + filterTeams.length
                  setFilterCategories([])
                  setFilterVeloLiveRanks([])
                  setFilterVelo30dayRanks([])
                  setFilterTeams([])
                  if (totalFilters > 0) {
                    toast.success(`${totalFilters} filter${totalFilters > 1 ? 's' : ''} verwijderd`, { icon: '🗑️' })
                  }
                }}
                disabled={filterCategories.length === 0 && filterVeloLiveRanks.length === 0 && filterVelo30dayRanks.length === 0 && filterTeams.length === 0}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 sm:gap-2 flex-shrink-0 ${
                  filterCategories.length > 0 || filterVeloLiveRanks.length > 0 || filterVelo30dayRanks.length > 0 || filterTeams.length > 0
                    ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                    : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/20'
                }`}
                title="Verwijder alle filters"
              >
                <span className="text-sm sm:text-base">🗑️</span>
                <span className="hidden sm:inline">Clear</span>
                {(filterCategories.length > 0 || filterVeloLiveRanks.length > 0 || filterVelo30dayRanks.length > 0 || filterTeams.length > 0) && (
                  <span className="ml-0.5 sm:ml-1 px-1 sm:px-1.5 py-0.5 bg-white/30 rounded text-[10px] sm:text-xs font-bold">
                    {filterCategories.length + filterVeloLiveRanks.length + filterVelo30dayRanks.length + filterTeams.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card Deck - Mobile Optimized & Desktop Carousel */}
      <div className="max-w-full mx-auto px-4">
        {filteredRiders.length === 0 ? (
          <div className="text-center text-gray-700 text-xl py-20 font-semibold">
            Geen riders gevonden met deze filters.
          </div>
        ) : (
          <>
            {/* Mobile: Horizontal Snap Scroll - Centered */}
            <div className="md:hidden overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-yellow-400 scrollbar-track-gray-800 pb-4">
              <div className="flex gap-4 snap-x snap-mandatory px-4 justify-center" style={{ minWidth: 'min-content' }}>
                {filteredRiders.map(rider => {
                  const category = rider.zwift_official_category || rider.zwiftracing_category || 'D'
                  const flagUrl = getFlagUrl(rider.country_alpha3)
                  const categoryColor = getCategoryColor(category)
                  const veloLive = Math.floor(rider.velo_live || 0)
                  const velo30day = Math.floor(rider.velo_30day || 0)
                  const veloTier = getVeloTier(veloLive)
                  const heightCm = rider.height_cm ? Math.round(rider.height_cm / 10) : '-'
                  const wkg = rider.racing_ftp && rider.weight_kg ? (rider.racing_ftp / rider.weight_kg).toFixed(1) : '-'
                  const isFlipped = flippedCards.has(rider.rider_id)
                  
                  return renderCard(rider, category, flagUrl, categoryColor, veloLive, velo30day, veloTier, heightCm, wkg, isFlipped)
                })}
              </div>
            </div>
            
            {/* Desktop: Horizontal Scroll */}
            <div className="hidden md:block">
              <div 
                className="overflow-x-auto overflow-y-hidden pb-4 scroll-smooth"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#FACC15 #1F2937'
                }}
              >
                <div className="flex gap-6 px-4 justify-center" style={{ minWidth: 'min-content' }}>
                  {filteredRiders.map((rider) => {
                    const category = rider.zwift_official_category || rider.zwiftracing_category || 'D'
                    const flagUrl = getFlagUrl(rider.country_alpha3)
                    const categoryColor = getCategoryColor(category)
                    const veloLive = Math.floor(rider.velo_live || 0)
                    const velo30day = Math.floor(rider.velo_30day || 0)
                    const veloTier = getVeloTier(veloLive)
                    const heightCm = rider.height_cm ? Math.round(rider.height_cm / 10) : '-'
                    const wkg = rider.racing_ftp && rider.weight_kg ? (rider.racing_ftp / rider.weight_kg).toFixed(1) : '-'
                    const isFlipped = flippedCards.has(rider.rider_id)
                    
                    return renderCard(rider, category, flagUrl, categoryColor, veloLive, velo30day, veloTier, heightCm, wkg, isFlipped)
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
