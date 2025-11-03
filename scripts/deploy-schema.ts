#!/usr/bin/env tsx

/**
 * Automated Schema Deployment
 * 
 * Voert cleanup + mvp-schema deployment uit via Supabase REST API
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY niet gevonden')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function executeSql(sql: string, description: string) {
  console.log(`\n🔄 ${description}...`)
  
  try {
    // Split SQL into individual statements (simplistic approach)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`   Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      if (stmt.length < 10) continue // Skip empty/comment-only lines
      
      try {
        // Use Supabase SQL RPC (if available) or direct query
        const { error } = await supabase.rpc('exec_sql', { query: stmt })
        
        if (error) {
          // Fallback: try direct execution via PostgREST
          console.log(`   ⚠️  RPC niet beschikbaar, probeer direct execute...`)
          // Note: Direct SQL execution via REST API is limited
          // We'll need to use psql or Supabase Dashboard
          throw new Error(`Cannot execute SQL via REST API: ${error.message}`)
        }
      } catch (err: any) {
        // Some statements may fail (e.g., DROP IF NOT EXISTS), continue
        if (err.message.includes('does not exist')) {
          console.log(`   ℹ️  Skipped (object doesn't exist)`)
        } else {
          console.log(`   ⚠️  Warning: ${err.message}`)
        }
      }
    }
    
    console.log(`   ✅ ${description} voltooid`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return false
  }
}

async function deploySchema() {
  console.log('🚀 Schema Deployment - Automated\n')
  console.log('=' .repeat(70))
  
  // Read SQL files
  const cleanupSql = readFileSync(
    join(__dirname, '../supabase/cleanup-schema.sql'),
    'utf-8'
  )
  
  const mvpSchemaSql = readFileSync(
    join(__dirname, '../supabase/mvp-schema.sql'),
    'utf-8'
  )
  
  console.log('\n📋 Schema Deployment Plan:')
  console.log('   1. Cleanup oude schema (DROP tables)')
  console.log('   2. Deploy MVP schema (CREATE tables)')
  console.log('   3. Verify deployment')
  
  console.log('\n⚠️  WAARSCHUWING: Dit verwijdert alle bestaande data!')
  console.log('   Druk CTRL+C binnen 3 seconden om te annuleren...\n')
  
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  console.log('🔄 Starting deployment...\n')
  
  // Step 1: Cleanup
  console.log('📋 STAP 1: Cleanup Oude Schema')
  console.log('=' .repeat(70))
  
  // Note: We can't execute raw SQL via Supabase JS client
  // We need to use the Supabase Management API or psql
  
  console.log('\n⚠️  LIMITATIE GEVONDEN:')
  console.log('   Supabase JS client ondersteunt geen directe SQL execution')
  console.log('   voor schema wijzigingen (DDL statements).')
  console.log('\n   Je moet handmatig via Supabase Dashboard:')
  console.log('   1. Open: https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql')
  console.log('   2. New Query → Copy-paste: supabase/cleanup-schema.sql → Run')
  console.log('   3. New Query → Copy-paste: supabase/mvp-schema.sql → Run')
  
  console.log('\n💡 ALTERNATIEF: Gebruik psql command-line tool')
  console.log('   Als je DATABASE_URL hebt (connection string):')
  console.log('\n   psql $SUPABASE_DATABASE_URL < supabase/cleanup-schema.sql')
  console.log('   psql $SUPABASE_DATABASE_URL < supabase/mvp-schema.sql')
  
  process.exit(1)
}

deploySchema().catch(err => {
  console.error('\n❌ Deployment failed:', err.message)
  process.exit(1)
})
