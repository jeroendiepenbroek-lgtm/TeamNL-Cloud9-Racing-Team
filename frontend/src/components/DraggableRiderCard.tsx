import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CATEGORY_COLORS, getVeloTier } from '../constants/racing'

interface Rider {
  rider_id: number
  name: string
  full_name: string
  velo_live: number
  velo_30day: number | null
  zwift_official_category: string | null
  zwiftracing_category: string | null
  avatar_url: string
  phenotype: string | null
  zwift_official_racing_score: number | null
}

interface DraggableRiderCardProps {
  rider: Rider
  onAdd: () => void
}

export default function DraggableRiderCard({ rider, onAdd }: DraggableRiderCardProps) {
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
  const category = rider.zwift_official_category || rider.zwiftracing_category || 'D'
  const categoryColor = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || 'bg-gray-600 text-white border-gray-700'
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group relative bg-gradient-to-br from-white to-gray-50/50 hover:from-indigo-50/30 hover:to-purple-50/30 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-200 shadow-sm ${isDragging ? 'scale-105 ring-2 ring-indigo-400/50 shadow-2xl' : ''}`}
    >
      <div className="p-3 sm:p-4">
        <div {...listeners} className="cursor-move">
          <div className="mb-2 sm:mb-3">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
              {rider.name || rider.full_name}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="relative">
              <img 
                src={rider.avatar_url || `https://ui-avatars.com/api/?name=${rider.rider_id}&background=6366f1&color=fff&size=64`}
                alt={rider.name}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-indigo-200 shadow-md"
                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${rider.rider_id}&background=6366f1&color=fff&size=64`; }}
              />
              <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold rounded-md border ${categoryColor} shadow-md`}>
                {category}
              </div>
            </div>
            
            {rider.phenotype && (
              <div className="flex-1 min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1">Phenotype</div>
                <div className="text-base sm:text-lg font-bold text-purple-700 truncate">
                  {rider.phenotype}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-200/60 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm flex-wrap">
            <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-br ${veloTier?.color || 'from-gray-400 to-gray-600'} shadow-sm`}>
              <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/30 backdrop-blur-sm border border-white/50 sm:border-2">
                <span className="font-black text-[10px] sm:text-xs text-white">{veloTier?.rank || '?'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={`font-bold text-xs sm:text-sm leading-none ${veloTier?.textColor || 'text-white'}`}>{Math.floor(velo30day)}</span>
                {veloTier && veloTier.max && (
                  <div className="w-8 sm:w-12 h-0.5 sm:h-1 bg-black/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white/60 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((velo30day - veloTier.min) / (veloTier.max - veloTier.min)) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {rider.zwift_official_racing_score && (
              <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded text-[10px] sm:text-xs font-medium whitespace-nowrap">
                ZRS {rider.zwift_official_racing_score}
              </span>
            )}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              onAdd()
            }}
            className="px-2 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all whitespace-nowrap min-h-[40px] sm:min-h-0 flex items-center justify-center"
          >
            <span className="hidden sm:inline">+ Add</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>
    </div>
  )
}
