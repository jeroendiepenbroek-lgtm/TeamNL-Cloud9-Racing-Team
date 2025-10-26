#!/usr/bin/env tsx
/**
 * Script om de daadwerkelijke API response structuur te onderzoeken
 * Dit helpt ons om het database schema te optimaliseren
 */

import axios from 'axios';
import { writeFileSync } from 'fs';

const API_KEY = '650c6d2fc4ef6858d74cbef1';
const BASE_URL = 'https://zwift-ranking.herokuapp.com';
const CLUB_ID = 11818;

async function exploreAPI() {
  console.log('🔍 Onderzoek ZwiftRacing API structuur...\n');

  const results: Record<string, any> = {};

  try {
    // 1. Club members
    console.log('1️⃣ Ophalen club members...');
    const clubResponse = await axios.get(`${BASE_URL}/public/clubs/${CLUB_ID}`, {
      headers: { 'Authorization': API_KEY }
    });
    
    results.club = {
      totalMembers: Array.isArray(clubResponse.data) ? clubResponse.data.length : 0,
      sampleMember: Array.isArray(clubResponse.data) && clubResponse.data.length > 0 
        ? clubResponse.data[0] 
        : null,
      allFields: Array.isArray(clubResponse.data) && clubResponse.data.length > 0
        ? Object.keys(clubResponse.data[0])
        : []
    };
    console.log(`   ✓ Gevonden: ${results.club.totalMembers} members`);
    console.log(`   ✓ Velden: ${results.club.allFields.join(', ')}\n`);

    // 2. Enkele rider (gebruik eerste member)
    if (results.club.sampleMember?.riderId) {
      console.log('2️⃣ Ophalen individuele rider...');
      const riderId = results.club.sampleMember.riderId;
      const riderResponse = await axios.get(`${BASE_URL}/public/riders/${riderId}`, {
        headers: { 'Authorization': API_KEY }
      });
      
      results.rider = {
        riderId: riderId,
        data: riderResponse.data,
        allFields: Object.keys(riderResponse.data)
      };
      console.log(`   ✓ Velden: ${results.rider.allFields.join(', ')}\n`);
    }

    // 3. Results endpoint (probeer met een voorbeeld event ID)
    // Note: We kunnen hier een voorbeeld ID gebruiken of overslaan als we geen recent event ID hebben
    console.log('3️⃣ Results endpoint (overgeslagen - heeft event ID nodig)\n');

  } catch (error: any) {
    console.error('❌ Fout bij API call:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }

  // Sla resultaten op
  const output = JSON.stringify(results, null, 2);
  writeFileSync('docs/api-structure-analysis.json', output);
  
  console.log('📊 Analyse opgeslagen in docs/api-structure-analysis.json');
  console.log('\n=== SAMPLE DATA ===\n');
  console.log(output);
}

exploreAPI();
