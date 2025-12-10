-- TeamNL Racing - Data Export for Supabase
-- Generated: 2025-12-08T14:13:44.151Z

-- Upcoming Events (sample 50)
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5230192', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765195800, 
    '2025-12-08T12:10:00.000Z', 
    'Stage 1: Fresh Outta ''25: Prospect Park Loop', 
    'Race',
    '{"eventId":"5230192","time":1765195800,"routeId":"22757204","distance":21784,"title":"Stage 1: Fresh Outta ''25: Prospect Park Loop","numLaps":"4","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"20,29,36,52,39"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5231161', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765196100, 
    '2025-12-08T12:15:00.000Z', 
    'Stage 1: Fresh Outta ''25: Prospect Park Loop || Advanced', 
    'Race',
    '{"eventId":"5231161","time":1765196100,"routeId":"22757204","distance":21784,"title":"Stage 1: Fresh Outta ''25: Prospect Park Loop || Advanced","numLaps":"4","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A","signups":"15"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5213469', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765196400, 
    '2025-12-08T12:20:00.000Z', 
    'Zwift TT Club Racing - Park Perimeter Loop', 
    'Race',
    '{"eventId":"5213469","time":1765196400,"routeId":"1919980508","distance":9600,"title":"Zwift TT Club Racing - Park Perimeter Loop","numLaps":"1","type":"Race","subType":"Time Trial","staggeredStart":false,"categories":"A,B,C,D","signups":"2,8,6,11"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5236279', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765197600, 
    '2025-12-08T12:40:00.000Z', 
    'Zwift Crit Racing Club - LaGuardia Loop Reverse', 
    'Race',
    '{"eventId":"5236279","time":1765197600,"routeId":"3774003351","distance":21817,"title":"Zwift Crit Racing Club - LaGuardia Loop Reverse","numLaps":"7","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"3,4,3,21,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249583', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765197900, 
    '2025-12-08T12:45:00.000Z', 
    'Tullio Turbo Lunch', 
    'Race',
    '{"eventId":"5249583","time":1765197900,"routeId":"1464561389","distance":23973,"title":"Tullio Turbo Lunch","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A,B,C,D,E","signups":"2,2,1,7,3"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5230116', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765199400, 
    '2025-12-08T13:10:00.000Z', 
    'Stage 1: Fresh Outta ''25: Prospect Park Loop', 
    'Race',
    '{"eventId":"5230116","time":1765199400,"routeId":"22757204","distance":21784,"title":"Stage 1: Fresh Outta ''25: Prospect Park Loop","numLaps":"4","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"8,12,11,13,6"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5236649', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765200600, 
    '2025-12-08T13:30:00.000Z', 
    'Zwift Epic Race - Tire Bouchon', 
    'Race',
    '{"eventId":"5236649","time":1765200600,"routeId":"2413440572","distance":64056,"title":"Zwift Epic Race - Tire Bouchon","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A,B,C,D,E","signups":"6,2,5,5,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5230163', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765203000, 
    '2025-12-08T14:10:00.000Z', 
    'Stage 1: Fresh Outta ''25: Prospect Park Loop', 
    'Race',
    '{"eventId":"5230163","time":1765203000,"routeId":"22757204","distance":21784,"title":"Stage 1: Fresh Outta ''25: Prospect Park Loop","numLaps":"4","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"4,8,10,13,6"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5231283', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765203300, 
    '2025-12-08T14:15:00.000Z', 
    'Stage 1: Fresh Outta ''25: Prospect Park Loop || Advanced', 
    'Race',
    '{"eventId":"5231283","time":1765203300,"routeId":"22757204","distance":21784,"title":"Stage 1: Fresh Outta ''25: Prospect Park Loop || Advanced","numLaps":"4","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A","signups":"1"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5213638', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765203600, 
    '2025-12-08T14:20:00.000Z', 
    'Zwift TT Club Racing - Park Perimeter Loop', 
    'Race',
    '{"eventId":"5213638","time":1765203600,"routeId":"1919980508","distance":9600,"title":"Zwift TT Club Racing - Park Perimeter Loop","numLaps":"1","type":"Race","subType":"Time Trial","staggeredStart":false,"categories":"A,B,C,D","signups":"4,1,3,2"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5236332', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765204800, 
    '2025-12-08T14:40:00.000Z', 
    'Zwift Crit Racing Club - LaGuardia Loop Reverse', 
    'Race',
    '{"eventId":"5236332","time":1765204800,"routeId":"3774003351","distance":21817,"title":"Zwift Crit Racing Club - LaGuardia Loop Reverse","numLaps":"7","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"1,0,4,3,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249609', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765205100, 
    '2025-12-08T14:45:00.000Z', 
    'EVO CC Race Series', 
    'Race',
    '{"eventId":"5249609","time":1765205100,"routeId":"2898229208","distance":30956,"title":"EVO CC Race Series","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"0,2,2,2,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249614', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765206300, 
    '2025-12-08T15:05:00.000Z', 
    '3R Racing', 
    'Race',
    '{"eventId":"5249614","time":1765206300,"routeId":"1386460176","distance":19323,"title":"3R Racing","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"3,0,5,7,1"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5230213', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765206600, 
    '2025-12-08T15:10:00.000Z', 
    'Stage 1: Fresh Outta ''25: Prospect Park Loop', 
    'Race',
    '{"eventId":"5230213","time":1765206600,"routeId":"22757204","distance":21784,"title":"Stage 1: Fresh Outta ''25: Prospect Park Loop","numLaps":"4","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"7,4,14,14,6"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249620', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765207800, 
    '2025-12-08T15:30:00.000Z', 
    'Team DRAFT Monday Race', 
    'Race',
    '{"eventId":"5249620","time":1765207800,"routeId":"604330868","distance":42836,"title":"Team DRAFT Monday Race","numLaps":"2","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D","signups":"6,23,12,5"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249618', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765207800, 
    '2025-12-08T15:30:00.000Z', 
    'Ride Club Finland: Category Spotlight', 
    'Race',
    '{"eventId":"5249618","time":1765207800,"routeId":"986252325","distance":24788,"title":"Ride Club Finland: Category Spotlight","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D","signups":"0,1,4,6"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5262977', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765209600, 
    '2025-12-08T16:00:00.000Z', 
    'I ❤ Bologna TT', 
    'Race',
    '{"eventId":"5262977","time":1765209600,"routeId":"2843604888","distance":8026,"title":"I ❤ Bologna TT","numLaps":"1","type":"Race","subType":"Time Trial","staggeredStart":false,"categories":"E","signups":""}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5223292', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765210200, 
    '2025-12-08T16:10:00.000Z', 
    'Stage 2: Fresh Outta ''25: Scotland Smash', 
    'Race',
    '{"eventId":"5223292","time":1765210200,"routeId":"172610229","distance":18069,"title":"Stage 2: Fresh Outta ''25: Scotland Smash","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"16,17,35,45,12"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249630', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765211400, 
    '2025-12-08T16:30:00.000Z', 
    'EVO CC Race Series', 
    'Race',
    '{"eventId":"5249630","time":1765211400,"routeId":"2898229208","distance":30956,"title":"EVO CC Race Series","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"1,1,5,6,3"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249635', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765212660, 
    '2025-12-08T16:51:00.000Z', 
    'Wacky Races 1 of 3 by Scannellatori Seriali', 
    'Race',
    '{"eventId":"5249635","time":1765212660,"routeId":"87055383","distance":"5900","title":"Wacky Races 1 of 3 by Scannellatori Seriali","numLaps":"","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"2,1,9,5,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249649', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765213560, 
    '2025-12-08T17:06:00.000Z', 
    'Wacky Races 2 of 3 by Scannellatori Seriali', 
    'Race',
    '{"eventId":"5249649","time":1765213560,"routeId":"872351836","distance":"5100","title":"Wacky Races 2 of 3 by Scannellatori Seriali","numLaps":"","type":"Race","subType":"Time Trial","staggeredStart":true,"categories":"A,B,C,D,E","signups":"2,0,7,5,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5223295', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765213800, 
    '2025-12-08T17:10:00.000Z', 
    'Stage 2: Fresh Outta ''25: Scotland Smash', 
    'Race',
    '{"eventId":"5223295","time":1765213800,"routeId":"172610229","distance":18069,"title":"Stage 2: Fresh Outta ''25: Scotland Smash","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"13,26,27,34,21"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5223298', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765214100, 
    '2025-12-08T17:15:00.000Z', 
    'Stage 2: Fresh Outta ''25: Scotland Smash || Advanced', 
    'Race',
    '{"eventId":"5223298","time":1765214100,"routeId":"172610229","distance":18069,"title":"Stage 2: Fresh Outta ''25: Scotland Smash || Advanced","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A","signups":"42"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5213406', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765214400, 
    '2025-12-08T17:20:00.000Z', 
    'Zwift TT Club Racing - Park Perimeter Loop', 
    'Race',
    '{"eventId":"5213406","time":1765214400,"routeId":"1919980508","distance":9600,"title":"Zwift TT Club Racing - Park Perimeter Loop","numLaps":"1","type":"Race","subType":"Time Trial","staggeredStart":false,"categories":"A,B,C,D","signups":"4,2,4,3"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249657', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.083Z', 
    1765214460, 
    '2025-12-08T17:21:00.000Z', 
    'Wacky Races 3 of 3 by SCANNELLATORI', 
    'Race',
    '{"eventId":"5249657","time":1765214460,"routeId":"2474227587","distance":"7300","title":"Wacky Races 3 of 3 by SCANNELLATORI","numLaps":"","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"2,0,8,5,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5236650', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765215000, 
    '2025-12-08T17:30:00.000Z', 
    'Zwift Epic Race - Tire Bouchon', 
    'Race',
    '{"eventId":"5236650","time":1765215000,"routeId":"2413440572","distance":64056,"title":"Zwift Epic Race - Tire Bouchon","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A,B,C,D,E","signups":"4,5,10,1,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249663', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765215000, 
    '2025-12-08T17:30:00.000Z', 
    'EVOLVE 15km Road Race', 
    'Race',
    '{"eventId":"5249663","time":1765215000,"routeId":"1600198346","distance":"15000","title":"EVOLVE 15km Road Race","numLaps":"","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A,B,C,D,E","signups":"0,1,2,3,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5236505', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765215600, 
    '2025-12-08T17:40:00.000Z', 
    'Zwift Crit Racing Club - LaGuardia Loop Reverse', 
    'Race',
    '{"eventId":"5236505","time":1765215600,"routeId":"3774003351","distance":21817,"title":"Zwift Crit Racing Club - LaGuardia Loop Reverse","numLaps":"7","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"0,1,2,5,1"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249680', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765216800, 
    '2025-12-08T18:00:00.000Z', 
    'Sledgehammer Inbetweeners Races', 
    'Race',
    '{"eventId":"5249680","time":1765216800,"routeId":"743730361","distance":21330,"title":"Sledgehammer Inbetweeners Races","numLaps":"2","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A,B,C,D","signups":"0,1,2,3"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249678', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765216800, 
    '2025-12-08T18:00:00.000Z', 
    'Team KST''s "Le Rouleur" Race', 
    'Race',
    '{"eventId":"5249678","time":1765216800,"routeId":"2905381067","distance":27522,"title":"Team KST''s \"Le Rouleur\" Race","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D","signups":"0,3,1,2"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249673', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765216800, 
    '2025-12-08T18:00:00.000Z', 
    'The Stampede Challenge by Herd Racing', 
    'Race',
    '{"eventId":"5249673","time":1765216800,"routeId":"742057576","distance":16134,"title":"The Stampede Challenge by Herd Racing","numLaps":"2","type":"Race","subType":"Time Trial","staggeredStart":false,"categories":"A,B,C,D","signups":"0,2,4,7"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5257512', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765216800, 
    '2025-12-08T18:00:00.000Z', 
    'Cycling Weekly Club 10', 
    'Race',
    '{"eventId":"5257512","time":1765216800,"routeId":"742057576","distance":"16090","title":"Cycling Weekly Club 10","numLaps":"","type":"Race","subType":"Time Trial","staggeredStart":false,"categories":"D","signups":"3"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5230348', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765217400, 
    '2025-12-08T18:10:00.000Z', 
    'Stage 2: Fresh Outta ''25: Scotland Smash', 
    'Race',
    '{"eventId":"5230348","time":1765217400,"routeId":"172610229","distance":18069,"title":"Stage 2: Fresh Outta ''25: Scotland Smash","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"9,18,25,21,6"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5116481', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765217700, 
    '2025-12-08T18:15:00.000Z', 
    'Army Cycling eRacing Championship 25 Race 1 - iTT', 
    'Race',
    '{"eventId":"5116481","time":1765217700,"routeId":"186601870","distance":"13000","title":"Army Cycling eRacing Championship 25 Race 1 - iTT","numLaps":"","type":"Race","subType":"Time Trial","staggeredStart":false,"categories":"A,B","signups":"0,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5231061', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765217700, 
    '2025-12-08T18:15:00.000Z', 
    'Stage 2: Fresh Outta ''25: Scotland Smash || Advanced', 
    'Race',
    '{"eventId":"5231061","time":1765217700,"routeId":"172610229","distance":18069,"title":"Stage 2: Fresh Outta ''25: Scotland Smash || Advanced","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A","signups":"7"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249690', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765217700, 
    '2025-12-08T18:15:00.000Z', 
    'Forte Race Series', 
    'Race',
    '{"eventId":"5249690","time":1765217700,"routeId":"3454338139","distance":21699,"title":"Forte Race Series","numLaps":"3","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A,B,C,D","signups":"0,1,1,1"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249689', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765217700, 
    '2025-12-08T18:15:00.000Z', 
    'DBR Monday Race', 
    'Race',
    '{"eventId":"5249689","time":1765217700,"routeId":"240388043","distance":39218,"title":"DBR Monday Race","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"6,14,14,15,3"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5213527', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765218000, 
    '2025-12-08T18:20:00.000Z', 
    'Zwift TT Club Racing - Park Perimeter Loop', 
    'Race',
    '{"eventId":"5213527","time":1765218000,"routeId":"1919980508","distance":9600,"title":"Zwift TT Club Racing - Park Perimeter Loop","numLaps":"1","type":"Race","subType":"Time Trial","staggeredStart":false,"categories":"A,B,C,D","signups":"0,1,0,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5236651', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765218600, 
    '2025-12-08T18:30:00.000Z', 
    'Zwift Epic Race - Tire Bouchon', 
    'Race',
    '{"eventId":"5236651","time":1765218600,"routeId":"2413440572","distance":64056,"title":"Zwift Epic Race - Tire Bouchon","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A,B,C,D,E","signups":"2,0,0,4,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249696', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765218600, 
    '2025-12-08T18:30:00.000Z', 
    'WYDB Bash', 
    'Race',
    '{"eventId":"5249696","time":1765218600,"routeId":"947394567","distance":27454,"title":"WYDB Bash","numLaps":"14","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A,B,C,D,E","signups":"0,0,3,2,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5236309', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765219200, 
    '2025-12-08T18:40:00.000Z', 
    'Zwift Crit Racing Club - LaGuardia Loop Reverse', 
    'Race',
    '{"eventId":"5236309","time":1765219200,"routeId":"3774003351","distance":21817,"title":"Zwift Crit Racing Club - LaGuardia Loop Reverse","numLaps":"7","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"0,0,0,2,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5116483', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765219500, 
    '2025-12-08T18:45:00.000Z', 
    'Army Cycling eRacing Championship 25 Race 2 - Crit Race', 
    'Race',
    '{"eventId":"5116483","time":1765219500,"routeId":"2422779354","distance":12640,"title":"Army Cycling eRacing Championship 25 Race 2 - Crit Race","numLaps":"4","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B","signups":"0,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249703', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765219500, 
    '2025-12-08T18:45:00.000Z', 
    'Tour of Discovery 2025 - Team INOX', 
    'Race',
    '{"eventId":"5249703","time":1765219500,"routeId":"1552189318","distance":17860,"title":"Tour of Discovery 2025 - Team INOX","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A,B,C,D,E","signups":"1,2,2,3,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249713', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765220100, 
    '2025-12-08T18:55:00.000Z', 
    'Team Italy Specialissima Race', 
    'Race',
    '{"eventId":"5249713","time":1765220100,"routeId":"2898229208","distance":30956,"title":"Team Italy Specialissima Race","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"0,0,1,1,1"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5197807', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765220400, 
    '2025-12-08T19:00:00.000Z', 
    'CSNL Racing League etappe 7: Time to Trail', 
    'Race',
    '{"eventId":"5197807","time":1765220400,"routeId":"3919912289","distance":"20000","title":"CSNL Racing League etappe 7: Time to Trail","numLaps":"","type":"Race","subType":"Time Trial","staggeredStart":false,"categories":"A,B,C,D","signups":"0,0,0,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5249727', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765220400, 
    '2025-12-08T19:00:00.000Z', 
    'EVR Europe Race', 
    'Race',
    '{"eventId":"5249727","time":1765220400,"routeId":"1776635757","distance":48953,"title":"EVR Europe Race","numLaps":"2","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A,B,C,D,E","signups":"4,2,7,1,2"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5230382', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765221000, 
    '2025-12-08T19:10:00.000Z', 
    'Stage 2: Fresh Outta ''25: Scotland Smash', 
    'Race',
    '{"eventId":"5230382","time":1765221000,"routeId":"172610229","distance":18069,"title":"Stage 2: Fresh Outta ''25: Scotland Smash","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":true,"categories":"A,B,C,D,E","signups":"10,7,18,17,7"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5116485', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765221300, 
    '2025-12-08T19:15:00.000Z', 
    'Army Cycling eRacing Championship 25 Race 3 - Road Race', 
    'Race',
    '{"eventId":"5116485","time":1765221300,"routeId":"3976402826","distance":"6900","title":"Army Cycling eRacing Championship 25 Race 3 - Road Race","numLaps":"","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A,B","signups":"0,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5231158', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765221300, 
    '2025-12-08T19:15:00.000Z', 
    'Stage 2: Fresh Outta ''25: Scotland Smash || Advanced', 
    'Race',
    '{"eventId":"5231158","time":1765221300,"routeId":"172610229","distance":18069,"title":"Stage 2: Fresh Outta ''25: Scotland Smash || Advanced","numLaps":"1","type":"Race","subType":"Scratch","staggeredStart":false,"categories":"A","signups":"1"}'
  ) ON CONFLICT (event_id) DO NOTHING;
INSERT INTO api_zwiftracing_api_events_upcoming (event_id, source_api, endpoint, fetched_at, time, start_time, title, type, raw_response) VALUES (
    '5213466', 
    'zwiftracing.app', 
    '/api/events/upcoming', 
    '2025-12-08T14:13:44.084Z', 
    1765221600, 
    '2025-12-08T19:20:00.000Z', 
    'Zwift TT Club Racing - Park Perimeter Loop', 
    'Race',
    '{"eventId":"5213466","time":1765221600,"routeId":"1919980508","distance":9600,"title":"Zwift TT Club Racing - Park Perimeter Loop","numLaps":"1","type":"Race","subType":"Time Trial","staggeredStart":false,"categories":"A,B,C,D","signups":"1,1,2,0"}'
  ) ON CONFLICT (event_id) DO NOTHING;
