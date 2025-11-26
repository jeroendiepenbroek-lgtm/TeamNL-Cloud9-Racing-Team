/**
 * API Documentation Endpoint
 * Serves complete API documentation for alle 3 APIs
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

/**
 * GET /api/admin/api-documentation
 * Returns complete API documentation from discovery scan
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Read discovery results
    const discoveryPath = '/tmp/complete_api_discovery.json';
    
    if (!fs.existsSync(discoveryPath)) {
      return res.status(404).json({
        error: 'API discovery data not found',
        message: 'Run backend/scripts/complete_api_discovery.py first'
      });
    }
    
    const discoveryData = JSON.parse(fs.readFileSync(discoveryPath, 'utf-8'));
    
    // Add metadata
    const response = {
      ...discoveryData,
      metadata: {
        generated: new Date().toISOString(),
        rider_id: 150437,
        apis: {
          zwift_racing: {
            base_url: 'https://zwift-ranking.herokuapp.com/api',
            auth: 'None (public)',
            rate_limits: {
              clubs: '1/60min',
              riders: '5/min',
              bulk_riders: '1/15min'
            }
          },
          zwift_power: {
            base_url: 'https://zwiftpower.com',
            auth: 'Username/Password (via zpdatafetch)',
            rate_limits: 'Unknown'
          },
          zwift_com: {
            base_url: 'https://us-or-rly101.zwift.com/api',
            auth: 'OAuth Bearer token',
            rate_limits: 'Unknown'
          }
        }
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error loading API documentation:', error);
    res.status(500).json({
      error: 'Failed to load API documentation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/api-documentation/status
 * Live API status checks
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const axios = (await import('axios')).default;
    const statuses: Record<string, any> = {};
    
    // Test ZwiftRacing
    try {
      const zwiftRacing = await axios.get('https://zwift-ranking.herokuapp.com/api/routes', {
        timeout: 5000
      });
      statuses.zwift_racing = {
        status: 'online',
        response_time_ms: zwiftRacing.headers['x-response-time'] || 'N/A',
        last_checked: new Date().toISOString()
      };
    } catch (e) {
      statuses.zwift_racing = {
        status: 'offline',
        error: e instanceof Error ? e.message : 'Unknown',
        last_checked: new Date().toISOString()
      };
    }
    
    // Test ZwiftPower (check if site is up)
    try {
      const zwiftPower = await axios.get('https://zwiftpower.com', {
        timeout: 5000
      });
      statuses.zwift_power = {
        status: zwiftPower.status === 200 ? 'online' : 'degraded',
        last_checked: new Date().toISOString()
      };
    } catch (e) {
      statuses.zwift_power = {
        status: 'offline',
        error: e instanceof Error ? e.message : 'Unknown',
        last_checked: new Date().toISOString()
      };
    }
    
    // Test Zwift.com auth endpoint
    try {
      const zwiftCom = await axios.get('https://secure.zwift.com/auth/realms/zwift/.well-known/openid-configuration', {
        timeout: 5000
      });
      statuses.zwift_com = {
        status: 'online',
        last_checked: new Date().toISOString()
      };
    } catch (e) {
      statuses.zwift_com = {
        status: 'offline',
        error: e instanceof Error ? e.message : 'Unknown',
        last_checked: new Date().toISOString()
      };
    }
    
    res.json(statuses);
  } catch (error) {
    console.error('Error checking API status:', error);
    res.status(500).json({
      error: 'Failed to check API status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/api-documentation/fields
 * Returns flattened list of all fields from all APIs
 */
router.get('/fields', async (req: Request, res: Response) => {
  try {
    const discoveryPath = '/tmp/complete_api_discovery.json';
    
    if (!fs.existsSync(discoveryPath)) {
      return res.status(404).json({
        error: 'API discovery data not found'
      });
    }
    
    const discoveryData = JSON.parse(fs.readFileSync(discoveryPath, 'utf-8'));
    
    // Extract all fields from all endpoints
    const allFields: Record<string, any> = {};
    
    // ZwiftRacing fields
    Object.entries(discoveryData.zwift_racing || {}).forEach(([endpoint, data]: [string, any]) => {
      if (data.total_fields) {
        allFields[endpoint] = {
          api: 'zwift_racing',
          field_count: data.total_fields,
          structure: data.structure || 'object'
        };
      }
    });
    
    // Zwift.com fields
    Object.entries(discoveryData.zwift_com || {}).forEach(([endpoint, data]: [string, any]) => {
      if (data.total_fields) {
        allFields[endpoint] = {
          api: 'zwift_com',
          field_count: data.total_fields,
          structure: data.structure || 'unknown'
        };
      }
    });
    
    res.json({
      total_fields: discoveryData.summary?.total_fields || 0,
      by_endpoint: allFields
    });
  } catch (error) {
    console.error('Error loading field data:', error);
    res.status(500).json({
      error: 'Failed to load field data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
