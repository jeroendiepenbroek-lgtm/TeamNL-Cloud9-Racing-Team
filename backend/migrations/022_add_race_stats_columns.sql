-- Migration 022: Add missing race stats columns
-- Datum: 2025-12-02
-- Doel: Toevoegen van race_wins, race_podiums, race_dnfs voor complete race statistieken

ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS race_wins INT DEFAULT 0;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS race_podiums INT DEFAULT 0;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS race_dnfs INT DEFAULT 0;

-- Voeg ook velo_max_30d en velo_max_90d toe als die ontbreken
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS velo_max_30d INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS velo_max_90d INT;

COMMENT ON COLUMN riders_unified.race_wins IS 'Total race wins from ZwiftRacing.app';
COMMENT ON COLUMN riders_unified.race_podiums IS 'Total podium finishes (top 3) from ZwiftRacing.app';
COMMENT ON COLUMN riders_unified.race_dnfs IS 'Total Did Not Finish from ZwiftRacing.app';
COMMENT ON COLUMN riders_unified.velo_max_30d IS 'Maximum vELO rating in last 30 days';
COMMENT ON COLUMN riders_unified.velo_max_90d IS 'Maximum vELO rating in last 90 days';
