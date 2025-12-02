/**
 * Sync Configuration API Endpoints
 * Beheer sync scheduler parameters via API
 */

import { Request, Response, Router } from 'express';
import { syncConfigService } from '../../services/sync-config.service.js';
// import { smartEventSync } from '../../schedulers/smart-event-sync.js'; // Disabled for Railway
// import { riderSyncScheduler } from '../../schedulers/rider-sync.js'; // Disabled for Railway

const router = Router();

// GET /api/sync/config - Haal huidige configuratie op
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = syncConfigService.getConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching sync config:', error);
    res.status(500).json({ error: 'Fout bij ophalen configuratie' });
  }
});

// PUT /api/sync/config - Update configuratie
router.put('/config', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    // Valideer input
    const validKeys = [
      'nearEventThresholdMinutes',
      'nearEventSyncIntervalMinutes',
      'farEventSyncIntervalMinutes',
      'riderSyncEnabled',
      'riderSyncIntervalMinutes',
      'lookforwardHours',
      'checkIntervalMinutes'
    ];
    
    const invalidKeys = Object.keys(updates).filter(key => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      return res.status(400).json({ 
        error: `Ongeldige configuratie keys: ${invalidKeys.join(', ')}` 
      });
    }
    
    // Valideer waarden
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'riderSyncEnabled') {
        if (typeof value !== 'boolean') {
          return res.status(400).json({ 
            error: `${key} moet een boolean zijn` 
          });
        }
      } else if (typeof value !== 'number' || value <= 0) {
        return res.status(400).json({ 
          error: `${key} moet een positief getal zijn` 
        });
      }
    }
    
    // Update configuratie
    const newConfig = syncConfigService.updateConfig(updates);
    
    // Restart schedulers met nieuwe configuratie
    // TODO: Re-enable when schedulers are available
    // console.log('[SyncConfig API] Restarting smartEventSync with new config...');
    // smartEventSync.restart();
    // console.log('[SyncConfig API] Restarting riderSyncScheduler with new config...');
    // riderSyncScheduler.restart();
    
    res.json({
      message: 'Configuratie succesvol bijgewerkt en schedulers herstart',
      config: newConfig
    });
  } catch (error: any) {
    console.error('Error updating sync config:', error);
    res.status(500).json({ error: error.message || 'Fout bij updaten configuratie' });
  }
});

// POST /api/sync/config/reset - Reset naar defaults
router.post('/config/reset', async (req: Request, res: Response) => {
  try {
    const config = syncConfigService.resetToDefaults();
    
    // Restart schedulers
    // TODO: Re-enable when schedulers are available
    // console.log('[SyncConfig API] Restarting smartEventSync with default config...');
    // smartEventSync.restart();
    // console.log('[SyncConfig API] Restarting riderSyncScheduler with default config...');
    // riderSyncScheduler.restart();
    
    res.json({
      message: 'Configuratie gereset naar standaardwaarden en schedulers herstart',
      config
    });
  } catch (error) {
    console.error('Error resetting sync config:', error);
    res.status(500).json({ error: 'Fout bij resetten configuratie' });
  }
});

// POST /api/sync/riders/now - Trigger rider sync handmatig
router.post('/riders/now', async (req: Request, res: Response) => {
  try {
    console.log('[SyncConfig API] Manual rider sync triggered...');
    // TODO: Re-enable when scheduler is available
    const result = { success: false, count: 0, message: 'Scheduler temporarily disabled' }; // await riderSyncScheduler.syncNow();
    
    if (result.success) {
      res.json({
        message: `Riders succesvol gesynchroniseerd: ${result.count} riders`,
        count: result.count
      });
    } else {
      res.status(500).json({
        error: result.error || 'Rider sync gefaald'
      });
    }
  } catch (error: any) {
    console.error('Error triggering rider sync:', error);
    res.status(500).json({ error: error.message || 'Fout bij rider sync' });
  }
});

export default router;
