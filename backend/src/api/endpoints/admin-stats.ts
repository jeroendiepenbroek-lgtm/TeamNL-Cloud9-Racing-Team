import { Router, Request, Response } from 'express';
import { supabase } from '../../database/supabase.js';

const router = Router();

/**
 * GET /api/admin/stats
 * Haal quick stats op voor admin dashboard
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // 1. Team Members - Count active riders
    const { count: teamMembersCount, error: ridersError } = await supabase.client
      .from('riders')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (ridersError) {
      console.error('[AdminStats] Error fetching team members:', ridersError);
    }

    // 2. Active Users - Count users with access
    const { count: activeUsersCount, error: usersError } = await supabase.client
      .from('access_control')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    if (usersError) {
      console.error('[AdminStats] Error fetching active users:', usersError);
    }

    // 3. Last Sync - Get most recent successful sync
    const { data: lastSync, error: syncError } = await supabase.client
      .from('sync_logs')
      .select('created_at, endpoint, records_processed')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (syncError && syncError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('[AdminStats] Error fetching last sync:', syncError);
    }

    // 4. System Status - Simple health check
    const systemStatus = 'healthy';

    // Format last sync time
    let lastSyncFormatted = 'Never';
    if (lastSync) {
      const syncDate = new Date(lastSync.created_at);
      const now = new Date();
      const diffMs = now.getTime() - syncDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) {
        lastSyncFormatted = 'Just now';
      } else if (diffMins < 60) {
        lastSyncFormatted = `${diffMins}m ago`;
      } else if (diffHours < 24) {
        lastSyncFormatted = `${diffHours}h ago`;
      } else {
        lastSyncFormatted = `${diffDays}d ago`;
      }
    }

    res.json({
      teamMembers: teamMembersCount ?? 0,
      activeUsers: activeUsersCount ?? 0,
      lastSync: lastSyncFormatted,
      lastSyncDetails: lastSync ? {
        timestamp: lastSync.created_at,
        endpoint: lastSync.endpoint,
        recordsProcessed: lastSync.records_processed,
      } : null,
      systemStatus,
    });

  } catch (error) {
    console.error('[AdminStats] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch admin stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
