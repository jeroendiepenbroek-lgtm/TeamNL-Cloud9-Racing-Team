-- Migration 020: Add Power Profile, Phenotype, and Handicap fields
-- Datum: 2025-12-02
-- Doel: Store complete ZwiftRacing.app data voor Racing Matrix en Rider Stats

-- Power intervals (absolute watts)
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_5s_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_15s_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_30s_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_1m_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_2m_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_5m_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_20m_w INT;

-- Power intervals (W/kg)
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_5s_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_15s_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_30s_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_1m_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_2m_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_5m_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_20m_wkg DECIMAL(5,3);

-- Critical Power model parameters
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS critical_power DECIMAL(7,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS anaerobic_work_capacity DECIMAL(10,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS compound_score DECIMAL(8,3);

-- Phenotype scores (0-100 scale)
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS phenotype_sprinter DECIMAL(4,1);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS phenotype_puncheur DECIMAL(4,1);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS phenotype_pursuiter DECIMAL(4,1);

-- Route handicaps (seconds advantage/disadvantage)
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_flat DECIMAL(7,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_rolling DECIMAL(7,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_hilly DECIMAL(7,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_mountainous DECIMAL(7,3);

-- Demographic metadata
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS age_category TEXT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS gender TEXT;

-- vELO tier tracking
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS velo_rank TEXT; -- "Diamond", "Ruby", "Amethyst", etc.

-- Indexes voor performance
CREATE INDEX IF NOT EXISTS idx_riders_unified_power_5s ON riders_unified(power_5s_w);
CREATE INDEX IF NOT EXISTS idx_riders_unified_power_20m ON riders_unified(power_20m_w);
CREATE INDEX IF NOT EXISTS idx_riders_unified_velo_rank ON riders_unified(velo_rank);

COMMENT ON COLUMN riders_unified.power_5s_w IS '5-second peak power (watts) from ZwiftRacing.app';
COMMENT ON COLUMN riders_unified.power_20m_w IS '20-minute FTP power (watts) from ZwiftRacing.app';
COMMENT ON COLUMN riders_unified.phenotype_sprinter IS 'Sprinter score 0-100 (explosive power ability)';
COMMENT ON COLUMN riders_unified.phenotype_puncheur IS 'Puncheur score 0-100 (short climb ability)';
COMMENT ON COLUMN riders_unified.phenotype_pursuiter IS 'Pursuiter score 0-100 (sustained power ability)';
COMMENT ON COLUMN riders_unified.handicap_flat IS 'Flat route handicap in seconds (+advantage/-disadvantage)';
COMMENT ON COLUMN riders_unified.velo_rank IS 'vELO tier name (Diamond/Ruby/Emerald/Sapphire/Amethyst/Cobalt/Bronze)';
