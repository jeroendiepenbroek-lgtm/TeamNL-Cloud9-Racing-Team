import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface AccessRequest {
  id: string
  user_id: string
  discord_id: string | null
  discord_username: string | null
  discord_discriminator: string | null
  discord_avatar_url: string | null
  discord_email: string | null
  status: 'pending' | 'approved' | 'rejected'
  reason: string | null
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  reviewed_by_user?: { email: string }
}

interface Stats {
  pending: number
  approved: number
  rejected: number
  total: number
}

export function AccessRequests() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    fetchRequests()
    fetchStats()
  }, [user, filter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const url = filter === 'all' 
        ? 'http://localhost:3000/api/admin/access-requests'
        : `http://localhost:3000/api/admin/access-requests?status=${filter}`
      
      const response = await fetch(url)
      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/admin/access-requests/stats/overview')
      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleApprove = async (requestId: string) => {
    if (!user) return
    
    setActionLoading(requestId)
    try {
      const response = await fetch(`http://localhost:3000/api/admin/access-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_user_id: user.id,
          review_notes: reviewNotes[requestId] || '',
        }),
      })

      if (response.ok) {
        await fetchRequests()
        await fetchStats()
        setReviewNotes((prev) => ({ ...prev, [requestId]: '' }))
      }
    } catch (error) {
      console.error('Error approving request:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!user) return
    
    const notes = reviewNotes[requestId] || ''
    if (!notes.trim()) {
      alert('Vul een reden in voor afwijzing')
      return
    }

    setActionLoading(requestId)
    try {
      const response = await fetch(`http://localhost:3000/api/admin/access-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_user_id: user.id,
          review_notes: notes,
        }),
      })

      if (response.ok) {
        await fetchRequests()
        await fetchStats()
        setReviewNotes((prev) => ({ ...prev, [requestId]: '' }))
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-NL')
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Access Requests Beheer</h1>
          <p className="mt-2 text-gray-600">
            Beheer Discord OAuth aanvragen van riders
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Wachtend</div>
              <div className="mt-2 text-3xl font-bold text-yellow-600">{stats.pending}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Goedgekeurd</div>
              <div className="mt-2 text-3xl font-bold text-green-600">{stats.approved}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Afgewezen</div>
              <div className="mt-2 text-3xl font-bold text-red-600">{stats.rejected}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-500">Totaal</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {['pending', 'approved', 'rejected', 'all'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab as typeof filter)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm
                    ${filter === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab === 'pending' && 'Wachtend'}
                  {tab === 'approved' && 'Goedgekeurd'}
                  {tab === 'rejected' && 'Afgewezen'}
                  {tab === 'all' && 'Alle'}
                  {stats && tab !== 'all' && (
                    <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
                      {stats[tab as keyof typeof stats]}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Laden...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Geen requests gevonden voor filter: {filter}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {requests.map((request) => (
                <li key={request.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    {/* User Info */}
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Avatar */}
                      {request.discord_avatar_url ? (
                        <img
                          src={request.discord_avatar_url}
                          alt={request.discord_username || 'User'}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          {request.discord_username?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {request.discord_username}
                            {request.discord_discriminator && `#${request.discord_discriminator}`}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-500 space-y-1">
                          {request.discord_email && (
                            <div>📧 {request.discord_email}</div>
                          )}
                          {request.discord_id && (
                            <div>🆔 Discord ID: {request.discord_id}</div>
                          )}
                          <div>📅 Aangevraagd: {formatDate(request.requested_at)}</div>
                          
                          {request.reviewed_at && (
                            <div>
                              ✅ Behandeld: {formatDate(request.reviewed_at)}
                              {request.reviewed_by_user && ` door ${request.reviewed_by_user.email}`}
                            </div>
                          )}
                          
                          {request.reason && (
                            <div className="mt-2 p-2 bg-gray-100 rounded">
                              <strong>Reden:</strong> {request.reason}
                            </div>
                          )}
                          
                          {request.review_notes && (
                            <div className="mt-2 p-2 bg-blue-50 rounded">
                              <strong>Review notities:</strong> {request.review_notes}
                            </div>
                          )}
                        </div>

                        {/* Actions voor pending requests */}
                        {request.status === 'pending' && (
                          <div className="mt-4 space-y-2">
                            <textarea
                              placeholder="Notities (optioneel voor approve, vereist voor reject)"
                              value={reviewNotes[request.id] || ''}
                              onChange={(e) => setReviewNotes({ ...reviewNotes, [request.id]: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              rows={2}
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApprove(request.id)}
                                disabled={actionLoading === request.id}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                              >
                                {actionLoading === request.id ? 'Verwerken...' : '✓ Goedkeuren'}
                              </button>
                              <button
                                onClick={() => handleReject(request.id)}
                                disabled={actionLoading === request.id}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                              >
                                {actionLoading === request.id ? 'Verwerken...' : '✗ Afwijzen'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
