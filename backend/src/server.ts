// ULTRA CLEAN SERVER - ALLEEN RACING MATRIX DATA
// Geen sync, geen teammanager, geen gedoe
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Railway environment variables (direct access)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ZWIFTRACING_API_TOKEN = process.env.ZWIFTRACING_API_TOKEN || '650c6d2fc4ef6858d74cbef1';

console.log('🚀 Environment loaded:', {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasSupabaseKey: !!SUPABASE_SERVICE_KEY,
  hasZwiftToken: !!ZWIFTRACING_API_TOKEN,
  nodeEnv: process.env.NODE_ENV
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================// ZWIFT LOGIN (Get Session Cookie)
// ============================================

let zwiftCookie: string = process.env.ZWIFT_COOKIE || '';
let cookieExpiry: Date = new Date();

async function getZwiftCookie(): Promise<string> {
  // Return cached cookie if still valid (expires after 6 hours)
  if (zwiftCookie && zwiftCookie !== 'placeholder' && cookieExpiry > new Date()) {
    return zwiftCookie;
  }

  const username = process.env.ZWIFT_USERNAME;
  const password = process.env.ZWIFT_PASSWORD;

  if (!username || !password) {
    console.warn('⚠️  ZWIFT_USERNAME or ZWIFT_PASSWORD not set');
    return '';
  }

  try {
    console.log('🔐 Logging in to Zwift to get session cookie...');
    
    // Step 1: Get access token
    const authResponse = await axios.post(
      'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token',
      new URLSearchParams({
        username,
        password,
        client_id: 'Zwift_Mobile_Link',
        grant_type: 'password'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = authResponse.data.access_token;
    
    if (!accessToken) {
      console.warn('⚠️  No access token received from Zwift');
      return '';
    }

    // Use access token as Bearer auth instead of cookie
    zwiftCookie = `Bearer ${accessToken}`;
    cookieExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
    console.log('✅ Zwift login successful, token cached for 6 hours');
    return zwiftCookie;

  } catch (error: any) {
    console.error('❌ Zwift login failed:', error.response?.data || error.message);
    return '';
  }
}

// ============================================// API SYNC FUNCTIONS
// ============================================

async function syncRiderFromAPIs(riderId: number): Promise<{ synced: boolean; error?: string }> {
  try {
    console.log(`🔄 Syncing rider ${riderId}...`);
    
    // Get fresh Zwift cookie (cached for 6 hours)
    const authToken = await getZwiftCookie();
    
    // Parallel fetch from both APIs
    const [racingResult, profileResult] = await Promise.allSettled([
      axios.get(`https://zwift-ranking.herokuapp.com/public/riders/${riderId}`, {
        headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
        timeout: 10000
      }),
      axios.get(`https://us-or-rly101.zwift.com/api/profiles/${riderId}`, {
        headers: {
          'Authorization': authToken,
          'User-Agent': 'Zwift/1.0'
        },
        timeout: 10000
      })
    ]);

    let racingSynced = false;
    let profileSynced = false;

    // Process ZwiftRacing data
    if (racingResult.status === 'fulfilled') {
      console.log(`  ℹ️  ZwiftRacing API responded for ${riderId}`);
      const data = racingResult.value.data;
      const riderData = {
        id: riderId,
        rider_id: riderId,
        name: data.name,
        country: data.country,
        velo_live: data.race?.current?.rating || null,
        velo_30day: data.race?.max30?.rating || null,
        velo_90day: data.race?.max90?.rating || null,
        category: data.zpCategory,
        ftp: data.zpFTP,
        power_5s: data.power?.w5 || null,
        power_15s: data.power?.w15 || null,
        power_30s: data.power?.w30 || null,
        power_60s: data.power?.w60 || null,
        power_120s: data.power?.w120 || null,
        power_300s: data.power?.w300 || null,
        power_1200s: data.power?.w1200 || null,
        power_5s_wkg: data.power?.wkg5 || null,
        power_15s_wkg: data.power?.wkg15 || null,
        power_30s_wkg: data.power?.wkg30 || null,
        power_60s_wkg: data.power?.wkg60 || null,
        power_120s_wkg: data.power?.wkg120 || null,
        power_300s_wkg: data.power?.wkg300 || null,
        power_1200s_wkg: data.power?.wkg1200 || null,
        weight: data.weight,
        height: data.height,
        phenotype: data.phenotype?.value || null,
        race_count: data.race?.finishes || 0,
        zwift_id: riderId,
        race_wins: data.race?.wins || 0,
        race_podiums: data.race?.podiums || 0,
        race_finishes: data.race?.finishes || 0,
        race_dnfs: data.race?.dnfs || 0,
        raw_response: data,
        fetched_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('api_zwiftracing_riders')
        .upsert(riderData, { onConflict: 'rider_id' });

      if (!error) {
        racingSynced = true;
        console.log(`✅ ZwiftRacing data synced for ${riderId}`);
      } else {
        console.error(`❌ ZwiftRacing sync failed for ${riderId}:`, error.message);
      }
    } else {
      console.warn(`⚠️  ZwiftRacing API failed for ${riderId}:`, racingResult.reason);
    }

    // Process Zwift Official data
    if (profileResult.status === 'fulfilled') {
      console.log(`  ℹ️  Zwift Official API responded for ${riderId}`);
      const data = profileResult.value.data;
      const profileData = {
        rider_id: riderId,
        id: data.id || riderId,
        first_name: data.firstName || null,
        last_name: data.lastName || null,
        male: data.male,
        image_src: data.imageSrc || null,
        image_src_large: data.imageSrcLarge || null,
        country_code: data.countryCode || null,
        country_alpha3: data.countryAlpha3 || null,
        age: data.age || null,
        weight: data.weight || null, // in grams
        height: data.height || null, // in cm
        ftp: data.ftp || null,
        player_type_id: data.playerTypeId || null,
        player_type: data.playerType || null,
        competition_category: data.competitionMetrics?.category || null,
        competition_racing_score: data.competitionMetrics?.racingScore || null,
        followers_count: data.followerStatusOfLoggedInPlayer?.followerCount || null,
        followees_count: data.followerStatusOfLoggedInPlayer?.followeeCount || null,
        rideons_given: data.totalGiveRideons || null,
        achievement_level: data.achievementLevel || null,
        total_distance: data.totalDistanceInMeters || null,
        total_distance_climbed: data.totalDistanceClimbed || null,
        riding: data.riding || false,
        world_id: data.worldId || null,
        privacy_profile: data.privacy?.approvalRequired === true,
        privacy_activities: data.privacy?.defaultActivityPrivacy === 'PRIVATE',
        raw_response: data,
        fetched_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('api_zwift_api_profiles')
        .upsert(profileData, { onConflict: 'rider_id' });

      if (!error) {
        profileSynced = true;
        console.log(`✅ Zwift Official data synced for ${riderId}`);
      } else {
        console.error(`❌ Zwift Official sync failed for ${riderId}:`, error.message);
      }
    } else {
      console.warn(`⚠️  Zwift Official API failed for ${riderId}:`, profileResult.reason?.message || profileResult.reason);
    }

    // Update team_roster last_synced
    if (racingSynced || profileSynced) {
      await supabase
        .from('team_roster')
        .upsert({
          rider_id: riderId,
          is_active: true,
          last_synced: new Date().toISOString()
        }, { onConflict: 'rider_id' });
      
      console.log(`✅ Rider ${riderId} synced (Racing: ${racingSynced}, Profile: ${profileSynced})`);
      return { synced: true };
    }

    return { synced: false, error: 'Both APIs failed' };
  } catch (error: any) {
    console.error(`❌ Sync error for rider ${riderId}:`, error.message);
    return { synced: false, error: error.message };
  }
}

// ============================================
// API ENDPOINTS - READ ONLY
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: '6.0.0-clean',
    timestamp: new Date().toISOString()
  });
});

// Supabase config for frontend
app.get('/api/config/supabase', (req, res) => {
  res.json({
    url: SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

// Get all riders from v_rider_complete view (ONLY ACTIVE TEAM MEMBERS)
app.get('/api/riders', async (req, res) => {
  try {
    // v_rider_complete has is_team_member field from team_roster join
    const { data, error } = await supabase
      .from('v_rider_complete')
      .select('*')
      .eq('is_team_member', true)
      .order('velo_live', { ascending: false, nullsFirst: false });

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      riders: data || []
    });
  } catch (error: any) {
    console.error('❌ Error fetching riders:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get team roster (only active team members)
app.get('/api/team/roster', async (req, res) => {
  try {
    // v_rider_complete already has team status via LEFT JOIN with team_roster
    const { data, error } = await supabase
      .from('v_rider_complete')
      .select('*')
      .eq('is_team_member', true)

    console.log(`📊 Team roster: ${data?.length || 0} active riders`);

    res.json({
      success: true,
      count: data?.length || 0,
      riders: data || []
    });
  } catch (error: any) {
    console.error('❌ Error fetching team roster:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// TEAM MANAGEMENT ENDPOINTS
// ============================================

// Add riders (single, multiple, or bulk)
app.post('/api/admin/riders', async (req, res) => {
  try {
    const { rider_ids } = req.body;

    if (!rider_ids || !Array.isArray(rider_ids) || rider_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'rider_ids array required'
      });
    }

    console.log(`📥 Adding ${rider_ids.length} riders...`);

    const results = [];

    for (const riderId of rider_ids) {
      const result = await syncRiderFromAPIs(riderId);
      results.push({
        rider_id: riderId,
        ...result
      });

      // Small delay to avoid rate limiting
      if (rider_ids.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const synced = results.filter(r => r.synced).length;
    const failed = results.filter(r => !r.synced).length;

    console.log(`✅ Bulk add completed: ${synced} synced, ${failed} failed`);

    res.json({
      success: true,
      total: rider_ids.length,
      synced,
      failed,
      results
    });

  } catch (error: any) {
    console.error('❌ Error adding riders:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// MANUAL SYNC ALL - Sync all active team members
app.post('/api/admin/sync-all', async (req, res) => {
  try {
    console.log('🔄 Manual sync all triggered');
    
    // Get all active team members
    const { data: riders, error } = await supabase
      .from('v_rider_complete')
      .select('rider_id')
      .eq('is_team_member', true);
    
    if (error) throw error;
    
    if (!riders || riders.length === 0) {
      return res.json({
        success: true,
        message: 'No riders to sync',
        total: 0,
        synced: 0
      });
    }
    
    const riderIds = riders.map(r => r.rider_id);
    console.log(`📊 Syncing ${riderIds.length} riders: ${riderIds.join(', ')}`);
    
    let synced = 0;
    let failed = 0;
    const results = [];
    
    for (const riderId of riderIds) {
      try {
        const result = await syncRiderFromAPIs(riderId);
        if (result.synced) {
          synced++;
          results.push({ rider_id: riderId, synced: true });
        } else {
          failed++;
          results.push({ rider_id: riderId, synced: false, error: 'Sync failed' });
        }
      } catch (error: any) {
        failed++;
        results.push({ rider_id: riderId, synced: false, error: error.message });
      }
      
      // Small delay between syncs
      if (riderIds.indexOf(riderId) < riderIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`✅ Manual sync complete: ${synced} synced, ${failed} failed`);
    
    res.json({
      success: true,
      total: riderIds.length,
      synced,
      failed,
      results
    });
    
  } catch (error: any) {
    console.error('❌ Manual sync all failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Remove rider from team AND all source tables (clean database)
app.delete('/api/admin/riders/:riderId', async (req, res) => {
  try {
    const riderId = parseInt(req.params.riderId);

    // Delete from all tables for clean database
    const deletePromises = [
      supabase.from('team_roster').delete().eq('rider_id', riderId),
      supabase.from('api_zwiftracing_riders').delete().eq('rider_id', riderId),
      supabase.from('api_zwift_api_profiles').delete().eq('rider_id', riderId)
    ];

    const results = await Promise.allSettled(deletePromises);
    
    // Check if any deletions failed
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`⚠️  Some deletions failed for rider ${riderId}`);
    }

    console.log(`🗑️  Removed rider ${riderId} from all tables (team + sources)`);

    res.json({ success: true });

  } catch (error: any) {
    console.error('❌ Error removing rider:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// FRONTEND SERVING
// ============================================

// In production (Railway/Docker): frontend is at ../frontend/dist
// In development: frontend is at ../../frontend/dist
const frontendPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '..', '..', 'frontend', 'dist')
  : path.join(__dirname, '..', '..', 'frontend', 'dist');

console.log('📂 Frontend path:', frontendPath);

app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// ============================================
// SERVER-SIDE AUTO-SYNC SCHEDULER (DYNAMISCH CONFIGUREERBAAR + PERSISTENT)
// ============================================

const CONFIG_TABLE = 'app_config';
const CONFIG_KEY = 'auto_sync_settings';

let autoSyncConfig = {
  enabled: true,
  intervalMinutes: parseInt(process.env.AUTO_SYNC_INTERVAL_MINUTES || '60'),
  lastRun: null as Date | null,
  nextRun: null as Date | null
};

let autoSyncIntervalId: NodeJS.Timeout | null = null;
let autoSyncInitialTimeoutId: NodeJS.Timeout | null = null;

// Load config from database
const loadAutoSyncConfig = async () => {
  try {
    const { data, error } = await supabase
      .from(CONFIG_TABLE)
      .select('value')
      .eq('key', CONFIG_KEY)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') { // Not found error
        console.error('⚠️  Failed to load auto-sync config:', error.message);
      }
      return;
    }
    
    if (data?.value) {
      const saved = data.value as { enabled: boolean; intervalMinutes: number };
      autoSyncConfig.enabled = saved.enabled;
      autoSyncConfig.intervalMinutes = saved.intervalMinutes;
      console.log('💾 Loaded auto-sync config from database:', saved);
    }
  } catch (error: any) {
    console.error('⚠️  Error loading auto-sync config:', error.message);
  }
};

// Save config to database
const saveAutoSyncConfig = async () => {
  try {
    const { error } = await supabase
      .from(CONFIG_TABLE)
      .upsert({
        key: CONFIG_KEY,
        value: {
          enabled: autoSyncConfig.enabled,
          intervalMinutes: autoSyncConfig.intervalMinutes
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    
    if (error) {
      console.error('❌ Failed to save auto-sync config:', error.message);
    } else {
      console.log('💾 Saved auto-sync config to database');
    }
  } catch (error: any) {
    console.error('❌ Error saving auto-sync config:', error.message);
  }
};

// Run sync function
const runAutoSync = async () => {
  try {
    autoSyncConfig.lastRun = new Date();
    console.log('\n⏰ Server-side auto-sync triggered at', autoSyncConfig.lastRun.toISOString());
    
    const { data: riders, error } = await supabase
      .from('v_rider_complete')
      .select('rider_id')
      .eq('is_team_member', true);
    
    if (error) {
      console.error('❌ Auto-sync failed to fetch riders:', error.message);
      return;
    }
    
    if (!riders || riders.length === 0) {
      console.log('ℹ️  No riders to sync');
      return;
    }
    
    const riderIds = riders.map(r => r.rider_id);
    console.log(`📊 Auto-syncing ${riderIds.length} riders: ${riderIds.join(', ')}`);
    
    let synced = 0;
    let failed = 0;
    
    for (const riderId of riderIds) {
      try {
        const result = await syncRiderFromAPIs(riderId);
        if (result.synced) {
          synced++;
        } else {
          failed++;
        }
      } catch (error: any) {
        console.error(`❌ Auto-sync failed for rider ${riderId}:`, error.message);
        failed++;
      }
      
      // Small delay between riders
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`✅ Auto-sync complete: ${synced} synced, ${failed} failed\n`);
    
    // Calculate next run
    if (autoSyncConfig.enabled && autoSyncConfig.intervalMinutes > 0) {
      autoSyncConfig.nextRun = new Date(Date.now() + autoSyncConfig.intervalMinutes * 60 * 1000);
    }
    
  } catch (error: any) {
    console.error('❌ Auto-sync error:', error.message);
  }
};

// Start/restart auto-sync scheduler
const startAutoSync = () => {
  // Clear existing timers
  if (autoSyncIntervalId) clearInterval(autoSyncIntervalId);
  if (autoSyncInitialTimeoutId) clearTimeout(autoSyncInitialTimeoutId);
  
  if (!autoSyncConfig.enabled || autoSyncConfig.intervalMinutes <= 0) {
    console.log('⚠️  Server-side auto-sync disabled');
    autoSyncConfig.nextRun = null;
    return;
  }
  
  const intervalMs = autoSyncConfig.intervalMinutes * 60 * 1000;
  console.log(`🔄 Server-side auto-sync enabled: every ${autoSyncConfig.intervalMinutes} minutes`);
  
  // Initial sync after 5 minutes (or immediately if configured < 5 minutes)
  const initialDelay = Math.min(5 * 60 * 1000, intervalMs);
  
  // Calculate nextRun time
  autoSyncConfig.nextRun = new Date(Date.now() + initialDelay);
  console.log(`📅 Next sync scheduled at: ${autoSyncConfig.nextRun.toISOString()}`);
  
  autoSyncInitialTimeoutId = setTimeout(() => {
    console.log('🚀 Running initial auto-sync...');
    runAutoSync();
  }, initialDelay);
  
  // Schedule recurring sync
  autoSyncIntervalId = setInterval(runAutoSync, intervalMs);
};

// GET current auto-sync config
app.get('/api/admin/sync-config', (req, res) => {
  res.json({
    ...autoSyncConfig,
    lastRun: autoSyncConfig.lastRun?.toISOString() || null,
    nextRun: autoSyncConfig.nextRun?.toISOString() || null
  });
});

// POST update auto-sync config
app.post('/api/admin/sync-config', (req, res) => {
  try {
    const { enabled, intervalMinutes } = req.body;
    
    if (typeof enabled === 'boolean') {
      autoSyncConfig.enabled = enabled;
    }
    
    if (typeof intervalMinutes === 'number' && intervalMinutes >= 0) {
      autoSyncConfig.intervalMinutes = intervalMinutes;
    }
    
    console.log('⚙️  Auto-sync config updated:', { enabled: autoSyncConfig.enabled, intervalMinutes: autoSyncConfig.intervalMinutes });
    
    // Save to database voor persistence
    await saveAutoSyncConfig();
    
    // Restart scheduler with new config
    startAutoSync();
    
    // Respond met de actuele config inclusief nieuwe nextRun
    res.json({
      success: true,
      config: {
        enabled: autoSyncConfig.enabled,
        intervalMinutes: autoSyncConfig.intervalMinutes,
        lastRun: autoSyncConfig.lastRun?.toISOString() || null,
        nextRun: autoSyncConfig.nextRun?.toISOString() || null
      }
    });
  } catch (error: any) {
    console.error('❌ Failed to update sync config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, async () => {
  // Load persisted config before starting scheduler
  await loadAutoSyncConfig();
  
  // Start auto-sync with loaded config
  startAutoSync();
  console.log(`✅ Server on ${PORT}`);
  console.log(`📊 Racing Matrix: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
});
