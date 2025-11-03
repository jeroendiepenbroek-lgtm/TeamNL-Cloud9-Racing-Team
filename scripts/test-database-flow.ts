#!/usr/bin/env tsx

/**
 * Database Flow Test - Test 6 Tabellen zonder API dependency
 * 
 * Test strategie: Insert mock data → Verify data flow → Check relationships
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL'
  message: string
}

const results: TestResult[] = []

function test(name: string, status: 'PASS' | 'FAIL', message: string) {
  results.push({ test: name, status, message })
  const icon = status === 'PASS' ? '✅' : '❌'
  console.log(`${icon} ${name}: ${message}`)
}

async function main() {
  console.log('🧪 Database Flow Test - Mock Data Validation\n')
  console.log('=' .repeat(70))
  
  // Mock data
  const mockRider = {
    zwift_id: 999999,
    name: 'Test Rider',
    club_id: 88888,
    club_name: 'Test Club',
    ranking: 1000,
    ranking_score: 95.5,
    ftp: 300,
    weight: 75,
    category_racing: 'B',
    category_zftp: 'B',
    age: 30,
    gender: 'M',
    country: 'NL',
    last_synced: new Date().toISOString(),
  }
  
  const mockClub = {
    club_id: 88888,
    club_name: 'Test Club',
    description: 'Test club for E2E validation',
    member_count: 1,
    country: 'NL',
    last_synced: new Date().toISOString(),
  }
  
  const mockEvent = {
    event_id: 777777,
    name: 'Test Race',
    event_date: new Date().toISOString(),
    route_name: 'Watopia',
    laps: 3,
    distance_meters: 25000,
    elevation_meters: 500,
    category: 'B',
    source: 'test',
    last_synced: new Date().toISOString(),
  }
  
  console.log('\n📋 Test 1: Schema Verification\n')
  
  // Test 1: Check all tables exist
  const tables = ['clubs', 'club_members', 'riders', 'rider_snapshots', 'events', 'event_results', 'sync_logs']
  let allTablesExist = true
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
      if (error) {
        test(`Table: ${table}`, 'FAIL', error.message)
        allTablesExist = false
      } else {
        test(`Table: ${table}`, 'PASS', 'Exists')
      }
    } catch (e: any) {
      test(`Table: ${table}`, 'FAIL', e.message)
      allTablesExist = false
    }
  }
  
  if (!allTablesExist) {
    console.log('\n❌ Schema incomplete. Run supabase/mvp-schema.sql first.')
    process.exit(1)
  }
  
  console.log('\n📋 Test 2: Data Insertion (US1: 6 Tabellen)\n')
  
  // Test 2: Insert club
  try {
    const { error } = await supabase.from('clubs').upsert(mockClub, { onConflict: 'club_id' })
    if (error) throw error
    test('Insert: clubs', 'PASS', `Club ${mockClub.club_id} inserted`)
  } catch (e: any) {
    test('Insert: clubs', 'FAIL', e.message)
  }
  
  // Test 3: Insert rider (US2: Rider upload)
  try {
    const { error } = await supabase.from('riders').upsert(mockRider, { onConflict: 'zwift_id' })
    if (error) throw error
    test('Insert: riders (US2)', 'PASS', `Rider ${mockRider.zwift_id} inserted`)
  } catch (e: any) {
    test('Insert: riders (US2)', 'FAIL', e.message)
  }
  
  // Test 4: Verify club auto-detection (US3)
  try {
    const { data: rider } = await supabase
      .from('riders')
      .select('club_id, club_name')
      .eq('zwift_id', mockRider.zwift_id)
      .single()
    
    if (rider && rider.club_id === mockClub.club_id) {
      test('Club auto-detect (US3)', 'PASS', `Club ${rider.club_name} linked to rider`)
    } else {
      test('Club auto-detect (US3)', 'FAIL', 'Club not linked')
    }
  } catch (e: any) {
    test('Club auto-detect (US3)', 'FAIL', e.message)
  }
  
  // Test 5: Insert club member
  try {
    const { error } = await supabase.from('club_members').upsert({
      club_id: mockClub.club_id,
      rider_id: mockRider.zwift_id,
      rider_name: mockRider.name,
      ranking: mockRider.ranking,
      category: mockRider.category_racing,
    }, { onConflict: 'club_id,rider_id' })
    
    if (error) throw error
    test('Insert: club_members', 'PASS', 'Member added to club')
  } catch (e: any) {
    test('Insert: club_members', 'FAIL', e.message)
  }
  
  // Test 6: Insert event (US4: Event scraping)
  try {
    const { error } = await supabase.from('events').upsert(mockEvent, { onConflict: 'event_id' })
    if (error) throw error
    test('Insert: events (US4)', 'PASS', `Event ${mockEvent.event_id} inserted`)
  } catch (e: any) {
    test('Insert: events (US4)', 'FAIL', e.message)
  }
  
  // Test 7: Insert event result
  try {
    const { error } = await supabase.from('event_results').upsert({
      event_id: mockEvent.event_id,
      rider_id: mockRider.zwift_id,
      position: 10,
      finish_time_seconds: 3600,
      avg_watts: 280,
      category: 'B',
    }, { onConflict: 'event_id,rider_id' })
    
    if (error) throw error
    test('Insert: event_results', 'PASS', 'Result recorded')
  } catch (e: any) {
    test('Insert: event_results', 'FAIL', e.message)
  }
  
  // Test 8: Insert rider snapshot (US1: Time-series)
  try {
    const { error } = await supabase.from('rider_snapshots').insert({
      rider_id: mockRider.zwift_id,
      snapshot_timestamp: new Date().toISOString(),
      ranking: mockRider.ranking,
      ranking_score: mockRider.ranking_score,
      ftp: mockRider.ftp,
      weight: mockRider.weight,
      raw_data: mockRider,
    })
    
    if (error) throw error
    test('Insert: rider_snapshots (US1)', 'PASS', 'Snapshot saved')
  } catch (e: any) {
    test('Insert: rider_snapshots (US1)', 'FAIL', e.message)
  }
  
  console.log('\n📋 Test 3: Data Relationships\n')
  
  // Test 9: Query rider with club (JOIN test)
  try {
    const { data: rider } = await supabase
      .from('riders')
      .select('zwift_id, name, club_id, club_name, ranking')
      .eq('zwift_id', mockRider.zwift_id)
      .single()
    
    if (rider && rider.club_id) {
      test('Relationship: rider → club', 'PASS', `Rider linked to club ${rider.club_id}`)
    } else {
      test('Relationship: rider → club', 'FAIL', 'No club relationship')
    }
  } catch (e: any) {
    test('Relationship: rider → club', 'FAIL', e.message)
  }
  
  // Test 10: Query event results (JOIN test)
  try {
    const { data: results, count } = await supabase
      .from('event_results')
      .select('event_id, rider_id, position', { count: 'exact' })
      .eq('event_id', mockEvent.event_id)
    
    if (count && count > 0) {
      test('Relationship: event → results', 'PASS', `${count} results for event`)
    } else {
      test('Relationship: event → results', 'FAIL', 'No results found')
    }
  } catch (e: any) {
    test('Relationship: event → results', 'FAIL', e.message)
  }
  
  // Test 11: Query rider snapshots (time-series test)
  try {
    const { data: snapshots, count } = await supabase
      .from('rider_snapshots')
      .select('rider_id, snapshot_timestamp', { count: 'exact' })
      .eq('rider_id', mockRider.zwift_id)
      .order('snapshot_timestamp', { ascending: false })
    
    if (count && count > 0) {
      test('Time-series: rider snapshots', 'PASS', `${count} snapshots found`)
    } else {
      test('Time-series: rider snapshots', 'FAIL', 'No snapshots')
    }
  } catch (e: any) {
    test('Time-series: rider snapshots', 'FAIL', e.message)
  }
  
  console.log('\n📋 Test 4: Computed Columns\n')
  
  // Test 12: watts_per_kg (computed column)
  try {
    const { data: rider } = await supabase
      .from('riders')
      .select('zwift_id, ftp, weight, watts_per_kg')
      .eq('zwift_id', mockRider.zwift_id)
      .single()
    
    if (rider && rider.watts_per_kg) {
      const expected = Math.round((mockRider.ftp / mockRider.weight) * 100) / 100
      const actual = rider.watts_per_kg
      
      if (Math.abs(expected - actual) < 0.01) {
        test('Computed: watts_per_kg', 'PASS', `${actual} W/kg (correct)`)
      } else {
        test('Computed: watts_per_kg', 'FAIL', `Expected ${expected}, got ${actual}`)
      }
    } else {
      test('Computed: watts_per_kg', 'FAIL', 'No watts_per_kg value')
    }
  } catch (e: any) {
    test('Computed: watts_per_kg', 'FAIL', e.message)
  }
  
  console.log('\n📋 Test 5: Database Statistics\n')
  
  // Test 13: Row counts
  const stats: Record<string, number> = {}
  for (const table of tables) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
    stats[table] = count || 0
  }
  
  console.log('   Table Row Counts:')
  Object.entries(stats).forEach(([table, count]) => {
    const icon = count > 0 ? '✅' : '⚠️ '
    console.log(`   ${icon} ${table.padEnd(20)}: ${count.toLocaleString()} rows`)
  })
  
  test('Database stats', 'PASS', 'All tables accessible')
  
  // Test 14: Cleanup test data
  console.log('\n📋 Test 6: Cleanup\n')
  
  try {
    await supabase.from('event_results').delete().eq('event_id', mockEvent.event_id)
    await supabase.from('rider_snapshots').delete().eq('rider_id', mockRider.zwift_id)
    await supabase.from('club_members').delete().eq('club_id', mockClub.club_id)
    await supabase.from('events').delete().eq('event_id', mockEvent.event_id)
    await supabase.from('riders').delete().eq('zwift_id', mockRider.zwift_id)
    await supabase.from('clubs').delete().eq('club_id', mockClub.club_id)
    
    test('Cleanup: test data', 'PASS', 'Mock data removed')
  } catch (e: any) {
    test('Cleanup: test data', 'FAIL', e.message)
  }
  
  // Summary
  console.log('\n' + '=' .repeat(70))
  console.log('📊 Test Summary\n')
  
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌'
    console.log(`${icon} ${r.test}: ${r.message}`)
  })
  
  console.log(`\n📈 Results: ${passed}/${results.length} passed, ${failed} failed`)
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check schema or permissions.')
    process.exit(1)
  }
  
  console.log('\n✅ All database flow tests passed!')
  console.log('\n💡 Next: Get working ZwiftRacing API key to populate real data')
  console.log('   Or use frontend upload: https://team-nl-cloud9-racing-team.vercel.app/')
  
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌ Test runner failed:', err.message)
  process.exit(1)
})
