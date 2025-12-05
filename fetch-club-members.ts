#!/usr/bin/env node
/**
 * Fetch Team Members from ZwiftRacing Club API
 * Haalt alle members van club 11818 op en insert in my_team_members
 */

import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const ZWIFT_API_KEY = process.env.ZWIFT_API_KEY!;
const CLUB_ID = 11818; // TeamNL Cloud9

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fetchClubMembers() {
  console.log(`🔄 Fetching members from club ${CLUB_ID}...`);
  
  try {
    const response = await axios.get(
      `https://zwift-ranking.herokuapp.com/api/club/${CLUB_ID}/members`,
      {
        headers: {
          'Authorization': ZWIFT_API_KEY
        }
      }
    );

    const members = response.data;
    console.log(`✅ Found ${members.length} club members\n`);

    // Insert into my_team_members
    const riderIds = members.map((m: any) => ({
      rider_id: m.riderId,
      nickname: null,
      notes: `Auto-added from club ${CLUB_ID}`,
      added_at: new Date().toISOString()
    }));

    console.log(`📝 Inserting ${riderIds.length} members into database...`);

    const { data, error } = await supabase
      .from('my_team_members')
      .upsert(riderIds, { 
        onConflict: 'rider_id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('❌ Database error:', error.message);
      process.exit(1);
    }

    console.log(`✅ Successfully inserted ${riderIds.length} team members!`);
    console.log(`\n📊 Sample rider IDs:`);
    console.log(riderIds.slice(0, 10).map(r => `   - ${r.rider_id}`).join('\n'));

    // Verify
    const { count } = await supabase
      .from('my_team_members')
      .select('*', { count: 'exact', head: true });

    console.log(`\n✅ Total team members in database: ${count}`);
    console.log(`\n🔄 Next step: Run sync`);
    console.log(`   npx tsx sync-runner.ts --all`);

  } catch (error: any) {
    if (error.response?.status === 429) {
      console.error('❌ Rate limit hit. Wait 60 minutes.');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

fetchClubMembers();
