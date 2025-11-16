#!/usr/bin/env tsx
/**
 * Debug script to check getClubMembers response format
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../backend/.env') });

import { ZwiftApiClient } from '../backend/src/api/zwift-client.js';

const TEAM_CLUB_ID = 11818;

async function debugClubResponse() {
  console.log('🔍 Debugging club members response format...\n');
  console.log('ZWIFT_API_KEY from env:', process.env.ZWIFT_API_KEY?.substring(0, 10) + '...');
  
  const zwiftClient = new ZwiftApiClient();
  
  try {
    const response = await zwiftClient.getClubMembers(TEAM_CLUB_ID);
    
    console.log('Response type:', typeof response);
    console.log('Is array:', Array.isArray(response));
    console.log('Keys:', Object.keys(response).slice(0, 5));
    console.log('First item (if array):', response[0]);
    console.log('\nFull response structure:', JSON.stringify(response).slice(0, 500));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugClubResponse();
