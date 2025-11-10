import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Debug() {
  const auth = useAuth()
  const [envVars, setEnvVars] = useState<any>({})
  const [supabaseTest, setSupabaseTest] = useState<string>('Testing...')

  useEffect(() => {
    // Check env vars
    setEnvVars({
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY_LENGTH: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0,
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
    })

    // Test Supabase connection
    supabase.auth.getSession()
      .then(() => setSupabaseTest('✅ Supabase connected'))
      .catch((err) => setSupabaseTest(`❌ Error: ${err.message}`))
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Debug Info</h1>

        <div className="space-y-6">
          <section className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Environment Variables</h2>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
              {JSON.stringify(envVars, null, 2)}
            </pre>
          </section>

          <section className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Supabase Connection</h2>
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-mono">{supabaseTest}</p>
            </div>
          </section>

          <section className="border-b pb-4">
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Auth Context State</h2>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
              {JSON.stringify({
                loading: auth.loading,
                hasUser: !!auth.user,
                userEmail: auth.user?.email || 'none',
                hasSession: !!auth.session,
              }, null, 2)}
            </pre>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Browser Info</h2>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
              {JSON.stringify({
                userAgent: navigator.userAgent,
                localStorage: typeof localStorage !== 'undefined' ? 'available' : 'unavailable',
                location: window.location.href,
              }, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </div>
  )
}
