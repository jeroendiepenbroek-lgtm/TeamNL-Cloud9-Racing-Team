/**
 * Haal ALLE data op van GET /public/riders/{riderId}
 * Zoek naar eventID links in de response
 */

const ZWIFT_RACING_API = 'https://zwift-ranking.herokuapp.com';
const API_KEY = '650c6d2fc4ef6858d74cbef1';
const RIDER_ID = 150437;

async function getCompleteRiderData() {
  console.log('🔍 COMPLETE RIDER DATA - GET /public/riders/150437\n');
  console.log('='.repeat(80));
  console.log('🌐 URL:', `${ZWIFT_RACING_API}/public/riders/${RIDER_ID}`);
  console.log('🔑 Auth: API Key\n');

  const response = await fetch(`${ZWIFT_RACING_API}/public/riders/${RIDER_ID}`, {
    headers: {
      'Authorization': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  console.log('✅ Response Status:', response.status);
  console.log('📦 Response Headers:');
  console.log('   Content-Type:', response.headers.get('content-type'));
  console.log('   Content-Length:', response.headers.get('content-length'));
  console.log('\n' + '='.repeat(80));
  console.log('📄 COMPLETE JSON RESPONSE (FORMATTED)');
  console.log('='.repeat(80));
  console.log(JSON.stringify(data, null, 2));

  console.log('\n\n' + '='.repeat(80));
  console.log('🔎 SEARCHING FOR EVENT IDs IN RESPONSE');
  console.log('='.repeat(80));

  const jsonString = JSON.stringify(data);
  
  // Zoek naar alle mogelijke eventID patterns
  const patterns = [
    { name: 'eventId', regex: /"eventId":\s*(\d+)/g },
    { name: 'event_id', regex: /"event_id":\s*(\d+)/g },
    { name: 'EventId', regex: /"EventId":\s*(\d+)/g },
    { name: 'event', regex: /"event":\s*(\d+)/g },
    { name: 'id (in events array)', regex: /"events":\s*\[(.*?)\]/g },
  ];

  let foundEventIds = false;

  for (const pattern of patterns) {
    const matches = [...jsonString.matchAll(pattern.regex)];
    if (matches.length > 0) {
      console.log(`\n✅ GEVONDEN: ${pattern.name}`);
      matches.forEach((match, i) => {
        console.log(`   [${i + 1}] ${match[1] || match[0]}`);
      });
      foundEventIds = true;
    }
  }

  if (!foundEventIds) {
    console.log('\n❌ GEEN EVENT IDs GEVONDEN IN RESPONSE');
  }

  // Diep doorzoeken op race object
  console.log('\n\n' + '='.repeat(80));
  console.log('🏁 RACE OBJECT DEEP INSPECTION');
  console.log('='.repeat(80));
  
  if (data.race) {
    console.log('\n📦 race.last:');
    console.log(JSON.stringify(data.race.last, null, 2));
    
    console.log('\n📦 race.current:');
    console.log(JSON.stringify(data.race.current, null, 2));
    
    console.log('\n📦 race.max30:');
    console.log(JSON.stringify(data.race.max30, null, 2));
    
    console.log('\n📦 race.max90:');
    console.log(JSON.stringify(data.race.max90, null, 2));

    // Check alle keys in race object
    console.log('\n📦 ALL KEYS IN race:');
    Object.keys(data.race).forEach(key => {
      const value = data.race[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const length = Array.isArray(value) ? value.length : '-';
      console.log(`   • ${key}: ${type} (length: ${length})`);
      
      // Als het een array is, laat eerste item zien
      if (Array.isArray(value) && value.length > 0) {
        console.log('     First item:', JSON.stringify(value[0], null, 2));
      }
    });
  }

  // Check of er een events array bestaat
  console.log('\n\n' + '='.repeat(80));
  console.log('🎯 CHECK FOR EVENTS ARRAY');
  console.log('='.repeat(80));
  
  if (data.events) {
    console.log('\n✅ EVENTS ARRAY GEVONDEN!');
    console.log('   Length:', data.events.length);
    console.log('\n📋 Events:');
    console.log(JSON.stringify(data.events, null, 2));
  } else if (data.race?.events) {
    console.log('\n✅ race.events ARRAY GEVONDEN!');
    console.log('   Length:', data.race.events.length);
    console.log('\n📋 Events:');
    console.log(JSON.stringify(data.race.events, null, 2));
  } else {
    console.log('\n❌ Geen events array gevonden');
  }

  // Check hele object voor arrays
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 ALL ARRAYS IN RESPONSE');
  console.log('='.repeat(80));
  
  function findArrays(obj: any, path: string = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (Array.isArray(value)) {
        console.log(`\n✅ Array found at: ${currentPath}`);
        console.log(`   Length: ${value.length}`);
        if (value.length > 0) {
          console.log('   First item:', JSON.stringify(value[0], null, 2));
        }
      } else if (typeof value === 'object' && value !== null) {
        findArrays(value, currentPath);
      }
    }
  }
  
  findArrays(data);

  console.log('\n\n' + '='.repeat(80));
  console.log('📋 CONCLUSIE');
  console.log('='.repeat(80));
  console.log(`
Als er GEEN eventIDs in deze response zitten, dan betekent dit:

❌ GET /public/riders/{riderId} bevat GEEN race history met eventIDs
❌ Rider endpoint is NIET de bron voor event-rider links

✅ ALTERNATIEVE BRONNEN voor event-rider links:
   1. Database: zwift_api_race_results table (30 events al bekend!)
   2. Events API: GET /api/events/upcoming + filter op signed up riders
   3. Results API: GET /public/results/{eventId} (geeft alle riders)
   4. Club API: GET /public/clubs/{clubId} → race.last per member
   
💡 AANBEVELING:
   Gebruik database Event IDs als basis (heb je al 30 events!)
   Voor nieuwe events: poll upcoming events en sync results na afloop
  `);
}

getCompleteRiderData().catch(console.error);
