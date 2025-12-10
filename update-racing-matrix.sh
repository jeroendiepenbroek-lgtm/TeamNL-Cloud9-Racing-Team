#!/bin/bash

# Update RacingMatrix.tsx om v_rider_complete velden te gebruiken
# Alle oude veldnamen vervangen door nieuwe

cd /workspaces/TeamNL-Cloud9-Racing-Team/frontend/src/pages

# Backup maken
cp RacingMatrix.tsx RacingMatrix.tsx.backup

# Vervang alle oude veldnamen
sed -i 's/rider\.race_last_rating/rider.velo_live/g' RacingMatrix.tsx
sed -i 's/rider\.race_max30_rating/rider.velo_30day/g' RacingMatrix.tsx
sed -i 's/rider\.name/rider.full_name/g' RacingMatrix.tsx
sed -i 's/rider\.zp_category/rider.zwiftracing_category/g' RacingMatrix.tsx
sed -i 's/rider\.zp_ftp/rider.racing_ftp/g' RacingMatrix.tsx
sed -i 's/rider\.weight/rider.weight_kg/g' RacingMatrix.tsx
sed -i 's/rider\.race_finishes/rider.race_count/g' RacingMatrix.tsx

# Power intervals - vervang oude met nieuwe _wkg velden
sed -i 's/calculateWkg(rider\.power_w5, rider\.weight_kg)/rider.power_5s_wkg/g' RacingMatrix.tsx
sed -i 's/calculateWkg(rider\.power_w15, rider\.weight_kg)/rider.power_15s_wkg/g' RacingMatrix.tsx
sed -i 's/calculateWkg(rider\.power_w30, rider\.weight_kg)/rider.power_30s_wkg/g' RacingMatrix.tsx
sed -i 's/calculateWkg(rider\.power_w60, rider\.weight_kg)/rider.power_60s_wkg/g' RacingMatrix.tsx
sed -i 's/calculateWkg(rider\.power_w120, rider\.weight_kg)/rider.power_120s_wkg/g' RacingMatrix.tsx
sed -i 's/calculateWkg(rider\.power_w300, rider\.weight_kg)/rider.power_300s_wkg/g' RacingMatrix.tsx
sed -i 's/calculateWkg(rider\.power_w1200, rider\.weight_kg)/rider.power_1200s_wkg/g' RacingMatrix.tsx

# Power watts titles
sed -i 's/rider\.power_w5/rider.power_5s/g' RacingMatrix.tsx
sed -i 's/rider\.power_w15/rider.power_15s/g' RacingMatrix.tsx
sed -i 's/rider\.power_w30/rider.power_30s/g' RacingMatrix.tsx
sed -i 's/rider\.power_w60/rider.power_60s/g' RacingMatrix.tsx
sed -i 's/rider\.power_w120/rider.power_120s/g' RacingMatrix.tsx
sed -i 's/rider\.power_w300/rider.power_300s/g' RacingMatrix.tsx
sed -i 's/rider\.power_w1200/rider.power_1200s/g' RacingMatrix.tsx

# TeamBests
sed -i 's/teamBests?.power_w5/teamBests?.power_5s_wkg/g' RacingMatrix.tsx
sed -i 's/teamBests?.power_w15/teamBests?.power_15s_wkg/g' RacingMatrix.tsx
sed -i 's/teamBests?.power_w30/teamBests?.power_30s_wkg/g' RacingMatrix.tsx
sed -i 's/teamBests?.power_w60/teamBests?.power_60s_wkg/g' RacingMatrix.tsx
sed -i 's/teamBests?.power_w120/teamBests?.power_120s_wkg/g' RacingMatrix.tsx
sed -i 's/teamBests?.power_w300/teamBests?.power_300s_wkg/g' RacingMatrix.tsx
sed -i 's/teamBests?.power_w1200/teamBests?.power_1200s_wkg/g' RacingMatrix.tsx

echo "✅ RacingMatrix.tsx updated met v_rider_complete velden!"
echo "📄 Backup: RacingMatrix.tsx.backup"
