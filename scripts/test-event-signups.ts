#!/usr/bin/env tsx
/**
 * Test Event Signup Data
 * Check wat upcoming events API terug geeft qua signup info
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../backend/.env') });

import { zwiftClient } from '../backend/src/api/zwift-client.js';

async function testEventSignups() {
  console.log('\n🔍 Testing Event Signup Data\n');
  
  try {
    // Get upcoming events
    console.log('📡 Fetching upcoming events...');
    const events = await zwiftClient.getUpcomingEvents();
    
    console.log(`✅ Found ${events.length} events\n`);
    
    // Check first 5 events for signup data
    console.log('📊 Checking first 5 events for signup fields:\n');
    
    for (let i = 0; i < Math.min(5, events.length); i++) {
      const event = events[i];
      console.log(`Event ${i + 1}: ${event.eventId} - ${event.title}`);
      console.log(`  Time: ${new Date(event.time * 1000).toLocaleString()}`);
      console.log(`  Type: ${event.type || 'N/A'}`);
      
      // Check for signup fields
      const keys = Object.keys(event);
      const signupKeys = keys.filter(k => 
        k.toLowerCase().includes('signup') || 
        k.toLowerCase().includes('category') ||
        k.toLowerCase().includes('categories')
      );
      
      if (signupKeys.length > 0) {
        console.log(`  📝 Signup fields found: ${signupKeys.join(', ')}`);
        signupKeys.forEach(key => {
          console.log(`     ${key}: ${JSON.stringify((event as any)[key])}`);
        });
      } else {
        console.log(`  ⚠️  No signup fields found`);
      }
      
      console.log('');
    }
    
    // Try getting details for first event
    if (events.length > 0) {
      const firstEvent = events[0];
      console.log(`\n🔎 Getting detailed info for event ${firstEvent.eventId}:\n`);
      
      try {
        const details = await zwiftClient.getEventDetails(Number(firstEvent.eventId));
        console.log(`Event details keys: ${Object.keys(details).join(', ')}`);
        
        // Check for signup/category data
        if ((details as any).categories) {
          console.log(`\n  Categories: ${(details as any).categories}`);
        }
        if ((details as any).signups) {
          console.log(`  Signups: ${(details as any).signups}`);
        }
        
      } catch (error: any) {
        console.error(`❌ Error getting event details: ${error.message}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testEventSignups();
