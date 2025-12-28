import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CATEGORY_COLORS, getVeloTier } from '../constants/racing'

interface LineupRider {
  rider_id: number
  lineup_position: number
  name: string
  full_name: string
  category: string
  velo_live: number
  velo_30day: number | null
  avatar_url?: string
  phenotype: string | null
  is_valid: boolean
  validation_warning?: string
}

interface LineupRiderCardProps {
  rider: LineupRider
  onRemove: () => void
}

export default function LineupRiderCard({ rider, onRemove }: LineupRiderCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rider.rider_id
  })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }
  
  const velo30day = rider.velo_30day || rider.velo_live
  const veloTier = getVeloTier(velo30day)
  const category = rider.category || 'D'
  const categoryColor = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'bg-gray-500 text-white border-gray-400'
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative bg-gradient-to-br p-3 rounded-lg border-2 transition-all shadow-md cursor-move touch-manipulation ${
        rider.is_valid 
          ? 'from-blue-900/80 to-indigo-950/80 border-orange-500/40 hover:border-orange-400'
          : 'from-red-900/40 to-gray-900 border-red-500 hover:border-red-400'
      } ${isDragging ? 'scale-105 ring-4 ring-indigo-400/50 shadow-2xl z-50' : 'active:scale-95'}`}>
      <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md border-2 border-gray-900">
        {rider.lineup_position}
      </div>
      
      <div className="relative flex items-center gap-2 sm:gap-2.5">
        <img 
          src={rider.avatar_url || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=36`}
          alt={rider.name}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-gray-600 shadow-sm flex-shrink-0"
          onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=3b82f6&color=fff&size=36`; }}
        />
        
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-xs sm:text-sm truncate">
            {rider.name || rider.full_name}
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 flex-wrap">
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] sm:text-xs font-bold rounded border ${categoryColor}`}>
            {category}
          </span>
          
          <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-gradient-to-br ${veloTier?.color || 'from-gray-400 to-gray-600'} shadow-sm`}>
            <div className="flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/30 backdrop-blur-sm border border-white/50">
              <span className="font-black text-[10px] sm:text-xs text-white">{veloTier?.rank || '?'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={`font-bold text-[10px] sm:text-xs leading-none ${veloTier?.textColor || 'text-white'}`}>{Math.floor(velo30day)}</span>
              {veloTier && veloTier.max && (
                <div className="hidden sm:block w-10 h-0.5 bg-black/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white/60 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((velo30day - veloTier.min) / (veloTier.max - veloTier.min)) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
          
          {rider.phenotype && (
            <span className="hidden sm:inline px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-semibold border border-purple-500/30">
              {rider.phenotype}
            </span>
          )}
          
          {rider.is_valid ? (
            <span className="text-green-400 text-base sm:text-lg" title="Valid">✓</span>
          ) : (
            <span className="text-red-400 text-base sm:text-lg" title={rider.validation_warning || 'Invalid'}>✗</span>
          )}
        </div>
        
        <button
          onClick={onRemove}
          className="flex-shrink-0 px-2 py-1.5 sm:py-1 bg-red-500/80 hover:bg-red-600 text-white rounded text-xs font-bold shadow-sm hover:shadow-md transition-all min-h-[40px] sm:min-h-0 flex items-center justify-center"
          title="Remove rider"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
