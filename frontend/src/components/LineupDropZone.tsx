import { useDroppable } from '@dnd-kit/core'
import { ReactNode } from 'react'

interface LineupRider {
  rider_id: number
  lineup_position: number
  name: string
}

interface LineupDropZoneProps {
  children: ReactNode
  lineup: LineupRider[]
}

export default function LineupDropZone({ children, lineup }: LineupDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'lineup-drop-zone'
  })
  
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] border-3 rounded-xl p-4 transition-all duration-300 relative ${
        isOver 
          ? 'border-green-500 bg-green-500/20 shadow-2xl shadow-green-500/50 ring-4 ring-green-400/50 scale-[1.02]' 
          : 'border-blue-400 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-dashed shadow-lg hover:shadow-xl hover:border-blue-500'
      }`}
    >
      {/* US1: Visual drop indicator overlay */}
      {isOver && (
        <div className="absolute inset-0 rounded-xl border-4 border-green-400 pointer-events-none animate-pulse">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-green-500/90 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-2xl">
              ⬇️ Drop hier om toe te voegen
            </div>
          </div>
        </div>
      )}
      
      {lineup.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <div className="text-6xl mb-4 animate-bounce">👥</div>
          <p className="text-lg font-bold text-gray-700 mb-2">Nog geen riders</p>
          <p className="text-sm text-gray-500 max-w-xs">
            <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold mr-1">Sleep riders hierheen</span>
            of gebruik de <span className="font-bold text-blue-600">+ Add</span> knop
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
