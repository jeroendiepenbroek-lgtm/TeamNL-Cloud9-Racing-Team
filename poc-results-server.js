// POC Backend Endpoints for Rider 150437 Results
// Uses real ZwiftRacing API data + mock race history

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 8081; // Different port for POC

app.use(cors());
app.use(express.json());

const API_TOKEN = '650c6d2fc4ef6858d74cbef1';
const API_BASE = 'https://api.zwiftracing.app/api';

// Mock race history for rider 150437 (based on screenshots)
const mockRaceHistory = [
  {
    eventId: 'mock_001',
    eventName: 'Club Ladder // Herd of Honey Badgers v TeamNL_Cloud9 Spark',
    eventDate: '2025-12-29T18:00:00Z',
    position: 7,
    totalRiders: 10,
    pen: 'B',
    veloAfter: 1436,
    veloChange: -4,
    timeSeconds: 2185,
    avgWkg: 2.959,
    effort: 90,
    power: {
      wkg5: 8.99,
      wkg15: 8.05,
      wkg30: 7.31,
      wkg60: 5.45,
      wkg120: 4.66,
      wkg300: 4.07,
      wkg1200: 3.07
    }
  },
  {
    eventId: 'mock_002',
    eventName: 'HISP WINTER TOUR 2025 STAGE 2',
    eventDate: '2025-12-27T19:00:00Z',
    position: 13,
    totalRiders: 36,
    pen: 'B',
    veloAfter: 1432,
    veloChange: 2,
    timeSeconds: 2400,
    avgWkg: 3.095,
    effort: 89,
    power: {
      wkg5: 8.53,
      wkg15: 7.66,
      wkg30: 6.35,
      wkg60: 5.14,
      wkg120: 4.72,
      wkg300: 3.91,
      wkg1200: 3.32
    }
  },
  {
    eventId: 'mock_003',
    eventName: 'Club Ladder // GTR Krakens v TeamNL Cloud9 Spark',
    eventDate: '2025-12-22T18:30:00Z',
    position: 8,
    totalRiders: 10,
    pen: 'B',
    veloAfter: 1410,
    veloChange: -22,
    timeSeconds: 2100,
    avgWkg: 3.230,
    effort: 94,
    power: {
      wkg5: 12.74,
      wkg15: 9.82,
      wkg30: 7.89,
      wkg60: 6.00,
      wkg120: 4.47,
      wkg300: 3.69,
      wkg1200: 3.41
    }
  }
];

// Mock event results for race detail page (based on screenshot 2)
const mockEventResults = {
  'mock_001': {
    eventId: 'mock_001',
    eventName: 'Club Ladder // Herd of Honey Badgers v TeamNL_Cloud9 Spark',
    eventDate: '2025-12-29T18:00:00Z',
    routeName: 'Watopia Figure 8',
    distanceKm: 28.5,
    elevationM: 456,
    results: [
      {
        position: 1,
        riderId: 999001,
        riderName: 'Iain Thistlethwaite',
        teamName: 'HERO',
        pen: 'A',
        veloRating: 1821,
        timeSeconds: 2176,
        deltaSeconds: 0,
        avgWkg: 3.583,
        power: { wkg5: 9.48, wkg15: 8.72, wkg30: 7.55, wkg60: 6.55, wkg120: 6.30, wkg300: 5.42, wkg1200: 3.75 }
      },
      {
        position: 2,
        riderId: 999002,
        riderName: 'Freek Zwart',
        teamName: 'TeamNL',
        pen: 'A',
        veloRating: 1532,
        timeSeconds: 2184,
        deltaSeconds: 8,
        avgWkg: 3.122,
        power: { wkg5: 9.61, wkg15: 8.49, wkg30: 7.07, wkg60: 5.24, wkg120: 4.54, wkg300: 4.22, wkg1200: 3.24 }
      },
      {
        position: 3,
        riderId: 999003,
        riderName: 'Matt Reamsbottom',
        teamName: 'HERO',
        pen: 'A',
        veloRating: 1493,
        timeSeconds: 2184,
        deltaSeconds: 8,
        avgWkg: 3.139,
        power: { wkg5: 8.47, wkg15: 8.08, wkg30: 7.53, wkg60: 5.72, wkg120: 5.06, wkg300: 4.39, wkg1200: 3.33 }
      },
      {
        position: 4,
        riderId: 999004,
        riderName: 'Hans Saris',
        teamName: 'TeamNL',
        pen: 'A',
        veloRating: 1616,
        timeSeconds: 2184,
        deltaSeconds: 8,
        avgWkg: 3.200,
        power: { wkg5: 10.71, wkg15: 8.91, wkg30: 7.99, wkg60: 6.05, wkg120: 4.84, wkg300: 4.41, wkg1200: 3.31 }
      },
      {
        position: 7,
        riderId: 150437,
        riderName: 'JRøne | CloudRacer-9 @YouTube',
        teamName: 'TeamNL',
        pen: 'B',
        veloRating: 1436,
        timeSeconds: 2185,
        deltaSeconds: 9,
        avgWkg: 2.959,
        power: { wkg5: 8.99, wkg15: 8.05, wkg30: 7.31, wkg60: 5.45, wkg120: 4.66, wkg300: 4.07, wkg1200: 3.07 }
      }
    ]
  }
};

// US1: Rider Race History
app.get('/api/poc/rider/:riderId/history', async (req, res) => {
  const { riderId } = req.params;
  
  try {
    console.log(`📊 Fetching race history for rider ${riderId}`);
    
    // Get real rider profile from ZwiftRacing API
    const response = await axios.get(`${API_BASE}/public/riders/${riderId}`, {
      headers: { 'Authorization': API_TOKEN },
      timeout: 10000
    });
    
    const profile = response.data;
    
    // Combine with mock race history
    res.json({
      success: true,
      rider: {
        riderId: profile.riderId,
        name: profile.name,
        category: profile.zpCategory,
        velo: Math.round(profile.race?.current?.rating || 0),
        power: profile.power
      },
      raceHistory: mockRaceHistory
    });
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// US2: Event Race Results
app.get('/api/poc/event/:eventId/results', async (req, res) => {
  const { eventId } = req.params;
  
  try {
    console.log(`📊 Fetching results for event ${eventId}`);
    
    // Use mock data for POC
    const eventData = mockEventResults[eventId];
    
    if (!eventData) {
      return res.status(404).json({
        success: false,
        error: 'Event not found in POC data'
      });
    }
    
    res.json({
      success: true,
      event: eventData
    });
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'results-poc' });
});

app.listen(PORT, () => {
  console.log(`✅ POC Server running on port ${PORT}`);
  console.log(`📊 Rider History: http://localhost:${PORT}/api/poc/rider/150437/history`);
  console.log(`🏁 Event Results: http://localhost:${PORT}/api/poc/event/mock_001/results`);
});
