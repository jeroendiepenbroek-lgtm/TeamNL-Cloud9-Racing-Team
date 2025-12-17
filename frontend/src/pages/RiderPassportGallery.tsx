import { useState, useEffect } from 'react'

interface Rider {
  rider_id: number
  racing_name: string
  full_name: string
  category: string
  country_alpha3: string
  velo_live: number
  velo_30day: number
  racing_ftp: number
  weight_kg: number
  height_cm: number
  age: number
  zwift_official_racing_score: number
  avatar_url: string
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
  const [tierFilter, setTierFilter] = useState('all')
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadRiders()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [riders, searchTerm, categoryFilter, tierFilter])

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
      filtered = filtered.filter(r => r.category === categoryFilter)
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter(r => {
        const tier = getVeloTier(r.velo_live).tier
        const [min, max] = tierFilter.split('-').map(Number)
        return tier >= min && tier <= max
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
    total: filteredRiders.length,
    avgVelo: Math.round(filteredRiders.reduce((sum, r) => sum + (r.velo_live || 0), 0) / filteredRiders.length || 0),
    avgFTP: Math.round(filteredRiders.reduce((sum, r) => sum + (r.racing_ftp || 0), 0) / filteredRiders.length || 0)
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
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-green-900 to-red-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 text-center border-2 border-yellow-400">
          <h1 className="text-5xl font-black text-yellow-400 mb-2">🏆 Rider Passport Gallery 🏆</h1>
          <p className="text-white text-lg">TeamNL Cloud9 Racing Team</p>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border-2 border-white/20">
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="🔍 Zoek rider op naam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-6 py-4 rounded-xl bg-white text-gray-900 text-lg font-semibold shadow-lg focus:outline-none focus:ring-4 focus:ring-yellow-400"
            />
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Category Filter */}
            <div>
              <label className="block text-yellow-400 font-bold mb-3 text-sm uppercase tracking-wide">
                🏅 ZwiftPower Category
              </label>
              <div className="flex flex-wrap gap-2">
                {['all', 'A+', 'A', 'B', 'C', 'D', 'E'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      categoryFilter === cat
                        ? 'bg-yellow-400 text-gray-900 shadow-lg scale-105'
                        : 'bg-white/10 text-white border-2 border-white/30 hover:bg-white/20'
                    }`}
                  >
                    {cat === 'all' ? 'Alle' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tier Filter */}
            <div>
              <label className="block text-yellow-400 font-bold mb-3 text-sm uppercase tracking-wide">
                💎 vELO Tier
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Alle' },
                  { value: '1-2', label: '💎 Diamond/Ruby' },
                  { value: '3-4', label: '💚 Emerald/Sapphire' },
                  { value: '5-6', label: '💜 Amethyst/Platinum' },
                  { value: '7-8', label: '🥇 Gold/Silver' },
                  { value: '9-10', label: '🥉 Bronze/Copper' }
                ].map(tier => (
                  <button
                    key={tier.value}
                    onClick={() => setTierFilter(tier.value)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                      tierFilter === tier.value
                        ? 'bg-yellow-400 text-gray-900 shadow-lg scale-105'
                        : 'bg-white/10 text-white border-2 border-white/30 hover:bg-white/20'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex gap-4 justify-center flex-wrap">
          <div className="bg-white/15 backdrop-blur-md px-6 py-4 rounded-xl border-2 border-yellow-400/30 text-center">
            <div className="text-3xl font-black text-yellow-400">{stats.total}</div>
            <div className="text-sm text-white/80 uppercase tracking-wide">Riders</div>
          </div>
          <div className="bg-white/15 backdrop-blur-md px-6 py-4 rounded-xl border-2 border-yellow-400/30 text-center">
            <div className="text-3xl font-black text-yellow-400">{stats.avgVelo}</div>
            <div className="text-sm text-white/80 uppercase tracking-wide">Avg vELO</div>
          </div>
          <div className="bg-white/15 backdrop-blur-md px-6 py-4 rounded-xl border-2 border-yellow-400/30 text-center">
            <div className="text-3xl font-black text-yellow-400">{stats.avgFTP}</div>
            <div className="text-sm text-white/80 uppercase tracking-wide">Avg zFTP</div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto">
        {filteredRiders.length === 0 ? (
          <div className="text-center text-white text-xl py-20">
            Geen riders gevonden met deze filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRiders.map(rider => {
              const category = rider.category || 'D'
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
                    className={`relative w-full h-[580px] transition-transform duration-600 transform-style-3d ${
                      isFlipped ? 'rotate-y-180' : ''
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                  >
                    {/* FRONT */}
                    <div
                      className="absolute w-full h-full backface-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-blue-900 border-4 border-yellow-400 shadow-2xl p-3"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      {/* Header with tier badge and category */}
                      <div
                        className="h-24 rounded-t-xl relative mb-16"
                        style={{
                          background: `linear-gradient(135deg, ${veloTier.color} 0%, ${veloTier.border} 100%)`,
                          clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)'
                        }}
                      >
                        <div
                          className="absolute top-3 left-4 w-14 h-14 rounded-full flex items-center justify-center border-4"
                          style={{
                            background: 'rgba(255,255,255,0.15)',
                            borderColor: veloTier.color
                          }}
                          title={veloTier.name}
                        >
                          <span className="text-3xl font-black text-white drop-shadow-lg">{veloTier.tier}</span>
                        </div>
                        <div
                          className="absolute top-3 left-20 w-14 h-14 rounded-full flex items-center justify-center border-4 border-white"
                          style={{ background: categoryColor }}
                        >
                          <span className="text-3xl font-black text-white drop-shadow-lg">{category}</span>
                        </div>
                        <div className="absolute top-3 right-4 text-center">
                          <div className="text-xs font-bold text-gray-900 uppercase">ZRS</div>
                          <div className="text-2xl font-black text-gray-900">{rider.zwift_official_racing_score || '-'}</div>
                        </div>
                      </div>

                      {/* Avatar */}
                      <img
                        src={rider.avatar_url || 'https://via.placeholder.com/140?text=No+Avatar'}
                        alt={rider.racing_name}
                        className="absolute top-16 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full border-4 border-yellow-400 object-cover bg-gray-700 shadow-xl"
                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/140?text=No+Avatar' }}
                      />

                      {/* Name and Flag */}
                      <div className="text-center mb-3 mt-4">
                        <h2 className="text-xl font-black text-white uppercase drop-shadow-lg mb-2">
                          {rider.racing_name || rider.full_name || 'Unknown'}
                        </h2>
                        <div className="flex items-center justify-center gap-2">
                          {flagUrl && (
                            <img
                              src={flagUrl}
                              alt={rider.country_alpha3}
                              className="w-10 h-8 rounded shadow-lg"
                            />
                          )}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-3 px-2">
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
                          <div className="text-xs text-yellow-400 font-bold uppercase">zFTP</div>
                          <div className="text-base font-black text-white">{rider.racing_ftp || '-'}<span className="text-xs text-white/70 ml-1">W</span></div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
                          <div className="text-xs text-yellow-400 font-bold uppercase">Weight</div>
                          <div className="text-base font-black text-white">{rider.weight_kg || '-'}<span className="text-xs text-white/70 ml-1">kg</span></div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
                          <div className="text-xs text-yellow-400 font-bold uppercase">W/kg</div>
                          <div className="text-base font-black text-white">{wkg}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
                          <div className="text-xs text-yellow-400 font-bold uppercase">Height</div>
                          <div className="text-base font-black text-white">{heightCm}<span className="text-xs text-white/70 ml-1">cm</span></div>
                        </div>
                        <div></div>
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
                          <div className="text-xs text-yellow-400 font-bold uppercase">Age</div>
                          <div className="text-base font-black text-white">{rider.age || '-'}<span className="text-xs text-white/70 ml-1">yr</span></div>
                        </div>
                      </div>

                      {/* Velo Ranks */}
                      <div className="grid grid-cols-2 gap-2 px-2 mb-3">
                        <div
                          className="rounded-lg p-2 text-center border-2"
                          style={{ background: 'rgba(255,255,255,0.1)', borderColor: veloTier.color }}
                        >
                          <div className="text-xs font-bold uppercase" style={{ color: veloTier.color }}>Velo Live</div>
                          <div className="text-base font-black text-white">{veloLive || '-'}</div>
                        </div>
                        <div
                          className="rounded-lg p-2 text-center border-2"
                          style={{ background: 'rgba(255,255,255,0.1)', borderColor: veloTier.color }}
                        >
                          <div className="text-xs font-bold uppercase" style={{ color: veloTier.color }}>Velo 30d</div>
                          <div className="text-base font-black text-white">{velo30day || '-'}</div>
                        </div>
                      </div>

                      <div className="text-center text-xs text-yellow-400/80 uppercase tracking-wide font-bold mt-4">
                        🔄 Klik voor intervals
                      </div>
                    </div>

                    {/* BACK */}
                    <div
                      className="absolute w-full h-full backface-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-blue-900 border-4 border-yellow-400 shadow-2xl p-6 flex flex-col items-center justify-center"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      <h3 className="text-yellow-400 text-xl font-black uppercase mb-4 tracking-wide">Power Intervals</h3>
                      <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                        {[
                          { label: '5s', power: rider.power_5s, wkg: rider.power_5s_wkg },
                          { label: '15s', power: rider.power_15s, wkg: rider.power_15s_wkg },
                          { label: '30s', power: rider.power_30s, wkg: rider.power_30s_wkg },
                          { label: '1m', power: rider.power_60s, wkg: rider.power_60s_wkg },
                          { label: '2m', power: rider.power_120s, wkg: rider.power_120s_wkg },
                          { label: '5m', power: rider.power_300s, wkg: rider.power_300s_wkg },
                          { label: '20m', power: rider.power_1200s, wkg: rider.power_1200s_wkg }
                        ].map(interval => (
                          <div key={interval.label} className="bg-white/10 border border-white/20 rounded-lg p-2 text-center">
                            <div className="text-xs text-yellow-400 font-bold mb-1">{interval.label}</div>
                            <div className="text-sm font-black text-white">
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
