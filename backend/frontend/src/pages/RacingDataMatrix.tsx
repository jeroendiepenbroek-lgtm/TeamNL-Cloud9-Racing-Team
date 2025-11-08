import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

interface MatrixRider {
  rider_id: number
  name: string
  zp_category: string | null
  zp_ftp: number | null
  weight: number | null
  race_current_rating: number | null
  race_wins: number
  race_podiums: number | null
  race_finishes: number
  race_dnfs: number | null
  watts_per_kg: number | null
  // Power intervals - correcte veldnamen uit API
  power_w5: number | null      // 5s in watts
  power_w15: number | null     // 15s in watts
  power_w30: number | null     // 30s in watts
  power_w60: number | null     // 1min in watts
  power_w120: number | null    // 2min in watts
  power_w300: number | null    // 5min in watts
  power_w1200: number | null   // 20min in watts
  ranking: number | null       // Overall rank
}

const API_BASE = ''

// vELO Tiers met moderne kleuren
const VELO_TIERS = [
  { name: 'Diamond', min: 2200, color: 'from-cyan-400 to-blue-500', textColor: 'text-cyan-100', bgColor: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20' },
  { name: 'Ruby', min: 1900, max: 2199, color: 'from-red-500 to-pink-600', textColor: 'text-red-100', bgColor: 'bg-gradient-to-r from-red-500/20 to-pink-600/20' },
  { name: 'Emerald', min: 1650, max: 1899, color: 'from-emerald-400 to-green-600', textColor: 'text-emerald-100', bgColor: 'bg-gradient-to-r from-emerald-400/20 to-green-600/20' },
  { name: 'Sapphire', min: 1450, max: 1649, color: 'from-blue-400 to-indigo-600', textColor: 'text-blue-100', bgColor: 'bg-gradient-to-r from-blue-400/20 to-indigo-600/20' },
  { name: 'Amethyst', min: 1300, max: 1449, color: 'from-purple-400 to-violet-600', textColor: 'text-purple-100', bgColor: 'bg-gradient-to-r from-purple-400/20 to-violet-600/20' },
  { name: 'Platinum', min: 1150, max: 1299, color: 'from-slate-300 to-slate-500', textColor: 'text-slate-100', bgColor: 'bg-gradient-to-r from-slate-400/20 to-slate-500/20' },
  { name: 'Gold', min: 1000, max: 1149, color: 'from-yellow-400 to-amber-600', textColor: 'text-yellow-900', bgColor: 'bg-gradient-to-r from-yellow-400/20 to-amber-600/20' },
  { name: 'Silver', min: 850, max: 999, color: 'from-gray-300 to-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gradient-to-r from-gray-300/20 to-gray-500/20' },
  { name: 'Bronze', min: 650, max: 849, color: 'from-orange-400 to-orange-700', textColor: 'text-orange-900', bgColor: 'bg-gradient-to-r from-orange-400/20 to-orange-700/20' },
]

// ZP Categories met subtiele kleuren
const ZP_CATEGORIES = {
  'A+': { color: 'bg-red-100 text-red-900 border-red-300', label: 'A+' },
  'A': { color: 'bg-red-50 text-red-800 border-red-200', label: 'A' },
  'B': { color: 'bg-green-50 text-green-800 border-green-200', label: 'B' },
  'C': { color: 'bg-blue-50 text-blue-800 border-blue-200', label: 'C' },
  'D': { color: 'bg-yellow-50 text-yellow-800 border-yellow-200', label: 'D' },
}

// Result Power Colors - voor interval highlighting
const getPowerColor = (value: number | null, personalBest: number | null): string => {
  if (!value || !personalBest || personalBest === 0) return 'bg-gray-100 text-gray-600'
  
  const percentage = (value / personalBest) * 100
  
  if (percentage >= 100) return 'bg-yellow-300 text-yellow-900 font-bold' // Gold: Personal Best
  if (percentage >= 95) return 'bg-gray-300 text-gray-800 font-semibold' // Silver: Near Best
  if (percentage >= 90) return 'bg-orange-300 text-orange-900' // Bronze: Good Effort
  
  return 'bg-gray-100 text-gray-600' // Below 90%
}

// Bereken vELO tier op basis van rating
const getVeloTier = (rating: number | null) => {
  if (!rating) return null
  return VELO_TIERS.find(tier => 
    rating >= tier.min && (!tier.max || rating <= tier.max)
  )
}

export default function RacingDataMatrix() {
  const [showLegend, setShowLegend] = useState(false)
  const [sortBy, setSortBy] = useState<keyof MatrixRider>('race_current_rating')
  const [sortDesc, setSortDesc] = useState(true)

  const { data: riders, isLoading } = useQuery<MatrixRider[]>({
    queryKey: ['matrixRiders'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders/team`)
      if (!res.ok) throw new Error('Failed to fetch riders')
      return res.json()
    },
    refetchInterval: 60000,
  })

  // Sorteer riders
  const sortedRiders = riders ? [...riders].sort((a, b) => {
    const aVal = a[sortBy] ?? 0
    const bVal = b[sortBy] ?? 0
    return sortDesc ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1)
  }) : []

  // Bereken personal bests voor elke rider
  const getRiderPersonalBests = (rider: MatrixRider) => ({
    power_w5: rider.power_w5,
    power_w15: rider.power_w15,
    power_w30: rider.power_w30,
    power_w60: rider.power_w60,
    power_w120: rider.power_w120,
    power_w300: rider.power_w300,
    power_w1200: rider.power_w1200,
  })

  const handleSort = (column: keyof MatrixRider) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc)
    } else {
      setSortBy(column)
      setSortDesc(true)
    }
  }

  return (
    <div className="space-y-6 max-w-[98vw] mx-auto">
      {/* Header met legenda button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">📊</span>
            RACING DATA MATRIX
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Complete performance analytics met {sortedRiders.length} riders
          </p>
        </div>
        
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <span>{showLegend ? '📖' : '📚'}</span>
          <span>{showLegend ? 'Hide' : 'Show'} Legend</span>
        </button>
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
              <div className="space-y-2">
                {VELO_TIERS.map(tier => (
                  <div key={tier.name} className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded bg-gradient-to-r ${tier.color}`}></div>
                    <span className="text-sm font-medium">{tier.name}</span>
                    <span className="text-xs text-gray-600">
                      {tier.min}{tier.max ? `-${tier.max}` : '+'}
                    </span>
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
                    <span className="text-sm text-gray-700">Category {cat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interval Highlights Legend */}
            <div>
              <h3 className="font-bold text-indigo-900 mb-3 flex items-center">
                <span className="mr-2">⚡</span>
                Interval Highlights
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-6 bg-yellow-300 rounded"></div>
                  <div>
                    <div className="text-sm font-medium">Gold</div>
                    <div className="text-xs text-gray-600">100%+ Personal Best</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-6 bg-gray-300 rounded"></div>
                  <div>
                    <div className="text-sm font-medium">Silver</div>
                    <div className="text-xs text-gray-600">95-99% Near Best</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-12 h-6 bg-orange-300 rounded"></div>
                  <div>
                    <div className="text-sm font-medium">Bronze</div>
                    <div className="text-xs text-gray-600">90-94% Good Effort</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading racing data...</p>
          </div>
        ) : sortedRiders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">🚴</div>
            <p className="text-gray-600 text-lg">No riders in database yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('rider_id')}>
                    Rider ID
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('ranking')}>
                    RP
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('race_current_rating')}>
                    vELO Live {sortBy === 'race_current_rating' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider whitespace-nowrap">
                    vELO J0D
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('name')}>
                    Rider Name
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('zp_category')}>
                    Category
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('zp_ftp')}>
                    FTP
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('weight')}>
                    Weight
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('race_finishes')}>
                    Finishes
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('race_wins')}>
                    Wins
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('race_podiums')}>
                    Podiums
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('race_dnfs')}>
                    DNFs
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w5')}>
                    5s {sortBy === 'power_w5' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w15')}>
                    15s {sortBy === 'power_w15' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w30')}>
                    30s {sortBy === 'power_w30' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w60')}>
                    1m {sortBy === 'power_w60' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w120')}>
                    2m {sortBy === 'power_w120' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w300')}>
                    5m {sortBy === 'power_w300' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider bg-indigo-700 cursor-pointer hover:bg-indigo-600 whitespace-nowrap" onClick={() => handleSort('power_w1200')}>
                    20m {sortBy === 'power_w1200' && (sortDesc ? '↓' : '↑')}
                  </th>
                  <th className="px-4 py-4 text-right text-sm font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-600 whitespace-nowrap" onClick={() => handleSort('watts_per_kg')}>
                    W/kg
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedRiders.map((rider) => {
                  const veloTier = getVeloTier(rider.race_current_rating)
                  const personalBests = getRiderPersonalBests(rider)
                  const zpCategory = rider.zp_category as keyof typeof ZP_CATEGORIES | null
                  
                  return (
                    <tr 
                      key={rider.rider_id} 
                      className={`hover:bg-gray-50 transition-colors ${veloTier?.bgColor || ''}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700 font-mono text-sm">
                        {rider.rider_id}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-semibold">
                        {rider.ranking || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {veloTier ? (
                          <span className={`px-3 py-1.5 rounded-lg font-bold text-base bg-gradient-to-r ${veloTier.color} ${veloTier.textColor} shadow-md`}>
                            {Math.round(rider.race_current_rating || 0)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-sm">
                        {/* TODO: vELO J0D berekenen vanuit history */}
                        -
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                        {rider.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {zpCategory && ZP_CATEGORIES[zpCategory] ? (
                          <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-md border ${ZP_CATEGORIES[zpCategory].color}`}>
                            {ZP_CATEGORIES[zpCategory].label}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-gray-900 text-base">
                        {rider.zp_ftp || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700">
                        {rider.weight ? `${rider.weight.toFixed(1)}kg` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-gray-700 font-semibold">
                        {rider.race_finishes || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-green-700">
                        {rider.race_wins || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-blue-700">
                        {rider.race_podiums || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-red-700">
                        {rider.race_dnfs || 0}
                      </td>
                      
                      {/* Power Intervals met highlighting */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${getPowerColor(rider.power_w5, personalBests.power_w5)}`}>
                          {rider.power_w5 || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${getPowerColor(rider.power_w15, personalBests.power_w15)}`}>
                          {rider.power_w15 || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${getPowerColor(rider.power_w30, personalBests.power_w30)}`}>
                          {rider.power_w30 || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${getPowerColor(rider.power_w60, personalBests.power_w60)}`}>
                          {rider.power_w60 || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${getPowerColor(rider.power_w120, personalBests.power_w120)}`}>
                          {rider.power_w120 || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${getPowerColor(rider.power_w300, personalBests.power_w300)}`}>
                          {rider.power_w300 || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${getPowerColor(rider.power_w1200, personalBests.power_w1200)}`}>
                          {rider.power_w1200 || '-'}
                        </span>
                      </td>
                      
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-indigo-700 text-base">
                        {rider.watts_per_kg?.toFixed(2) || '-'}
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
