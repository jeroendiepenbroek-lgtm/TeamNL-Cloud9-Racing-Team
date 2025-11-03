#!/usr/bin/env tsx
/**
 * MVP Script: Scrape Events voor Rider
 * 
 * US4 + US5: Scrape events van https://zwiftracing.app/riders/<riderId>
 * 
 * Flow:
 *   1. Fetch HTML van zwiftracing.app/riders/<riderId>
 *   2. Parse event IDs uit HTML
 *   3. Fetch event details van /public/results/<eventId>
 *   4. Fetch event results van /public/zp/<eventId>/results
 *   5. Upsert naar events + event_results tables
 * 
 * Usage:
 *   npx tsx scripts/mvp-scrape-events.ts <riderId> [days]
 *   npx tsx scripts/mvp-scrape-events.ts 150437 90
 */

import { createClient } from '@supabase/supabase-js'

// Config
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!
const ZWIFT_API_KEY = process.env.ZWIFT_API_KEY || '650c6d2fc4ef6858d74cbef1'
const ZWIFT_API_BASE = 'https://zwift-ranking.herokuapp.com'
const SCRAPING_BASE = 'https://zwiftracing.app'

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Helper: Sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function scrapeEvents(riderId: number, days: number = 90) {
  console.log(`[INFO] Scraping events voor rider ${riderId} (laatste ${days} dagen)...`)
  
  try {
    // Step 1: Fetch HTML van zwiftracing.app
    const scrapeUrl = `${SCRAPING_BASE}/riders/${riderId}`
    console.log(`[INFO] Fetching HTML: ${scrapeUrl}`)
    
    const htmlResponse = await fetch(scrapeUrl)
    if (!htmlResponse.ok) {
      throw new Error(`HTTP ${htmlResponse.status}`)
    }

    const html = await htmlResponse.text()
    
    // Step 2: Parse event IDs uit HTML (regex: /results/12345)
    const eventIdRegex = /\/results\/(\d+)/g
    const matches = [...html.matchAll(eventIdRegex)]
    const eventIds = [...new Set(matches.map(m => parseInt(m[1])))] // Uniques
    
    console.log(`[SUCCESS] Gevonden ${eventIds.length} unieke events`)
    
    if (eventIds.length === 0) {
      console.log('[INFO] Geen events gevonden voor deze rider')
      return { success: true, eventsCount: 0 }
    }

    // Step 3 + 4: Fetch event details + results
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < eventIds.length; i++) {
      const eventId = eventIds[i]
      console.log(`[INFO] Processing event ${i + 1}/${eventIds.length}: ${eventId}`)
      
      try {
        // US4: Fetch event details van /public/results/<eventId>
        const eventResponse = await fetch(
          `${ZWIFT_API_BASE}/public/results/${eventId}?apikey=${ZWIFT_API_KEY}`
        )
        
        if (!eventResponse.ok) {
          console.warn(`[WARN] Event ${eventId} niet gevonden (HTTP ${eventResponse.status})`)
          failCount++
          continue
        }

        const eventData = await eventResponse.json()
        
        // Upsert event (sourcing table: events)
        const { error: eventError } = await supabase
          .from('events')
          .upsert({
            event_id: eventId,
            event_name: eventData.name || `Event ${eventId}`,
            event_date: eventData.eventDate || eventData.event_date || new Date().toISOString(),
            route_name: eventData.route || eventData.route_name,
            laps: eventData.laps,
            distance_meters: eventData.distanceInMeters || eventData.distance_meters,
            elevation_meters: eventData.totalElevation || eventData.elevation_meters,
            category: eventData.category,
            source: 'scraping',
            last_synced: new Date().toISOString(),
          }, { onConflict: 'event_id' })

        if (eventError) {
          console.error(`[ERROR] Failed to upsert event ${eventId}:`, eventError)
          failCount++
          continue
        }

        // US5: Fetch event results van /public/zp/<eventId>/results
        await sleep(1000) // Rate limiting: 1 sec tussen calls
        
        const resultsResponse = await fetch(
          `${ZWIFT_API_BASE}/public/zp/${eventId}/results?apikey=${ZWIFT_API_KEY}`
        )
        
        if (!resultsResponse.ok) {
          console.warn(`[WARN] Results voor event ${eventId} niet beschikbaar`)
          successCount++ // Event is al opgeslagen
          continue
        }

        const resultsData = await resultsResponse.json()
        const results = Array.isArray(resultsData) ? resultsData : resultsData.results || []
        
        if (results.length > 0) {
          // Batch upsert results (sourcing table: event_results)
          const resultRecords = results.map((result: any) => ({
            event_id: eventId,
            rider_id: result.riderId || result.rider_id,
            rider_name: result.name || result.rider_name,
            position: result.position || result.rank,
            finish_time_seconds: result.finishTimeInSeconds || result.finish_time_seconds,
            avg_power_watts: result.avgWatts || result.avg_power_watts,
            avg_heart_rate: result.avgHeartRate || result.avg_heart_rate,
            avg_cadence: result.avgCadence || result.avg_cadence,
            normalized_power: result.normalizedPower || result.normalized_power,
            watts_per_kg: result.wPerKg || result.watts_per_kg,
            category: result.category,
            did_finish: result.didFinish !== false,
            dnf_reason: result.dnfReason || null,
            synced_at: new Date().toISOString(),
          }))

          const { error: resultsError } = await supabase
            .from('event_results')
            .upsert(resultRecords, { onConflict: 'event_id,rider_id' })

          if (resultsError) {
            console.error(`[ERROR] Failed to upsert results:`, resultsError)
            failCount++
            continue
          }

          console.log(`[SUCCESS] Event ${eventId} + ${results.length} results synced`)
        } else {
          console.log(`[SUCCESS] Event ${eventId} synced (geen results)`)
        }

        successCount++
        
        // Rate limiting: 2 sec tussen events
        if (i < eventIds.length - 1) {
          await sleep(2000)
        }
        
      } catch (error: any) {
        console.error(`[ERROR] Failed event ${eventId}:`, error.message)
        failCount++
      }
    }

    console.log(`[COMPLETE] Scraping done: ${successCount} success, ${failCount} failed`)
    
    // Log to sync_logs
    await supabase.from('sync_logs').insert({
      operation: 'scrape_events',
      entity_type: 'rider',
      entity_id: riderId,
      status: failCount === 0 ? 'success' : 'partial',
      message: `Scraped ${successCount}/${eventIds.length} events`,
      duration_ms: 0,
    })

    return { success: true, eventsCount: successCount }
    
  } catch (error: any) {
    console.error(`[ERROR] Scraping failed:`, error)
    
    // Log error
    await supabase.from('sync_logs').insert({
      operation: 'scrape_events',
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
  const days = parseInt(process.argv[3]) || 90
  
  if (!riderId || isNaN(riderId)) {
    console.error('[ERROR] Usage: npx tsx scripts/mvp-scrape-events.ts <riderId> [days]')
    console.error('[EXAMPLE] npx tsx scripts/mvp-scrape-events.ts 150437 90')
    process.exit(1)
  }

  console.log(`[START] MVP Scrape Events: rider ${riderId}, last ${days} days`)
  
  const result = await scrapeEvents(riderId, days)
  
  if (result.success) {
    console.log('[COMPLETE] Scraping successful ✅')
    process.exit(0)
  } else {
    console.log('[FAILED] Scraping failed ❌')
    process.exit(1)
  }
}

main()
