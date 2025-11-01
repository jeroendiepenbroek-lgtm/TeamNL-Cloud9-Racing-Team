import { useState, useEffect } from 'react'

// Environment-aware API URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export function AdminPanel() {
  const [riderIds, setRiderIds] = useState('')
  const [deleteId, setDeleteId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [clubId, setClubId] = useState<number | null>(null)
  const [clubs, setClubs] = useState<Array<{ id: number; name: string; memberCount: number }>>([])
  const [loadingClubs, setLoadingClubs] = useState(false)

  // Haal club ID op bij component mount
  useEffect(() => {
    const fetchClubId = async () => {
      try {
        const response = await fetch(`${API_BASE}/config`)
        const data = await response.json()
        setClubId(data.clubId)
      } catch (err) {
        console.error('Failed to fetch club ID:', err)
        setClubId(11818) // Fallback naar default
      }
    }
    fetchClubId()
    fetchClubs()
  }, [])

  const fetchClubs = async () => {
    setLoadingClubs(true)
    try {
      const response = await fetch(`${API_BASE}/clubs`)
      const data = await response.json()
      if (data.success && data.clubs) {
        setClubs(data.clubs)
      }
    } catch (err) {
      console.error('Failed to fetch clubs:', err)
    } finally {
      setLoadingClubs(false)
    }
  }

  const handleUpload = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const ids = riderIds
        .split(/[\n,]/)
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id))

      if (ids.length === 0) {
        setMessage('❌ No valid rider IDs found')
        return
      }

      // Use the multi-club endpoint which will detect clubs based on riders
      const response = await fetch(`${API_BASE}/sync/riders-with-clubs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderIds: ids }),
      })

      const data = await response.json()

      if (data && data.success) {
        const ridersSynced = data.synced?.riders ?? 0
        const clubsSynced = data.synced?.clubs ?? 0
        const clubsList = (data.clubs || []).map((c: any) => `${c.name} (${c.memberCount})`).join(', ')

        setMessage(`✅ Synced ${ridersSynced} riders across ${clubsSynced} clubs${clubsList ? ': ' + clubsList : ''}`)
        setRiderIds('')
        fetchClubs() // Refresh clubs
      } else if (response.status === 202) {
        setMessage('✅ Bulk sync started in background')
        setRiderIds('')
        setTimeout(fetchClubs, 2000) // Refresh after delay
      } else {
        setMessage(`❌ Upload failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      setMessage(`❌ Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId.trim()) {
      setMessage('❌ Enter a rider ID to delete')
      return
    }

    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch(`${API_BASE}/riders/${deleteId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success || response.ok) {
        setMessage(`✅ Rider ${deleteId} deleted`)
        setDeleteId('')
      } else {
        setMessage(`❌ Delete failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      setMessage(`❌ Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClubSync = async () => {
    if (!clubId) {
      setMessage('⏳ Loading club configuration...')
      return
    }

    setLoading(true)
    setMessage('🔄 Syncing club data...')
    
    try {
      const response = await fetch(`${API_BASE}/sync/club/${clubId}`, {
        method: 'POST',
      })

      const data = await response.json()
      
      if (data.success) {
        setMessage(`✅ Club synced: ${data.memberCount} members`)
      } else {
        setMessage(`❌ Sync failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      setMessage(`❌ Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <h2>🔧 Admin Panel</h2>
        <p style={{ color: '#718096', marginBottom: '24px' }}>
          Manage riders and sync data with ZwiftRacing API + Supabase PostgreSQL
        </p>

        <div className="admin-section">
          <h3>➕ Add Riders</h3>
          <div className="admin-form">
            <textarea
              placeholder="Enter rider IDs (one per line or comma-separated)&#10;Example:&#10;150437&#10;123456&#10;789012"
              value={riderIds}
              onChange={(e) => setRiderIds(e.target.value)}
              rows={6}
              style={{
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '15px',
                fontFamily: 'monospace',
              }}
            />
            <button onClick={handleUpload} disabled={loading || !riderIds.trim()}>
              {loading ? 'Uploading...' : 'Upload Riders'}
            </button>
          </div>
        </div>

        <div className="admin-section">
          <h3>🗑️ Delete Rider</h3>
          <div className="admin-form">
            <input
              type="number"
              placeholder="Enter Zwift ID to delete"
              value={deleteId}
              onChange={(e) => setDeleteId(e.target.value)}
            />
            <button 
              onClick={handleDelete} 
              disabled={loading || !deleteId.trim()}
              style={{ background: '#f56565' }}
            >
              {loading ? 'Deleting...' : 'Delete Rider'}
            </button>
          </div>
        </div>

        <div className="admin-section">
          <h3>🔄 Sync Club Data</h3>
          <p style={{ fontSize: '14px', color: '#718096', marginBottom: '12px' }}>
            Fetch latest club members from ZwiftRacing API and sync to Supabase
          </p>
          <button 
            onClick={handleClubSync} 
            disabled={loading || !clubId}
          >
            {loading ? 'Syncing...' : clubId ? `Sync Club ${clubId}` : 'Loading...'}
          </button>
        </div>

        <div className="admin-section">
          <h3>🏢 Tracked Clubs</h3>
          <p style={{ fontSize: '14px', color: '#718096', marginBottom: '12px' }}>
            All clubs detected from uploaded riders
          </p>
          <button 
            onClick={fetchClubs} 
            disabled={loadingClubs}
            style={{ marginBottom: '12px' }}
          >
            {loadingClubs ? 'Loading...' : '🔄 Refresh Clubs'}
          </button>
          {clubs.length > 0 ? (
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '8px'
            }}>
              {clubs.map(club => (
                <div key={club.id} style={{
                  padding: '8px',
                  marginBottom: '4px',
                  background: '#f7fafc',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span><strong>{club.name}</strong> (ID: {club.id})</span>
                  <span style={{ color: '#718096' }}>{club.memberCount} members</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#a0aec0', fontSize: '14px' }}>No clubs tracked yet. Upload riders to detect clubs.</p>
          )}
        </div>

        {message && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: message.startsWith('✅') ? '#f0fff4' : '#fff5f5',
            border: `2px solid ${message.startsWith('✅') ? '#48bb78' : '#f56565'}`,
            borderRadius: '6px',
            color: message.startsWith('✅') ? '#22543d' : '#742a2a',
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
