/**
 * Endpoint 1: Clubs - GET /api/clubs/:id
 */
import { Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { syncServiceV2 as syncService } from '../../services/sync-v2.service.js';
const router = Router();
// GET /api/clubs/:id - Haal club op uit database
router.get('/:id', async (req, res) => {
    try {
        const clubId = parseInt(req.params.id);
        const club = await supabase.getClub(clubId);
        if (!club) {
            return res.status(404).json({ error: 'Club niet gevonden' });
        }
        res.json(club);
    }
    catch (error) {
        console.error('Error fetching club:', error);
        res.status(500).json({ error: 'Fout bij ophalen club' });
    }
});
// POST /api/clubs/:id/sync - Sync club vanaf ZwiftRacing API
router.post('/:id/sync', async (req, res) => {
    try {
        const clubId = parseInt(req.params.id);
        const club = await syncService.syncClub(clubId);
        res.json({
            success: true,
            club,
        });
    }
    catch (error) {
        console.error('Error syncing club:', error);
        res.status(500).json({ error: 'Fout bij synchroniseren club' });
    }
});
export default router;
//# sourceMappingURL=clubs.js.map