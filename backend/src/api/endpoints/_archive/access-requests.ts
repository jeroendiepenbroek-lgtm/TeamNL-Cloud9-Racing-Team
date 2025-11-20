/**
 * Access Requests API Endpoints
 * Admin approval flow voor Discord OAuth users
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const router = Router();

// GET /api/admin/access-requests - Haal alle access requests op
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('access_requests')
      .select(`
        *,
        reviewed_by_user:reviewed_by(email)
      `)
      .order('requested_at', { ascending: false });

    // Filter op status indien opgegeven
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AccessRequests] Error fetching requests:', error);
      return res.status(500).json({ error: 'Fout bij ophalen access requests' });
    }

    res.json({
      count: data?.length || 0,
      requests: data || [],
    });
  } catch (error) {
    console.error('[AccessRequests] Error:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// GET /api/admin/access-requests/:id - Haal specifieke request op
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('access_requests')
      .select(`
        *,
        user:user_id(email, raw_user_meta_data),
        reviewed_by_user:reviewed_by(email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[AccessRequests] Error fetching request:', error);
      return res.status(404).json({ error: 'Access request niet gevonden' });
    }

    res.json(data);
  } catch (error) {
    console.error('[AccessRequests] Error:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// POST /api/admin/access-requests/:id/approve - Approve access request
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { review_notes, admin_user_id } = req.body;

    // Update request status
    const { data, error } = await supabase
      .from('access_requests')
      .update({
        status: 'approved',
        reviewed_by: admin_user_id,
        reviewed_at: new Date().toISOString(),
        review_notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[AccessRequests] Error approving request:', error);
      return res.status(500).json({ error: 'Fout bij goedkeuren access request' });
    }

    // Grant 'rider' role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: data.user_id,
        role: 'rider',
        granted_by: admin_user_id,
      });

    if (roleError) {
      console.warn('[AccessRequests] Error granting role:', roleError);
      // Continue anyway - request is approved
    }

    console.log(`✅ Access request ${id} goedgekeurd voor user ${data.user_id}`);

    res.json({
      message: 'Access request goedgekeurd',
      request: data,
    });
  } catch (error) {
    console.error('[AccessRequests] Error:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// POST /api/admin/access-requests/:id/reject - Reject access request
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { review_notes, admin_user_id } = req.body;

    const { data, error } = await supabase
      .from('access_requests')
      .update({
        status: 'rejected',
        reviewed_by: admin_user_id,
        reviewed_at: new Date().toISOString(),
        review_notes,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[AccessRequests] Error rejecting request:', error);
      return res.status(500).json({ error: 'Fout bij afwijzen access request' });
    }

    console.log(`❌ Access request ${id} afgewezen voor user ${data.user_id}`);

    res.json({
      message: 'Access request afgewezen',
      request: data,
    });
  } catch (error) {
    console.error('[AccessRequests] Error:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// POST /api/admin/access-requests/bulk-approve - Bulk approve meerdere requests
router.post('/bulk-approve', async (req: Request, res: Response) => {
  try {
    const { request_ids, admin_user_id } = req.body;

    if (!Array.isArray(request_ids) || request_ids.length === 0) {
      return res.status(400).json({ error: 'request_ids array vereist' });
    }

    const { data, error } = await supabase
      .from('access_requests')
      .update({
        status: 'approved',
        reviewed_by: admin_user_id,
        reviewed_at: new Date().toISOString(),
      })
      .in('id', request_ids)
      .select();

    if (error) {
      console.error('[AccessRequests] Error bulk approving:', error);
      return res.status(500).json({ error: 'Fout bij bulk goedkeuren' });
    }

    // Grant roles
    const roleInserts = data.map((request) => ({
      user_id: request.user_id,
      role: 'rider',
      granted_by: admin_user_id,
    }));

    await supabase.from('user_roles').insert(roleInserts);

    console.log(`✅ ${data.length} access requests bulk goedgekeurd`);

    res.json({
      message: `${data.length} requests goedgekeurd`,
      approved: data,
    });
  } catch (error) {
    console.error('[AccessRequests] Error:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

// GET /api/admin/access-requests/stats - Statistics
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const { data: pending } = await supabase
      .from('access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { data: approved } = await supabase
      .from('access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { data: rejected } = await supabase
      .from('access_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'rejected');

    const { data: recentRequests } = await supabase
      .from('access_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(5);

    res.json({
      stats: {
        pending: pending || 0,
        approved: approved || 0,
        rejected: rejected || 0,
        total: (pending || 0) + (approved || 0) + (rejected || 0),
      },
      recent_pending: recentRequests || [],
    });
  } catch (error) {
    console.error('[AccessRequests] Error fetching stats:', error);
    res.status(500).json({ error: 'Server fout' });
  }
});

export default router;
