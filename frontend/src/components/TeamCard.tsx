import { useDroppable } from '@dnd-kit/core'

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
  onDelete?: () => void
  onEdit?: () => void
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

export default function TeamCard({ 
  team, 
  onDelete,
  onEdit,
  onSelectForFiltering,
  isSelectedForFiltering = false,
  isDragging,
  isExpanded = false,
  onToggleExpand,
  refetchTeams: _refetchTeams
}: TeamCardProps) {
  const canAddMore = team.current_riders < team.max_riders

  // Use @dnd-kit droppable for touch support
  const { setNodeRef, isOver } = useDroppable({
    id: `team-${team.team_id}`,
    disabled: !canAddMore,
    data: { teamId: team.team_id, type: 'team-card' }
  })

  const showDropIndicator = isOver && isDragging

  return (
    <div
      ref={setNodeRef}
      data-team-id={team.team_id}
      className={`
        relative bg-slate-800/50 backdrop-blur-sm rounded-xl border-2 
        transition-all duration-300 overflow-hidden
        ${showDropIndicator && canAddMore ? 'border-green-400 shadow-lg shadow-green-500/50 scale-105' : STATUS_COLORS[team.team_status]}
        ${showDropIndicator && !canAddMore ? 'border-red-400 shadow-lg shadow-red-500/50' : ''}
        ${isDragging && canAddMore ? 'hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/30' : ''}
        ${isSelectedForFiltering ? 'ring-4 ring-orange-500 border-orange-500' : ''}
        ${isExpanded ? 'ring-4 ring-orange-400 border-orange-400' : ''}
      `}
    >
      {/* Compacte Header - Verbeterd voor touch */}
      <div 
        className="p-4 bg-slate-900/50 transition-all"
      >
        {/* Top Row: Expand arrow, naam, status icon, sidebar button, delete */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div 
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:bg-slate-900/80 -mx-2 px-2 py-1 rounded touch-manipulation"
            onClick={(e) => {
              e.stopPropagation()
              if (onToggleExpand) {
                onToggleExpand(team.team_id)
              }
              if (onSelectForFiltering) {
                onSelectForFiltering(team.team_id)
              }
            }}
            title={onToggleExpand ? "Tik om team lineup uit te vouwen" : "Tik om riders te filteren"}
          >
            {onToggleExpand && (
              <svg 
                className={`w-5 h-5 text-orange-400 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            <h3 className="text-base sm:text-lg font-bold text-white truncate flex-1">
              {team.team_name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xl">{STATUS_ICONS[team.team_status]}</span>
            {onEdit ? (
              <button
                onClick={(e) => { 
                  e.stopPropagation()
                  console.log('🔴 Edit button clicked!', team.team_id)
                  onEdit()
                }}
                className="p-1.5 rounded bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 hover:border-yellow-500 text-yellow-400 hover:text-yellow-300 transition-all hover:scale-110"
                title="Bewerk team"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            ) : null}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 hover:border-red-500 text-red-400 hover:text-red-300 transition-all"
                title="Team verwijderen"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Competitie naam + inline badges */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400 truncate flex-1">{team.competition_name}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isSelectedForFiltering && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-500 text-white rounded-full animate-pulse">
                FILTER
              </span>
            )}
            {team.competition_type === 'velo' ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-600/30 text-blue-300 rounded whitespace-nowrap">
                vELO {team.velo_min_rank}-{team.velo_max_rank}
              </span>
            ) : (
              team.allowed_categories && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-orange-600/30 text-orange-300 rounded whitespace-nowrap">
                  {team.allowed_categories.join(',')}
                </span>
              )
            )}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
              team.current_riders >= team.min_riders 
                ? 'bg-green-600/30 text-green-300' 
                : 'bg-yellow-600/30 text-yellow-300'
            }`}>
              {team.current_riders}/{team.max_riders}
            </span>
          </div>
        </div>
      </div>

      {/* Drag Over Indicator - Compacter */}
      {showDropIndicator && (
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl ${
          canAddMore 
            ? 'bg-green-500/30 backdrop-blur-sm' 
            : 'bg-red-500/30 backdrop-blur-sm'
        }`}>
          <div className="px-4 py-2 rounded-lg bg-slate-900/90 border-2 border-dashed ${
            canAddMore ? 'border-green-400' : 'border-red-400'
          }">
            <p className={`text-lg font-bold ${
              canAddMore ? 'text-green-300' : 'text-red-300'
            }`}>
              {canAddMore ? '✓ Drop' : '✗ Vol'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
