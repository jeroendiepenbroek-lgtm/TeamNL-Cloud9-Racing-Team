/**
 * User Access Status API
 * Check access status voor huidige user na Discord login
 */
import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const router = Router();
// GET /api/user/access-status - Check of huidige user access heeft
router.get('/access-status', async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id || typeof user_id !== 'string') {
            return res.status(400).json({ error: 'user_id vereist' });
        }
        // Check access request
        const { data: accessRequest, error: requestError } = await supabase
            .from('access_requests')
            .select('*')
            .eq('user_id', user_id)
            .order('requested_at', { ascending: false })
            .limit(1)
            .single();
        if (requestError && requestError.code !== 'PGRST116') {
            console.error('[UserAccess] Error checking access:', requestError);
        }
        // Check roles
        const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user_id);
        if (rolesError) {
            console.error('[UserAccess] Error checking roles:', rolesError);
        }
        const hasAdminRole = roles?.some((r) => r.role === 'admin') || false;
        const hasRiderRole = roles?.some((r) => r.role === 'rider') || false;
        // SECURITY: Alleen users met explicit admin role in user_roles tabel krijgen admin toegang
        // Geen hardcoded bypasses of rider ID checks
        // Determine access status
        let status = 'no_request';
        let message = 'Geen access request gevonden';
        let hasAccess = false;
        if (hasAdminRole) {
            status = 'admin';
            message = 'Admin toegang';
            hasAccess = true;
        }
        else if (accessRequest) {
            status = accessRequest.status;
            switch (accessRequest.status) {
                case 'approved':
                    message = 'Toegang goedgekeurd';
                    hasAccess = true;
                    break;
                case 'pending':
                    message = 'Wacht op goedkeuring door admin';
                    hasAccess = false;
                    break;
                case 'rejected':
                    message = 'Toegang geweigerd';
                    hasAccess = false;
                    break;
            }
        }
        res.json({
            has_access: hasAccess,
            status,
            message,
            roles: roles?.map((r) => r.role) || [],
            access_request: accessRequest || null,
        });
    }
    catch (error) {
        console.error('[UserAccess] Error:', error);
        res.status(500).json({ error: 'Server fout' });
    }
});
// POST /api/user/request-access - Create access request na Discord login
router.post('/request-access', async (req, res) => {
    try {
        const { user_id, discord_id, discord_username, discord_discriminator, discord_avatar_url, discord_email, reason, ip_address, user_agent, } = req.body;
        if (!user_id) {
            return res.status(400).json({ error: 'user_id vereist' });
        }
        // Check of er al een request bestaat
        const { data: existing } = await supabase
            .from('access_requests')
            .select('id, status')
            .eq('user_id', user_id)
            .order('requested_at', { ascending: false })
            .limit(1)
            .single();
        if (existing && existing.status === 'pending') {
            return res.json({
                message: 'Access request al ingediend, wacht op goedkeuring',
                request: existing,
            });
        }
        // Create nieuwe request
        const { data, error } = await supabase
            .from('access_requests')
            .insert({
            user_id,
            discord_id,
            discord_username,
            discord_discriminator,
            discord_avatar_url,
            discord_email,
            reason,
            status: 'pending',
            ip_address,
            user_agent,
        })
            .select()
            .single();
        if (error) {
            console.error('[UserAccess] Error creating request:', error);
            return res.status(500).json({ error: 'Fout bij aanmaken access request' });
        }
        console.log(`📨 Nieuwe access request van ${discord_username} (${user_id})`);
        res.status(201).json({
            message: 'Access request aangemaakt, wacht op admin goedkeuring',
            request: data,
        });
    }
    catch (error) {
        console.error('[UserAccess] Error:', error);
        res.status(500).json({ error: 'Server fout' });
    }
});
export default router;
//# sourceMappingURL=user-access.js.map