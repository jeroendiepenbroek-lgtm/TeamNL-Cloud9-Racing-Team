#!/usr/bin/env tsx
/**
 * MVP Script: Sync Single Rider
 * 
 * US2 + US3 + US6: Fetch rider data from ZwiftRacing API → Upsert to Supabase
 * 
 * API Endpoints:
 *   - /public/riders/<riderId> → riders table
 *   - Auto-detect club → clubs table
 * 
 * Usage:
 *   npx tsx scripts/mvp-sync-rider.ts <riderId>
 *   npx tsx scripts/mvp-sync-rider.ts 150437
 */

import { createClient } from '@supabase/supabase-js'

// Config
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!
const ZWIFT_API_KEY = process.env.ZWIFT_API_KEY || '650c6d2fc4ef6858d74cbef1'
const ZWIFT_API_BASE = 'https://zwift-ranking.herokuapp.com'

// Supabase client (service_role for write access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function syncRider(riderId: number) {
  console.log(`[INFO] Fetching rider ${riderId} from ZwiftRacing API...`)
  
  try {
    // Fetch rider data from API
    const response = await fetch(
      `${ZWIFT_API_BASE}/public/rider/${riderId}?apikey=${ZWIFT_API_KEY}`
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const riderData = await response.json()
    console.log(`[SUCCESS] Fetched rider: ${riderData.name}`)

    // US3: Auto-detect club
    const clubId = riderData.clubId || riderData.club_id
    const clubName = riderData.clubName || riderData.club_name || null

    if (clubId && clubName) {
      console.log(`[INFO] Auto-detected club: ${clubName} (${clubId})`)
      
      // Upsert club (sourcing table: clubs)
      const { error: clubError } = await supabase
        .from('clubs')
        .upsert({
          club_id: clubId,
          club_name: clubName,
          member_count: 0, // Will be updated by club sync
          last_synced: new Date().toISOString(),
        }, { onConflict: 'club_id' })

      if (clubError) {
        console.error(`[ERROR] Failed to upsert club:`, clubError)
      } else {
        console.log(`[SUCCESS] Club upserted`)
      }
    }

    // US2: Upsert rider (sourcing table: riders)
    const { error: riderError } = await supabase
      .from('riders')
      .upsert({
        zwift_id: riderData.riderId,
        name: riderData.name,
        club_id: clubId,
        club_name: clubName,
        ranking: riderData.ranking,
        ranking_score: riderData.rankingScore || riderData.ranking_score,
        category_racing: riderData.category?.racing || riderData.categoryRacing || null,
        category_zftp: riderData.category?.zftp || null,
        ftp: riderData.ftp,
        weight: riderData.weight,
        age: riderData.age,
        gender: riderData.gender,
        country: riderData.country || riderData.countryCode,
        total_races: riderData.totalRaces || 0,
        total_wins: riderData.totalWins || 0,
        total_podiums: riderData.totalPodiums || 0,
        last_synced: new Date().toISOString(),
      }, { onConflict: 'zwift_id' })

    if (riderError) {
      console.error(`[ERROR] Failed to upsert rider:`, riderError)
      throw riderError
    }

    console.log(`[SUCCESS] Rider ${riderId} synced successfully`)
    
    // Log to sync_logs
    await supabase.from('sync_logs').insert({
      operation: 'sync_rider',
      entity_type: 'rider',
      entity_id: riderId,
      status: 'success',
      message: `Synced rider ${riderData.name}`,
      duration_ms: 0,
    })

    return { success: true, rider: riderData }
  } catch (error: any) {
    console.error(`[ERROR] Failed to sync rider ${riderId}:`, error)
    
    // Log error
    await supabase.from('sync_logs').insert({
      operation: 'sync_rider',
      entity_type: 'rider',
      entity_id: riderId,
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
  const riderId = parseInt(process.argv[2])
  
  if (!riderId || isNaN(riderId)) {
    console.error('[ERROR] Usage: npx tsx scripts/mvp-sync-rider.ts <riderId>')
    process.exit(1)
  }

  console.log(`[START] MVP Sync Rider: ${riderId}`)
  
  const result = await syncRider(riderId)
  
  if (result.success) {
    console.log('[COMPLETE] Sync successful ✅')
    process.exit(0)
  } else {
    console.log('[FAILED] Sync failed ❌')
    process.exit(1)
  }
}

main()
