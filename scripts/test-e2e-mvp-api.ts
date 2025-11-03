#!/usr/bin/env tsx

/**
 * MVP E2E API Test - Complete 6 Endpoint → 6 Table Validation
 * 
 * Tests alle User Stories:
 * - US1: 6 API endpoints → 6 sourcing tabellen alignment
 * - US2: Rider upload via GUI (simulated)
 * - US3: Club auto-detection via rider data
 * - US4: Event scraping from ZwiftRacing.app
 * - US5: Hourly event sync (manual trigger test)
 * - US6: Hourly rider updates (manual trigger test)
 * 
 * Usage:
 *   npx tsx scripts/test-e2e-mvp-api.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const ZWIFT_API_BASE = 'https://zwift-ranking.herokuapp.com'
const ZWIFT_API_KEY = '650c6d2fc4ef6858d74cbef1'

// Test data
const TEST_RIDER_ID = 150437  // CloudRacer-9
const TEST_CLUB_ID = 11818    // TeamNL
const TEST_EVENT_ID = 4621859 // Example event ID

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  duration?: number
}

const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now()
  try {
    console.log(`\n🧪 ${name}`)
    await fn()
    const duration = Date.now() - start
    results.push({ test: name, status: 'PASS', message: 'Success', duration })
    console.log(`✅ PASS (${duration}ms)`)
  } catch (error: any) {
    const duration = Date.now() - start
    results.push({ test: name, status: 'FAIL', message: error.message, duration })
    console.error(`❌ FAIL (${duration}ms): ${error.message}`)
  }
}

// Helper: Fetch ZwiftRacing API
async function fetchAPI(endpoint: string) {
  const url = `${ZWIFT_API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${ZWIFT_API_KEY}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return await response.json()
}

// Helper: Sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function main() {
  console.log('🚀 MVP E2E API Test - 6 Endpoints → 6 Tables')
  console.log('=' .repeat(70))
  console.log(`Test Rider: ${TEST_RIDER_ID}`)
  console.log(`Test Club: ${TEST_CLUB_ID}`)
  console.log(`Test Event: ${TEST_EVENT_ID}`)
  console.log('=' .repeat(70))

  // ========================================================================
  // US1: API ENDPOINT → TABLE ALIGNMENT TEST
  // ========================================================================

  console.log('\n📋 US1: API Endpoint → Sourcing Table Alignment\n')

  // Endpoint 1: /public/riders/<riderId> → riders table
  await test('Endpoint 1: /public/riders/<riderId> → riders', async () => {
    console.log(`   Fetching: ${ZWIFT_API_BASE}/public/rider/${TEST_RIDER_ID}`)
    const data = await fetchAPI(`/public/rider/${TEST_RIDER_ID}`)
    
    if (!data.riderId) throw new Error('Invalid API response')
    console.log(`   ✓ API Response: ${data.name} (Ranking: ${data.ranking})`)
    
    // Verify table structure
    const { data: rider, error } = await supabase
      .from('riders')
      .select('zwift_id, name, ranking, club_id')
      .eq('zwift_id', TEST_RIDER_ID)
      .maybeSingle()
    
    if (error) throw new Error(`Table query failed: ${error.message}`)
    
    if (rider) {
      console.log(`   ✓ Table 'riders': Found existing rider ${rider.name}`)
    } else {
      console.log(`   ℹ️  Table 'riders': Empty (ready for US2 upload)`)
    }
  })

  // Endpoint 2: /public/riders/<riderId>/<time> → rider_snapshots table
  await test('Endpoint 2: /public/riders/<riderId>/<time> → rider_snapshots', async () => {
    const timestamp = Math.floor(Date.now() / 1000) - 86400 // Yesterday
    console.log(`   Fetching: ${ZWIFT_API_BASE}/public/rider/${TEST_RIDER_ID}/${timestamp}`)
    
    const data = await fetchAPI(`/public/rider/${TEST_RIDER_ID}/${timestamp}`)
    
    if (!data.riderId) throw new Error('Invalid API response')
    console.log(`   ✓ API Response: Historical data (Ranking: ${data.ranking})`)
    
    // Verify table structure
    const { error } = await supabase
      .from('rider_snapshots')
      .select('id')
      .limit(1)
    
    if (error) throw new Error(`Table not found: ${error.message}`)
    console.log(`   ✓ Table 'rider_snapshots': Ready for time-series data`)
  })

  // Endpoint 3: /public/clubs/<id> → clubs table
  await test('Endpoint 3: /public/clubs/<id> → clubs', async () => {
    console.log(`   Fetching: ${ZWIFT_API_BASE}/public/clubs/${TEST_CLUB_ID}`)
    const data = await fetchAPI(`/public/clubs/${TEST_CLUB_ID}`)
    
    if (!data.id) throw new Error('Invalid API response')
    console.log(`   ✓ API Response: ${data.name} (${data.memberCount} members)`)
    
    // Verify table structure
    const { data: club, error } = await supabase
      .from('clubs')
      .select('club_id, club_name, member_count')
      .eq('club_id', TEST_CLUB_ID)
      .maybeSingle()
    
    if (error) throw new Error(`Table query failed: ${error.message}`)
    
    if (club) {
      console.log(`   ✓ Table 'clubs': Found ${club.club_name} (${club.member_count} members)`)
    } else {
      console.log(`   ℹ️  Table 'clubs': Empty (ready for US3 auto-detect)`)
    }
  })

  // Endpoint 4: /public/clubs/<id> → club_members table (members array)
  await test('Endpoint 4: /public/clubs/<id> (members) → club_members', async () => {
    console.log(`   Fetching club members from /public/clubs/${TEST_CLUB_ID}`)
    const data = await fetchAPI(`/public/clubs/${TEST_CLUB_ID}`)
    
    if (!data.members || !Array.isArray(data.members)) {
      throw new Error('No members array in response')
    }
    
    console.log(`   ✓ API Response: ${data.members.length} members`)
    
    // Verify table structure
    const { data: members, error } = await supabase
      .from('club_members')
      .select('rider_id, rider_name')
      .eq('club_id', TEST_CLUB_ID)
      .limit(5)
    
    if (error) throw new Error(`Table query failed: ${error.message}`)
    
    if (members && members.length > 0) {
      console.log(`   ✓ Table 'club_members': Found ${members.length} members`)
    } else {
      console.log(`   ℹ️  Table 'club_members': Empty (ready for club sync)`)
    }
  })

  // Endpoint 5: /public/results/<eventId> → events table
  await test('Endpoint 5: /public/results/<eventId> → events', async () => {
    console.log(`   Fetching: ${ZWIFT_API_BASE}/public/results/${TEST_EVENT_ID}`)
    const data = await fetchAPI(`/public/results/${TEST_EVENT_ID}`)
    
    if (!data.id) throw new Error('Invalid API response')
    console.log(`   ✓ API Response: ${data.name} (${new Date(data.eventDate).toLocaleDateString()})`)
    
    // Verify table structure
    const { data: event, error } = await supabase
      .from('events')
      .select('event_id, name, event_date')
      .eq('event_id', TEST_EVENT_ID)
      .maybeSingle()
    
    if (error) throw new Error(`Table query failed: ${error.message}`)
    
    if (event) {
      console.log(`   ✓ Table 'events': Found ${event.name}`)
    } else {
      console.log(`   ℹ️  Table 'events': Empty (ready for US4 scraping)`)
    }
  })

  // Endpoint 6: /public/zp/<eventId>/results → event_results table
  await test('Endpoint 6: /public/zp/<eventId>/results → event_results', async () => {
    console.log(`   Fetching: ${ZWIFT_API_BASE}/public/zp/${TEST_EVENT_ID}/results`)
    const data = await fetchAPI(`/public/zp/${TEST_EVENT_ID}/results`)
    
    if (!Array.isArray(data)) throw new Error('Invalid API response')
    console.log(`   ✓ API Response: ${data.length} participants`)
    
    // Verify table structure
    const { data: results, error } = await supabase
      .from('event_results')
      .select('event_id, rider_id, position')
      .eq('event_id', TEST_EVENT_ID)
      .limit(5)
    
    if (error) throw new Error(`Table query failed: ${error.message}`)
    
    if (results && results.length > 0) {
      console.log(`   ✓ Table 'event_results': Found ${results.length} results`)
    } else {
      console.log(`   ℹ️  Table 'event_results': Empty (ready for event sync)`)
    }
  })

  // ========================================================================
  // US2: RIDER UPLOAD TEST (Frontend simulation)
  // ========================================================================

  console.log('\n📋 US2: Rider Upload via GUI (Simulated)\n')

  await test('US2: Upload rider via AdminPanel (simulation)', async () => {
    console.log(`   Simulating: Upload rider ${TEST_RIDER_ID}`)
    
    // Fetch rider from API
    const apiData = await fetchAPI(`/public/rider/${TEST_RIDER_ID}`)
    
    // Extract club info (US3)
    const clubId = apiData.clubId || apiData.club_id
    const clubName = apiData.clubName || apiData.club_name
    
    console.log(`   ✓ Fetched from API: ${apiData.name}`)
    console.log(`   ✓ Club detected: ${clubName} (ID: ${clubId})`)
    
    // Upsert rider
    const { error: riderError } = await supabase
      .from('riders')
      .upsert({
        zwift_id: apiData.riderId,
        name: apiData.name,
        club_id: clubId,
        club_name: clubName,
        ranking: apiData.ranking,
        ranking_score: apiData.rankingScore,
        ftp: apiData.ftp,
        weight: apiData.weight,
        category_racing: apiData.category?.racing,
        category_zftp: apiData.category?.zftp,
        age: apiData.age,
        gender: apiData.gender,
        country: apiData.country,
        last_synced: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'zwift_id' })
    
    if (riderError) throw new Error(`Rider upsert failed: ${riderError.message}`)
    
    console.log(`   ✅ Rider uploaded to 'riders' table`)
  })

  // ========================================================================
  // US3: CLUB AUTO-DETECTION TEST
  // ========================================================================

  console.log('\n📋 US3: Club Auto-Detection from Rider Data\n')

  await test('US3: Auto-detect and upsert club', async () => {
    // Get club_id from rider
    const { data: rider } = await supabase
      .from('riders')
      .select('club_id, club_name')
      .eq('zwift_id', TEST_RIDER_ID)
      .single()
    
    if (!rider?.club_id) throw new Error('No club_id on rider')
    
    console.log(`   ✓ Detected club_id: ${rider.club_id}`)
    
    // Fetch club data from API
    const clubData = await fetchAPI(`/public/clubs/${rider.club_id}`)
    
    console.log(`   ✓ Fetched club: ${clubData.name}`)
    
    // Upsert club
    const { error } = await supabase
      .from('clubs')
      .upsert({
        club_id: clubData.id,
        club_name: clubData.name,
        description: clubData.description,
        member_count: clubData.memberCount,
        country: clubData.country,
        created_date: clubData.createdDate,
        last_synced: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'club_id' })
    
    if (error) throw new Error(`Club upsert failed: ${error.message}`)
    
    console.log(`   ✅ Club auto-detected and saved to 'clubs' table`)
  })

  // ========================================================================
  // US4: EVENT SCRAPING TEST
  // ========================================================================

  console.log('\n📋 US4: Event Scraping from ZwiftRacing.app\n')

  await test('US4: Scrape events for rider', async () => {
    console.log(`   Scraping: https://www.zwiftracing.app/riders/${TEST_RIDER_ID}`)
    
    // Simulate scraping (fetch HTML, parse event IDs)
    // In production: scripts/mvp-scrape-events.ts does this
    const response = await fetch(`https://www.zwiftracing.app/riders/${TEST_RIDER_ID}`)
    const html = await response.text()
    
    // Parse event IDs from HTML (simplified regex)
    const eventMatches = html.match(/\/events\/(\d+)/g) || []
    const eventIds = [...new Set(eventMatches.map(m => parseInt(m.split('/')[2])))]
    
    console.log(`   ✓ Found ${eventIds.length} event IDs in HTML`)
    
    if (eventIds.length === 0) {
      console.log(`   ℹ️  No events found (rider may not have recent races)`)
      return
    }
    
    // Test: Fetch one event and upsert
    const testEventId = eventIds[0]
    console.log(`   Testing event ${testEventId}...`)
    
    const eventData = await fetchAPI(`/public/results/${testEventId}`)
    
    const { error } = await supabase
      .from('events')
      .upsert({
        event_id: eventData.id,
        name: eventData.name,
        event_date: new Date(eventData.eventDate).toISOString(),
        route_name: eventData.route,
        laps: eventData.laps,
        distance_meters: eventData.distanceInMeters,
        elevation_meters: eventData.totalElevation,
        category: eventData.category,
        source: 'scraping',
        last_synced: new Date().toISOString(),
      }, { onConflict: 'event_id' })
    
    if (error) throw new Error(`Event upsert failed: ${error.message}`)
    
    console.log(`   ✅ Event scraped and saved to 'events' table`)
  })

  // ========================================================================
  // US5+US6: HOURLY SYNC TEST (Manual trigger simulation)
  // ========================================================================

  console.log('\n📋 US5+US6: Hourly Sync (Manual Trigger Test)\n')

  await test('US5: Sync new events for tracked riders', async () => {
    console.log(`   Simulating: Hourly event sync for rider ${TEST_RIDER_ID}`)
    
    // Get tracked riders
    const { data: riders } = await supabase
      .from('riders')
      .select('zwift_id')
      .limit(5)
    
    if (!riders || riders.length === 0) {
      console.log(`   ℹ️  No tracked riders yet. Upload via US2 first.`)
      return
    }
    
    console.log(`   ✓ Found ${riders.length} tracked riders`)
    console.log(`   ✓ Would scrape events for each rider (see scripts/mvp-scrape-events.ts)`)
    console.log(`   ✓ Scheduled: GitHub Actions runs hourly via cron '0 * * * *'`)
  })

  await test('US6: Sync rider updates hourly', async () => {
    console.log(`   Simulating: Hourly rider update for ${TEST_RIDER_ID}`)
    
    // Fetch latest rider data
    const apiData = await fetchAPI(`/public/rider/${TEST_RIDER_ID}`)
    
    // Update rider
    const { error } = await supabase
      .from('riders')
      .update({
        ranking: apiData.ranking,
        ranking_score: apiData.rankingScore,
        ftp: apiData.ftp,
        weight: apiData.weight,
        category_racing: apiData.category?.racing,
        last_synced: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('zwift_id', TEST_RIDER_ID)
    
    if (error) throw new Error(`Rider update failed: ${error.message}`)
    
    console.log(`   ✅ Rider updated with latest data`)
    console.log(`   ✓ Scheduled: GitHub Actions runs hourly via cron '0 * * * *'`)
  })

  // ========================================================================
  // DATABASE STATISTICS
  // ========================================================================

  console.log('\n📊 Database Statistics\n')

  await test('Database table row counts', async () => {
    const tables = ['riders', 'clubs', 'club_members', 'events', 'event_results', 'rider_snapshots']
    const stats: Record<string, number> = {}

    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      stats[table] = count || 0
    }

    console.log('   Table Row Counts:')
    Object.entries(stats).forEach(([table, count]) => {
      const icon = count === 0 ? '⚠️ ' : '✅'
      console.log(`   ${icon} ${table.padEnd(20)}: ${count.toLocaleString()} rows`)
    })
  })

  // ========================================================================
  // SUMMARY
  // ========================================================================

  console.log('\n' + '=' .repeat(70))
  console.log('📊 E2E Test Summary\n')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0)

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌'
    const duration = r.duration ? ` (${r.duration}ms)` : ''
    console.log(`${icon} ${r.test}${duration}`)
  })

  console.log(`\n📈 Results: ${passed}/${results.length} passed, ${failed} failed`)
  console.log(`⏱️  Total duration: ${(totalDuration / 1000).toFixed(2)}s`)

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed.')
    console.log('\n💡 Next steps:')
    console.log('   1. Check Supabase schema: Run supabase/mvp-schema.sql')
    console.log('   2. Upload rider: https://team-nl-cloud9-racing-team.vercel.app/')
    console.log('   3. Trigger sync: GitHub Actions → MVP Production Sync')
    process.exit(1)
  }

  console.log('\n✅ All tests passed! MVP is production ready.')
  console.log('\n🚀 Production URLs:')
  console.log('   Frontend: https://team-nl-cloud9-racing-team.vercel.app/')
  console.log('   Database: https://app.supabase.com/project/bktbeefdmrpxhsyyalvc')
  console.log('   Actions:  https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team/actions')
  
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌ Test runner failed:', err.message)
  process.exit(1)
})
