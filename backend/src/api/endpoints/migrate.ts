/**
 * Add ZRS migration endpoint - temporary for database setup
 */
import { Router, Request, Response } from 'express';
import { supabase } from '../../services/supabase.service.js';

const router = Router();

// POST /api/admin/migrate/add-zrs - Add ZRS column (ONE-TIME)
router.post('/add-zrs', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Running ZRS migration...');
    
    // Check if column already exists
    const { data: existing, error: checkError } = await supabase.client
      .from('riders_unified')
      .select('zrs')
      .limit(1);
    
    if (!checkError) {
      return res.json({
        success: true,
        message: 'ZRS column already exists',
        action: 'none',
      });
    }
    
    // Column doesn't exist, need to add it
    // Note: Supabase REST API doesn't support DDL, must use SQL Editor
    console.log('⚠️  ZRS column needs to be added via Supabase SQL Editor');
    
    res.json({
      success: false,
      message: 'ZRS column moet toegevoegd worden via Supabase SQL Editor',
      sql: 'ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS zrs INTEGER;',
      instructions: [
        '1. Ga naar Supabase Dashboard',
        '2. Open SQL Editor',
        '3. Run: ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS zrs INTEGER;',
        '4. Verify met: SELECT rider_id, name, zrs FROM riders_unified LIMIT 1;',
      ],
    });
    
  } catch (error) {
    console.error('Migration check failed:', error);
    res.status(500).json({ 
      error: 'Migration check gefaald', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;
