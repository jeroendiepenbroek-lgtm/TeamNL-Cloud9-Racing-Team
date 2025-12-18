import { useState, useEffect, useRef } from 'react'
import { useFavorites } from '../hooks/useFavorites'

interface RiderCardProps {
  rider: {
    rider_id: number
    racing_name: string
    full_name: string
    zwift_official_category?: string | null
    zwiftracing_category?: string | null
    country_alpha3: string
    velo_live: number
    velo_30day: number
    racing_ftp?: number | null
    ftp_watts?: number | null
    weight_kg: number | null
    height_cm: number
    age?: number
    zwift_official_racing_score: number | null
    avatar_url: string
    phenotype?: string | null
    power_5s?: number
    power_15s?: number
    power_30s?: number
    power_60s?: number
    power_120s?: number
    power_300s?: number
    power_1200s?: number
    power_5s_wkg?: number
    power_15s_wkg?: number
    power_30s_wkg?: number
    power_60s_wkg?: number
    power_120s_wkg?: number
    power_300s_wkg?: number
    power_1200s_wkg?: number
  }
  showFavorite?: boolean
  tierMaxValues?: {[tier: number]: {[key: string]: number}}
}

export default function RiderPassportCard({ rider, showFavorite = false, tierMaxValues = {} }: RiderCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const { toggleFavorite, isFavorite } = useFavorites()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const category = rider.zwift_official_category || rider.zwiftracing_category || 'D'
  const veloLive = Math.floor(rider.velo_live || 0)
  const velo30day = Math.floor(rider.velo_30day || 0)
  const ftp = rider.racing_ftp || rider.ftp_watts || 0
  const heightCm = rider.height_cm ? Math.round(rider.height_cm / 10) : '-'
  const wkg = ftp && rider.weight_kg ? (ftp / rider.weight_kg).toFixed(1) : '-'

  const getVeloTier = (veloValue: number) => {
    if (!veloValue) return { tier: 10, name: 'Copper', color: '#B87333', border: '#8B5A1F', emoji: '🟤' }
    if (veloValue >= 2200) return { tier: 1, name: 'Diamond', color: '#00D4FF', border: '#0099CC', emoji: '💎' }
    if (veloValue >= 1900) return { tier: 2, name: 'Ruby', color: '#E61E50', border: '#B30F3A', emoji: '♦️' }
    if (veloValue >= 1650) return { tier: 3, name: 'Emerald', color: '#50C878', border: '#2E9356', emoji: '💚' }
    if (veloValue >= 1450) return { tier: 4, name: 'Sapphire', color: '#0F52BA', border: '#0A3680', emoji: '💙' }
    if (veloValue >= 1300) return { tier: 5, name: 'Amethyst', color: '#9966CC', border: '#6B4A99', emoji: '💜' }
    if (veloValue >= 1150) return { tier: 6, name: 'Platinum', color: '#E5E4E2', border: '#B8B7B5', emoji: '⚪' }
    if (veloValue >= 1000) return { tier: 7, name: 'Gold', color: '#FFD700', border: '#CCA700', emoji: '🥇' }
    if (veloValue >= 850) return { tier: 8, name: 'Silver', color: '#C0C0C0', border: '#8C8C8C', emoji: '⚪' }
    if (veloValue >= 650) return { tier: 9, name: 'Bronze', color: '#CD7F32', border: '#995F26', emoji: '🥉' }
    return { tier: 10, name: 'Copper', color: '#B87333', border: '#8B5A1F', emoji: '🟤' }
  }

  const getCategoryColor = (cat: string) => {
    const colors: { [key: string]: string } = {
      'A+': '#FF0000', 'A': '#FF0000', 'B': '#4CAF50',
      'C': '#0000FF', 'D': '#FF1493', 'E': '#808080'
    }
    return colors[cat] || '#666'
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

  const veloTier = getVeloTier(veloLive)
  const categoryColor = getCategoryColor(category)
  const flagUrl = getFlagUrl(rider.country_alpha3)

  // Draw spider chart on flip
  useEffect(() => {
    if (isFlipped && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const tier = veloTier.tier
      const maxValues = tierMaxValues[tier] || {
        power_5s: 1500, power_15s: 1400, power_30s: 1300, power_60s: 1200,
        power_120s: 1100, power_300s: 1000, power_1200s: 900
      }

      const dataPoints = [
        { label: '5s', value: rider.power_5s || 0, max: maxValues.power_5s },
        { label: '15s', value: rider.power_15s || 0, max: maxValues.power_15s },
        { label: '30s', value: rider.power_30s || 0, max: maxValues.power_30s },
        { label: '1m', value: rider.power_60s || 0, max: maxValues.power_60s },
        { label: '2m', value: rider.power_120s || 0, max: maxValues.power_120s },
        { label: '5m', value: rider.power_300s || 0, max: maxValues.power_300s },
        { label: '20m', value: rider.power_1200s || 0, max: maxValues.power_1200s },
      ]

      setTimeout(() => {
        if (!ctx || !canvas) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const radius = Math.min(centerX, centerY) - 30

        // Draw web
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)'
        ctx.lineWidth = 1
        for (let i = 1; i <= 5; i++) {
          ctx.beginPath()
          ctx.arc(centerX, centerY, (radius / 5) * i, 0, Math.PI * 2)
          ctx.stroke()
        }

        // Draw axes
        dataPoints.forEach((_, i) => {
          const angle = (Math.PI * 2 / dataPoints.length) * i - Math.PI / 2
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(x, y)
          ctx.stroke()
        })

        // Draw data
        setTimeout(() => {
          if (!ctx) return
          ctx.fillStyle = 'rgba(255, 107, 53, 0.3)'
          ctx.strokeStyle = '#FF6B35'
          ctx.lineWidth = 2
          ctx.beginPath()
          dataPoints.forEach((point, i) => {
            const normalizedValue = Math.min(point.value / point.max, 1)
            const angle = (Math.PI * 2 / dataPoints.length) * i - Math.PI / 2
            const x = centerX + Math.cos(angle) * radius * normalizedValue
            const y = centerY + Math.sin(angle) * radius * normalizedValue
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          })
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Draw labels
          setTimeout(() => {
            if (!ctx) return
            ctx.fillStyle = '#333'
            ctx.font = 'bold 11px sans-serif'
            ctx.textAlign = 'center'
            dataPoints.forEach((point, i) => {
              const angle = (Math.PI * 2 / dataPoints.length) * i - Math.PI / 2
              const x = centerX + Math.cos(angle) * (radius + 18)
              const y = centerY + Math.sin(angle) * (radius + 18)
              ctx.fillText(point.label, x, y + 4)
            })
          }, 50)
        }, 150)
      }, 50)
    }
  }, [isFlipped, rider, veloTier.tier, tierMaxValues])

  return (
    <div
      className="perspective-1000 cursor-pointer snap-center flex-shrink-0"
      onClick={() => setIsFlipped(!isFlipped)}
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

          {/* Favorite Star */}
          {showFavorite && (
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
          )}

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
              <div className="text-lg font-black text-white">{ftp || '-'}<span className="text-sm text-white/70">W</span></div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
              <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">Wgt</div>
              <div className="text-lg font-black text-white">{rider.weight_kg || '-'}<span className="text-sm text-white/70">kg</span></div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
              <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">W/kg</div>
              <div className="text-lg font-black text-white">{wkg}</div>
            </div>
          </div>

          {/* vELO Scores */}
          <div className="grid grid-cols-2 gap-2 mb-3 px-2">
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-md rounded-lg p-2 text-center border border-purple-500/30">
              <div className="text-xs text-purple-300 font-bold uppercase leading-tight">vELO Live</div>
              <div className="text-xl font-black text-white">{veloLive}</div>
              <div className="text-[9px] text-purple-200 font-semibold uppercase">{veloTier.name}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-md rounded-lg p-2 text-center border border-blue-500/30">
              <div className="text-xs text-blue-300 font-bold uppercase leading-tight">vELO 30d</div>
              <div className="text-xl font-black text-white">{velo30day}</div>
              <div className="text-[9px] text-blue-200 font-semibold uppercase">{getVeloTier(velo30day).name}</div>
            </div>
          </div>

          {/* Physical Stats */}
          <div className="grid grid-cols-2 gap-2 px-2">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
              <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">Height</div>
              <div className="text-lg font-black text-white">{heightCm}<span className="text-sm text-white/70">cm</span></div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 text-center border border-white/20">
              <div className="text-xs text-yellow-400 font-bold uppercase leading-tight">Age</div>
              <div className="text-lg font-black text-white">{rider.age || '-'}</div>
            </div>
          </div>

          {/* Phenotype Badge */}
          {rider.phenotype && (
            <div className="mt-3 px-2">
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-md rounded-lg p-2 text-center border border-orange-400/30">
                <div className="text-xs text-orange-300 font-bold uppercase">Phenotype</div>
                <div className="text-sm font-black text-white">{rider.phenotype}</div>
              </div>
            </div>
          )}

          {/* Flip Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/50 text-xs font-semibold">
            Click to flip →
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute w-full h-full backface-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-orange-500 shadow-xl p-4"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <h3 className="text-center text-white font-bold text-lg mb-4">Power Profile</h3>
          <canvas ref={canvasRef} width={260} height={300} className="mx-auto" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/50 text-xs font-semibold">
            ← Click to flip back
          </div>
        </div>
      </div>
    </div>
  )
}
