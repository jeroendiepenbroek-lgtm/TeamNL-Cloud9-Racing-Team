import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger.js'
import dotenv from 'dotenv'

// Ensure .env is loaded
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || ''

let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    logger.warn('⚠️  Supabase credentials not found in env. SUPABASE_URL or SUPABASE_SERVICE_KEY missing')
    logger.warn(`   SUPABASE_URL: ${SUPABASE_URL || 'MISSING'}`)
    logger.warn(`   SUPABASE_KEY: ${SUPABASE_KEY ? 'SET' : 'MISSING'}`)
    return null
  }

  _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  })

  logger.info('🔌 Supabase client initialized')
  return _client
}

export default getSupabaseClient
