/**
 * Check alle beschikbare data voor Rider 150437
 * Inclusief eventIDs voor results ophalen
 */

const ZWIFT_RACING_API = 'https://zwift-ranking.herokuapp.com';
const API_KEY = '650c6d2fc4ef6858d74cbef1';
const RIDER_ID = 150437;

interface ZwiftRider {
  riderId: number;
  name: string;
  gender: string;
  country: string;
  age: string;
  height: number;
  weight: number;
  zpCategory: string;
  zpFTP: number;
  power: any;
  race: {
    last?: {
      rating: number;
      date: number;
      mixed?: boolean;
      eventId?: number;  // Check of deze er is!
    };
    current: {
      rating: number;
      date?: number;
      mixed?: boolean;
    };
    max30?: {
      rating: number;
      date?: number;
      expires?: number;
      mixed?: boolean;
    };
    max90?: {
      rating: number;
      date?: number;
      expires?: number;
      mixed?: boolean;
    };
    finishes: number;
    dnfs: number;
    wins: number;
    podiums: number;
  };
  phenotype: any;
  handicaps: any;
  club: {
    id: number;
    name: string;
  };
}

async function fetchWithAuth(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: {
      'Authorization': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function checkRiderData() {
  console.log('🔍 COMPLETE DATA CHECK - Rider 150437\n');
  console.log('='.repeat(80));

  // 1. Rider Data (huidige staat)
  console.log('\n📊 SECTION 1: RIDER DATA (Current State)');
  console.log('-'.repeat(80));
  
  try {
    const rider: ZwiftRider = await fetchWithAuth(
      `${ZWIFT_RACING_API}/public/riders/${RIDER_ID}`
    );

    console.log('✅ Rider gevonden:', rider.name);
    console.log('\n🏁 RACE STATS:');
    console.log('  • Current vELO:', rider.race.current.rating);
    console.log('  • Max 30d vELO:', rider.race.max30?.rating || 'N/A');
    console.log('  • Max 90d vELO:', rider.race.max90?.rating || 'N/A');
    console.log('  • Total finishes:', rider.race.finishes);
    console.log('  • Wins:', rider.race.wins);
    console.log('  • Podiums:', rider.race.podiums);
    console.log('  • DNFs:', rider.race.dnfs);

    // Check for eventID in last race
    console.log('\n🎯 LAST RACE DETAILS:');
    if (rider.race.last) {
      console.log('  • Rating:', rider.race.last.rating);
      console.log('  • Date:', new Date(rider.race.last.date * 1000).toISOString());
      console.log('  • Mixed:', rider.race.last.mixed);
      
      // CRITICAL: Check if eventId exists
      if ('eventId' in rider.race.last) {
        console.log('  ✅ EventID:', (rider.race.last as any).eventId);
        console.log('\n  🚀 Dit eventID kunnen we gebruiken voor results!');
      } else {
        console.log('  ❌ Geen eventID field gevonden in race.last');
      }
    } else {
      console.log('  ❌ Geen race.last data beschikbaar');
    }

    // Show complete race.last structure
    console.log('\n📦 COMPLETE race.last STRUCTURE:');
    console.log(JSON.stringify(rider.race.last, null, 2));

    // Show ALL keys in race object
    console.log('\n🔑 ALL KEYS IN race OBJECT:');
    console.log(Object.keys(rider.race).join(', '));

    // Deep inspection of race.last
    if (rider.race.last) {
      console.log('\n🔬 DEEP INSPECTION race.last:');
      for (const [key, value] of Object.entries(rider.race.last)) {
        console.log(`  • ${key}: ${typeof value} = ${JSON.stringify(value)}`);
      }
    }

  } catch (error) {
    console.error('❌ Error fetching rider:', error);
  }

  // 2. Rider Data (30 dagen geleden) - Check historische eventIDs
  console.log('\n\n📊 SECTION 2: HISTORICAL RIDER DATA (30 Days Ago)');
  console.log('-'.repeat(80));
  
  try {
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const historicalRider: ZwiftRider = await fetchWithAuth(
      `${ZWIFT_RACING_API}/public/riders/${RIDER_ID}/${thirtyDaysAgo}`
    );

    console.log('✅ Historical data gevonden');
    console.log('  • vELO toen:', historicalRider.race.current.rating);
    console.log('  • vELO nu:', (await fetchWithAuth(`${ZWIFT_RACING_API}/public/riders/${RIDER_ID}`)).race.current.rating);

    console.log('\n🎯 HISTORICAL LAST RACE:');
    if (historicalRider.race.last) {
      console.log('  • Rating:', historicalRider.race.last.rating);
      console.log('  • Date:', new Date(historicalRider.race.last.date * 1000).toISOString());
      
      if ('eventId' in historicalRider.race.last) {
        console.log('  ✅ EventID:', (historicalRider.race.last as any).eventId);
      } else {
        console.log('  ❌ Geen eventID field');
      }
    }

  } catch (error) {
    console.error('❌ Error fetching historical rider:', error);
  }

  // 3. Club Members - Check of er eventIDs in club data zitten
  console.log('\n\n📊 SECTION 3: CLUB MEMBERS DATA');
  console.log('-'.repeat(80));
  
  try {
    const clubId = 11818; // TeamNL Cloud9
    const clubData = await fetchWithAuth(
      `${ZWIFT_RACING_API}/public/clubs/${clubId}`
    );

    console.log('✅ Club data gevonden:', clubData.name);
    console.log('  • Total members:', clubData.members?.length || 0);

    // Find our rider in club data
    const ourRider = clubData.members?.find((m: any) => m.riderId === RIDER_ID);
    if (ourRider) {
      console.log('\n🎯 RIDER 150437 IN CLUB DATA:');
      console.log('  • Name:', ourRider.name);
      console.log('  • Current vELO:', ourRider.race?.current?.rating);
      
      if (ourRider.race?.last) {
        console.log('\n  🏁 Last Race in Club Data:');
        console.log('    • Rating:', ourRider.race.last.rating);
        console.log('    • Date:', new Date(ourRider.race.last.date * 1000).toISOString());
        
        if ('eventId' in ourRider.race.last) {
          console.log('    ✅ EventID:', (ourRider.race.last as any).eventId);
        } else {
          console.log('    ❌ Geen eventID field');
        }

        console.log('\n  📦 COMPLETE race.last FROM CLUB:');
        console.log(JSON.stringify(ourRider.race.last, null, 2));
      }
    } else {
      console.log('  ❌ Rider 150437 niet gevonden in club members');
    }

  } catch (error) {
    console.error('❌ Error fetching club:', error);
  }

  // 4. Check Database voor bestaande eventIDs
  console.log('\n\n📊 SECTION 4: DATABASE - EXISTING RESULTS');
  console.log('-'.repeat(80));

  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      'https://bktbeefdmrpxhsyyalvc.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzMjQzODAsImV4cCI6MjA0ODkwMDM4MH0.NZLd3Q5qzIyEMhWdqQm0vKSNx-0vMIFYN8ZVrJxZe7M'
    );

    const { data: results, error } = await supabase
      .from('zwift_api_race_results')
      .select('event_id, event_name, event_date, rank, position, velo_rating')
      .eq('rider_id', RIDER_ID)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
    } else {
      console.log(`✅ Gevonden: ${results.length} results in database`);
      
      if (results.length > 0) {
        console.log('\n📋 EVENT IDs IN DATABASE:');
        const uniqueEvents = [...new Set(results.map(r => r.event_id))];
        console.log(`  • Total unique events: ${uniqueEvents.length}`);
        
        console.log('\n  Event IDs:');
        uniqueEvents.forEach(eventId => {
          const eventResults = results.filter(r => r.event_id === eventId);
          const firstResult = eventResults[0];
          console.log(`    • ${eventId} - ${firstResult.event_name} (${new Date(firstResult.event_date).toLocaleDateString()})`);
        });

        console.log('\n📊 RECENT 5 RESULTS:');
        results.slice(0, 5).forEach(r => {
          console.log(`  • Event ${r.event_id}: Rank ${r.rank}, vELO ${r.velo_rating} - ${r.event_name}`);
        });
      } else {
        console.log('  ℹ️  Geen results in database voor deze rider');
      }
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }

  // 5. SUMMARY & RECOMMENDATIONS
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 SAMENVATTING & AANBEVELINGEN');
  console.log('='.repeat(80));

  console.log(`
🎯 BESCHIKBARE DATA BRONNEN VOOR RIDER ${RIDER_ID}:

1. ✅ Rider Profile Data (ZwiftRacing API)
   - Endpoint: GET /public/riders/${RIDER_ID}
   - Bevat: power curves, race stats, vELO ratings
   - race.last: bevat laatste race info
   - ❓ EventID: Wordt gecontroleerd in output hierboven

2. ✅ Historical Rider Data (ZwiftRacing API)
   - Endpoint: GET /public/riders/${RIDER_ID}/{timestamp}
   - Bevat: historische vELO progressie
   - Gebruik voor: vELO trends over tijd

3. ✅ Club Member Data (ZwiftRacing API)
   - Endpoint: GET /public/clubs/11818
   - Bevat: alle team members met hun race.last
   - ❓ EventID: Wordt gecontroleerd in output hierboven

4. ✅ Existing Results in Database
   - Table: zwift_api_race_results
   - Bevat: Event IDs van eerder gesynchroniseerde races
   - Use deze Event IDs voor results endpoint!

🚀 VOOR RESULTS OPHALEN:

Optie A: Als race.last.eventId bestaat
   → Gebruik: GET /public/results/{eventId}
   → Direct laatste race results ophalen

Optie B: Gebruik database Event IDs
   → Query: SELECT DISTINCT event_id FROM zwift_api_race_results WHERE rider_id = ${RIDER_ID}
   → Fetch: GET /public/results/{eventId} voor elke event

Optie C: Zoek events via Events endpoint
   → Endpoint: GET /public/events/upcoming
   → Filter: Events met team members signed up
   → Fetch results na afloop event

📊 RATE LIMITS:
   • Rider GET: 5 requests/min ✅ Safe
   • Results GET: 1 request/min ⚠️ Langzaam
   • Events GET: 1 request/min ⚠️ Langzaam

💡 AANBEVELING:
   Start met database Event IDs (hebben we al 30 results!)
   Gebruik die als basis voor results endpoints testen.
  `);
}

// Run the check
checkRiderData().catch(console.error);
