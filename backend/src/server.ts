// MINIMAL SERVER WITH TEAM MANAGEMENT
import './env';
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

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || ''
);

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

    // Add to roster
    const { error: insertError } = await supabase
      .from('team_roster')
      .insert({ rider_id, is_active: true });
    
    if (insertError) throw insertError;

    // Sync rider data from APIs
    await syncRiderData(rider_id);

    res.json({ success: true, rider_id });
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

    const results = { added: 0, failed: 0, errors: [] as any[] };

    for (const rider_id of rider_ids) {
      try {
        // Add to roster
        const { error: insertError } = await supabase
          .from('team_roster')
          .insert({ rider_id, is_active: true });
        
        if (insertError) {
          results.failed++;
          results.errors.push({ rider_id, error: insertError.message });
          continue;
        }

        // Sync data
        await syncRiderData(rider_id);
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
  try {
    const ZWIFTRACING_API_KEY = process.env.ZWIFTRACING_API_TOKEN || '650c6d2fc4ef6858d74cbef1';
    
    // Fetch ZwiftRacing data
    const racingRes = await axios.get(
      `https://zwift-ranking.herokuapp.com/public/riders/${riderId}`,
      { headers: { 'Authorization': ZWIFTRACING_API_KEY }, timeout: 10000 }
    );
    
    const data = racingRes.data;
    
    // Insert racing data
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

    // Fetch Zwift Official profile
    const profileRes = await axios.get(
      `https://us-or-rly101.zwift.com/api/profiles/${riderId}`,
      { timeout: 10000 }
    );
    
    const profile = profileRes.data;
    
    // Insert profile data
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

    // Update last_synced
    await supabase.from('team_roster')
      .update({ last_synced: new Date().toISOString() })
      .eq('rider_id', riderId);

    console.log(`✅ Synced rider ${riderId}`);
  } catch (error: any) {
    console.error(`❌ Sync failed for rider ${riderId}:`, error.message);
  }
}

// ============= END TEAM MANAGEMENT =============

// Frontend
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.listen(PORT, () => console.log(`✅ Server on ${PORT}`));
