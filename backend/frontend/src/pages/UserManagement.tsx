import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

interface UserWithRole {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  roles: string[]
  is_admin: boolean
}

const AVAILABLE_ROLES = ['admin', 'rider', 'captain', 'viewer'] as const

export default function UserManagement() {
  const { user, accessStatus, accessLoading } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    // Wacht tot accessStatus geladen is voordat we redirecten
    if (accessLoading) return
    
    if (!user || !accessStatus?.is_admin) {
      console.log('[UserManagement] Access denied - redirecting. User:', !!user, 'Is admin:', accessStatus?.is_admin)
      navigate('/')
      return
    }
    fetchUsers()
  }, [user, accessStatus, accessLoading])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      // Haal user_roles op met user info via JOIN
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, granted_at')
      
      if (rolesError) {
        console.error('Error fetching roles:', rolesError)
        return
      }

      // Haal auth.users metadata op via RPC of view
      // Voor nu: groepeer per user_id
      const userMap = new Map<string, { roles: string[], granted_at: string }>()
      
      userRolesData?.forEach(r => {
        if (!userMap.has(r.user_id)) {
          userMap.set(r.user_id, { roles: [], granted_at: r.granted_at })
        }
        userMap.get(r.user_id)!.roles.push(r.role)
      })

      // Voor demo: gebruik alleen users met roles
      // TODO: Add RPC function om alle auth.users op te halen
      const usersWithRoles: UserWithRole[] = Array.from(userMap.entries()).map(([userId, data]) => ({
        id: userId,
        email: user?.id === userId ? user.email! : 'User ' + userId.slice(0, 8),
        created_at: data.granted_at,
        last_sign_in_at: null,
        roles: data.roles,
        is_admin: data.roles.includes('admin')
      }))

      // Voeg huidige user toe als die nog niet in lijst staat
      if (user && !userMap.has(user.id)) {
        usersWithRoles.push({
          id: user.id,
          email: user.email!,
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          roles: [],
          is_admin: false
        })
      }

      setUsers(usersWithRoles)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const grantRole = async (userId: string, role: string) => {
    if (!user) return
    
    setActionLoading(`${userId}-${role}-grant`)
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          granted_by: user.id,
          granted_at: new Date().toISOString()
        })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          alert('Deze gebruiker heeft deze rol al!')
        } else {
          console.error('Error granting role:', error)
          alert('Fout bij toekennen rol: ' + error.message)
        }
      } else {
        await fetchUsers()
      }
    } catch (error) {
      console.error('Error granting role:', error)
      alert('Fout bij toekennen rol')
    } finally {
      setActionLoading(null)
    }
  }

  const revokeRole = async (userId: string, role: string) => {
    if (!user) return
    if (!confirm(`Weet je zeker dat je de rol "${role}" wilt intrekken?`)) return
    
    setActionLoading(`${userId}-${role}-revoke`)
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role)

      if (error) {
        console.error('Error revoking role:', error)
        alert('Fout bij intrekken rol: ' + error.message)
      } else {
        await fetchUsers()
      }
    } catch (error) {
      console.error('Error revoking role:', error)
      alert('Fout bij intrekken rol')
    } finally {
      setActionLoading(null)
    }
  }

  // Toon loading terwijl access status wordt gecontroleerd
  if (accessLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="mt-4 text-gray-600">
            {accessLoading ? 'Toegang controleren...' : 'Gebruikers laden...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gebruikersbeheer</h1>
        <p className="mt-2 text-gray-600">Beheer rollen en toegang voor gebruikers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Totaal Gebruikers</p>
          <p className="text-3xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Admins</p>
          <p className="text-3xl font-bold text-red-600">{users.filter(u => u.is_admin).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Met Rollen</p>
          <p className="text-3xl font-bold text-green-600">{users.filter(u => u.roles.length > 0).length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Zonder Rollen</p>
          <p className="text-3xl font-bold text-amber-600">{users.filter(u => u.roles.length === 0).length}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gebruiker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Huidige Rollen
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acties
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Laatste Login
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className={u.id === user?.id ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {u.email}
                        {u.id === user?.id && (
                          <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            Jij
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Aangemaakt: {new Date(u.created_at).toLocaleDateString('nl-NL')}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {u.roles.length === 0 ? (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        Geen rollen
                      </span>
                    ) : (
                      u.roles.map(role => (
                        <div key={role} className="flex items-center gap-1">
                          <span className={`px-2 py-1 text-xs rounded font-medium ${
                            role === 'admin' ? 'bg-red-100 text-red-800' :
                            role === 'captain' ? 'bg-purple-100 text-purple-800' :
                            role === 'rider' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {role}
                          </span>
                          <button
                            onClick={() => revokeRole(u.id, role)}
                            disabled={actionLoading === `${u.id}-${role}-revoke`}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Rol intrekken"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_ROLES.filter(role => !u.roles.includes(role)).map(role => (
                      <button
                        key={role}
                        onClick={() => grantRole(u.id, role)}
                        disabled={actionLoading === `${u.id}-${role}-grant`}
                        className={`px-3 py-1 text-xs rounded font-medium transition disabled:opacity-50 ${
                          role === 'admin' ? 'bg-red-600 hover:bg-red-700 text-white' :
                          role === 'captain' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                          role === 'rider' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                          'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        + {role}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u.last_sign_in_at 
                    ? new Date(u.last_sign_in_at).toLocaleString('nl-NL')
                    : 'Nooit ingelogd'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Legend */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Rol Uitleg:</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li><strong>Admin:</strong> Volledige toegang tot alle functies inclusief gebruikersbeheer</li>
          <li><strong>Captain:</strong> Team management en sync functies</li>
          <li><strong>Rider:</strong> Toegang tot eigen rider data en team matrix</li>
          <li><strong>Viewer:</strong> Alleen lezen toegang tot publieke data</li>
        </ul>
      </div>
    </div>
  )
}
