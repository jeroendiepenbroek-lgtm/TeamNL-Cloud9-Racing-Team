/**
 * Racing Matrix Dashboard
 * Complete view met alle rider data van 3-API sourcing
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Zap, TrendingUp, Users, Target, Award, Calendar, Wind } from 'lucide-react'

interface RiderData {
  rider_id: number
  name: string
  // ZwiftRacing API fields
  velo_rating: number | null
  zp_category: string | null
  phenotype_sprinter: number | null
  phenotype_climber: number | null
  phenotype_pursuiter: number | null
  phenotype_puncheur: number | null
  phenotype_type: string | null
  power_rating: number | null
  race_wins: number
  race_finishes: number
  race_count: number
  race_last_rating: number | null
  last_race_date: string | null
  last_race_velo: number | null
  // Zwift Official API fields
  weight: number | null
  height: number | null
  zp_ftp: number | null
  current_activity: string | null
  // Metadata
  last_synced_zwift_racing: string | null
  last_synced_zwift_official: string | null
  is_team_member: boolean
}

const API_BASE = ''

export default function RacingMatrix() {
  const [sortBy, setSortBy] = useState<'velo' | 'wins' | 'power'>('velo')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Fetch team riders
  const { data: riders = [], isLoading } = useQuery<RiderData[]>({
    queryKey: ['racingMatrix'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders/team`)
      if (!res.ok) throw new Error('Failed to fetch riders')
      return res.json()
    },
    refetchInterval: 60000, // Refresh elke minuut
  })

  // Filter and sort
  const filteredRiders = riders
    .filter(r => filterCategory === 'all' || r.zp_category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'velo') return (b.velo_rating || 0) - (a.velo_rating || 0)
      if (sortBy === 'wins') return b.race_wins - a.race_wins
      if (sortBy === 'power') {
        const aWkg = a.zp_ftp && a.weight ? a.zp_ftp / a.weight : 0
        const bWkg = b.zp_ftp && b.weight ? b.zp_ftp / b.weight : 0
        return bWkg - aWkg
      }
      return 0
    })

  const categories = ['all', ...Array.from(new Set(riders.map(r => r.zp_category).filter(Boolean)))]

  const formatDate = (date: string | null) => {
    if (!date) return '--'
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Vandaag'
    if (diffDays === 1) return 'Gisteren'
    if (diffDays < 7) return `${diffDays}d geleden`
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  }

  const getPhenotypeColor = (score: number) => {
    if (score >= 75) return 'text-green-400'
    if (score >= 50) return 'text-blue-400'
    if (score >= 25) return 'text-yellow-400'
    return 'text-gray-400'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 sm:p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Racing Matrix</h1>
              <p className="text-sm text-gray-400">Complete team performance overview</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="velo">Sort: vELO Rating</option>
              <option value="wins">Sort: Wins</option>
              <option value="power">Sort: W/kg</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : `Cat ${cat}`}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSortBy('velo')
                setFilterCategory('all')
              }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-300 text-sm transition flex items-center gap-2"
            >
              <span>✕</span> Clear
            </button>
          </div>
        </div>

        {/* Team Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Team Size</span>
            </div>
            <div className="text-3xl font-bold text-white">{riders.length}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-400">Total Wins</span>
            </div>
            <div className="text-3xl font-bold text-yellow-400">
              {riders.reduce((sum, r) => sum + r.race_wins, 0)}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-400">Avg vELO</span>
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {Math.round(riders.filter(r => r.velo_rating).reduce((sum, r) => sum + (r.velo_rating || 0), 0) / riders.filter(r => r.velo_rating).length) || '--'}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-gray-400">Elite Riders</span>
            </div>
            <div className="text-3xl font-bold text-orange-400">
              {riders.filter(r => r.velo_rating && r.velo_rating >= 2000).length}
            </div>
          </div>
        </div>

        {/* Riders Table */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <span className="ml-4 text-gray-400">Loading racing matrix...</span>
            </div>
          ) : filteredRiders.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">Geen riders gevonden</h3>
              <p className="text-gray-500">Voeg team members toe via Team Management</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">#</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Rider</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-300">Cat</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-300">
                      <div className="flex items-center justify-center gap-1">
                        <Target className="w-4 h-4" />
                        vELO
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-300">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-4 h-4" />
                        W/kg
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-300">
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="w-4 h-4" />
                        Wins
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-300">Races</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-300">Phenotype</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-300">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Last Race
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-300">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        Power
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRiders.map((rider, index) => {
                    const wkg = rider.zp_ftp && rider.weight
                      ? (rider.zp_ftp / rider.weight).toFixed(1)
                      : '--'

                    const phenotypes = [
                      { name: 'Sprint', score: rider.phenotype_sprinter, icon: '🚀' },
                      { name: 'Climb', score: rider.phenotype_climber, icon: '⛰️' },
                      { name: 'Pursuit', score: rider.phenotype_pursuiter, icon: '🎯' },
                      { name: 'Punch', score: rider.phenotype_puncheur, icon: '💥' },
                    ].filter(p => p.score !== null)

                    const topPhenotype = phenotypes.sort((a, b) => (b.score || 0) - (a.score || 0))[0]

                    return (
                      <tr
                        key={rider.rider_id}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="px-4 py-4 text-gray-400 font-mono text-sm">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                              {rider.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white">{rider.name}</div>
                              <div className="text-xs text-gray-500">ID: {rider.rider_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {rider.zp_category ? (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold">
                              {rider.zp_category}
                            </span>
                          ) : (
                            <span className="text-gray-600">--</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {rider.velo_rating ? (
                            <div className="flex flex-col items-center">
                              <span className="text-lg font-bold text-purple-400">
                                {rider.velo_rating}
                              </span>
                              {rider.last_race_velo && rider.last_race_velo !== rider.velo_rating && (
                                <span className="text-xs text-gray-500">
                                  (was {rider.last_race_velo})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600">--</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-semibold text-orange-400">{wkg}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-bold text-yellow-400">{rider.race_wins}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm text-gray-400">{rider.race_count || rider.race_finishes || 0}</span>
                        </td>
                        <td className="px-4 py-4">
                          {topPhenotype ? (
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1">
                                <span>{topPhenotype.icon}</span>
                                <span className={`text-xs font-bold ${getPhenotypeColor(topPhenotype.score || 0)}`}>
                                  {Math.round(topPhenotype.score || 0)}
                                </span>
                              </div>
                              {rider.phenotype_type && (
                                <span className="text-xs text-gray-500">{rider.phenotype_type}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600 text-xs">--</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-xs text-gray-400">
                            {formatDate(rider.last_race_date)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {rider.power_rating ? (
                            <span className="text-sm font-semibold text-green-400">
                              {Math.round(rider.power_rating)}
                            </span>
                          ) : (
                            <span className="text-gray-600">--</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Data Sources Footer */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live data van ZwiftRacing API + Zwift Official API</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4" />
            <span>Auto-sync elk uur</span>
          </div>
        </div>
      </div>
    </div>
  )
}
