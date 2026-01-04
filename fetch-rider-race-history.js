#!/usr/bin/env node

/**
 * Fetch complete race history for a rider from ZwiftRacing.app
 * 
 * Strategy:
 * 1. Fetch rider HTML from zwiftracing.app/riders/{riderId}
 * 2. Extract Event IDs from embedded __NEXT_DATA__ JSON
 * 3. For each Event ID, fetch race results from API
 * 4. Filter rider data from results
 * 5. Return complete race history
 */

const axios = require('axios');

const ZWIFTRACING_API_TOKEN = '650c6d2fc4ef6858d74cbef1';
const API_BASE = 'https://api.zwiftracing.app/api';

/**
 * Extract Event IDs from ZwiftRacing.app HTML
 */
async function scrapeEventIds(riderId) {
  try {
    console.log(`📥 Fetching HTML for rider ${riderId}...`);
    const response = await axios.get(`https://www.zwiftracing.app/riders/${riderId}`);
    const html = response.data;
    
    // Extract __NEXT_DATA__ JSON
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match) {
      throw new Error('Could not find __NEXT_DATA__ in HTML');
    }
    
    const data = JSON.parse(match[1]);
    const history = data?.props?.pageProps?.rider?.history || [];
    
    const eventIds = history.map(race => race.event?.id).filter(Boolean);
    
    console.log(`✅ Found ${eventIds.length} Event IDs`);
    return eventIds;
  } catch (error) {
    console.error(`❌ Error scraping Event IDs:`, error.message);
    throw error;
  }
}

/**
 * Fetch event results for specific Event ID
 */
async function fetchEventResults(eventId) {
  try {
    const response = await axios.get(
      `${API_BASE}/public/results/${eventId}`,
      {
        headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
        timeout: 15000
      }
    );
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn(`⏳ Rate limited on event ${eventId}, retrying in 60s...`);
      await new Promise(resolve => setTimeout(resolve, 60000));
      return fetchEventResults(eventId); // Retry
    }
    throw error;
  }
}

/**
 * Fetch complete race history for rider
 */
async function fetchRiderRaceHistory(riderId, options = {}) {
  const { limit = null, delayMs = 1000 } = options;
  
  try {
    // Step 1: Scrape Event IDs
    const eventIds = await scrapeEventIds(riderId);
    
    if (eventIds.length === 0) {
      return {
        success: true,
        riderId,
        races: [],
        message: 'No race history found'
      };
    }
    
    // Apply limit if specified
    const idsToFetch = limit ? eventIds.slice(0, limit) : eventIds;
    
    console.log(`🏁 Fetching results for ${idsToFetch.length} events...`);
    
    const races = [];
    
    // Step 2: Fetch each event (with rate limiting)
    for (let i = 0; i < idsToFetch.length; i++) {
      const eventId = idsToFetch[i];
      
      console.log(`  [${i + 1}/${idsToFetch.length}] Event ${eventId}...`);
      
      try {
        const eventData = await fetchEventResults(eventId);
        
        // Find rider in results
        const riderResult = eventData.results?.find(r => r.riderId === riderId);
        
        if (riderResult) {
          races.push({
            eventId: eventData.eventId,
            eventTitle: eventData.title,
            eventTime: eventData.time,
            eventType: eventData.type,
            eventSubType: eventData.subType,
            distance: eventData.distance,
            elevation: eventData.elevation,
            routeId: eventData.routeId,
            // Rider specific data
            position: riderResult.position,
            positionInCategory: riderResult.positionInCategory,
            time: riderResult.time,
            gap: riderResult.gap,
            category: riderResult.category,
            rating: riderResult.rating,
            ratingBefore: riderResult.ratingBefore,
            ratingDelta: riderResult.ratingDelta,
            ratingMax30: riderResult.ratingMax30,
            ratingMax90: riderResult.ratingMax90
          });
        }
        
        // Rate limit delay (except for last request)
        if (i < idsToFetch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
      } catch (error) {
        console.error(`  ❌ Error fetching event ${eventId}:`, error.message);
        // Continue with next event
      }
    }
    
    console.log(`✅ Successfully fetched ${races.length} races`);
    
    return {
      success: true,
      riderId,
      totalEvents: eventIds.length,
      fetchedEvents: idsToFetch.length,
      races: races.sort((a, b) => b.eventTime - a.eventTime) // Sort by date descending
    };
    
  } catch (error) {
    console.error(`❌ Error fetching race history:`, error.message);
    return {
      success: false,
      riderId,
      error: error.message,
      races: []
    };
  }
}

// CLI usage
if (require.main === module) {
  const riderId = process.argv[2] || 150437;
  const limit = process.argv[3] ? parseInt(process.argv[3]) : 10;
  
  console.log(`\n🏁 Fetching race history for rider ${riderId} (limit: ${limit})\n`);
  
  fetchRiderRaceHistory(riderId, { limit, delayMs: 2000 })
    .then(result => {
      console.log('\n📊 RESULT:\n');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('\n❌ FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { fetchRiderRaceHistory, scrapeEventIds, fetchEventResults };
