#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

// Get actual columns
const { data: ridersUnified } = await (supabase as any).client
  .from('riders_unified')
  .select('*')
  .limit(1);

const { data: teamMembers } = await (supabase as any).client
  .from('my_team_members')
  .select('*')
  .limit(1);

console.log('riders_unified columns:');
if (ridersUnified && ridersUnified.length > 0) {
  console.log(Object.keys(ridersUnified[0]).sort().join(', '));
  console.log('\nSample data:', ridersUnified[0]);
} else {
  console.log('   ⚠️  Table is EMPTY');
}

console.log('\n\nmy_team_members columns:');
if (teamMembers && teamMembers.length > 0) {
  console.log(Object.keys(teamMembers[0]).sort().join(', '));
  console.log('\nSample data:', teamMembers[0]);
} else {
  console.log('   ⚠️  Table is EMPTY');
}

// Count rows
const { count: ridersCount } = await (supabase as any).client
  .from('riders_unified')
  .select('*', { count: 'exact', head: true });

const { count: teamCount } = await (supabase as any).client
  .from('my_team_members')
  .select('*', { count: 'exact', head: true });

console.log('\n\n📊 Row counts:');
console.log(`   riders_unified: ${ridersCount || 0} rows`);
console.log(`   my_team_members: ${teamCount || 0} rows`);
