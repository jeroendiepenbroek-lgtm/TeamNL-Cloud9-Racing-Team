import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

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
  { rank: 1, name: 'Diamond', icon: '💎', min: 2200, max: null, color: 'from-cyan-400 to-blue-500', textColor: 'text-cyan-100' },
  { rank: 2, name: 'Ruby', icon: '💍', min: 1900, max: 2200, color: 'from-red-500 to-pink-600', textColor: 'text-red-100' },
  { rank: 3, name: 'Emerald', icon: '💚', min: 1650, max: 1900, color: 'from-emerald-400 to-green-600', textColor: 'text-emerald-100' },
  { rank: 4, name: 'Sapphire', icon: '💙', min: 1450, max: 1650, color: 'from-blue-400 to-indigo-600', textColor: 'text-blue-100' },
  { rank: 5, name: 'Amethyst', icon: '💜', min: 1300, max: 1450, color: 'from-purple-400 to-violet-600', textColor: 'text-purple-100' },
  { rank: 6, name: 'Platinum', icon: '⚪', min: 1150, max: 1300, color: 'from-slate-300 to-slate-500', textColor: 'text-slate-100' },
  { rank: 7, name: 'Gold', icon: '🟡', min: 1000, max: 1150, color: 'from-yellow-400 to-amber-600', textColor: 'text-yellow-900' },
  { rank: 8, name: 'Silver', icon: '⚫', min: 850, max: 1000, color: 'from-gray-300 to-gray-500', textColor: 'text-gray-700' },
  { rank: 9, name: 'Bronze', icon: '🟠', min: 650, max: 850, color: 'from-orange-400 to-orange-700', textColor: 'text-orange-900' },
  { rank: 10, name: 'Copper', icon: '🟤', min: 0, max: 650, color: 'from-orange-600 to-red-800', textColor: 'text-orange-100' },
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
  current_riders: number
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
  // Power intervals for spider chart
  power_5s?: number | null
  power_15s?: number | null
  power_30s?: number | null
  power_60s?: number | null
  power_120s?: number | null
  power_300s?: number | null
  power_1200s?: number | null
  weight_kg: number | null
  lineup_position: number
}

interface TeamViewerProps {
  hideHeader?: boolean
}

export default function TeamViewer({ hideHeader = false }: TeamViewerProps) {
  const [viewMode, setViewMode] = useState<'matrix' | 'passports'>('matrix')
  const [passportSize, setPassportSize] = useState<'compact' | 'full'>('full')
  
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
  
  const teams: Team[] = teamsData || []
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      {/* Header */}
      {!hideHeader && (
      <div className="relative overflow-hidden mb-4 sm:mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-green-900 to-red-900 opacity-95"></div>
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
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur-lg rounded-lg p-1 border border-white/20">
                  <button
                    onClick={() => setViewMode('matrix')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      viewMode === 'matrix'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    📊 Matrix
                  </button>
                  <button
                    onClick={() => setViewMode('passports')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      viewMode === 'passports'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    🎴 Passports
                  </button>
                </div>
                
                {/* Passport Size Dropdown - alleen zichtbaar in passport mode */}
                {viewMode === 'passports' && (
                  <div className="relative z-[9999]">
                    <select
                      value={passportSize}
                      onChange={(e) => setPassportSize(e.target.value as 'compact' | 'full')}
                      className="bg-white/10 backdrop-blur-lg text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/20 hover:border-orange-500 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="compact">📦 Compact</option>
                      <option value="full">🖼️ Full Size</option>
                    </select>
                  </div>
                )}
                
                <button
                  onClick={() => window.location.pathname = '/team-builder'}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 backdrop-blur-lg rounded-lg border border-orange-400/30 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden sm:inline">Team Builder</span>
                  <span className="sm:hidden">⚙️</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>      )}      
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
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
          <div className="space-y-6">
            {teams.map(team => (
              <TeamCard key={team.team_id} team={team} viewMode={viewMode} passportSize={passportSize} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Team Card with Riders - Collapsible
function TeamCard({ team, viewMode, passportSize }: { team: Team; viewMode: 'matrix' | 'passports'; passportSize: 'compact' | 'full' }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
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
    <div className="bg-gradient-to-br from-blue-900/80 to-indigo-950/80 backdrop-blur rounded-xl border border-orange-500/30 shadow-xl overflow-hidden">
      {/* Team Header - Clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
      >
        <div className="text-left flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white">{team.team_name}</h2>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusColor}`}>
              {team.current_riders} riders
            </span>
          </div>
          <p className="text-gray-400 text-sm">{team.competition_name}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              {team.competition_type === 'velo' ? '🎯 vELO-based' : '📊 Category-based'}
            </span>
          </div>
        </div>
        
        {/* Expand/Collapse Icon */}
        <div className="text-white text-2xl flex-shrink-0 ml-4">
          {isExpanded ? '▼' : '▶'}
        </div>
      </button>
      
      {/* Riders Table - Collapsible */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-700">
          {isLoading ? (
            <div className="text-center text-gray-400 py-8">Riders laden...</div>
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
      )}
    </div>
  )
}

// Riders Passports - Full Size Cards zoals in Passport Gallery met flip & spider chart
function RidersPassportsFull({ lineup }: { lineup: LineupRider[] }) {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())
  const [tierMaxValues, setTierMaxValues] = useState<{[tier: number]: any}>({})

  const getCategoryColor = (cat: string) => {
    const colors: {[key: string]: string} = {
      'A+': '#FF0000', 'A': '#FF0000', 'B': '#4CAF50',
      'C': '#0000FF', 'D': '#FF1493', 'E': '#808080'
    }
    return colors[cat] || '#666'
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
      const tierData = getVeloTier(rider.current_velo_rank || rider.velo_live || 0)
      if (!tierData) return
      const tier = tierData.rank
      
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

      const tierData = getVeloTier(rider.current_velo_rank || rider.velo_live || 0)
      if (!tierData) return
      const tier = tierData.rank
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
                  className="absolute inset-0 rounded-xl bg-gradient-to-br from-gray-900 to-blue-900 border-4 border-yellow-400 shadow-xl p-2"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                {/* Header with tier badge and category */}
                <div
                  className="h-16 rounded-t-lg relative mb-12"
                  style={{
                    background: veloLiveTier 
                      ? `linear-gradient(135deg, ${veloLiveTier.color} 0%, ${veloLiveTier.color} 100%)` 
                      : '#666',
                    clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)'
                  }}
                >
                  <div
                    className="absolute top-2 left-3 w-10 h-10 rounded-full flex items-center justify-center border-3"
                    style={{
                      background: veloLiveTier?.color || '#666',
                      borderColor: '#fff',
                      borderWidth: '3px',
                      borderStyle: 'solid'
                    }}
                    title={veloLiveTier?.name}
                  >
                    <span className="text-2xl font-black text-white drop-shadow-lg">{veloLiveTier?.rank || '?'}</span>
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
                  className="absolute top-14 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-3 border-yellow-400 object-cover bg-gray-700 shadow-xl"
                  style={{ position: 'relative', marginTop: '-3rem', marginBottom: '1rem', marginLeft: 'auto', marginRight: 'auto', display: 'block', transform: 'none', left: 0 }}
                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/100?text=No+Avatar' }}
                />

                {/* Name */}
                <div className="text-center mb-2">
                  <h2 className="text-sm font-black text-white uppercase drop-shadow-lg leading-tight px-1">
                    {rider.name || rider.full_name || 'Unknown'}
                  </h2>
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

                {/* Racing FTP W/kg Label */}
                {rider.ftp_wkg && (
                  <div className="mx-2 mb-2 bg-green-500/20 rounded-lg p-2 border border-green-500/30 text-center">
                    <div className="text-xs text-green-400 font-bold uppercase">Racing FTP W/kg</div>
                    <div className="text-base font-bold text-white">{rider.ftp_wkg}</div>
                  </div>
                )}

                {/* Flip Hint */}
                <div className="absolute bottom-2 left-0 right-0 text-center">
                  <span className="text-xs text-yellow-400 font-bold">🔄 Klik voor intervals</span>
                </div>
              </div>

              {/* ACHTERKANT - Spider Chart */}
              <div
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-gray-900 to-indigo-950 border-4 border-yellow-400 shadow-xl p-4 flex items-center justify-center"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                <div className="text-center">
                  <h3 className="text-white font-bold text-lg mb-2">Power Intervals</h3>
                  <canvas
                    id={`spider-${rider.rider_id}`}
                    width="240"
                    height="240"
                    className="mx-auto"
                  />
                  <div className="mt-2 text-yellow-400 text-xs font-bold">
                    🔄 Klik om terug te keren
                  </div>
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
          const veloLiveTier = getVeloTier(rider.current_velo_rank || rider.velo_live || null)
          const category = rider.category || 'D'
          const categoryColor = getCategoryColor(category)
          const wkg = rider.racing_ftp && rider.weight_kg ? (rider.racing_ftp / rider.weight_kg).toFixed(1) : '-'

          return (
            <div
              key={rider.rider_id}
              className="flex-shrink-0 w-[220px] bg-gradient-to-br from-gray-900 to-blue-900 border-2 border-yellow-400 rounded-lg shadow-lg overflow-hidden"
            >
              {/* Header with tier and category */}
              <div
                className="h-12 relative"
                style={{
                  background: veloLiveTier 
                    ? `linear-gradient(135deg, ${veloLiveTier.color} 0%, ${veloLiveTier.color} 100%)` 
                    : '#666',
                  clipPath: 'polygon(0 0, 100% 0, 100% 70%, 0 100%)'
                }}
              >
                <div className="flex items-center justify-between px-2 py-1">
                  {veloLiveTier && (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white"
                      style={{ background: veloLiveTier.color }}
                    >
                      <span className="text-sm font-black text-white">{veloLiveTier.rank}</span>
                    </div>
                  )}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white"
                    style={{ background: categoryColor }}
                  >
                    <span className="text-sm font-black text-white">{category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-white">ZRS</div>
                    <div className="text-sm font-black text-white">{rider.zwift_official_racing_score || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Avatar */}
              <div className="flex justify-center -mt-6 mb-2">
                <img
                  src={rider.avatar_url || 'https://via.placeholder.com/60?text=No+Avatar'}
                  alt={rider.name}
                  className="w-16 h-16 rounded-full border-2 border-yellow-400 object-cover bg-gray-700 shadow-lg"
                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/60?text=No+Avatar' }}
                />
              </div>

              {/* Name */}
              <div className="text-center px-2 mb-2">
                <h3 className="text-xs font-bold text-white leading-tight truncate">
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
                <div className="bg-white/10 rounded p-1 text-center">
                  <div className="text-[9px] text-yellow-400 font-bold">vELO</div>
                  <div className="text-xs font-black text-white">{Math.floor(rider.velo_live || 0)}</div>
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
            <span className={`font-bold text-sm leading-none ${veloLiveTier?.textColor || 'text-white'}`}>{veloLive?.toFixed(0) || 'N/A'}</span>
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
            <span className={`font-bold text-sm leading-none ${velo30dayTier?.textColor || 'text-white'}`}>{velo30day?.toFixed(0) || 'N/A'}</span>
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
