import { useEffect, useState } from 'react'
import { collection, getDocs, getFirestore } from 'firebase/firestore'
import { initializeApp } from 'firebase/app'
import { firebaseConfig } from '../firebase'

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export function useClubStats() {
  const [stats, setStats] = useState({
    totalRiders: 0,
    totalEvents: 0,
    avgFTP: 0,
    avgWPerKg: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const ridersSnap = await getDocs(collection(db, 'riders'))
        const eventsSnap = await getDocs(collection(db, 'events'))
        
        const riders = ridersSnap.docs.map(d => d.data())
        const validRiders = riders.filter(r => r.ftp && r.weight)
        
        const totalFTP = validRiders.reduce((sum, r) => sum + (r.ftp || 0), 0)
        const totalWPerKg = validRiders.reduce((sum, r) => sum + ((r.ftp || 0) / (r.weight || 1)), 0)
        
        setStats({
          totalRiders: riders.length,
          totalEvents: eventsSnap.size,
          avgFTP: validRiders.length > 0 ? Math.round(totalFTP / validRiders.length) : 0,
          avgWPerKg: validRiders.length > 0 ? (totalWPerKg / validRiders.length).toFixed(2) as any : 0,
        })
      } catch (err) {
        console.error('Failed to fetch stats', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [])

  return { stats, loading }
}
