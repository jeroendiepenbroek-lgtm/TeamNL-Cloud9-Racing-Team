#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://bktbeefdmrpxhsyyalvc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || ''
)

async function inspect() {
  console.log('🔍 Inspecting Actual Supabase Schema\n')
  
  // Check clubs table
  console.log('📋 CLUBS table:')
  const { data: clubSample } = await supabase.from('clubs').select('*').limit(1)
  if (clubSample && clubSample[0]) {
    console.log('   Columns:', Object.keys(clubSample[0]).join(', '))
  }
  
  // Check riders table
  console.log('\n📋 RIDERS table:')
  const { data: riderSample } = await supabase.from('riders').select('*').limit(1)
  if (riderSample && riderSample.length > 0) {
    console.log('   Columns:', Object.keys(riderSample[0]).join(', '))
  } else {
    console.log('   (Empty - trying insert to see schema)')
    const { error } = await supabase.from('riders').insert({ zwift_id: 1 })
    if (error) {
      console.log('   Error:', error.message)
      console.log('   Details:', error.details)
      console.log('   Hint:', error.hint)
    }
  }
  
  // Check events table
  console.log('\n📋 EVENTS table:')
  const { data: eventSample } = await supabase.from('events').select('*').limit(1)
  if (eventSample && eventSample.length > 0) {
    console.log('   Columns:', Object.keys(eventSample[0]).join(', '))
  } else {
    console.log('   (Empty - trying insert to see schema)')
    const { error } = await supabase.from('events').insert({ event_id: 1 })
    if (error) {
      console.log('   Error:', error.message)
    }
  }
  
  // Try to get schema from information_schema
  console.log('\n📋 Querying PostgreSQL information_schema...\n')
  
  const tables = ['clubs', 'riders', 'events', 'club_members', 'event_results', 'rider_snapshots']
  
  for (const table of tables) {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: table }).select('*')
    
    if (error) {
      // Fallback: try direct query
      console.log(`❌ ${table}: RPC not available (${error.message})`)
    }
  }
}

inspect()
