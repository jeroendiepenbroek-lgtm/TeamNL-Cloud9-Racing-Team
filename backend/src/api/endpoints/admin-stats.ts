import { Router, Request, Response } from 'express';
import { supabase } from '../../services/supabase.service.js';

const router = Router();

/**
 * GET /api/admin/stats
 * Haal quick stats op voor admin dashboard
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // 1. Team Members - Count team members from riders_unified
    const riders = await supabase.getMyTeamMembers();
    const teamMembersCount = riders.length;

    // 2. Active Users & Pending Requests - Query Supabase directly
    let activeUsersCount = 0;
    let pendingRequestsCount = 0;
    
    try {
      // Query access_control for approved users
      const { count: approvedCount } = await supabase.client
        .from('access_control')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      activeUsersCount = approvedCount ?? 0;
      
      // Query for pending requests
      const { count: pendingCount } = await supabase.client
        .from('access_control')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      pendingRequestsCount = pendingCount ?? 0;
    } catch (err) {
      console.warn('[AdminStats] Failed to fetch user counts:', err);
    }

    // 3. Last Sync - Get most recent successful sync
    const syncLogs = await supabase.getSyncLogs(1);
    const lastSync = syncLogs.length > 0 ? syncLogs[0] : null;

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
      pendingRequests: pendingRequestsCount ?? 0,
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
