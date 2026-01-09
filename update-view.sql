-- Update v_teamnl_race_results view to use api_zwiftracing_riders
CREATE OR REPLACE VIEW v_teamnl_race_results AS
SELECT 
  rr.event_id,
  re.event_name,
  re.event_date,
  rr.rider_id,
  ar.name AS rider_name,
  rr.position,
  rr.category_position,
  rr.time_seconds,
  rr.avg_power,
  rr.avg_wkg,
  rr.velo_before,
  rr.velo_after,
  rr.velo_change,
  rr.category,
  rr.points,
  rr.dnf,
  rr.dq,
  rr.source,
  rr.fetched_at
FROM race_results rr
LEFT JOIN race_events re ON rr.event_id = re.event_id
INNER JOIN api_zwiftracing_riders ar ON rr.rider_id = ar.rider_id
ORDER BY 
  COALESCE(re.event_date, rr.fetched_at) DESC,
  rr.position ASC NULLS LAST;
