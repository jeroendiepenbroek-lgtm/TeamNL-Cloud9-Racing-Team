import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

// ZwiftRacing API config
const ZWIFT_API_BASE = 'https://zwift-ranking.herokuapp.com'
const ZWIFT_API_KEY = '650c6d2fc4ef6858d74cbef1'

export function AdminPanel() {
  const [riderIds, setRiderIds] = useState('')
  const [deleteId, setDeleteId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [clubs, setClubs] = useState<Array<{ id: number; club_name: string; member_count: number }>>([])
  const [loadingClubs, setLoadingClubs] = useState(false)

  // Fetch clubs from Supabase
  useEffect(() => {
    fetchClubs()
  }, [])

  const fetchClubs = async () => {
    setLoadingClubs(true)
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, club_name, member_count')
        .order('member_count', { ascending: false })

      if (error) throw error
      setClubs(data || [])
    } catch (err) {
      console.error('Failed to fetch clubs:', err)
    } finally {
      setLoadingClubs(false)
    }
  }

  // Sync single rider from ZwiftRacing API to Supabase
  const syncRider = async (riderId: number) => {
    try {
      // Fetch rider data from ZwiftRacing API
      const response = await fetch(
        `${ZWIFT_API_BASE}/public/rider/${riderId}?apikey=${ZWIFT_API_KEY}`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const riderData = await response.json()

      // Extract club info
      const clubId = riderData.clubId || riderData.club_id
      const clubName = riderData.clubName || riderData.club_name || 'Unknown'

      // Upsert club if exists
      if (clubId) {
        await supabase.from('clubs').upsert({
          id: clubId,
          club_name: clubName,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      }

      // Upsert rider
      await supabase.from('riders').upsert({
        zwift_id: riderData.riderId,
        name: riderData.name,
        club_id: clubId,
        ranking: riderData.ranking,
        category_racing: riderData.category?.racing || null,
        category_zftp: riderData.category?.zftp || null,
        ftp: riderData.ftp,
        weight: riderData.weight,
        watts_per_kg: riderData.ftp && riderData.weight ? riderData.ftp / riderData.weight : null,
        age: riderData.age,
        country: riderData.country,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'zwift_id' })

      return { success: true, clubId, clubName }
    } catch (error: any) {
      console.error(`Failed to sync rider ${riderId}:`, error)
      return { success: false, error: error?.message || 'Unknown error' }
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
        setLoading(false)
        return
      }

      const results = {
        success: [] as number[],
        failed: [] as number[],
        clubs: new Set<string>(),
      }

      // Sync each rider with 2 second delay (rate limiting)
      for (let i = 0; i < ids.length; i++) {
        const riderId = ids[i]
        setMessage(`⏳ Syncing rider ${i + 1}/${ids.length}...`)

        const result = await syncRider(riderId)
        
        if (result.success) {
          results.success.push(riderId)
          if (result.clubName) results.clubs.add(result.clubName)
        } else {
          results.failed.push(riderId)
        }

        // Rate limiting: 2 second delay between requests
        if (i < ids.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Show summary
      const clubsList = Array.from(results.clubs).join(', ')
      setMessage(
        `✅ Synced ${results.success.length}/${ids.length} riders` +
        (results.failed.length > 0 ? ` (${results.failed.length} failed)` : '') +
        (clubsList ? ` across clubs: ${clubsList}` : '')
      )
      setRiderIds('')
      fetchClubs() // Refresh clubs
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
      const riderId = parseInt(deleteId)
      
      if (isNaN(riderId)) {
        setMessage('❌ Invalid rider ID')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('riders')
        .delete()
        .eq('zwift_id', riderId)

      if (error) throw error

      setMessage(`✅ Rider ${riderId} deleted`)
      setDeleteId('')
      fetchClubs() // Refresh in case rider was last in a club
    } catch (err) {
      setMessage(`❌ Delete failed: ${err}`)
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
                  <span><strong>{club.club_name}</strong> (ID: {club.id})</span>
                  <span style={{ color: '#718096' }}>{club.member_count} members</span>
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
