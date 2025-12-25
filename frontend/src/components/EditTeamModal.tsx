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
}

interface EditTeamModalProps {
  team: Team
  onClose: () => void
  onSave: (updates: any) => void
  isLoading: boolean
}

export default function EditTeamModal({ team, onClose, onSave, isLoading }: EditTeamModalProps) {
  const [editedTeam, setEditedTeam] = useState({
    team_name: team.team_name,
    competition_name: team.competition_name,
    competition_type: team.competition_type,
    velo_min_rank: team.velo_min_rank || 1,
    velo_max_rank: team.velo_max_rank || 10,
    velo_max_spread: team.velo_max_spread || 3,
    allowed_categories: team.allowed_categories || [],
    min_riders: team.min_riders || 1,
    max_riders: team.max_riders || 10
  })

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">✏️ Bewerk Team</h2>
          
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Team Naam</label>
              <input
                type="text"
                value={editedTeam.team_name}
                onChange={(e) => setEditedTeam({...editedTeam, team_name: e.target.value})}
                className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Team naam..."
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Competitie Type</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setEditedTeam({...editedTeam, competition_type: 'velo'})}
                  className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all min-h-[60px] sm:min-h-0 ${
                    editedTeam.competition_type === 'velo'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="font-bold text-sm sm:text-base">⚡ vELO</div>
                  <div className="text-[10px] sm:text-xs text-gray-400">bijv: Club Ladder</div>
                </button>
                <button
                  type="button"
                  onClick={() => setEditedTeam({...editedTeam, competition_type: 'category'})}
                  className={`p-2.5 sm:p-3 rounded-lg border-2 transition-all min-h-[60px] sm:min-h-0 ${
                    editedTeam.competition_type === 'category'
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="font-bold text-sm sm:text-base">🏆 Category</div>
                  <div className="text-[10px] sm:text-xs text-gray-400">bijv: WTRL ZRL</div>
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Competitie Naam</label>
              <input
                type="text"
                value={editedTeam.competition_name}
                onChange={(e) => setEditedTeam({...editedTeam, competition_name: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="bijv. WTRL ZRL Division 1"
              />
            </div>
            
            {editedTeam.competition_type === 'velo' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min vELO Rank</label>
                    <input
                      type="number"
                      value={editedTeam.velo_min_rank}
                      onChange={(e) => setEditedTeam({...editedTeam, velo_min_rank: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                      min="1"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max vELO Rank</label>
                    <input
                      type="number"
                      value={editedTeam.velo_max_rank}
                      onChange={(e) => setEditedTeam({...editedTeam, velo_max_rank: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max vELO Spread</label>
                  <input
                    type="number"
                    value={editedTeam.velo_max_spread}
                    onChange={(e) => setEditedTeam({...editedTeam, velo_max_spread: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    min="1"
                    max="10"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Huidige spread: {editedTeam.velo_max_rank - editedTeam.velo_min_rank + 1} ranks
                  </div>
                </div>
              </div>
            )}
            
            {editedTeam.competition_type === 'category' && (
              <div>
                <label className="block text-sm font-medium mb-2">Toegestane Categorieën</label>
                <div className="grid grid-cols-4 gap-2">
                  {['A+', 'A', 'B', 'C', 'D'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        const current = editedTeam.allowed_categories || []
                        setEditedTeam({
                          ...editedTeam,
                          allowed_categories: current.includes(cat)
                            ? current.filter(c => c !== cat)
                            : [...current, cat]
                        })
                      }}
                      className={`px-3 py-2 rounded-lg font-bold transition-all ${
                        (editedTeam.allowed_categories || []).includes(cat)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 border border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Min Riders</label>
                <input
                  type="number"
                  value={editedTeam.min_riders}
                  onChange={(e) => setEditedTeam({...editedTeam, min_riders: parseInt(e.target.value)})}
                  className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Max Riders</label>
                <input
                  type="number"
                  value={editedTeam.max_riders}
                  onChange={(e) => setEditedTeam({...editedTeam, max_riders: parseInt(e.target.value)})}
                  className="w-full px-3 py-2.5 sm:py-2 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  min="1"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 sm:py-2 text-sm sm:text-base bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors min-h-[48px] sm:min-h-0 flex items-center justify-center"
              disabled={isLoading}
            >
              Annuleer
            </button>
            <button
              onClick={() => onSave(editedTeam)}
              className="flex-1 px-4 py-3 sm:py-2 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-lg font-semibold shadow-lg transition-colors disabled:opacity-50 min-h-[48px] sm:min-h-0 flex items-center justify-center"
              disabled={isLoading || !editedTeam.team_name.trim() || !editedTeam.competition_name.trim()}
            >
              {isLoading ? 'Opslaan...' : '💾 Opslaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
