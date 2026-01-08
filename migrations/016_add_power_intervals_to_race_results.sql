-- ============================================
-- ADD POWER INTERVALS TO race_results
-- ============================================
-- ZwiftPower data heeft complete power interval data per race
-- Dit voegt de 7 standaard intervallen toe aan race_results tabel

-- Power intervals (absolute watts)
ALTER TABLE race_results 
ADD COLUMN IF NOT EXISTS power_5s INTEGER,
ADD COLUMN IF NOT EXISTS power_15s INTEGER,
ADD COLUMN IF NOT EXISTS power_30s INTEGER,
ADD COLUMN IF NOT EXISTS power_1m INTEGER,
ADD COLUMN IF NOT EXISTS power_2m INTEGER,
ADD COLUMN IF NOT EXISTS power_5m INTEGER,
ADD COLUMN IF NOT EXISTS power_20m INTEGER;

-- Power intervals (relative W/kg)
ALTER TABLE race_results
ADD COLUMN IF NOT EXISTS power_5s_wkg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS power_15s_wkg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS power_30s_wkg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS power_1m_wkg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS power_2m_wkg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS power_5m_wkg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS power_20m_wkg DECIMAL(5,2);

-- Additional rider metadata from ZwiftPower
ALTER TABLE race_results
ADD COLUMN IF NOT EXISTS rider_name TEXT,
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ftp INTEGER;

-- Indexes voor power interval queries
CREATE INDEX IF NOT EXISTS idx_race_results_power_5s ON race_results(power_5s_wkg DESC) WHERE power_5s_wkg IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_race_results_power_20m ON race_results(power_20m_wkg DESC) WHERE power_20m_wkg IS NOT NULL;

-- Comment
COMMENT ON COLUMN race_results.power_5s_wkg IS 'Peak 5-second power in W/kg from ZwiftPower';
COMMENT ON COLUMN race_results.power_15s_wkg IS 'Peak 15-second power in W/kg from ZwiftPower';
COMMENT ON COLUMN race_results.power_30s_wkg IS 'Peak 30-second power in W/kg from ZwiftPower';
COMMENT ON COLUMN race_results.power_1m_wkg IS 'Peak 1-minute power in W/kg from ZwiftPower';
COMMENT ON COLUMN race_results.power_2m_wkg IS 'Peak 2-minute power in W/kg from ZwiftPower';
COMMENT ON COLUMN race_results.power_5m_wkg IS 'Peak 5-minute power in W/kg from ZwiftPower';
COMMENT ON COLUMN race_results.power_20m_wkg IS 'Peak 20-minute power in W/kg from ZwiftPower';

-- Bevestiging
SELECT 
  'Power intervals toegevoegd aan race_results' as status,
  COUNT(*) as existing_results
FROM race_results;
