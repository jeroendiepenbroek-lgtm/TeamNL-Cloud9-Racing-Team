import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function AuthDebug() {
  const { user, session, loading, accessStatus, accessLoading } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">🔍 Auth Debug Info</h1>

        {/* Loading State */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Loading State</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p><strong>Auth Loading:</strong> {loading ? '⏳ Yes' : '✅ No'}</p>
            <p><strong>Access Loading:</strong> {accessLoading ? '⏳ Yes' : '✅ No'}</p>
          </div>
        </div>

        {/* User State */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">User State</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p><strong>User Object:</strong> {user ? '✅ Exists' : '❌ Null'}</p>
            {user && (
              <>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
              </>
            )}
          </div>
        </div>

        {/* Session State */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Session State</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p><strong>Session:</strong> {session ? '✅ Active' : '❌ None'}</p>
            {session && (
              <>
                <p><strong>Provider:</strong> {session.user.app_metadata.provider}</p>
                <p><strong>Expires:</strong> {new Date((session.expires_at || 0) * 1000).toLocaleString()}</p>
              </>
            )}
          </div>
        </div>

        {/* Access Status */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Access Status</h2>
          <div className="bg-gray-50 p-4 rounded">
            <p><strong>Status Object:</strong> {accessStatus ? '✅ Exists' : '❌ Null'}</p>
            {accessStatus && (
              <>
                <p><strong>Has Access:</strong> {accessStatus.has_access ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Status:</strong> {accessStatus.status}</p>
                <p><strong>Message:</strong> {accessStatus.message}</p>
                <p><strong>Roles:</strong> {accessStatus.roles.join(', ') || 'none'}</p>
                <p><strong>Is Admin:</strong> {accessStatus.is_admin ? '✅ Yes' : '❌ No'}</p>
              </>
            )}
          </div>
        </div>

        {/* Expected vs Actual */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Expected for jeroen.diepenbroek@gmail.com</h2>
          <div className="bg-green-50 border border-green-200 p-4 rounded">
            <p>✅ User: Should exist</p>
            <p>✅ Email: jeroen.diepenbroek@gmail.com</p>
            <p>✅ Access Status: has_access = true</p>
            <p>✅ Roles: ['admin']</p>
            <p>✅ Is Admin: true</p>
          </div>
        </div>

        {/* Console Logs */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Debug Instructions</h2>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded">
            <p className="mb-2">Open browser console (F12) and look for:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>[AuthContext] Initializing...</li>
              <li>[AuthContext] Session loaded: true/false</li>
              <li>[AuthContext] Checking access status for user: ...</li>
              <li>[AuthContext] User email: ...</li>
              <li>[AuthContext] ✅ Recognized team member: Jeroen</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ← Terug naar Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            🔄 Reload Page
          </button>
        </div>

        {/* Raw JSON */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Raw JSON Data</h2>
          <details className="bg-gray-50 p-4 rounded">
            <summary className="cursor-pointer font-medium">Click to expand</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(
                {
                  user: user ? { email: user.email, id: user.id } : null,
                  session: session ? { provider: session.user.app_metadata.provider } : null,
                  accessStatus,
                  loading,
                  accessLoading
                },
                null,
                2
              )}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}
