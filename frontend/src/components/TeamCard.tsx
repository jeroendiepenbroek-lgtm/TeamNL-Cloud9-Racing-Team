import { useState } from 'react'

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

interface TeamCardProps {
  team: Team
  onDrop: (teamId: number) => void
  onOpenDetail: (teamId: number) => void
  onDelete?: () => void
  onSelectForFiltering?: (teamId: number) => void
  isSelectedForFiltering?: boolean
  isDragging: boolean
  isExpanded?: boolean
  onToggleExpand?: (teamId: number) => void
  refetchTeams?: () => void
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

export default function TeamCard({ team, onDrop, onDelete, onSelectForFiltering, isSelectedForFiltering, isDragging, isExpanded = false, onToggleExpand }: TeamCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)

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
        ${isExpanded ? 'ring-4 ring-orange-400 border-orange-400' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div 
        className="p-4 border-b border-slate-700/50 bg-slate-900/50 cursor-pointer hover:bg-slate-900/70 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          // Altijd expand/collapse als de functie beschikbaar is
          if (onToggleExpand) {
            onToggleExpand(team.team_id)
          }
          // EN ook altijd filtering als de functie beschikbaar is
          if (onSelectForFiltering) {
            onSelectForFiltering(team.team_id)
          }
        }}
        title={onToggleExpand ? "Klik om uit/in te vouwen en riders te filteren" : "Klik om riders te filteren voor dit team"}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {onToggleExpand && (
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
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
