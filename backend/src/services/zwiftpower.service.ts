/**
 * ZwiftPower Service - Direct data ophalen van ZwiftPower
 * 
 * Gebruikt Python bridge (zp_robust_fetch.py) om actuele rider data op te halen
 * via de officiële zpdatafetch library. Deze data is actueler dan ZwiftRacing.app API.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ZwiftPowerRiderData {
  success: boolean;
  data?: {
    zwift_id: number;
    name: string;
    ftp: number;
    category: string;
    weight_kg: number;
    height_cm: number;
    flag: string;
    age: string;
    team_name: string;
    avg_power: number;
    avg_wkg: string;
    last_race_date: number;
    last_race_title: string;
    profile_url: string;
  };
  race_count?: number;
  error?: string;
  error_type?: string;
}

interface CategoryCalculation {
  ftp: number;
  weight_kg: number;
  wkg: number;
  calculated_category: string;
  category_threshold: string;
  gender: 'male' | 'female';
}

/**
 * ZwiftPower Category grenzen
 * Bron: https://zwiftpower.com/events.php?zid=cats
 */
const CATEGORY_THRESHOLDS = {
  male: {
    'A+': 4.6,
    'A': 4.0,
    'B': 3.2,
    'C': 2.5,
    'D': 0
  },
  female: {
    'A+': 4.0,
    'A': 3.4,
    'B': 2.8,
    'C': 2.1,
    'D': 0
  }
};

export class ZwiftPowerService {
  private pythonPath: string;
  private scriptPath: string;
  private username: string;
  private password: string;

  constructor() {
    // Python environment configuratie
    this.pythonPath = process.env.PYTHON_PATH || 
                     path.join(process.cwd(), '.venv', 'bin', 'python');
    this.scriptPath = path.join(process.cwd(), 'scripts', 'zp_robust_fetch.py');
    
    // ZwiftPower credentials uit environment
    this.username = process.env.ZWIFTPOWER_USERNAME || '';
    this.password = process.env.ZWIFTPOWER_PASSWORD || '';

    if (!this.username || !this.password) {
      console.warn('⚠️  ZwiftPower credentials niet geconfigureerd in .env');
    }
  }

  /**
   * Bereken ZwiftPower Category (Pace Group) op basis van W/kg
   * 
   * @param ftp - Functional Threshold Power in Watt
   * @param weight_kg - Gewicht in kilogram
   * @param gender - Geslacht ('male' of 'female')
   * @returns Category berekening met logging
   */
  calculateCategory(
    ftp: number, 
    weight_kg: number, 
    gender: 'male' | 'female' = 'male'
  ): CategoryCalculation {
    const wkg = ftp / weight_kg;
    const thresholds = CATEGORY_THRESHOLDS[gender];

    let category = 'D';
    let threshold = `< ${thresholds.C}`;

    if (wkg >= thresholds['A+']) {
      category = 'A+';
      threshold = `≥ ${thresholds['A+']}`;
    } else if (wkg >= thresholds.A) {
      category = 'A';
      threshold = `≥ ${thresholds.A}`;
    } else if (wkg >= thresholds.B) {
      category = 'B';
      threshold = `≥ ${thresholds.B}`;
    } else if (wkg >= thresholds.C) {
      category = 'C';
      threshold = `≥ ${thresholds.C}`;
    }

    const result: CategoryCalculation = {
      ftp,
      weight_kg,
      wkg: parseFloat(wkg.toFixed(2)),
      calculated_category: category,
      category_threshold: threshold,
      gender
    };

    // Log de berekening
    console.log(`📊 Category Berekening: ${ftp}W / ${weight_kg}kg = ${result.wkg} W/kg → Category ${category} (${threshold} W/kg)`);

    return result;
  }

  /**
   * Haal rider data op van ZwiftPower via Python bridge
   * 
   * @param zwiftId - Zwift rider ID
   * @returns ZwiftPower rider data met actuele FTP en calculated category
   */
  async getRiderData(zwiftId: number): Promise<ZwiftPowerRiderData> {
    try {
      console.log(`🔍 Ophalen ZwiftPower data voor rider ${zwiftId}...`);

      // Execute Python script
      const command = `"${this.pythonPath}" "${this.scriptPath}" ${zwiftId} "${this.username}" "${this.password}"`;
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 seconden timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer voor grote responses
      });

      if (stderr && !stderr.includes('Warning')) {
        console.warn(`⚠️  Python stderr: ${stderr}`);
      }

      // Parse JSON response
      const data: ZwiftPowerRiderData = JSON.parse(stdout);

      if (!data.success) {
        console.error(`❌ ZwiftPower fout: ${data.error}`);
        return data;
      }

      // Bereken category op basis van FTP en gewicht
      if (data.data) {
        const categoryCalc = this.calculateCategory(
          data.data.ftp,
          data.data.weight_kg,
          'male' // TODO: Haal gender uit profiel data
        );

        // Log de category berekening
        console.log(`✅ ZwiftPower data opgehaald:`);
        console.log(`   Rider: ${data.data.name}`);
        console.log(`   FTP: ${data.data.ftp}W`);
        console.log(`   Gewicht: ${data.data.weight_kg}kg`);
        console.log(`   W/kg: ${categoryCalc.wkg}`);
        console.log(`   Calculated Category: ${categoryCalc.calculated_category}`);
        console.log(`   Race Count: ${data.race_count}`);

        // Voeg berekende category toe aan response
        data.data.category = categoryCalc.calculated_category;
      }

      return data;

    } catch (error: any) {
      console.error(`❌ Fout bij ophalen ZwiftPower data:`, error.message);
      
      return {
        success: false,
        error: error.message,
        error_type: error.name
      };
    }
  }

  /**
   * Haal data op voor meerdere riders (bulk)
   * 
   * @param zwiftIds - Array van Zwift rider IDs
   * @param batchSize - Aantal riders per batch (om rate limiting te voorkomen)
   * @returns Array van ZwiftPower rider data
   */
  async getBulkRiderData(
    zwiftIds: number[], 
    batchSize: number = 5
  ): Promise<ZwiftPowerRiderData[]> {
    console.log(`📦 Bulk ophalen van ${zwiftIds.length} riders (batch size: ${batchSize})`);
    
    const results: ZwiftPowerRiderData[] = [];
    
    // Process in batches om rate limiting te voorkomen
    for (let i = 0; i < zwiftIds.length; i += batchSize) {
      const batch = zwiftIds.slice(i, i + batchSize);
      console.log(`   Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(zwiftIds.length / batchSize)}: ${batch.join(', ')}`);
      
      const batchPromises = batch.map(id => this.getRiderData(id));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Wacht tussen batches (5 sec) om rate limiting te voorkomen
      if (i + batchSize < zwiftIds.length) {
        console.log(`   ⏳ Wacht 5 seconden voor volgende batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Bulk complete: ${successCount}/${zwiftIds.length} riders succesvol opgehaald`);
    
    return results;
  }

  /**
   * Vergelijk ZwiftPower data met ZwiftRacing.app data
   * 
   * @param zwiftId - Zwift rider ID
   * @param zrFtp - FTP van ZwiftRacing.app
   * @param zrCategory - Category van ZwiftRacing.app
   * @returns Comparison met verschillen
   */
  async compareWithZwiftRacing(
    zwiftId: number,
    zrFtp: number,
    zrCategory: string
  ) {
    const zpData = await this.getRiderData(zwiftId);
    
    if (!zpData.success || !zpData.data) {
      return null;
    }

    const ftpDiff = zpData.data.ftp - zrFtp;
    const categoryChanged = zpData.data.category !== zrCategory;

    const comparison = {
      zwift_id: zwiftId,
      zwiftpower: {
        ftp: zpData.data.ftp,
        category: zpData.data.category,
        weight: zpData.data.weight_kg,
        source: 'ZwiftPower (actueel)'
      },
      zwiftRacing: {
        ftp: zrFtp,
        category: zrCategory,
        source: 'ZwiftRacing.app (kan 24-48u achter lopen)'
      },
      differences: {
        ftp_diff: ftpDiff,
        ftp_changed: ftpDiff !== 0,
        category_changed: categoryChanged,
        recommendation: ftpDiff !== 0 || categoryChanged 
          ? 'Gebruik ZwiftPower data (actueler)' 
          : 'Beide bronnen zijn gelijk'
      }
    };

    // Log de vergelijking
    if (comparison.differences.ftp_changed || comparison.differences.category_changed) {
      console.log(`⚠️  Data verschil gevonden voor rider ${zwiftId}:`);
      console.log(`   ZwiftPower:     FTP ${zpData.data.ftp}W, Category ${zpData.data.category}`);
      console.log(`   ZwiftRacing:    FTP ${zrFtp}W, Category ${zrCategory}`);
      console.log(`   Verschil:       FTP ${ftpDiff > 0 ? '+' : ''}${ftpDiff}W`);
      console.log(`   → ${comparison.differences.recommendation}`);
    }

    return comparison;
  }

  /**
   * Test de ZwiftPower connectie
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Test ZwiftPower connectie...');
      
      // Test met een bekende rider (150437)
      const testData = await this.getRiderData(150437);
      
      if (testData.success && testData.data) {
        console.log('✅ ZwiftPower connectie werkt!');
        console.log(`   Test rider: ${testData.data.name}`);
        console.log(`   FTP: ${testData.data.ftp}W`);
        console.log(`   Category: ${testData.data.category}`);
        return true;
      } else {
        console.error('❌ ZwiftPower connectie mislukt:', testData.error);
        return false;
      }
    } catch (error: any) {
      console.error('❌ ZwiftPower test fout:', error.message);
      return false;
    }
  }
}

// Singleton instance
export const zwiftPowerService = new ZwiftPowerService();
