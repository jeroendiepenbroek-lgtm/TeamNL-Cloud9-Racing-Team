import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { authenticateAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY not set in environment');
  throw new Error('SUPABASE_SERVICE_KEY is required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      JWT_SECRET,
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

// Get team roster
router.get('/team/roster', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('team_roster')
      .select('*')
      .order('added_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Get roster error:', error);
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
    const { data, error } = await supabase
      .from('team_roster')
      .insert({
        rider_id,
        zwift_id,
        notes,
        added_by: req.admin?.email
      })
      .select()
      .single();

    if (error) throw error;

    // Log action
    await supabase.rpc('log_admin_action', {
      p_admin_email: req.admin?.email,
      p_action: 'add_rider',
      p_entity_type: 'rider',
      p_entity_id: rider_id.toString(),
      p_details: { rider_id, zwift_id, notes }
    });

    res.json(data);
  } catch (error: any) {
    console.error('Add rider error:', error);
    res.status(500).json({ error: 'Failed to add rider' });
  }
});

// Bulk import riders
router.post('/team/riders/bulk', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const { rider_ids } = req.body;

  if (!Array.isArray(rider_ids) || rider_ids.length === 0) {
    return res.status(400).json({ error: 'rider_ids array required' });
  }

  try {
    const riders = rider_ids.map(id => ({
      rider_id: id,
      added_by: req.admin?.email
    }));

    const { data, error } = await supabase
      .from('team_roster')
      .insert(riders)
      .select();

    if (error) throw error;

    // Log action
    await supabase.rpc('log_admin_action', {
      p_admin_email: req.admin?.email,
      p_action: 'bulk_import',
      p_entity_type: 'rider',
      p_entity_id: 'bulk',
      p_details: { count: rider_ids.length, rider_ids }
    });

    res.json({ success: true, added: data?.length || 0 });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to bulk import' });
  }
});

// Remove rider from team
router.delete('/team/riders/:rider_id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const { rider_id } = req.params;

  try {
    const { error } = await supabase
      .from('team_roster')
      .delete()
      .eq('rider_id', rider_id);

    if (error) throw error;

    // Log action
    await supabase.rpc('log_admin_action', {
      p_admin_email: req.admin?.email,
      p_action: 'remove_rider',
      p_entity_type: 'rider',
      p_entity_id: rider_id
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Remove rider error:', error);
    res.status(500).json({ error: 'Failed to remove rider' });
  }
});

// ============================================================================
// SYNC MANAGEMENT
// ============================================================================

// Get sync config
router.get('/sync/config', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('sync_config')
      .select('*');

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

// Update sync config
router.put('/sync/config', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  const { auto_sync_enabled, sync_interval_hours } = req.body;

  try {
    if (auto_sync_enabled !== undefined) {
      await supabase.rpc('update_sync_config', {
        p_key: 'auto_sync_enabled',
        p_value: auto_sync_enabled.toString(),
        p_updated_by: req.admin?.email
      });
    }

    if (sync_interval_hours !== undefined) {
      const hours = parseInt(sync_interval_hours);
      if (hours < 1 || hours > 24) {
        return res.status(400).json({ error: 'Interval must be between 1-24 hours' });
      }
      await supabase.rpc('update_sync_config', {
        p_key: 'sync_interval_hours',
        p_value: hours.toString(),
        p_updated_by: req.admin?.email
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Get sync logs
router.get('/sync/logs', authenticateAdmin, async (req: AuthRequest, res: Response) => {
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

// Trigger manual sync
router.post('/sync/trigger', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Check if sync already in progress
    const { data: config } = await supabase
      .from('sync_config')
      .select('config_value')
      .eq('config_key', 'sync_in_progress')
      .single();

    if (config?.config_value === 'true') {
      return res.status(409).json({ error: 'Sync already in progress' });
    }

    // Create sync log
    const { data: logEntry } = await supabase
      .from('sync_logs')
      .insert({
        status: 'running',
        triggered_by: req.admin?.email
      })
      .select()
      .single();

    // Set lock
    await supabase
      .from('sync_config')
      .update({ config_value: 'true' })
      .eq('config_key', 'sync_in_progress');

    // Trigger sync (async - don't wait)
    triggerSync(logEntry?.id, req.admin?.email);

    res.json({ success: true, sync_log_id: logEntry?.id });
  } catch (error: any) {
    console.error('Trigger sync error:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
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
  let ridersSynced = 0;
  let ridersFailed = 0;
  let errorMessage = '';

  try {
    // Get all riders from team roster
    const { data: roster } = await supabase
      .from('team_roster')
      .select('rider_id')
      .eq('is_active', true);

    if (!roster || roster.length === 0) {
      throw new Error('No active riders in roster');
    }

    // Sync each rider (simplified - real implementation would use worker queue)
    for (const rider of roster) {
      try {
        // Call sync script (would be actual sync logic)
        console.log(`Syncing rider ${rider.rider_id}...`);
        ridersSynced++;
        
        // Update last_synced in roster
        await supabase
          .from('team_roster')
          .update({ last_synced: new Date().toISOString() })
          .eq('rider_id', rider.rider_id);
          
      } catch (error: any) {
        console.error(`Failed to sync rider ${rider.rider_id}:`, error.message);
        ridersFailed++;
      }
    }

    // Update sync log as success
    await supabase
      .from('sync_logs')
      .update({
        status: ridersFailed === 0 ? 'success' : 'partial',
        completed_at: new Date().toISOString(),
        riders_synced: ridersSynced,
        riders_failed: ridersFailed,
        duration_seconds: Math.floor((Date.now() - startTime) / 1000)
      })
      .eq('id', logId);

  } catch (error: any) {
    errorMessage = error.message;
    
    // Update sync log as failed
    await supabase
      .from('sync_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        riders_synced: ridersSynced,
        riders_failed: ridersFailed,
        error_message: errorMessage,
        duration_seconds: Math.floor((Date.now() - startTime) / 1000)
      })
      .eq('id', logId);
  } finally {
    // Release lock
    await supabase
      .from('sync_config')
      .update({ config_value: 'false' })
      .eq('config_key', 'sync_in_progress');

    // Update last sync timestamp
    await supabase
      .from('sync_config')
      .update({ config_value: Math.floor(Date.now() / 1000).toString() })
      .eq('config_key', 'last_sync_timestamp');
  }
}

export default router;
