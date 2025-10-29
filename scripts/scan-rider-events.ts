/**
 * Event Range Scanner voor Rider 150437
 * 
 * Scant event range 5067681 - 5129365 (61684 events) om alle races
 * van rider 150437 te vinden en op te slaan in database.
 * 
 * Strategie:
 * - Start bij laatste event en werk terug
 * - Rate limit: 1 req/min = ~43 dagen voor volledige scan
 * - Resume support: start waar vorige scan stopte
 * - Save progress elke 100 events
 * 
 * Run: npm run scan-rider-events -- --rider 150437 --start 5129365 --end 5067681
 */

import { ZwiftApiClient } from '../src/api/zwift-client.js';
import { ResultRepository } from '../src/database/repositories.js';
import { logger } from '../src/utils/logger.js';

interface ScanProgress {
  riderId: number;
  currentEventId: number;
  eventsScanned: number;
  eventsFound: number;
  startTime: Date;
  lastSave: Date;
}

const RIDER_ID = 150437;
const START_EVENT = 5129365; // Laatste bekende event
const END_EVENT = 5067681; // Eerste event binnen 90 dagen
const PROGRESS_FILE = './data/scan-progress.json';

async function scanEventRange() {
  const config = {
    apiKey: process.env.ZWIFT_API_KEY || '650c6d2fc4ef6858d74cbef1',
    baseUrl: process.env.ZWIFT_API_BASE_URL || 'https://zwift-ranking.herokuapp.com',
  };
  
  const apiClient = new ZwiftApiClient(config);
  const resultRepo = new ResultRepository();

  // Load progress if exists
  let progress: ScanProgress = loadProgress() || {
    riderId: RIDER_ID,
    currentEventId: START_EVENT,
    eventsScanned: 0,
    eventsFound: 0,
    startTime: new Date(),
    lastSave: new Date(),
  };

  logger.info('🔍 Start Event Range Scanner', {
    riderId: RIDER_ID,
    range: `${END_EVENT} - ${START_EVENT}`,
    totalEvents: START_EVENT - END_EVENT + 1,
    resumeFrom: progress.currentEventId,
    alreadyScanned: progress.eventsScanned,
    alreadyFound: progress.eventsFound,
  });

  const totalEvents = START_EVENT - END_EVENT + 1;
  const estimatedHours = (totalEvents - progress.eventsScanned) / 60;
  const estimatedDays = estimatedHours / 24;

  logger.info(`⏱️  Geschatte resterende tijd: ${estimatedHours.toFixed(1)} uur (${estimatedDays.toFixed(1)} dagen)`);

  // Scan loop
  for (let eventId = progress.currentEventId; eventId >= END_EVENT; eventId--) {
    try {
      // Haal event results op
      const results = await apiClient.getResults(eventId);

      progress.eventsScanned++;

      // Zoek rider in results
      const riderResult = results.find((r: any) => r.riderId === RIDER_ID);

      if (riderResult) {
        progress.eventsFound++;

        logger.info(`✅ Rider gevonden in event ${eventId}`, {
          position: riderResult.position,
          category: riderResult.category,
          time: riderResult.time,
        });

        // Save to database
        await resultRepo.upsertResult({
          eventId,
          riderId: RIDER_ID,
          name: riderResult.name,
          eventName: riderResult.eventName,
          eventDate: riderResult.eventDate,
          position: riderResult.position || 0,
          category: riderResult.category || 'Unknown',
          time: riderResult.time || 0,
          distance: riderResult.distance,
          averagePower: riderResult.averagePower,
          averageWkg: riderResult.averageWkg,
        }, 'zwiftranking');
      }

      // Update progress
      progress.currentEventId = eventId - 1;

      // Save progress elke 100 events
      if (progress.eventsScanned % 100 === 0) {
        saveProgress(progress);
        logProgress(progress, totalEvents);
      }

      // Rate limit: 1 per minute
      await sleep(61000);

    } catch (error) {
      logger.error(`❌ Error bij event ${eventId}`, error);

      if (error instanceof Error && error.message.includes('Rate limit')) {
        logger.warn('Rate limit bereikt - wacht extra lang...');
        await sleep(120000); // 2 minuten
      }
    }
  }

  // Final save
  saveProgress(progress);

  logger.info('🎉 Scan voltooid!', {
    eventsScanned: progress.eventsScanned,
    eventsFound: progress.eventsFound,
    duration: Date.now() - progress.startTime.getTime(),
  });
}

function loadProgress(): ScanProgress | null {
  try {
    const fs = require('fs');
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      const progress = JSON.parse(data);
      progress.startTime = new Date(progress.startTime);
      progress.lastSave = new Date(progress.lastSave);
      return progress;
    }
  } catch (error) {
    logger.error('Kan progress niet laden', error);
  }
  return null;
}

function saveProgress(progress: ScanProgress) {
  try {
    const fs = require('fs');
    const dir = './data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    progress.lastSave = new Date();
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
    logger.debug('Progress saved', { eventsScanned: progress.eventsScanned });
  } catch (error) {
    logger.error('Kan progress niet opslaan', error);
  }
}

function logProgress(progress: ScanProgress, totalEvents: number) {
  const percentage = (progress.eventsScanned / totalEvents) * 100;
  const elapsed = Date.now() - progress.startTime.getTime();
  const eventsPerHour = (progress.eventsScanned / elapsed) * 3600000;
  const remaining = totalEvents - progress.eventsScanned;
  const estimatedRemaining = (remaining / eventsPerHour) * 3600000;

  logger.info(`📊 Progress: ${progress.eventsScanned}/${totalEvents} (${percentage.toFixed(2)}%)`, {
    found: progress.eventsFound,
    speed: `${eventsPerHour.toFixed(1)} events/uur`,
    remaining: `${(estimatedRemaining / 3600000).toFixed(1)} uur`,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if called directly
if (require.main === module) {
  scanEventRange()
    .then(() => {
      logger.info('Scanner gestopt');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Scanner error', error);
      process.exit(1);
    });
}

export { scanEventRange };
