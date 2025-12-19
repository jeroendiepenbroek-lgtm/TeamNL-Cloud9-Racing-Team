import React, { useState } from 'react'
import { toast } from 'react-hot-toast'

interface TeamCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onTeamCreated: () => void
}

export const TeamCreationModal: React.FC<TeamCreationModalProps> = ({ isOpen, onClose, onTeamCreated }) => {
  const [teamName, setTeamName] = useState('')
  const [competitionType, setCompetitionType] = useState<'velo-based' | 'category-based'>('velo-based')
  const [competitionName, setCompetitionName] = useState('')
  
  // vELO constraints
  const [veloMinRank, setVeloMinRank] = useState(1)
  const [veloMaxRank, setVeloMaxRank] = useState(10)
  const [veloMaxSpread, setVeloMaxSpread] = useState(3)
  
  // Category constraints
  const [allowedCategories, setAllowedCategories] = useState<string[]>(['A+', 'A', 'B', 'C', 'D', 'E'])
  const [allowCategoryUp, setAllowCategoryUp] = useState(true)
  
  // Rider limits
  const [minRiders, setMinRiders] = useState(1)
  const [maxRiders, setMaxRiders] = useState(10)
  
  const [loading, setLoading] = useState(false)

  const VELO_TIERS = [
    { rank: 1, name: 'Diamond', emoji: '💎' },
    { rank: 2, name: 'Ruby', emoji: '💍' },
    { rank: 3, name: 'Emerald', emoji: '💚' },
    { rank: 4, name: 'Sapphire', emoji: '💙' },
    { rank: 5, name: 'Amethyst', emoji: '💜' },
    { rank: 6, name: 'Pearl', emoji: '⚪' },
    { rank: 7, name: 'Gold', emoji: '🟡' },
    { rank: 8, name: 'Silver', emoji: '⚫' },
    { rank: 9, name: 'Bronze', emoji: '🟠' },
    { rank: 10, name: 'Copper', emoji: '🟤' }
  ]

  const CATEGORIES = [
    { value: 'A+', label: 'A+', color: '#FF0000' },
    { value: 'A', label: 'A', color: '#FF0000' },
    { value: 'B', label: 'B', color: '#4CAF50' },
    { value: 'C', label: 'C', color: '#0000FF' },
    { value: 'D', label: 'D', color: '#FF1493' },
    { value: 'E', label: 'E', color: '#808080' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!teamName.trim()) {
      toast.error('Voer een teamnaam in')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: teamName,
          competition_type: competitionType,
          competition_name: competitionName || null,
          velo_min_rank: competitionType === 'velo-based' ? veloMinRank : null,
          velo_max_rank: competitionType === 'velo-based' ? veloMaxRank : null,
          velo_max_spread: competitionType === 'velo-based' ? veloMaxSpread : null,
          allowed_categories: competitionType === 'category-based' ? allowedCategories : null,
          allow_category_up: allowCategoryUp,
          min_riders: minRiders,
          max_riders: maxRiders
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`✅ Team "${teamName}" aangemaakt!`)
        onTeamCreated()
        handleClose()
      } else {
        toast.error(data.error || 'Team aanmaken mislukt')
      }
    } catch (error) {
      console.error('Error creating team:', error)
      toast.error('Fout bij aanmaken team')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTeamName('')
    setCompetitionName('')
    setCompetitionType('velo-based')
    setVeloMinRank(1)
    setVeloMaxRank(10)
    setVeloMaxSpread(3)
    setAllowedCategories(['A+', 'A', 'B', 'C', 'D', 'E'])
    setAllowCategoryUp(true)
    setMinRiders(1)
    setMaxRiders(10)
    onClose()
  }

  const toggleCategory = (category: string) => {
    setAllowedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 p-6 border-b border-slate-700 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-2xl">➕</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Nieuw Team Aanmaken</h2>
                <p className="text-white/80 text-sm">Configureer team criteria en limieten</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Team Name */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Team Naam *</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="bijv. Cloud9 Racing A-Team"
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          {/* Competition Name (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Competitie Naam (optioneel)</label>
            <input
              type="text"
              value={competitionName}
              onChange={(e) => setCompetitionName(e.target.value)}
              placeholder="bijv. Club Ladder, WTRL TTT"
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Competition Type */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Competitie Type *</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setCompetitionType('velo-based')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  competitionType === 'velo-based'
                    ? 'bg-orange-500/20 border-orange-500 text-white'
                    : 'bg-slate-900/30 border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="font-bold mb-1">vELO Based</div>
                <div className="text-xs">Tier en spread limieten</div>
              </button>
              <button
                type="button"
                onClick={() => setCompetitionType('category-based')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  competitionType === 'category-based'
                    ? 'bg-orange-500/20 border-orange-500 text-white'
                    : 'bg-slate-900/30 border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="font-bold mb-1">Category Based</div>
                <div className="text-xs">Categorie restricties</div>
              </button>
            </div>
          </div>

          {/* vELO Constraints (only for velo-based) */}
          {competitionType === 'velo-based' && (
            <div className="space-y-4 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-orange-500">⚡</span> vELO Criteria
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Min Tier */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Minimale Tier</label>
                  <select
                    value={veloMinRank}
                    onChange={(e) => setVeloMinRank(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    {VELO_TIERS.map(tier => (
                      <option key={tier.rank} value={tier.rank}>
                        {tier.emoji} {tier.name} (Tier {tier.rank})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Max Tier */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">Maximale Tier</label>
                  <select
                    value={veloMaxRank}
                    onChange={(e) => setVeloMaxRank(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    {VELO_TIERS.map(tier => (
                      <option key={tier.rank} value={tier.rank}>
                        {tier.emoji} {tier.name} (Tier {tier.rank})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Max Spread */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Max Tier Spread (bijv. max 3 tiers verschil)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={veloMaxSpread}
                  onChange={(e) => setVeloMaxSpread(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {/* Category Constraints (only for category-based) */}
          {competitionType === 'category-based' && (
            <div className="space-y-4 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-orange-500">🏆</span> Categorie Criteria
              </h3>
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Toegestane Categorieën</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => toggleCategory(cat.value)}
                      className={`px-3 py-2 rounded-lg border-2 font-bold text-sm transition-all ${
                        allowedCategories.includes(cat.value)
                          ? 'border-white text-white'
                          : 'border-slate-600 text-slate-500'
                      }`}
                      style={{
                        backgroundColor: allowedCategories.includes(cat.value) ? cat.color : 'transparent'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCategoryUp}
                    onChange={(e) => setAllowCategoryUp(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Sta riders toe in hogere categorie te rijden</span>
                </label>
              </div>
            </div>
          )}

          {/* Rider Limits */}
          <div className="space-y-4 p-4 bg-slate-900/30 rounded-lg border border-slate-700">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="text-orange-500">👥</span> Rider Limieten
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Min Riders</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={minRiders}
                  onChange={(e) => setMinRiders(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Max Riders</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxRiders}
                  onChange={(e) => setMaxRiders(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              disabled={loading}
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? '⏳ Aanmaken...' : '✅ Team Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
