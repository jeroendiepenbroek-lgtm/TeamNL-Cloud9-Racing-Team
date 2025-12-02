/**
 * Team Management - Simpel toevoegen en verwijderen van riders
 * Focus op data sourcing van ZwiftRacing API
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Trash2, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'

interface TeamMember {
  rider_id: number
  name: string
  zp_category: string | null
  race_last_rating: number | null
  race_wins: number
  race_finishes: number
  weight: number | null
  zp_ftp: number | null
  team_added_at: string
}

const API_BASE = ''

export default function TeamManagement() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)

  // Fetch team members
  const { data: members = [], isLoading, error } = useQuery<TeamMember[]>({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders/team`)
      if (!res.ok) throw new Error('Failed to fetch team members')
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
    refetchInterval: 30000,
  })

  // Delete rider mutation
  const deleteRider = useMutation({
    mutationFn: async (riderId: number) => {
      const res = await fetch(`${API_BASE}/api/riders/team/${riderId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete rider')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
      toast.success('Rider verwijderd uit team')
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  const handleDelete = (rider: TeamMember) => {
    if (window.confirm(`Weet je zeker dat je ${rider.name} wilt verwijderen uit het team?`)) {
      deleteRider.mutate(rider.rider_id)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 max-w-md">
          <div className="text-red-400 text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <h2 className="text-xl font-bold mb-2">Fout bij laden team</h2>
            <p className="text-sm">{error instanceof Error ? error.message : 'Onbekende fout'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-xl backdrop-blur-sm">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Team Management</h1>
              <p className="text-sm text-gray-400">Beheer je team members - Data sync via ZwiftRacing API</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Rider</span>
          </button>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-3xl font-bold text-blue-400">{members.length}</div>
            <div className="text-sm text-gray-400">Team Members</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-3xl font-bold text-green-400">
              {members.reduce((sum, m) => sum + m.race_wins, 0)}
            </div>
            <div className="text-sm text-gray-400">Total Wins</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-3xl font-bold text-purple-400">
              {members.reduce((sum, m) => sum + m.race_finishes, 0)}
            </div>
            <div className="text-sm text-gray-400">Total Races</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="text-3xl font-bold text-orange-400">
              {members.filter(m => m.race_last_rating && m.race_last_rating > 2000).length}
            </div>
            <div className="text-sm text-gray-400">Elite (2000+)</div>
          </div>
        </div>

        {/* Team List */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="ml-3 text-gray-400">Loading team members...</span>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">Geen team members</h3>
              <p className="text-gray-500 mb-4">Voeg je eerste rider toe via de knop hierboven</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Rider</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Category</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">vELO Rating</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">W/kg</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Wins</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Races</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Added</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const wkg = member.zp_ftp && member.weight
                      ? (member.zp_ftp / member.weight).toFixed(2)
                      : '--'

                    return (
                      <tr
                        key={member.rider_id}
                        className="border-b border-white/5 hover:bg-white/5 transition"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{member.name}</div>
                              <div className="text-xs text-gray-500">ID: {member.rider_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {member.zp_category ? (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                              {member.zp_category}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-white font-medium">
                            {member.race_last_rating || '--'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-white">{wkg}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-green-400 font-medium">{member.race_wins}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-300">{member.race_finishes}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-400">{formatDate(member.team_added_at)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(member)}
                            disabled={deleteRider.isPending}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                            title="Verwijder uit team"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Rider Modal */}
      {showAddModal && <AddRiderModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}

// ============================================================================
// Add Rider Modal Component
// ============================================================================

function AddRiderModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [zwiftId, setZwiftId] = useState('')
  const [name, setName] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zwiftId: parseInt(zwiftId),
          name: name || undefined,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add rider')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
      toast.success(data.message || 'Rider toegevoegd!')
      onClose()
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`)
    },
  })

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6 border border-white/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/20 rounded-xl">
            <UserPlus className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Add Rider to Team</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Zwift ID *</label>
            <input
              type="number"
              value={zwiftId}
              onChange={(e) => setZwiftId(e.target.value)}
              placeholder="150437"
              className="w-full px-4 py-2.5 text-sm bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Data wordt automatisch opgehaald van ZwiftRacing API
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Naam <span className="text-gray-500 text-xs">(optioneel)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alleen nodig als API sync faalt"
              className="w-full px-4 py-2.5 text-sm bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {mutation.isPending && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-sm flex items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Rider toevoegen en data synchroniseren...</span>
            </div>
          )}

          {mutation.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
              {mutation.error.message}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => mutation.mutate()}
              disabled={!zwiftId || mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl disabled:bg-gray-600 disabled:cursor-not-allowed transition shadow-lg font-medium text-sm flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add & Sync Rider
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition font-medium text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
