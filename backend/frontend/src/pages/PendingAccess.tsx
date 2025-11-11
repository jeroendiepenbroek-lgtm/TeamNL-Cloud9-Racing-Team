import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

interface AccessRequestDetails {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  review_notes?: string
  reviewed_at?: string
}

export default function PendingAccess() {
  const { user, accessStatus, refreshAccessStatus } = useAuth()
  const navigate = useNavigate()
  const [requestDetails, setRequestDetails] = useState<AccessRequestDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      console.log('[PendingAccess] No user, redirecting to home')
      navigate('/')
      return
    }

    // Check if already approved
    if (accessStatus?.has_access) {
      console.log('[PendingAccess] User has access, redirecting to dashboard')
      navigate('/')
      return
    }

    // Fetch request details
    fetchRequestDetails()
  }, [user, accessStatus, navigate])

  const fetchRequestDetails = async () => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/user/access-status?user_id=${user.id}`)
      if (!response.ok) {
        console.error('[PendingAccess] Failed to fetch details:', response.status)
        return
      }

      const data = await response.json()
      console.log('[PendingAccess] Request details:', data)
      
      // Als er een access request is, haal details op
      if (data.access_request) {
        setRequestDetails(data.access_request)
      }
    } catch (error) {
      console.error('[PendingAccess] Error fetching details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    await refreshAccessStatus()
    await fetchRequestDetails()
    setLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'approved': return 'bg-green-100 text-green-800 border-green-300'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'approved': return '✅'
      case 'rejected': return '❌'
      default: return '❓'
    }
  }

  const getStatusMessage = () => {
    if (!requestDetails) {
      return {
        title: 'Toegang Aanvragen',
        message: 'Je hebt nog geen toegang aangevraagd.',
        action: 'Vraag toegang aan'
      }
    }

    switch (requestDetails.status) {
      case 'pending':
        return {
          title: 'Wacht op Goedkeuring',
          message: 'Je toegangsverzoek is ontvangen en wordt beoordeeld door een administrator.',
          action: 'Status vernieuwen'
        }
      case 'rejected':
        return {
          title: 'Toegang Geweigerd',
          message: requestDetails.review_notes || 'Je toegangsverzoek is helaas afgewezen.',
          action: 'Nieuwe aanvraag indienen'
        }
      case 'approved':
        return {
          title: 'Toegang Goedgekeurd',
          message: 'Je hebt toegang! De pagina wordt over enkele seconden ververst.',
          action: 'Naar Dashboard'
        }
      default:
        return {
          title: 'Onbekende Status',
          message: 'Er is iets misgegaan.',
          action: 'Opnieuw proberen'
        }
    }
  }

  const handleAction = async () => {
    if (!requestDetails) {
      // Maak nieuwe access request
      try {
        const response = await fetch('/api/user/request-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id,
            discord_id: user?.user_metadata?.provider_id,
            discord_username: user?.user_metadata?.full_name || user?.user_metadata?.user_name,
            discord_email: user?.email,
            discord_avatar_url: user?.user_metadata?.avatar_url,
          })
        })

        if (response.ok) {
          await fetchRequestDetails()
        }
      } catch (error) {
        console.error('[PendingAccess] Error creating request:', error)
      }
    } else if (requestDetails.status === 'approved') {
      navigate('/')
    } else {
      handleRefresh()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusMessage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header met status icon */}
          <div className={`p-6 text-center border-b-4 ${getStatusColor(requestDetails?.status || 'pending')}`}>
            <div className="text-6xl mb-2">
              {getStatusIcon(requestDetails?.status || 'pending')}
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              {statusInfo.title}
            </h1>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 mb-6 text-center">
              {statusInfo.message}
            </p>

            {/* User info */}
            {user && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  {user.user_metadata?.avatar_url && (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Avatar"
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">
                      {user.user_metadata?.full_name || user.user_metadata?.user_name || user.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Request details */}
            {requestDetails && (
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-semibold px-2 py-1 rounded ${getStatusColor(requestDetails.status)}`}>
                    {requestDetails.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Aangevraagd op:</span>
                  <span className="text-gray-800">
                    {new Date(requestDetails.requested_at).toLocaleString('nl-NL')}
                  </span>
                </div>
                {requestDetails.reviewed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Beoordeeld op:</span>
                    <span className="text-gray-800">
                      {new Date(requestDetails.reviewed_at).toLocaleString('nl-NL')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action button */}
            <button
              onClick={handleAction}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {statusInfo.action}
            </button>

            {/* Help text */}
            <p className="mt-4 text-xs text-gray-500 text-center">
              Vragen? Neem contact op met een administrator
            </p>
          </div>
        </div>

        {/* Back to home link */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/')}
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            ← Terug naar home
          </button>
        </div>
      </div>
    </div>
  )
}
