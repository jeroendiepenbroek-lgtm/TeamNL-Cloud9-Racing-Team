import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8080'

interface Team {
  team_id: number
  team_name: string
  competition_type: 'velo' | 'category'
  competition_name: string
  velo_min_rank?: number
  velo_max_rank?: number
  velo_max_spread?: number
  allowed_categories?: string[]
  min_riders: number
  max_riders: number
  current_riders: number
  valid_riders: number
  invalid_riders: number
  team_status: 'incomplete' | 'ready' | 'warning' | 'overfilled'
}

interface TeamLineup {
  rider_id: number
  name: string
  avatar_url?: string
  category: string
  current_velo_rank?: number
}

interface TeamCardProps {
  team: Team
  onDrop: (teamId: number) => void
  onOpenDetail: (teamId: number) => void
  onDelete?: () => void
  onSelectForFiltering?: (teamId: number) => void
  isSelectedForFiltering?: boolean
  isDragging: boolean
}

const STATUS_COLORS = {
  incomplete: 'border-yellow-500 bg-yellow-500/10',
  ready: 'border-green-500 bg-green-500/10',
  warning: 'border-orange-500 bg-orange-500/10',
  overfilled: 'border-red-500 bg-red-500/10',
}

const STATUS_ICONS = {
  incomplete: '⏳',
  ready: '✅',
  warning: '⚠️',
  overfilled: '🚫',
}

export default function TeamCard({ team, onDrop, onOpenDetail, onDelete, onSelectForFiltering, isSelectedForFiltering, isDragging }: TeamCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  // Fetch team lineup
  const { data: lineupData } = useQuery({
    queryKey: ['team', team.team_id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/teams/${team.team_id}`)
      if (!res.ok) throw new Error('Failed to fetch team')
      return res.json()
    }
  })

  const lineup: TeamLineup[] = lineupData?.lineup || []

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDrop(team.team_id)
  }

  const canAddMore = team.current_riders < team.max_riders

  return (
    <div
      className={`
        relative bg-slate-800/50 backdrop-blur-sm rounded-xl border-2 
        transition-all duration-300 overflow-hidden
        ${isDragOver && canAddMore ? 'border-green-400 shadow-lg shadow-green-500/50 scale-105' : STATUS_COLORS[team.team_status]}
        ${isDragOver && !canAddMore ? 'border-red-400 shadow-lg shadow-red-500/50' : ''}
        ${isDragging && canAddMore ? 'hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/30' : ''}
        ${isSelectedForFiltering ? 'ring-4 ring-orange-500 border-orange-500' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div 
        className="p-4 border-b border-slate-700/50 bg-slate-900/50 cursor-pointer hover:bg-slate-900/70 transition-colors"
        onClick={() => onSelectForFiltering?.(team.team_id)}
        title="Klik om riders te filteren voor dit team"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white truncate">
                {team.team_name}
              </h3>
              {isSelectedForFiltering && (
                <span className="text-xs font-bold px-2 py-0.5 bg-orange-500 text-white rounded-full animate-pulse">
                  FILTERING
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">{team.competition_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 hover:border-red-500 text-red-400 hover:text-red-300 transition-all"
                title="Team verwijderen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <span className="text-2xl">{STATUS_ICONS[team.team_status]}</span>
          </div>
        </div>

        {/* Team Constraints */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {team.competition_type === 'velo' && (
            <>
              <span className="px-2 py-1 bg-blue-600/30 text-blue-300 rounded">
                vELO: {team.velo_min_rank}-{team.velo_max_rank}
              </span>
              <span className="px-2 py-1 bg-purple-600/30 text-purple-300 rounded">
                Spread: max {team.velo_max_spread}
              </span>
            </>
          )}
          {team.competition_type === 'category' && team.allowed_categories && (
            <span className="px-2 py-1 bg-orange-600/30 text-orange-300 rounded">
              Cat: {team.allowed_categories.join(', ')}
            </span>
          )}
          <span className={`px-2 py-1 rounded ${
            team.current_riders >= team.min_riders 
              ? 'bg-green-600/30 text-green-300' 
              : 'bg-yellow-600/30 text-yellow-300'
          }`}>
            {team.current_riders}/{team.max_riders} riders
          </span>
        </div>
      </div>

      {/* Passport Grid */}
      <div className="p-4">
        {lineup.length === 0 ? (
          <div className="h-48 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-lg">
            <div className="text-center">
              <p className="text-slate-400 text-sm">Sleep riders hierheen</p>
              <p className="text-slate-500 text-xs mt-1">Minimaal {team.min_riders} riders</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {lineup.slice(0, 12).map((rider) => (
              <div
                key={rider.rider_id}
                className="aspect-[3/4] relative group"
              >
                {/* Mini Passport Card */}
                <div className="absolute inset-0 rounded-lg overflow-hidden border border-slate-600 bg-slate-900/80">
                  {/* Avatar */}
                  <div className="h-2/5 bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center">
                    {rider.avatar_url ? (
                      <img 
                        src={rider.avatar_url} 
                        alt={rider.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">👤</span>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="h-3/5 p-1.5 flex flex-col justify-between">
                    <p className="text-[10px] font-bold text-white leading-tight truncate">
                      {rider.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span 
                        className="text-[9px] px-1.5 py-0.5 text-white rounded font-bold"
                        style={{ 
                          backgroundColor: rider.category === 'A+' || rider.category === 'A' ? '#FF0000' 
                            : rider.category === 'B' ? '#4CAF50' 
                            : rider.category === 'C' ? '#0000FF' 
                            : rider.category === 'D' ? '#FF1493' 
                            : rider.category === 'E' ? '#808080' 
                            : '#666666' 
                        }}
                      >
                        {rider.category || 'N/A'}
                      </span>
                      {rider.current_velo_rank && (
                        <span className="text-[9px] text-cyan-400 font-bold">
                          {Math.floor(rider.current_velo_rank)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add more placeholder spots if needed */}
            {Array.from({ length: Math.min(team.max_riders - lineup.length, 12 - lineup.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-[3/4] border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center"
              >
                <span className="text-slate-600 text-xl">+</span>
              </div>
            ))}
          </div>
        )}

        {lineup.length > 12 && (
          <div className="mt-2 text-center text-xs text-slate-400">
            +{lineup.length - 12} meer riders
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-700/50 bg-slate-900/30">
        <button
          onClick={() => onOpenDetail(team.team_id)}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          📋 Open Team LINE-UP
        </button>
      </div>

      {/* Drag Over Indicator */}
      {isDragOver && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${
          canAddMore 
            ? 'bg-green-500/20 backdrop-blur-sm' 
            : 'bg-red-500/20 backdrop-blur-sm'
        }`}>
          <div className="text-center">
            <p className={`text-2xl font-bold ${canAddMore ? 'text-green-300' : 'text-red-300'}`}>
              {canAddMore ? '✓ Drop hier' : '✗ Team vol'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
