import { useEffect, useState } from 'react'

interface DatabaseStats {
  riders: number
  clubs: number
  events: number
  raceResults: number
}

export function DataViewer() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabaseUrl] = useState('https://bktbeefdmrpxhsyyalvc.supabase.co')

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      // In productie: haal stats op via Supabase client
      // Voor nu: toon link naar Supabase Studio
      setStats({
        riders: 0,
        clubs: 2,
        events: 0,
        raceResults: 0,
      })
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">📊 Database Viewer</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded p-4">
          <div className="text-3xl font-bold text-blue-600">
            {loading ? '...' : stats?.riders || 0}
          </div>
          <div className="text-sm text-gray-600">Riders</div>
        </div>
        <div className="bg-green-50 rounded p-4">
          <div className="text-3xl font-bold text-green-600">
            {loading ? '...' : stats?.clubs || 0}
          </div>
          <div className="text-sm text-gray-600">Clubs</div>
        </div>
        <div className="bg-purple-50 rounded p-4">
          <div className="text-3xl font-bold text-purple-600">
            {loading ? '...' : stats?.events || 0}
          </div>
          <div className="text-sm text-gray-600">Events</div>
        </div>
        <div className="bg-orange-50 rounded p-4">
          <div className="text-3xl font-bold text-orange-600">
            {loading ? '...' : stats?.raceResults || 0}
          </div>
          <div className="text-sm text-gray-600">Race Results</div>
        </div>
      </div>

      {/* Supabase Studio Link */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-3 flex items-center">
          <span className="text-2xl mr-2">🗄️</span>
          Supabase Studio - Database Tables
        </h3>
        
        <p className="text-gray-700 mb-4">
          Bekijk en beheer alle data via <strong>Supabase Studio</strong> (ingebouwde GUI, 100% gratis):
        </p>

        <div className="space-y-3">
          {/* Table Editor */}
          <a
            href={`${supabaseUrl}/project/bktbeefdmrpxhsyyalvc/editor`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-white hover:bg-gray-50 border border-gray-200 rounded p-4 transition-colors"
          >
            <div>
              <div className="font-medium">📋 Table Editor</div>
              <div className="text-sm text-gray-600">Browse, filter, edit rows in real-time</div>
            </div>
            <span className="text-blue-600">→</span>
          </a>

          {/* SQL Editor */}
          <a
            href={`${supabaseUrl}/project/bktbeefdmrpxhsyyalvc/sql/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-white hover:bg-gray-50 border border-gray-200 rounded p-4 transition-colors"
          >
            <div>
              <div className="font-medium">⚡ SQL Editor</div>
              <div className="text-sm text-gray-600">Run custom queries, joins, aggregations</div>
            </div>
            <span className="text-blue-600">→</span>
          </a>

          {/* API Docs */}
          <a
            href={`${supabaseUrl}/project/bktbeefdmrpxhsyyalvc/api`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-white hover:bg-gray-50 border border-gray-200 rounded p-4 transition-colors"
          >
            <div>
              <div className="font-medium">📡 API Documentation</div>
              <div className="text-sm text-gray-600">Auto-generated REST API + GraphQL</div>
            </div>
            <span className="text-blue-600">→</span>
          </a>
        </div>

        {/* Available Tables */}
        <div className="mt-6 bg-white rounded border border-gray-200 p-4">
          <h4 className="font-medium mb-3">📚 Available Tables:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div className="bg-gray-50 px-3 py-2 rounded">
              <span className="font-mono">riders</span>
            </div>
            <div className="bg-gray-50 px-3 py-2 rounded">
              <span className="font-mono">clubs</span>
            </div>
            <div className="bg-gray-50 px-3 py-2 rounded">
              <span className="font-mono">club_roster</span>
            </div>
            <div className="bg-gray-50 px-3 py-2 rounded">
              <span className="font-mono">events</span>
            </div>
            <div className="bg-gray-50 px-3 py-2 rounded">
              <span className="font-mono">race_results</span>
            </div>
            <div className="bg-gray-50 px-3 py-2 rounded">
              <span className="font-mono">rider_history</span>
            </div>
            <div className="bg-gray-50 px-3 py-2 rounded">
              <span className="font-mono">sync_logs</span>
            </div>
          </div>
        </div>

        {/* Example Queries */}
        <div className="mt-4 bg-gray-800 text-green-400 rounded p-4 text-xs font-mono overflow-x-auto">
          <div className="text-gray-400 mb-2">-- Example SQL queries:</div>
          <div>SELECT * FROM riders ORDER BY updated_at DESC LIMIT 10;</div>
          <div className="mt-2">SELECT r.name, COUNT(rr.id) as race_count</div>
          <div>FROM riders r</div>
          <div>JOIN race_results rr ON r.id = rr.rider_id</div>
          <div>GROUP BY r.name ORDER BY race_count DESC;</div>
        </div>
      </div>

      {/* Upload Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4 text-sm">
        <p className="font-medium mb-2">💡 Tip: CSV/TXT Upload</p>
        <p>
          Gebruik de <strong>Admin Panel</strong> hieronder om rider IDs te uploaden.
          Ondersteunde formaten: comma-separated (CSV) of line-separated (TXT)
        </p>
      </div>
    </div>
  )
}
