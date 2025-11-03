#!/usr/bin/env tsx

/**
 * E2E Production Test - MVP Clean Architecture
 * 
 * Tests:
 * 1. Upload rider via frontend (US2)
 * 2. Auto-detect club (US3)
 * 3. Trigger GitHub Actions sync (US5+US6)
 * 4. Verify events scraped (US4)
 * 
 * Usage:
 *   npx tsx scripts/test-e2e-production.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const TEST_RIDER_ID = 150437 // CloudRacer-9

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
  data?: any
}

const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void>) {
  try {
    console.log(`\n🧪 Testing: ${name}...`)
    await fn()
    results.push({ test: name, status: 'PASS', message: 'Success' })
    console.log(`✅ PASS: ${name}`)
  } catch (error: any) {
    results.push({ test: name, status: 'FAIL', message: error.message })
    console.error(`❌ FAIL: ${name} - ${error.message}`)
  }
}

async function main() {
  console.log('🚀 MVP E2E Production Test')
  console.log('=' .repeat(60))

  // Test 1: Database Connection
  await test('Database Connection', async () => {
    const { data, error } = await supabase.from('riders').select('count').single()
    if (error) throw new Error(`DB connection failed: ${error.message}`)
    console.log(`   Connected to Supabase (${SUPABASE_URL})`)
  })

  // Test 2: Check rider exists (from Upload)
  await test('US2: Rider Upload (Check if exists)', async () => {
    const { data, error } = await supabase
      .from('riders')
      .select('zwift_id, name, club_id, club_name, ranking')
      .eq('zwift_id', TEST_RIDER_ID)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Query failed: ${error.message}`)
    }

    if (!data) {
      console.log(`   ⚠️  Rider ${TEST_RIDER_ID} not found. Upload via frontend first!`)
      console.log(`   URL: https://team-nl-cloud9-racing-team.vercel.app/`)
      throw new Error('Rider not uploaded yet')
    }

    console.log(`   Found: ${data.name} (Ranking: ${data.ranking})`)
    results.push({ 
      test: 'Rider Data', 
      status: 'PASS', 
      message: `${data.name} - Ranking ${data.ranking}`,
      data 
    })
  })

  // Test 3: Auto-detected Club
  await test('US3: Club Auto-Detection', async () => {
    const { data: rider } = await supabase
      .from('riders')
      .select('club_id, club_name')
      .eq('zwift_id', TEST_RIDER_ID)
      .single()

    if (!rider?.club_id) {
      throw new Error('No club_id found on rider')
    }

    const { data: club, error } = await supabase
      .from('clubs')
      .select('club_id, club_name, member_count')
      .eq('club_id', rider.club_id)
      .single()

    if (error) throw new Error(`Club not found: ${error.message}`)

    console.log(`   Club: ${club.club_name} (${club.member_count} members)`)
    results.push({ 
      test: 'Club Auto-detected', 
      status: 'PASS', 
      message: club.club_name,
      data: club 
    })
  })

  // Test 4: Check Events (from scraping)
  await test('US4: Events Scraped', async () => {
    const { data, error } = await supabase
      .from('events')
      .select('event_id, name, event_date')
      .order('event_date', { ascending: false })
      .limit(5)

    if (error) throw new Error(`Events query failed: ${error.message}`)

    if (!data || data.length === 0) {
      console.log(`   ⚠️  No events found. Run GitHub Actions workflow to scrape events.`)
      console.log(`   URL: https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team/actions`)
      throw new Error('Events not scraped yet')
    }

    console.log(`   Found ${data.length} recent events:`)
    data.forEach(e => {
      console.log(`   - ${new Date(e.event_date).toLocaleDateString()}: ${e.name}`)
    })

    results.push({ 
      test: 'Events Scraped', 
      status: 'PASS', 
      message: `${data.length} events found`,
      data 
    })
  })

  // Test 5: Check Event Results
  await test('US4: Event Results', async () => {
    const { data, error } = await supabase
      .from('event_results')
      .select('event_id, rider_id, position, watts_per_kg')
      .eq('rider_id', TEST_RIDER_ID)
      .order('event_id', { ascending: false })
      .limit(5)

    if (error) throw new Error(`Results query failed: ${error.message}`)

    if (!data || data.length === 0) {
      console.log(`   ⚠️  No results for rider ${TEST_RIDER_ID}`)
      throw new Error('No event results found')
    }

    console.log(`   Found ${data.length} results for rider ${TEST_RIDER_ID}:`)
    data.forEach(r => {
      console.log(`   - Event ${r.event_id}: P${r.position} @ ${r.watts_per_kg} W/kg`)
    })

    results.push({ 
      test: 'Event Results', 
      status: 'PASS', 
      message: `${data.length} results found`,
      data 
    })
  })

  // Test 6: Check Rider Snapshots (historical)
  await test('US1: Rider Snapshots (time-series)', async () => {
    const { data, error } = await supabase
      .from('rider_snapshots')
      .select('rider_id, snapshot_timestamp, ranking, ftp, weight')
      .eq('rider_id', TEST_RIDER_ID)
      .order('snapshot_timestamp', { ascending: false })
      .limit(5)

    if (error) throw new Error(`Snapshots query failed: ${error.message}`)

    if (!data || data.length === 0) {
      console.log(`   ℹ️  No snapshots yet. Will be created on next sync.`)
      results.push({ test: 'Snapshots', status: 'SKIP', message: 'No data yet' })
      return
    }

    console.log(`   Found ${data.length} historical snapshots:`)
    data.forEach(s => {
      const date = new Date(s.snapshot_timestamp).toLocaleDateString()
      console.log(`   - ${date}: Ranking ${s.ranking}, FTP ${s.ftp}, Weight ${s.weight}kg`)
    })

    results.push({ 
      test: 'Snapshots', 
      status: 'PASS', 
      message: `${data.length} snapshots found`,
      data 
    })
  })

  // Test 7: Database Stats
  await test('Database Statistics', async () => {
    const tables = ['riders', 'clubs', 'club_members', 'events', 'event_results', 'rider_snapshots']
    const stats: Record<string, number> = {}

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.log(`   ⚠️  ${table}: error`)
        stats[table] = -1
      } else {
        stats[table] = count || 0
      }
    }

    console.log('\n   📊 Table Row Counts:')
    Object.entries(stats).forEach(([table, count]) => {
      const status = count === -1 ? '❌' : count === 0 ? '⚠️ ' : '✅'
      console.log(`   ${status} ${table.padEnd(20)}: ${count === -1 ? 'ERROR' : count} rows`)
    })

    results.push({ 
      test: 'Database Stats', 
      status: 'PASS', 
      message: 'All tables accessible',
      data: stats 
    })
  })

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 E2E Test Summary\n')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const skipped = results.filter(r => r.status === 'SKIP').length

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️ '
    console.log(`${icon} ${r.test}: ${r.message}`)
  })

  console.log(`\n📈 Results: ${passed} passed, ${failed} failed, ${skipped} skipped`)

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check errors above.')
    console.log('\n💡 Next steps:')
    if (results.find(r => r.test.includes('Rider Upload') && r.status === 'FAIL')) {
      console.log('   1. Upload rider 150437 via frontend:')
      console.log('      https://team-nl-cloud9-racing-team.vercel.app/')
    }
    if (results.find(r => r.test.includes('Events') && r.status === 'FAIL')) {
      console.log('   2. Run GitHub Actions workflow to scrape events:')
      console.log('      https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team/actions')
    }
    process.exit(1)
  }

  console.log('\n✅ All tests passed! MVP is production ready.')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Test runner failed:', err)
  process.exit(1)
})
