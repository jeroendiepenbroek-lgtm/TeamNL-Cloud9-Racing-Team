/**
 * ZwiftPower API Endpoints
 * 
 * Endpoints voor directe toegang tot ZwiftPower data en category berekeningen
 */

import { Router, Request, Response } from 'express';
import { zwiftPowerService } from '../../services/zwiftpower.service.js';
import { supabase } from '../../services/supabase.service.js';

const router = Router();

/**
 * GET /api/zwiftpower/rider/:riderId
 * Haal actuele rider data op van ZwiftPower
 */
router.get('/rider/:riderId', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);
    
    if (isNaN(riderId)) {
      return res.status(400).json({ error: 'Ongeldig rider ID' });
    }

    const data = await zwiftPowerService.getRiderData(riderId);
    
    if (!data.success) {
      return res.status(500).json({ 
        error: 'Fout bij ophalen ZwiftPower data',
        details: data.error 
      });
    }

    res.json(data);
  } catch (error: any) {
    console.error('ZwiftPower API fout:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/zwiftpower/compare/:riderId
 * Vergelijk ZwiftPower data met database data
 */
router.get('/compare/:riderId', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);
    
    if (isNaN(riderId)) {
      return res.status(400).json({ error: 'Ongeldig rider ID' });
    }

    // Haal database data op
    const { data: dbRider, error: dbError } = await supabase
      .from('riders')
      .select('rider_id, name, zp_ftp, zp_category, weight')
      .eq('rider_id', riderId)
      .single();

    if (dbError || !dbRider) {
      return res.status(404).json({ error: 'Rider niet gevonden in database' });
    }

    // Vergelijk met ZwiftPower
    const comparison = await zwiftPowerService.compareWithZwiftRacing(
      riderId,
      dbRider.zp_ftp || 0,
      dbRider.zp_category || 'D'
    );

    if (!comparison) {
      return res.status(500).json({ error: 'Kon geen vergelijking maken' });
    }

    res.json({
      ...comparison,
      database: {
        name: dbRider.name,
        ftp: dbRider.zp_ftp,
        category: dbRider.zp_category,
        weight: dbRider.weight
      }
    });
  } catch (error: any) {
    console.error('Compare API fout:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/zwiftpower/calculate-category
 * Bereken category op basis van FTP en gewicht
 */
router.post('/calculate-category', async (req: Request, res: Response) => {
  try {
    const { ftp, weight_kg, gender = 'male' } = req.body;

    if (!ftp || !weight_kg) {
      return res.status(400).json({ 
        error: 'FTP en weight_kg zijn verplicht' 
      });
    }

    if (gender !== 'male' && gender !== 'female') {
      return res.status(400).json({ 
        error: 'Gender moet "male" of "female" zijn' 
      });
    }

    const calculation = zwiftPowerService.calculateCategory(
      parseFloat(ftp),
      parseFloat(weight_kg),
      gender
    );

    res.json(calculation);
  } catch (error: any) {
    console.error('Calculate category fout:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/zwiftpower/sync-rider/:riderId
 * Sync rider data van ZwiftPower naar database
 */
router.post('/sync-rider/:riderId', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);
    
    if (isNaN(riderId)) {
      return res.status(400).json({ error: 'Ongeldig rider ID' });
    }

    console.log(`🔄 Start ZwiftPower sync voor rider ${riderId}...`);

    // Haal huidige database waarden op
    const { data: currentRider } = await supabase
      .from('riders')
      .select('rider_id, zp_ftp, zp_category, weight')
      .eq('rider_id', riderId)
      .single();

    // Haal ZwiftPower data op
    const zpData = await zwiftPowerService.getRiderData(riderId);

    if (!zpData.success || !zpData.data) {
      return res.status(500).json({ 
        error: 'Kon ZwiftPower data niet ophalen',
        details: zpData.error 
      });
    }

    // Update database met ZwiftPower data
    const { error: updateError } = await supabase
      .from('riders')
      .update({
        zp_ftp: zpData.data.ftp,
        zp_category: zpData.data.category,
        weight: zpData.data.weight_kg,
        last_synced: new Date().toISOString()
      })
      .eq('rider_id', riderId);

    if (updateError) {
      throw updateError;
    }

    // Log de wijzigingen
    const changes = {
      ftp_changed: currentRider?.zp_ftp !== zpData.data.ftp,
      category_changed: currentRider?.zp_category !== zpData.data.category,
      weight_changed: currentRider?.weight !== zpData.data.weight_kg
    };

    console.log(`✅ Rider ${riderId} ge-sync'd met ZwiftPower:`);
    if (changes.ftp_changed) {
      console.log(`   FTP: ${currentRider?.zp_ftp} → ${zpData.data.ftp}W`);
    }
    if (changes.category_changed) {
      console.log(`   Category: ${currentRider?.zp_category} → ${zpData.data.category}`);
    }
    if (changes.weight_changed) {
      console.log(`   Weight: ${currentRider?.weight} → ${zpData.data.weight_kg}kg`);
    }

    res.json({
      success: true,
      rider_id: riderId,
      changes,
      old_values: currentRider ? {
        ftp: currentRider.zp_ftp,
        category: currentRider.zp_category,
        weight: currentRider.weight
      } : null,
      new_values: {
        ftp: zpData.data.ftp,
        category: zpData.data.category,
        weight: zpData.data.weight_kg,
        wkg: zpData.data.ftp / zpData.data.weight_kg
      },
      synced_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Sync rider fout:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/zwiftpower/test
 * Test de ZwiftPower connectie
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    const success = await zwiftPowerService.testConnection();
    
    res.json({
      success,
      message: success 
        ? 'ZwiftPower connectie werkt!' 
        : 'ZwiftPower connectie mislukt',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Test fout:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;
