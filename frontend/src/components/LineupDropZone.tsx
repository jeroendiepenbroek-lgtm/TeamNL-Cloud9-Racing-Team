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
      className={`min-h-[400px] border-2 border-dashed rounded-xl p-4 transition-all ${
        isOver 
          ? 'border-indigo-500 bg-indigo-500/20' 
          : 'border-blue-500/30 bg-blue-500/5'
      }`}
    >
      {lineup.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-12">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-lg font-semibold">No riders yet</p>
          <p className="text-sm">Drag riders here or click + Add button</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
