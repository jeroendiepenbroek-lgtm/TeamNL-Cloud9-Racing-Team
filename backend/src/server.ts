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

// ============================================
// API SYNC FUNCTIONS
// ============================================

async function syncRiderFromAPIs(riderId: number): Promise<{ synced: boolean; error?: string }> {
  try {
    console.log(`🔄 Syncing rider ${riderId}...`);
    
    // Parallel fetch from both APIs
    const [racingResult, profileResult] = await Promise.allSettled([
      axios.get(`https://zwift-ranking.herokuapp.com/public/riders/${riderId}`, {
        headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
        timeout: 10000
      }),
      axios.get(`https://us-or-rly101.zwift.com/api/profiles/${riderId}`, {
        timeout: 10000
      })
    ]);

    let racingSynced = false;
    let profileSynced = false;

    // Process ZwiftRacing data
    if (racingResult.status === 'fulfilled') {
      const data = racingResult.value.data;
      const riderData = {
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
    }

    // Process Zwift Official data
    if (profileResult.status === 'fulfilled') {
      const data = profileResult.value.data;
      const profileData = {
        rider_id: riderId,
        zwift_id: riderId,
        first_name: data.firstName || null,
        last_name: data.lastName || null,
        email_address: data.emailAddress || null,
        address: data.address || null,
        date_of_birth: data.dob || null,
        age: data.age || null,
        gender: data.male === true ? 'M' : data.male === false ? 'F' : null,
        is_male: data.male,
        country_code: data.countryCode || null,
        country_alpha3: data.countryAlpha3 || null,
        avatar_url: data.imageSrc || null,
        avatar_url_large: data.imageSrcLarge || null,
        weight_kg: data.weight ? data.weight / 1000 : null,
        height_cm: data.height || null,
        ftp_watts: data.ftp || null,
        racing_score: data.playerTypeId || null,
        racing_category: null,
        followers_count: data.followerStatusOfLoggedInPlayer?.followeeCount || null,
        followees_count: data.followerStatusOfLoggedInPlayer?.followerCount || null,
        rideons_given: data.totalGiveRideons || null,
        achievement_level: data.achievementLevel || null,
        total_distance_km: data.totalDistanceInMeters ? data.totalDistanceInMeters / 1000 : null,
        total_elevation_m: data.totalExperiencePoints || null,
        currently_riding: data.riding === true,
        current_world: data.worldId || null,
        raw_response: data,
        fetched_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('api_zwift_official_profiles')
        .upsert(profileData, { onConflict: 'rider_id' });

      if (!error) {
        profileSynced = true;
        console.log(`✅ Zwift Official data synced for ${riderId}`);
      } else {
        console.error(`❌ Zwift Official sync failed for ${riderId}:`, error.message);
      }
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

// Get all riders from v_rider_complete view
app.get('/api/riders', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('v_rider_complete')
      .select('*')
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
    const { data, error } = await supabase
      .from('v_rider_complete')
      .select('*')
      .eq('is_active', true)
      .order('velo_live', { ascending: false, nullsFirst: false });

    if (error) throw error;

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

// Remove rider from team
app.delete('/api/admin/riders/:riderId', async (req, res) => {
  try {
    const riderId = parseInt(req.params.riderId);

    const { error } = await supabase
      .from('team_roster')
      .delete()
      .eq('rider_id', riderId);

    if (error) throw error;

    console.log(`🗑️  Removed rider ${riderId} from team`);

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
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`✅ Server on ${PORT}`);
  console.log(`📊 Racing Matrix: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
});
