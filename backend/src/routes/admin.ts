import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { authenticateAdmin, AuthRequest } from '../middleware/auth';
import { syncRider, syncAllRiders } from '../services/syncService';

const router = express.Router();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required in environment variables');
  }
  return secret;
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';

// Export a function to initialize supabase AFTER env is loaded
let supabase: SupabaseClient;

export function initializeSupabase() {
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_SERVICE_KEY is required in environment variables');
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('✅ Supabase client initialized in admin routes');
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single() as { data: any; error: any };

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash as string);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await (supabase
      .from('admin_users') as any)
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token
router.get('/verify', authenticateAdmin, (req: AuthRequest, res: Response) => {
  res.json({ valid: true, admin: req.admin });
});

// ============================================================================
// TEAM MANAGEMENT
// ============================================================================

// Get team roster (PUBLIC for development)
router.get('/team/riders', async (req: Request, res: Response) => {
  console.log('📥 GET /api/admin/team/riders - request received');
  try {
    console.log('🔍 Querying team_roster...');
    const { data, error } = await supabase
      .from('team_roster')
      .select('*')
      .order('added_at', { ascending: false });

    console.log('📊 Query result:', { dataCount: data?.length, error });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('❌ Get roster error:', error);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

// Add rider to team
router.post('/team/riders', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const { rider_id, zwift_id, notes } = req.body;

  if (!rider_id) {
    return res.status(400).json({ error: 'rider_id required' });
  }

  try {
    const { data, error } = await (supabase
      .from('team_roster') as any)
      .insert({
        rider_id,
        zwift_id,
        notes,
        added_by: req.admin?.email || 'system'
      })
      .select()
      .single();

    if (error) throw error;

    // Log action
    await supabase.rpc('log_admin_action', {
      p_admin_email: req.admin?.email || 'system',
      p_action: 'add_rider',
      p_entity_type: 'rider',
      p_entity_id: rider_id.toString(),
      p_details: JSON.stringify({ rider_id, zwift_id, notes })
    } as any);

    // Trigger immediate sync for this rider (async, don't wait)
    syncRider(rider_id).catch(err => 
      console.error(`Failed to sync newly added rider ${rider_id}:`, err)
    );

    res.json(data);
  } catch (error: any) {
    console.error('Add rider error:', error);
    res.status(500).json({ error: 'Failed to add rider' });
  }
});

// Bulk import riders (PUBLIC for development)
router.post('/team/riders/bulk', async (req: AuthRequest, res: Response) => {
  const { rider_ids } = req.body;

  if (!Array.isArray(rider_ids) || rider_ids.length === 0) {
    return res.status(400).json({ error: 'rider_ids array required' });
  }

  try {
    const riders = rider_ids.map(id => ({
      rider_id: id,
      added_by: req.admin?.email || 'system'
    }));

    const { data, error } = await supabase
      .from('team_roster')
      .insert(riders as any)
      .select();

    if (error) throw error;

    // Log action
    await supabase.rpc('log_admin_action', {
      p_admin_email: req.admin?.email || 'system',
      p_action: 'bulk_add_riders',
      p_entity_type: 'rider',
      p_entity_id: 'bulk',
      p_details: JSON.stringify({ count: rider_ids.length, rider_ids })
    } as any);

    // Trigger sync for all newly added riders (async, don't wait)
    for (const rider_id of rider_ids) {
      syncRider(rider_id).catch(err => 
        console.error(`Failed to sync newly added rider ${rider_id}:`, err)
      );
      // Small delay between syncs
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({ success: true, added: data?.length || 0 });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to bulk import' });
  }
});

// Remove rider from team (PUBLIC for development)
router.delete('/team/riders/:rider_id', async (req: AuthRequest, res: Response) => {
  const { rider_id } = req.params;

  try {
    const { error } = await supabase
      .from('team_roster')
      .delete()
      .eq('rider_id', rider_id);

    if (error) throw error;

    // Log action
    await supabase.rpc('log_admin_action', {
      p_admin_email: req.admin?.email || 'system',
      p_action: 'remove_rider',
      p_entity_type: 'rider',
      p_entity_id: rider_id.toString()
    } as any);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Remove rider error:', error);
    res.status(500).json({ error: 'Failed to remove rider' });
  }
});

// ============================================================================
// SYNC MANAGEMENT
// ============================================================================

// Get sync config (PUBLIC for development)
router.get('/sync/config', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('sync_config')
      .select('*') as { data: any[] | null; error: any };

    if (error) throw error;

    const config: Record<string, any> = {};
    data?.forEach(item => {
      config[item.config_key] = item.config_value;
    });

    res.json(config);
  } catch (error: any) {
    console.error('Get config error:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Update sync config (PUBLIC for development)
router.post('/sync/config', async (req: AuthRequest, res: Response) => {
  const updates = req.body;

  try {
    // Handle auto_sync_enabled
    if (updates.auto_sync_enabled !== undefined) {
      const { error } = await (supabase
        .from('sync_config') as any)
        .update({ 
          config_value: updates.auto_sync_enabled,
          updated_by: req.admin?.email || 'system',
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'auto_sync_enabled');
      
      if (error) throw error;
    }

    // Handle sync_interval_hours
    if (updates.sync_interval_hours !== undefined) {
      const hours = parseInt(updates.sync_interval_hours);
      if (hours < 1 || hours > 24) {
        return res.status(400).json({ error: 'Interval must be between 1-24 hours' });
      }
      
      const { error } = await (supabase
        .from('sync_config') as any)
        .update({ 
          config_value: hours.toString(),
          updated_by: req.admin?.email || 'system',
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'sync_interval_hours');
      
      if (error) throw error;
    }

    // Log the action
    await supabase.rpc('log_admin_action', {
      p_admin_email: req.admin?.email || 'system',
      p_action: 'update_sync_config',
      p_entity_type: 'sync_config',
      p_entity_id: 'config',
      p_details: JSON.stringify(updates)
    } as any);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Get sync logs (PUBLIC for development)
router.get('/sync/logs', async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;

  try {
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Trigger manual sync (PUBLIC for development)
router.post('/sync/trigger', async (req: AuthRequest, res: Response) => {
  try {
    // Check if sync already in progress
    const { data: config } = await supabase
      .from('sync_config')
      .select('config_value')
      .eq('config_key', 'sync_in_progress')
      .maybeSingle() as { data: any; error: any };

    if (config?.config_value === 'true') {
      return res.status(409).json({ error: 'Sync already in progress' });
    }

    // Create sync log
    const { data: logEntry, error: logError } = await supabase
      .from('sync_logs')
      .insert({
        status: 'running',
        triggered_by: req.admin?.email || 'system',
        started_at: new Date().toISOString()
      } as any)
      .select()
      .single() as { data: any; error: any };

    if (logError) {
      console.error('Failed to create sync log:', logError);
      return res.status(500).json({ error: 'Failed to create sync log' });
    }

    // Set lock (upsert to ensure it exists)
    await (supabase
      .from('sync_config') as any)
      .upsert({ 
        config_key: 'sync_in_progress',
        config_value: 'true',
        updated_by: req.admin?.email || 'system',
        updated_at: new Date().toISOString()
      }, { onConflict: 'config_key' });

    // Trigger sync (async - don't wait)
    triggerSync(logEntry?.id, req.admin?.email || 'admin');

    res.json({ success: true, sync_log_id: logEntry?.id });
  } catch (error: any) {
    console.error('Trigger sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger sync' });
  }
});

// Get audit log
router.get('/audit', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;

  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Get audit error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function triggerSync(logId: number, triggeredBy: string | undefined) {
  const startTime = Date.now();
  let errorMessage = '';

  try {
    console.log(`🔄 Starting sync triggered by ${triggeredBy}...`);
    
    // Use the real sync service to fetch data from APIs
    const syncResult = await syncAllRiders();
    
    // Update sync log with results
    await (supabase
      .from('sync_logs') as any)
      .update({
        status: syncResult.failed === 0 ? 'success' : syncResult.synced > 0 ? 'partial' : 'failed',
        completed_at: new Date().toISOString(),
        riders_synced: syncResult.synced,
        riders_failed: syncResult.failed,
        duration_seconds: Math.floor((Date.now() - startTime) / 1000),
        error_message: syncResult.failed > 0 ? `${syncResult.failed} riders failed to sync` : null
      })
      .eq('id', logId);
    
    console.log(`✅ Sync completed: ${syncResult.synced}/${syncResult.total} riders synced`);

  } catch (error: any) {
    errorMessage = error.message;
    
    // Update sync log as failed
    await (supabase
      .from('sync_logs') as any)
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        riders_synced: 0,
        riders_failed: 0,
        error_message: errorMessage,
        duration_seconds: Math.floor((Date.now() - startTime) / 1000)
      })
      .eq('id', logId);
  } finally {
    // Release lock
    await (supabase
      .from('sync_config') as any)
      .update({ config_value: 'false' })
      .eq('config_key', 'sync_in_progress');

    // Update last sync timestamp
    await (supabase
      .from('sync_config') as any)
      .update({ config_value: Math.floor(Date.now() / 1000).toString() })
      .eq('config_key', 'last_sync_timestamp');
  }
}

export default router;
