#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkSchema() {
  console.log('🔍 Checking Supabase Schema...\n')
  
  const tables = [
    'clubs',
    'club_members', 
    'riders',
    'rider_snapshots',
    'events',
    'event_results',
    'sync_logs'
  ]
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.log(`❌ ${table.padEnd(20)}: NOT FOUND (${error.message})`)
      } else {
        console.log(`✅ ${table.padEnd(20)}: EXISTS (${count || 0} rows)`)
      }
    } catch (e: any) {
      console.log(`❌ ${table.padEnd(20)}: ERROR (${e.message})`)
    }
  }
  
  // Check events table columns
  console.log('\n🔍 Checking events table structure...')
  try {
    const { data, error } = await supabase
      .from('events')
      .select('event_id, name, event_date')
      .limit(1)
    
    if (error) {
      console.log(`❌ events columns: ${error.message}`)
    } else {
      console.log(`✅ events columns: event_id, name, event_date verified`)
    }
  } catch (e: any) {
    console.log(`❌ events columns: ${e.message}`)
  }
}

checkSchema()
