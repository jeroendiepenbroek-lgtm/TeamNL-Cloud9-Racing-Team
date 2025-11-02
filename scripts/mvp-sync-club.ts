#!/usr/bin/env tsx
/**
 * MVP Script: Sync Club + Members
 * 
 * US1: Fetch club data + roster from ZwiftRacing API → Upsert to Supabase
 * 
 * API Endpoints:
 *   - /public/clubs/<id> → clubs + club_members tables
 * 
 * Usage:
 *   npx tsx scripts/mvp-sync-club.ts <clubId>
 *   npx tsx scripts/mvp-sync-club.ts 11818
 */

import { createClient } from '@supabase/supabase-js'

// Config
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!
const ZWIFT_API_KEY = process.env.ZWIFT_API_KEY || '650c6d2fc4ef6858d74cbef1'
const ZWIFT_API_BASE = 'https://zwift-ranking.herokuapp.com'

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function syncClub(clubId: number) {
  console.log(`[INFO] Fetching club ${clubId} from ZwiftRacing API...`)
  
  try {
    // Fetch club data from API
    const response = await fetch(
      `${ZWIFT_API_BASE}/public/clubs/${clubId}?apikey=${ZWIFT_API_KEY}`
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const clubData = await response.json()
    console.log(`[SUCCESS] Fetched club: ${clubData.name}`)
    console.log(`[INFO] Members: ${clubData.members?.length || 0}`)

    // US1: Upsert club (sourcing table: clubs)
    const { error: clubError } = await supabase
      .from('clubs')
      .upsert({
        club_id: clubId,
        club_name: clubData.name,
        description: clubData.description || null,
        member_count: clubData.members?.length || 0,
        country: clubData.country || null,
        created_date: clubData.createdDate || null,
        last_synced: new Date().toISOString(),
      }, { onConflict: 'club_id' })

    if (clubError) {
      console.error(`[ERROR] Failed to upsert club:`, clubError)
      throw clubError
    }

    console.log(`[SUCCESS] Club upserted`)

    // US1: Upsert club members (sourcing table: club_members)
    if (clubData.members && clubData.members.length > 0) {
      console.log(`[INFO] Upserting ${clubData.members.length} members...`)
      
      const members = clubData.members.map((member: any) => ({
        club_id: clubId,
        rider_id: member.riderId || member.rider_id,
        rider_name: member.name,
        ranking: member.ranking,
        category_racing: member.category?.racing || member.categoryRacing || null,
        joined_date: member.joinedDate || null,
        synced_at: new Date().toISOString(),
      }))

      // Batch upsert (50 per batch to avoid timeouts)
      const BATCH_SIZE = 50
      for (let i = 0; i < members.length; i += BATCH_SIZE) {
        const batch = members.slice(i, i + BATCH_SIZE)
        
        const { error: membersError } = await supabase
          .from('club_members')
          .upsert(batch, { onConflict: 'club_id,rider_id' })

        if (membersError) {
          console.error(`[ERROR] Failed to upsert members batch ${i}-${i + batch.length}:`, membersError)
        } else {
          console.log(`[SUCCESS] Upserted members ${i + 1}-${i + batch.length}`)
        }
      }
    }

    console.log(`[SUCCESS] Club ${clubId} synced successfully`)
    
    // Log to sync_logs
    await supabase.from('sync_logs').insert({
      operation: 'sync_club',
      entity_type: 'club',
      entity_id: clubId,
      status: 'success',
      message: `Synced club ${clubData.name} with ${clubData.members?.length || 0} members`,
      duration_ms: 0,
    })

    return { success: true, club: clubData }
  } catch (error: any) {
    console.error(`[ERROR] Failed to sync club ${clubId}:`, error)
    
    // Log error
    await supabase.from('sync_logs').insert({
      operation: 'sync_club',
      entity_type: 'club',
      entity_id: clubId,
      status: 'failed',
      message: error.message || 'Unknown error',
      error_details: { stack: error.stack },
      duration_ms: 0,
    })

    return { success: false, error }
  }
}

// Main
const main = async () => {
  const clubId = parseInt(process.argv[2])
  
  if (!clubId || isNaN(clubId)) {
    console.error('[ERROR] Usage: npx tsx scripts/mvp-sync-club.ts <clubId>')
    console.error('[EXAMPLE] npx tsx scripts/mvp-sync-club.ts 11818')
    process.exit(1)
  }

  console.log(`[START] MVP Sync Club: ${clubId}`)
  
  const result = await syncClub(clubId)
  
  if (result.success) {
    console.log('[COMPLETE] Sync successful ✅')
    process.exit(0)
  } else {
    console.log('[FAILED] Sync failed ❌')
    process.exit(1)
  }
}

main()
