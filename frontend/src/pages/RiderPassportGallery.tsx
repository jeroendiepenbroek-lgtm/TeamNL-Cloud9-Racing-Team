import { useState, useEffect } from 'react'

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
}

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8080'

export default function RiderPassportGallery() {
  const [riders, setRiders] = useState<Rider[]>([])
  const [filteredRiders, setFilteredRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedTiers, setSelectedTiers] = useState<number[]>([])
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadRiders()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [riders, searchTerm, categoryFilter, selectedTiers])

  const loadRiders = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/riders`)
      const data = await response.json()
      setRiders(data.riders || [])
      setLoading(false)
    } catch (err) {
      setError('Fout bij laden van riders')
      setLoading(false)
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

    // Category filter
    if (categoryFilter !== 'all') {
      const riderCategory = (r: Rider) => r.zwift_official_category || r.zwiftracing_category || 'D'
      filtered = filtered.filter(r => riderCategory(r) === categoryFilter)
    }

    // Tier filter - individual tier selection
    if (selectedTiers.length > 0) {
      filtered = filtered.filter(r => {
        const tier = getVeloTier(r.velo_live).tier
        return selectedTiers.includes(tier)
      })
    }

    setFilteredRiders(filtered)
  }

  const toggleTier = (tier: number) => {
    setSelectedTiers(prev => 
      prev.includes(tier) 
        ? prev.filter(t => t !== tier)
        : [...prev, tier]
    )
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
      'EST': 'ee', 'GRC': 'gr', 'TUR': 'tr', 'UKR': 'ua', 'RUS': 'ru'
    }
    const alpha2 = alpha3ToAlpha2[countryCode?.toUpperCase()]
    return alpha2 ? `https://flagcdn.com/w80/${alpha2}.png` : null
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'A+': '#FF0000', 'A': '#FFA500', 'B': '#4CAF50',
      'C': '#0000FF', 'D': '#FF1493', 'E': '#808080'
    }
    return colors[category] || '#666'
  }

  const getVeloTier = (veloLive: number) => {
    if (!veloLive) return { tier: 10, name: 'Copper', color: '#B87333', border: '#D4A76A' }
    if (veloLive >= 1750) return { tier: 1, name: 'Diamond', color: '#00D4FF', border: '#7FEFFF' }
    if (veloLive >= 1650) return { tier: 2, name: 'Ruby', color: '#E61E50', border: '#FF6B9D' }
    if (veloLive >= 1550) return { tier: 3, name: 'Emerald', color: '#50C878', border: '#8FE5A0' }
    if (veloLive >= 1450) return { tier: 4, name: 'Sapphire', color: '#0F52BA', border: '#5B9BD5' }
    if (veloLive >= 1350) return { tier: 5, name: 'Amethyst', color: '#9966CC', border: '#C8A2D0' }
    if (veloLive >= 1200) return { tier: 6, name: 'Platinum', color: '#E5E4E2', border: '#FFFFFF' }
    if (veloLive >= 1000) return { tier: 7, name: 'Gold', color: '#FFD700', border: '#FFF700' }
    if (veloLive >= 800) return { tier: 8, name: 'Silver', color: '#C0C0C0', border: '#E8E8E8' }
    if (veloLive >= 600) return { tier: 9, name: 'Bronze', color: '#CD7F32', border: '#E4A672' }
    return { tier: 10, name: 'Copper', color: '#B87333', border: '#D4A76A' }
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
      {/* Compact Header with Rider Count */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black text-white uppercase tracking-tight drop-shadow-lg">
            🎴 Rider Passports
          </h1>
          <div className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-black text-lg shadow-lg">
            {stats.total} riders
          </div>
        </div>
      </div>

      {/* Compact Search + Filters Row */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 shadow-lg">
          <div className="grid md:grid-cols-4 gap-4 items-end">
            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="🔍 Zoek rider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/15 text-white placeholder-white/50 border border-white/30 focus:border-yellow-400 focus:outline-none font-semibold"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/15 text-white border border-white/30 focus:border-yellow-400 focus:outline-none font-bold appearance-none cursor-pointer"
                style={{ backgroundImage: 'none' }}
              >
                <option value="all" className="bg-gray-800">🏅 Alle Categories</option>
                <option value="A+" className="bg-gray-800">A+</option>
                <option value="A" className="bg-gray-800">A</option>
                <option value="B" className="bg-gray-800">B</option>
                <option value="C" className="bg-gray-800">C</option>
                <option value="D" className="bg-gray-800">D</option>
                <option value="E" className="bg-gray-800">E</option>
              </select>
            </div>

            {/* Tier Multi-Select */}
            <div className="col-span-2">
              <div className="flex flex-wrap gap-2">
                {[
                  { tier: 1, emoji: '💎', label: 'Diamond' },
                  { tier: 2, emoji: '♦️', label: 'Ruby' },
                  { tier: 3, emoji: '💚', label: 'Emerald' },
                  { tier: 4, emoji: '💙', label: 'Sapphire' },
                  { tier: 5, emoji: '💜', label: 'Amethyst' },
                  { tier: 6, emoji: '⚪', label: 'Platinum' },
                  { tier: 7, emoji: '🥇', label: 'Gold' },
                  { tier: 8, emoji: '⚪', label: 'Silver' },
                  { tier: 9, emoji: '🥉', label: 'Bronze' },
                  { tier: 10, emoji: '🟤', label: 'Copper' }
                ].map(({ tier, emoji }) => (
                  <button
                    key={tier}
                    onClick={() => toggleTier(tier)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTiers.includes(tier)
                        ? 'bg-yellow-400 text-gray-900 shadow-md scale-105'
                        : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
                    }`}
                    title={`Tier ${tier}`}
                  >
                    {emoji} {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid - Smaller Cards */}
      <div className="max-w-7xl mx-auto">
        {filteredRiders.length === 0 ? (
          <div className="text-center text-white text-xl py-20">
            Geen riders gevonden met deze filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

              return (
                <div
                  key={rider.rider_id}
                  className="perspective-1000 cursor-pointer"
                  onClick={() => toggleFlip(rider.rider_id)}
                  style={{ perspective: '1000px' }}
                >
                  <div
                    className={`relative w-full h-[460px] transition-transform duration-600 transform-style-3d ${
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
                            background: 'rgba(255,255,255,0.15)',
                            borderColor: veloTier.color
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
                      <div className="grid grid-cols-3 gap-1 mb-2 px-2">
                        <div className="bg-white/10 backdrop-blur-md rounded p-1 text-center border border-white/20">
                          <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">zFTP</div>
                          <div className="text-sm font-black text-white">{rider.racing_ftp || '-'}<span className="text-xs text-white/70">W</span></div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded p-1 text-center border border-white/20">
                          <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">Wgt</div>
                          <div className="text-sm font-black text-white">{rider.weight_kg || '-'}<span className="text-xs text-white/70">kg</span></div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded p-1 text-center border border-white/20">
                          <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">W/kg</div>
                          <div className="text-sm font-black text-white">{wkg}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded p-1 text-center border border-white/20">
                          <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">Hgt</div>
                          <div className="text-sm font-black text-white">{heightCm}<span className="text-xs text-white/70">cm</span></div>
                        </div>
                        <div></div>
                        <div className="bg-white/10 backdrop-blur-md rounded p-1 text-center border border-white/20">
                          <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">Age</div>
                          <div className="text-sm font-black text-white">{rider.age || '-'}<span className="text-xs text-white/70">yr</span></div>
                        </div>
                      </div>

                      {/* Phenotype Bar */}
                      {rider.phenotype && (
                        <div className="mx-2 mb-2 bg-white/10 rounded-lg p-2 border border-white/20 text-center">
                          <div className="text-xs text-yellow-400 font-bold uppercase">Phenotype</div>
                          <div className="text-sm font-bold text-white capitalize">{rider.phenotype}</div>
                        </div>
                      )}

                      {/* Velo Ranks */}
                      <div className="grid grid-cols-2 gap-1 px-2 mb-2">
                        <div
                          className="rounded-lg p-1 text-center border-2"
                          style={{ background: 'rgba(255,255,255,0.1)', borderColor: veloTier.color }}
                        >
                          <div className="text-xs font-bold uppercase" style={{ color: veloTier.color }}>Velo Live</div>
                          <div className="text-sm font-black text-white">{veloLive || '-'}</div>
                        </div>
                        <div
                          className="rounded-lg p-1 text-center border-2"
                          style={{ background: 'rgba(255,255,255,0.1)', borderColor: veloTier.color }}
                        >
                          <div className="text-xs font-bold uppercase" style={{ color: veloTier.color }}>Velo 30d</div>
                          <div className="text-sm font-black text-white">{velo30day || '-'}</div>
                        </div>
                      </div>

                      <div className="text-center text-xs text-yellow-400/80 uppercase tracking-wide font-bold mt-2">
                        🔄 Klik voor intervals
                      </div>
                    </div>

                    {/* BACK */}
                    <div
                      className="absolute w-full h-full backface-hidden rounded-xl bg-gradient-to-br from-gray-900 to-blue-900 border-4 border-yellow-400 shadow-xl p-3 flex flex-col items-center justify-center"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      <h3 className="text-yellow-400 text-base font-black uppercase mb-2 tracking-wide">Power Intervals</h3>
                      <div className="grid grid-cols-2 gap-1 w-full">
                        {[
                          { label: '5s', power: rider.power_5s, wkg: rider.power_5s_wkg },
                          { label: '15s', power: rider.power_15s, wkg: rider.power_15s_wkg },
                          { label: '30s', power: rider.power_30s, wkg: rider.power_30s_wkg },
                          { label: '1m', power: rider.power_60s, wkg: rider.power_60s_wkg },
                          { label: '2m', power: rider.power_120s, wkg: rider.power_120s_wkg },
                          { label: '5m', power: rider.power_300s, wkg: rider.power_300s_wkg },
                          { label: '20m', power: rider.power_1200s, wkg: rider.power_1200s_wkg }
                        ].map(interval => (
                          <div key={interval.label} className="bg-white/10 border border-white/20 rounded p-1 text-center">
                            <div className="text-xs text-yellow-400 font-bold mb-1">{interval.label}</div>
                            <div className="text-xs font-black text-white">
                              {interval.power ? Math.round(interval.power) + ' W' : '-'}
                            </div>
                            <div className="text-xs text-yellow-400/80">
                              {interval.wkg ? interval.wkg.toFixed(1) + ' W/kg' : '-'}
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
        )}
      </div>
    </div>
  )
}
