// MINIMAL SERVER WITH TEAM MANAGEMENT
// Railway environment variables worden automatisch geladen - GEEN dotenv nodig!
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

// Direct environment variables gebruiken - Railway injecteert ze al
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ZWIFTRACING_API_TOKEN = process.env.ZWIFTRACING_API_TOKEN || '650c6d2fc4ef6858d74cbef1';

console.log('🚀 Environment check:', {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasSupabaseKey: !!SUPABASE_SERVICE_KEY,
  hasZwiftToken: !!ZWIFTRACING_API_TOKEN,
  nodeEnv: process.env.NODE_ENV
});

// Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '5.0.0-minimal' });
});

// Supabase config for frontend
app.get('/api/config/supabase', (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

// Riders data - READ ONLY
app.get('/api/riders', async (req, res) => {
  const { data } = await supabase.from('v_rider_complete').select('*');
  res.json(data || []);
});

// ============= TEAM MANAGEMENT =============

// Get team roster
app.get('/api/admin/team/riders', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('team_roster')
      .select('*')
      .order('added_at', { ascending: false });
    
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error loading roster:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Add single rider with auto-sync
app.post('/api/admin/team/riders', async (req, res) => {
  try {
    const { rider_id } = req.body;
    if (!rider_id) return res.status(400).json({ error: 'rider_id required' });

    // Check if rider already exists in roster
    const { data: existing } = await supabase
      .from('team_roster')
      .select('rider_id')
      .eq('rider_id', rider_id)
      .single();

    if (existing) {
      // Already exists - just re-sync
      await syncRiderData(rider_id);
      return res.json({ success: true, rider_id, already_existed: true });
    }

    // FIRST: Sync rider data from APIs (creates entries in api tables)
    await syncRiderData(rider_id);

    // THEN: Add to roster (foreign key will now work)
    const { error: insertError } = await supabase
      .from('team_roster')
      .insert({ rider_id, is_active: true });
    
    if (insertError) throw insertError;

    res.json({ success: true, rider_id, already_existed: false });
  } catch (error: any) {
    console.error('Error adding rider:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Bulk add riders (CSV/TXT/Array)
app.post('/api/admin/team/riders/bulk', async (req, res) => {
  try {
    const { rider_ids } = req.body;
    if (!Array.isArray(rider_ids) || rider_ids.length === 0) {
      return res.status(400).json({ error: 'rider_ids array required' });
    }

    const results = { added: 0, skipped: 0, failed: 0, errors: [] as any[] };

    for (const rider_id of rider_ids) {
      try {
        // Check if exists in roster
        const { data: existing } = await supabase
          .from('team_roster')
          .select('rider_id')
          .eq('rider_id', rider_id)
          .single();

        if (existing) {
          results.skipped++;
          await syncRiderData(rider_id); // Re-sync existing
          continue;
        }

        // FIRST: Sync data from APIs
        await syncRiderData(rider_id);

        // THEN: Add to roster
        const { error: insertError } = await supabase
          .from('team_roster')
          .insert({ rider_id, is_active: true });
        
        if (insertError) {
          results.failed++;
          results.errors.push({ rider_id, error: insertError.message });
          continue;
        }

        results.added++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({ rider_id, error: error.message });
      }
    }

    res.json(results);
  } catch (error: any) {
    console.error('Bulk add error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete rider from roster
app.delete('/api/admin/team/riders/:riderId', async (req, res) => {
  try {
    const riderId = parseInt(req.params.riderId);
    const { error } = await supabase
      .from('team_roster')
      .delete()
      .eq('rider_id', riderId);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting rider:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Sync config endpoints
app.get('/api/admin/sync/config', async (req, res) => {
  try {
    const { data } = await supabase.from('sync_config').select('*').single();
    res.json(data || { auto_sync_enabled: 'false', sync_interval_hours: '24' });
  } catch (error: any) {
    res.json({ auto_sync_enabled: 'false', sync_interval_hours: '24' });
  }
});

app.post('/api/admin/sync/config', async (req, res) => {
  try {
    const { auto_sync_enabled } = req.body;
    const { error } = await supabase
      .from('sync_config')
      .update({ auto_sync_enabled })
      .eq('id', 1);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Sync logs
app.get('/api/admin/sync/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const { data } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);
    
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Manual sync trigger
app.post('/api/admin/sync/trigger', async (req, res) => {
  try {
    // Get all active riders
    const { data: roster } = await supabase
      .from('team_roster')
      .select('rider_id')
      .eq('is_active', true);

    if (!roster || roster.length === 0) {
      return res.status(400).json({ error: 'No active riders' });
    }

    // Log sync start
    const { data: logEntry } = await supabase
      .from('sync_logs')
      .insert({ status: 'running', riders_synced: 0, riders_failed: 0 })
      .select()
      .single();

    // Sync in background
    Promise.all(roster.map(r => syncRiderData(r.rider_id))).then(() => {
      supabase.from('sync_logs').update({
        status: 'success',
        completed_at: new Date().toISOString(),
        riders_synced: roster.length
      }).eq('id', logEntry?.id);
    });

    res.json({ success: true, message: 'Sync started' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============= SYNC HELPER =============

async function syncRiderData(riderId: number) {
  const results = { racing: false, profile: false };
  
  try {
    // Gebruik de globale token variabele (al geladen bovenaan)
    
    // Parallel fetch: beide APIs tegelijk aanroepen
    const [racingResult, profileResult] = await Promise.allSettled([
      // ZwiftRacing API
      axios.get(
        `https://zwift-ranking.herokuapp.com/public/riders/${riderId}`,
        { headers: { 'Authorization': ZWIFTRACING_API_TOKEN }, timeout: 10000 }
      ),
      // Zwift Official API
      axios.get(
        `https://us-or-rly101.zwift.com/api/profiles/${riderId}`,
        { timeout: 10000 }
      )
    ]);

    // Process ZwiftRacing data (indien succesvol)
    if (racingResult.status === 'fulfilled') {
      try {
        const data = racingResult.value.data;
        await supabase.from('api_zwiftracing_riders').upsert({
          rider_id: riderId,
          id: riderId,
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
        }, { onConflict: 'rider_id' });
        results.racing = true;
        console.log(`✅ ZwiftRacing data synced for ${riderId}`);
      } catch (error: any) {
        console.error(`❌ Failed to save ZwiftRacing data for ${riderId}:`, error.message);
      }
    } else {
      console.error(`❌ ZwiftRacing API failed for ${riderId}:`, racingResult.reason?.message);
    }

    // Process Zwift Official data (indien succesvol)
    if (profileResult.status === 'fulfilled') {
      try {
        const profile = profileResult.value.data;
        await supabase.from('api_zwift_official_profiles').upsert({
          rider_id: riderId,
          zwift_id: riderId,
          first_name: profile.firstName || null,
          last_name: profile.lastName || null,
          age: profile.age || null,
          gender: profile.male === true ? 'M' : profile.male === false ? 'F' : null,
          is_male: profile.male,
          country_code: profile.countryCode || null,
          country_alpha3: profile.countryAlpha3 || null,
          avatar_url: profile.imageSrc || null,
          avatar_url_large: profile.imageSrcLarge || null,
          weight_kg: profile.weight ? profile.weight / 1000 : null,
          height_cm: profile.height || null,
          ftp_watts: profile.ftp || null,
          racing_score: profile.playerTypeId || null,
          followers_count: profile.followerStatusOfLoggedInPlayer?.followeeCount || null,
          followees_count: profile.followerStatusOfLoggedInPlayer?.followerCount || null,
          rideons_given: profile.totalGiveRideons || null,
          achievement_level: profile.achievementLevel || null,
          total_distance_km: profile.totalDistanceInMeters ? profile.totalDistanceInMeters / 1000 : null,
          total_elevation_m: profile.totalExperiencePoints || null,
          currently_riding: profile.riding === true,
          current_world: profile.worldId || null,
          raw_response: profile,
          fetched_at: new Date().toISOString()
        }, { onConflict: 'rider_id' });
        results.profile = true;
        console.log(`✅ Zwift Official data synced for ${riderId}`);
      } catch (error: any) {
        console.error(`❌ Failed to save Zwift Official data for ${riderId}:`, error.message);
      }
    } else {
      console.error(`❌ Zwift Official API failed for ${riderId}:`, profileResult.reason?.message);
    }

    // Update last_synced als minimaal 1 bron succesvol was
    if (results.racing || results.profile) {
      await supabase.from('team_roster')
        .update({ last_synced: new Date().toISOString() })
        .eq('rider_id', riderId);
      console.log(`✅ Rider ${riderId} synced (Racing: ${results.racing}, Profile: ${results.profile})`);
    } else {
      console.error(`❌ Complete sync failed for ${riderId} - both APIs failed`);
    }

  } catch (error: any) {
    console.error(`❌ Unexpected sync error for ${riderId}:`, error.message);
  }
}

// ============= END TEAM MANAGEMENT =============

// Frontend
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.listen(PORT, () => console.log(`✅ Server on ${PORT}`));
