/**
 * Team Management Endpoints
 * US2: Add riders individually or bulk via .txt/.csv
 * US3: Sync rider data (current + historical)
 * US5: Auto-sync hourly
 * US7: Manual sync trigger
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { zwiftClient } from '../../api/zwift-client.js';
import { UnifiedSyncService } from '../../services/unified-sync.service.js';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

// Initialize unified sync service
const unifiedSync = new UnifiedSyncService();

const router = Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// ============================================================================
// US2: ADD RIDERS (Individual & Bulk)
// ============================================================================

/**
 * POST /api/team/members
 * Add single rider by riderId
 */
router.post('/members', async (req: Request, res: Response) => {
  try {
    const { rider_id, nickname, notes } = req.body;

    if (!rider_id) {
      return res.status(400).json({ 
        error: 'rider_id is verplicht' 
      });
    }

    // Check if rider already exists
    const { data: existing } = await supabase.client
      .from('my_team_members')
      .select('rider_id')
      .eq('rider_id', rider_id)
      .single();

    if (existing) {
      return res.status(409).json({ 
        error: 'Rider bestaat al in team',
        rider_id 
      });
    }

    // Add to team
    const { data, error } = await supabase.client
      .from('my_team_members')
      .insert({
        rider_id,
        nickname: nickname || null,
        notes: notes || null,
        added_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding rider:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Trigger immediate sync for this rider
    try {
      await syncSingleRider(rider_id);
    } catch (syncError) {
      console.warn('Sync failed but rider added:', syncError);
    }

    res.json({
      success: true,
      message: 'Rider toegevoegd aan team',
      rider: data
    });

  } catch (error) {
    console.error('Error in POST /api/team/members:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/team/members/bulk
 * Bulk import via .txt or .csv file
 * 
 * CSV format: rider_id,nickname,notes
 * TXT format: one rider_id per line
 */
router.post('/members/bulk', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Geen bestand geüpload' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const filename = req.file.originalname.toLowerCase();
    let riders: Array<{ rider_id: number; nickname?: string; notes?: string }> = [];

    // Parse based on file type
    if (filename.endsWith('.csv')) {
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      riders = records.map((record: any) => ({
        rider_id: parseInt(record.rider_id || record.riderId || record.id),
        nickname: record.nickname || null,
        notes: record.notes || null
      }));

    } else if (filename.endsWith('.txt')) {
      const lines = fileContent.split('\n');
      riders = lines
        .map(line => line.trim())
        .filter(line => line && !isNaN(parseInt(line)))
        .map(line => ({
          rider_id: parseInt(line),
          nickname: null,
          notes: null
        }));

    } else {
      return res.status(400).json({ 
        error: 'Alleen .csv en .txt bestanden zijn toegestaan' 
      });
    }

    if (riders.length === 0) {
      return res.status(400).json({ 
        error: 'Geen geldige rider IDs gevonden in bestand' 
      });
    }

    // Filter out existing riders
    const { data: existing } = await supabase.client
      .from('my_team_members')
      .select('rider_id');

    const existingIds = new Set(existing?.map(r => r.rider_id) || []);
    const newRiders = riders.filter(r => !existingIds.has(r.rider_id));

    if (newRiders.length === 0) {
      return res.status(409).json({ 
        message: 'Alle riders bestaan al in team',
        total: riders.length,
        skipped: riders.length
      });
    }

    // Insert new riders
    const { data, error } = await supabase.client
      .from('my_team_members')
      .insert(
        newRiders.map(r => ({
          rider_id: r.rider_id,
          nickname: r.nickname,
          notes: r.notes,
          added_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      )
      .select();

    if (error) {
      console.error('Error bulk insert:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Trigger bulk sync (async, don't wait)
    syncBulkRiders(newRiders.map(r => r.rider_id)).catch(console.error);

    res.json({
      success: true,
      message: `${newRiders.length} riders toegevoegd aan team`,
      total: riders.length,
      added: newRiders.length,
      skipped: riders.length - newRiders.length,
      riders: data
    });

  } catch (error) {
    console.error('Error in POST /api/team/members/bulk:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/team/members
 * Get all team members with unified rider data
 */
router.get('/members', async (req: Request, res: Response) => {
  try {
    // Get team members
    const { data: teamMembers, error: teamError } = await supabase.client
      .from('my_team_members')
      .select('*')
      .order('rider_id', { ascending: true });

    if (teamError) {
      console.error('Error fetching team members:', teamError);
      return res.status(500).json({ error: 'Database error', details: teamError.message });
    }

    // Get rider data for all team members
    const riderIds = teamMembers?.map(m => m.rider_id) || [];
    const { data: riders, error: ridersError } = await supabase.client
      .from('riders_unified')
      .select('rider_id, name, club_name, velo_rating, zp_category, ftp, race_wins, race_podiums, last_synced_zwift_racing')
      .in('rider_id', riderIds);

    if (ridersError) {
      console.error('Error fetching riders:', ridersError);
      // Continue with team members only
    }

    // Create lookup map
    const riderMap = new Map(riders?.map(r => [r.rider_id, r]) || []);

    // Merge data
    const members = teamMembers?.map(member => {
      const riderData = riderMap.get(member.rider_id);
      return {
        rider_id: member.rider_id,
        nickname: member.nickname,
        notes: member.notes,
        is_favorite: member.is_favorite,
        added_at: member.added_at,
        name: riderData?.name || null,
        club_name: riderData?.club_name || null,
        velo_rating: riderData?.velo_rating || null,
        category: riderData?.zp_category || null,
        ftp: riderData?.ftp || null,
        race_wins: riderData?.race_wins || null,
        race_podiums: riderData?.race_podiums || null,
        last_synced: riderData?.last_synced_zwift_racing || null
      };
    }) || [];

    // Sort by velo_rating DESC (nulls last)
    members.sort((a, b) => {
      if (a.velo_rating === null) return 1;
      if (b.velo_rating === null) return -1;
      return b.velo_rating - a.velo_rating;
    });

    res.json({
      success: true,
      count: members.length,
      members
    });

  } catch (error) {
    console.error('Error in GET /api/team/members:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/team/members/:riderId
 * Remove rider from team
 */
router.delete('/members/:riderId', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);

    const { error } = await supabase.client
      .from('my_team_members')
      .delete()
      .eq('rider_id', riderId);

    if (error) {
      console.error('Error deleting rider:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      success: true,
      message: 'Rider verwijderd uit team',
      rider_id: riderId
    });

  } catch (error) {
    console.error('Error in DELETE /api/team/members/:riderId:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================================
// US3: SYNC RIDERS (Current + Historical)
// ============================================================================

/**
 * POST /api/team/sync/rider/:riderId
 * US3: Sync single rider using unified 3-API sync service
 */
router.post('/sync/rider/:riderId', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);

    console.log(`🔄 Starting unified sync for rider ${riderId}...`);
    const result = await unifiedSync.syncRider(riderId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Sync failed',
        rider_id: riderId,
        errors: result.errors
      });
    }

    res.json({
      success: true,
      message: 'Rider sync voltooid met 3-API unified sync',
      rider_id: result.rider_id,
      name: result.name,
      synced_fields: result.synced_fields,
      errors: result.errors
    });

  } catch (error: any) {
    console.error('Error syncing rider:', error);
    res.status(500).json({ 
      error: 'Sync failed',
      message: error.message 
    });
  }
});

/**
 * POST /api/team/sync/all
 * US7: Manual sync trigger for all team members using unified 3-API sync
 */
router.post('/sync/all', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Starting unified sync for all team members...');
    const results = await unifiedSync.syncAllTeamMembers();

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Sync voltooid: ${successful} succesvol, ${failed} gefaald`,
      total: results.length,
      successful,
      failed,
      results: results.map(r => ({
        rider_id: r.rider_id,
        name: r.name,
        success: r.success,
        synced_fields: r.synced_fields,
        errors: r.errors
      }))
    });

  } catch (error: any) {
    console.error('Error in POST /api/team/sync/all:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/team/sync/status
 * US6: Get sync status and logs
 */
router.get('/sync/status', async (req: Request, res: Response) => {
  try {
    // Get last sync timestamp from riders_unified
    const { data: lastSync } = await supabase.client
      .from('riders_unified')
      .select('last_synced_zwift_racing')
      .order('last_synced_zwift_racing', { ascending: false, nullsFirst: false })
      .limit(1)
      .single();

    // Get sync logs
    const { data: logs } = await supabase.client
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    // Get team member count
    const { count: totalMembers } = await supabase.client
      .from('my_team_members')
      .select('*', { count: 'exact', head: true });

    // Get synced count
    const { count: syncedMembers } = await supabase.client
      .from('riders_unified')
      .select('*', { count: 'exact', head: true })
      .eq('is_team_member', true)
      .not('last_synced_zwift_racing', 'is', null);

    res.json({
      success: true,
      status: {
        last_sync: lastSync?.last_synced_zwift_racing,
        total_members: totalMembers || 0,
        synced_members: syncedMembers || 0,
        sync_percentage: totalMembers ? Math.round((syncedMembers || 0) / totalMembers * 100) : 0
      },
      logs: logs || []
    });

  } catch (error) {
    console.error('Error in GET /api/team/sync/status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/team/sync/scheduler
 * US5/US6: Get auto-sync scheduler status
 */
router.get('/sync/scheduler', async (req: Request, res: Response) => {
  try {
    const { teamAutoSync } = await import('../../services/team-auto-sync.service.js');
    const status = teamAutoSync.getStatus();

    res.json({
      success: true,
      scheduler: status
    });

  } catch (error) {
    console.error('Error in GET /api/team/sync/scheduler:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/team/sync/scheduler/enable
 * US5: Enable auto-sync
 */
router.post('/sync/scheduler/enable', async (req: Request, res: Response) => {
  try {
    const { teamAutoSync } = await import('../../services/team-auto-sync.service.js');
    teamAutoSync.setEnabled(true);

    res.json({
      success: true,
      message: 'Auto-sync enabled'
    });

  } catch (error) {
    console.error('Error enabling auto-sync:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/team/sync/scheduler/disable
 * US5: Disable auto-sync
 */
router.post('/sync/scheduler/disable', async (req: Request, res: Response) => {
  try {
    const { teamAutoSync } = await import('../../services/team-auto-sync.service.js');
    teamAutoSync.setEnabled(false);

    res.json({
      success: true,
      message: 'Auto-sync disabled'
    });

  } catch (error) {
    console.error('Error disabling auto-sync:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sync single rider with current + historical data
 */
async function syncSingleRider(riderId: number, includeHistorical: boolean = true) {
  // Get current rider data
  const currentData = await zwiftClient.getRider(riderId);

  // Get historical snapshot (30 days ago)
  let historicalData = null;
  if (includeHistorical) {
    try {
      const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
      historicalData = await zwiftClient.getRiderAtTimestamp(riderId, thirtyDaysAgo);
    } catch (error) {
      console.warn(`Historical data not available for rider ${riderId}`);
    }
  }

  // Map to database format
  const unified = {
    rider_id: currentData.riderId,
    name: currentData.name,
    
    // Physical
    weight_kg: currentData.weight,
    height_cm: currentData.height,
    ftp: currentData.zpFTP,
    gender: currentData.gender,
    country_code: currentData.country,
    
    // Categories
    zp_category: currentData.zpCategory,
    age_category: currentData.age,
    
    // Power curve
    power_5s_w: Math.round(currentData.power.w5),
    power_5s_wkg: Number(currentData.power.wkg5?.toFixed(2)),
    power_15s_w: Math.round(currentData.power.w15),
    power_15s_wkg: Number(currentData.power.wkg15?.toFixed(2)),
    power_30s_w: Math.round(currentData.power.w30),
    power_30s_wkg: Number(currentData.power.wkg30?.toFixed(2)),
    power_1m_w: Math.round(currentData.power.w60),
    power_1m_wkg: Number(currentData.power.wkg60?.toFixed(2)),
    power_2m_w: Math.round(currentData.power.w120),
    power_2m_wkg: Number(currentData.power.wkg120?.toFixed(2)),
    power_5m_w: Math.round(currentData.power.w300),
    power_5m_wkg: Number(currentData.power.wkg300?.toFixed(2)),
    power_20m_w: Math.round(currentData.power.w1200),
    power_20m_wkg: Number(currentData.power.wkg1200?.toFixed(2)),
    
    critical_power: Number(currentData.power.CP?.toFixed(2)),
    anaerobic_work_capacity: Number(currentData.power.AWC?.toFixed(2)),
    compound_score: Number(currentData.power.compoundScore?.toFixed(2)),
    
    // vELO & race stats
    velo_rating: Number(currentData.race.current.rating?.toFixed(2)),
    velo_max_30d: Number(currentData.race.max30?.rating?.toFixed(2)),
    velo_max_90d: Number(currentData.race.max90?.rating?.toFixed(2)),
    velo_rank: currentData.race.current.mixed?.number?.toString(),
    race_wins: currentData.race.wins,
    race_podiums: currentData.race.podiums,
    race_dnfs: currentData.race.dnfs,
    
    // Phenotype
    phenotype_sprinter: currentData.phenotype.scores?.sprinter,
    phenotype_pursuiter: currentData.phenotype.scores?.pursuiter,
    phenotype_puncheur: currentData.phenotype.scores?.puncheur,
    
    // Club
    club_id: currentData.club?.id,
    club_name: currentData.club?.name,
    
    // Handicaps
    handicap_flat: currentData.handicaps?.profile?.flat,
    handicap_rolling: currentData.handicaps?.profile?.rolling,
    handicap_hilly: currentData.handicaps?.profile?.hilly,
    handicap_mountainous: currentData.handicaps?.profile?.mountainous,
    
    // Sync tracking
    is_team_member: true,
    last_synced_zwift_racing: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Upsert to database
  const { error } = await supabase.client
    .from('riders_unified')
    .upsert(unified, { onConflict: 'rider_id' });

  if (error) {
    throw new Error(`Database upsert failed: ${error.message}`);
  }

  return {
    current_velo: unified.velo_rating,
    historical_velo: historicalData?.race.current.rating,
    velo_change: historicalData 
      ? Number((unified.velo_rating - historicalData.race.current.rating).toFixed(2))
      : null
  };
}

/**
 * Sync multiple riders in bulk with rate limiting
 */
async function syncBulkRiders(riderIds: number[]) {
  const results = {
    total: riderIds.length,
    success: 0,
    failed: 0,
    errors: [] as Array<{ rider_id: number; error: string }>
  };

  for (const riderId of riderIds) {
    try {
      await syncSingleRider(riderId);
      results.success++;
      console.log(`✅ Synced rider ${riderId} (${results.success}/${results.total})`);
    } catch (error: any) {
      results.failed++;
      results.errors.push({ rider_id: riderId, error: error.message });
      console.error(`❌ Failed to sync rider ${riderId}:`, error.message);
    }

    // Rate limiting: 12 seconds between riders (5/min safe)
    if (riderId !== riderIds[riderIds.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }

  return results;
}

/**
 * Log sync activity
 */
async function logSync(
  syncType: 'manual' | 'auto' | 'single',
  status: 'started' | 'completed' | 'failed',
  riderCount: number,
  errorMessage?: string
) {
  try {
    await supabase.client
      .from('sync_logs')
      .insert({
        sync_type: syncType,
        status,
        rider_count: riderCount,
        error_message: errorMessage || null,
        started_at: new Date().toISOString(),
        completed_at: status === 'completed' ? new Date().toISOString() : null
      });
  } catch (error) {
    console.error('Failed to log sync:', error);
  }
}

export default router;
