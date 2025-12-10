# 🚀 Stappenplan: TeamNL Cloud9 Racing Dashboard

**Doel**: Van 0 naar live dashboard in 4 weken  
**Test Rider**: 150437 (Jeroen Diepenbroek)  
**Status**: Ready to implement!

---

## 📋 WEEK 1: Database & Core Data (Dag 1-7)

### **DAG 1: Supabase Setup** ⏱️ 2 uur

1. **Maak Supabase project aan**
   ```bash
   # Ga naar: https://supabase.com
   # 1. Sign up / Log in
   # 2. New Project
   # 3. Noteer credentials:
   #    - Project URL: https://xxx.supabase.co
   #    - API Key (anon public)
   #    - Service Role Key (secret!)
   ```

2. **Run migrations**
   ```bash
   # In Supabase Dashboard > SQL Editor
   
   # Step 1: Run migration 002
   # Kopieer inhoud van: migrations/002_api_source_tables.sql
   # Plak in SQL Editor > Run
   # ✅ Expected: "Created 14 API source tables"
   
   # Step 2: Run migration 003
   # Kopieer inhoud van: migrations/003_hybrid_views.sql
   # Plak in SQL Editor > Run
   # ✅ Expected: "Created 10 hybrid views for frontend"
   ```

3. **Verify tables**
   ```sql
   -- Test query in SQL Editor
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name LIKE 'api_%'
   ORDER BY table_name;
   
   -- Expected: 14 tables
   ```

4. **Save credentials**
   ```bash
   # Create .env file in project root
   cat > .env << EOF
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   
   ZWIFT_RACING_API_KEY=650c6d2fc4ef6858d74cbef1
   
   # Zwift Official (if you have)
   ZWIFT_USERNAME=your_email
   ZWIFT_PASSWORD=your_password
   EOF
   
   # Add to .gitignore
   echo ".env" >> .gitignore
   ```

---

### **DAG 2-3: Backend API Client** ⏱️ 6 uur

1. **Install dependencies**
   ```bash
   cd backend
   npm install @supabase/supabase-js axios node-cron dotenv
   ```

2. **Create API clients**
   ```typescript
   // backend/src/clients/zwiftRacingClient.ts
   import axios from 'axios';
   
   export class ZwiftRacingClient {
     private apiKey = process.env.ZWIFT_RACING_API_KEY!;
     private baseUrl = 'https://zwift-ranking.herokuapp.com';
   
     async getClubRiders(clubId: number): Promise<any> {
       const response = await axios.get(
         `${this.baseUrl}/public/clubs/${clubId}`,
         { headers: { 'API-KEY': this.apiKey } }
       );
       return response.data;
     }
   
     async getUpcomingEvents(): Promise<any[]> {
       const response = await axios.get(
         `${this.baseUrl}/api/events/upcoming`,
         { headers: { 'API-KEY': this.apiKey } }
       );
       return response.data;
     }
   
     async getEventSignups(eventId: string): Promise<any> {
       const response = await axios.get(
         `${this.baseUrl}/api/events/${eventId}/signups`,
         { headers: { 'API-KEY': this.apiKey } }
       );
       return response.data;
     }
   }
   ```

3. **Create Supabase client**
   ```typescript
   // backend/src/clients/supabaseClient.ts
   import { createClient } from '@supabase/supabase-js';
   
   export const supabase = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   );
   ```

4. **Test API clients**
   ```typescript
   // backend/src/test-api.ts
   import { ZwiftRacingClient } from './clients/zwiftRacingClient';
   
   async function test() {
     const client = new ZwiftRacingClient();
     
     console.log('Testing club riders...');
     const riders = await client.getClubRiders(11818);
     console.log(`✅ Found ${riders.length} riders`);
     
     console.log('Testing upcoming events...');
     const events = await client.getUpcomingEvents();
     console.log(`✅ Found ${events.length} events`);
   }
   
   test();
   ```

   ```bash
   # Run test
   npx ts-node src/test-api.ts
   # Expected: ✅ Found 80+ riders, ✅ Found 856+ events
   ```

---

### **DAG 4-5: Sync Service** ⏱️ 8 uur

1. **Create sync service**
   ```typescript
   // backend/src/services/syncService.ts
   import { supabase } from '../clients/supabaseClient';
   import { ZwiftRacingClient } from '../clients/zwiftRacingClient';
   
   export class SyncService {
     private zwiftRacing = new ZwiftRacingClient();
   
     async syncClubRiders(clubId: number = 11818) {
       console.log('🔄 Syncing club riders...');
       const startTime = Date.now();
       
       try {
         // Fetch from API
         const riders = await this.zwiftRacing.getClubRiders(clubId);
         
         // Upsert to Supabase
         const { data, error } = await supabase
           .from('api_zwiftracing_public_clubs_riders')
           .upsert(
             riders.map((r: any) => ({
               rider_id: r.id,
               club_id: clubId,
               source_api: 'zwiftracing.app',
               endpoint: '/public/clubs/{id}',
               fetched_at: new Date().toISOString(),
               
               // All 51 fields
               id: r.id,
               name: r.name,
               velo: r.velo,
               racing_score: r.racingScore,
               ftp: r.ftp,
               power_5s: r.power5s,
               power_15s: r.power15s,
               power_30s: r.power30s,
               power_60s: r.power60s,
               power_120s: r.power120s,
               power_300s: r.power300s,
               power_1200s: r.power1200s,
               power_5s_wkg: r.power5sWkg,
               power_15s_wkg: r.power15sWkg,
               power_30s_wkg: r.power30sWkg,
               power_60s_wkg: r.power60sWkg,
               power_120s_wkg: r.power120sWkg,
               power_300s_wkg: r.power300sWkg,
               power_1200s_wkg: r.power1200sWkg,
               weight: r.weight,
               height: r.height,
               phenotype: r.phenotype,
               category: r.category,
               race_count: r.raceCount,
               
               raw_response: r
             })),
             { onConflict: 'rider_id' }
           );
         
         if (error) throw error;
         
         const duration = Date.now() - startTime;
         console.log(`✅ Synced ${riders.length} riders in ${duration}ms`);
         
         return { success: true, count: riders.length };
       } catch (error) {
         console.error('❌ Sync failed:', error);
         return { success: false, error };
       }
     }
   
     async syncUpcomingEvents() {
       console.log('🔄 Syncing upcoming events...');
       
       try {
         const events = await this.zwiftRacing.getUpcomingEvents();
         
         const { error } = await supabase
           .from('api_zwiftracing_api_events_upcoming')
           .upsert(
             events.map((e: any) => ({
               event_id: e.eventId,
               source_api: 'zwiftracing.app',
               endpoint: '/api/events/upcoming',
               fetched_at: new Date().toISOString(),
               
               time: e.time,
               start_time: new Date(e.time * 1000).toISOString(),
               route_id: e.routeId,
               distance: e.distance,
               title: e.title,
               num_laps: e.numLaps,
               type: e.type,
               sub_type: e.subType,
               staggered_start: e.staggeredStart,
               categories: e.categories,
               signups: e.signups,
               
               raw_response: e
             })),
             { onConflict: 'event_id' }
           );
         
         if (error) throw error;
         
         console.log(`✅ Synced ${events.length} events`);
         return { success: true, count: events.length };
       } catch (error) {
         console.error('❌ Sync failed:', error);
         return { success: false, error };
       }
     }
   }
   ```

2. **Create cron scheduler**
   ```typescript
   // backend/src/scheduler.ts
   import cron from 'node-cron';
   import { SyncService } from './services/syncService';
   
   const syncService = new SyncService();
   
   // Every 60 minutes: Club riders (rate limit: 1/60min)
   cron.schedule('0 * * * *', async () => {
     console.log('⏰ Starting hourly sync: Club riders');
     await syncService.syncClubRiders(11818);
   });
   
   // Every 60 minutes: Upcoming events
   cron.schedule('5 * * * *', async () => {
     console.log('⏰ Starting hourly sync: Events');
     await syncService.syncUpcomingEvents();
   });
   
   console.log('✅ Scheduler started');
   console.log('   - Club riders: Every 60 minutes');
   console.log('   - Events: Every 60 minutes');
   
   // Initial sync on startup
   (async () => {
     console.log('🚀 Running initial sync...');
     await syncService.syncClubRiders(11818);
     await syncService.syncUpcomingEvents();
     console.log('✅ Initial sync complete');
   })();
   ```

3. **Test sync**
   ```bash
   # Run scheduler
   npx ts-node src/scheduler.ts
   
   # Expected output:
   # 🚀 Running initial sync...
   # 🔄 Syncing club riders...
   # ✅ Synced 80 riders in 1234ms
   # 🔄 Syncing upcoming events...
   # ✅ Synced 856 events
   # ✅ Initial sync complete
   # ✅ Scheduler started
   ```

4. **Verify in Supabase**
   ```sql
   -- Check riders
   SELECT COUNT(*) FROM api_zwiftracing_public_clubs_riders;
   -- Expected: 80+
   
   -- Check events
   SELECT COUNT(*) FROM api_zwiftracing_api_events_upcoming;
   -- Expected: 856+
   
   -- Test views work
   SELECT * FROM v_team_rankings LIMIT 5;
   SELECT * FROM v_race_calendar LIMIT 10;
   ```

---

### **DAG 6-7: Backend API Endpoints** ⏱️ 6 uur

1. **Create API routes**
   ```typescript
   // backend/src/routes/riders.ts
   import express from 'express';
   import { supabase } from '../clients/supabaseClient';
   
   const router = express.Router();
   
   // GET /api/riders/:id - Complete rider profile
   router.get('/:id', async (req, res) => {
     const { data, error } = await supabase
       .from('v_rider_complete')
       .select('*')
       .eq('rider_id', req.params.id)
       .single();
     
     if (error) return res.status(500).json({ error: error.message });
     if (!data) return res.status(404).json({ error: 'Rider not found' });
     
     res.json(data);
   });
   
   // GET /api/riders - Team rankings
   router.get('/', async (req, res) => {
     const { data, error } = await supabase
       .from('v_team_rankings')
       .select('*')
       .order('velo_rank');
     
     if (error) return res.status(500).json({ error: error.message });
     res.json(data);
   });
   
   export default router;
   ```

   ```typescript
   // backend/src/routes/events.ts
   import express from 'express';
   import { supabase } from '../clients/supabaseClient';
   
   const router = express.Router();
   
   // GET /api/events - Upcoming races
   router.get('/', async (req, res) => {
     const { data, error } = await supabase
       .from('v_race_calendar')
       .select('*')
       .order('start_time');
     
     if (error) return res.status(500).json({ error: error.message });
     res.json(data);
   });
   
   // GET /api/events/:id/signups - Event preview
   router.get('/:id/signups', async (req, res) => {
     const { data, error } = await supabase
       .from('v_event_signup_preview')
       .select('*')
       .eq('event_id', req.params.id)
       .order('predicted_position');
     
     if (error) return res.status(500).json({ error: error.message });
     res.json(data);
   });
   
   export default router;
   ```

2. **Setup Express server**
   ```typescript
   // backend/src/server.ts
   import express from 'express';
   import cors from 'cors';
   import ridersRouter from './routes/riders';
   import eventsRouter from './routes/events';
   
   const app = express();
   
   app.use(cors());
   app.use(express.json());
   
   // Routes
   app.use('/api/riders', ridersRouter);
   app.use('/api/events', eventsRouter);
   
   // Health check
   app.get('/health', (req, res) => {
     res.json({ status: 'ok' });
   });
   
   const PORT = process.env.PORT || 3001;
   app.listen(PORT, () => {
     console.log(`✅ Server running on port ${PORT}`);
   });
   ```

3. **Test API**
   ```bash
   # Start server
   npm run dev
   
   # In another terminal, test endpoints:
   curl http://localhost:3001/health
   curl http://localhost:3001/api/riders/150437
   curl http://localhost:3001/api/riders
   curl http://localhost:3001/api/events
   ```

---

## 📋 WEEK 2: Frontend Core (Dag 8-14)

### **DAG 8-9: Frontend Setup** ⏱️ 6 uur

1. **Install dependencies**
   ```bash
   cd frontend
   npm install @supabase/supabase-js @tanstack/react-query axios
   ```

2. **Create API client**
   ```typescript
   // frontend/src/lib/api.ts
   import axios from 'axios';
   
   const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
   
   export const api = {
     // Riders
     getRider: (id: number) => 
       axios.get(`${API_BASE}/api/riders/${id}`).then(r => r.data),
     
     getTeamRankings: () => 
       axios.get(`${API_BASE}/api/riders`).then(r => r.data),
     
     // Events
     getUpcomingEvents: () => 
       axios.get(`${API_BASE}/api/events`).then(r => r.data),
     
     getEventSignups: (eventId: string) => 
       axios.get(`${API_BASE}/api/events/${eventId}/signups`).then(r => r.data),
   };
   ```

3. **Setup React Query**
   ```typescript
   // frontend/src/main.tsx
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   
   const queryClient = new QueryClient();
   
   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <QueryClientProvider client={queryClient}>
         <App />
       </QueryClientProvider>
     </React.StrictMode>
   );
   ```

---

### **DAG 10-12: Team Dashboard** ⏱️ 12 uur

1. **Create TeamDashboard component**
   ```typescript
   // frontend/src/pages/TeamDashboard.tsx
   import { useQuery } from '@tanstack/react-query';
   import { api } from '../lib/api';
   
   export function TeamDashboard() {
     const { data: rankings, isLoading } = useQuery({
       queryKey: ['team-rankings'],
       queryFn: api.getTeamRankings,
     });
   
     if (isLoading) return <div>Loading...</div>;
   
     return (
       <div className="container mx-auto p-4">
         <h1 className="text-3xl font-bold mb-6">TeamNL Cloud9 Rankings</h1>
         
         <div className="grid gap-4">
           {rankings?.map((rider: any) => (
             <div key={rider.rider_id} className="bg-white rounded-lg shadow p-4 flex items-center gap-4">
               {/* Avatar */}
               <img 
                 src={rider.avatar_url || '/default-avatar.png'} 
                 className="w-16 h-16 rounded-full"
                 alt={rider.name}
               />
               
               {/* Rider info */}
               <div className="flex-1">
                 <h3 className="font-bold text-lg">{rider.name}</h3>
                 <div className="text-sm text-gray-600">
                   {rider.phenotype} | {rider.category}
                 </div>
               </div>
               
               {/* Stats */}
               <div className="text-right">
                 <div className="text-2xl font-bold text-blue-600">
                   {rider.velo?.toFixed(0)}
                 </div>
                 <div className="text-sm text-gray-500">
                   Rank #{rider.velo_rank}
                 </div>
               </div>
               
               {/* Grade */}
               <div className={`
                 text-2xl font-bold px-4 py-2 rounded
                 ${rider.performance_grade === 'S' ? 'bg-yellow-400' : ''}
                 ${rider.performance_grade === 'A+' ? 'bg-green-400' : ''}
                 ${rider.performance_grade === 'A' ? 'bg-green-300' : ''}
               `}>
                 {rider.performance_grade}
               </div>
             </div>
           ))}
         </div>
       </div>
     );
   }
   ```

2. **Test dashboard**
   ```bash
   npm run dev
   # Open http://localhost:5173
   # Expected: List van 80+ riders met vELO rankings
   ```

---

### **DAG 13-14: Race Calendar** ⏱️ 8 uur

1. **Create RaceCalendar component**
   ```typescript
   // frontend/src/pages/RaceCalendar.tsx
   import { useQuery } from '@tanstack/react-query';
   import { api } from '../lib/api';
   
   export function RaceCalendar() {
     const { data: events } = useQuery({
       queryKey: ['upcoming-events'],
       queryFn: api.getUpcomingEvents,
     });
   
     return (
       <div className="container mx-auto p-4">
         <h1 className="text-3xl font-bold mb-6">Upcoming Races</h1>
         
         <div className="grid gap-4">
           {events?.map((event: any) => (
             <div key={event.event_id} className="bg-white rounded-lg shadow p-4">
               <h3 className="font-bold text-lg">{event.title}</h3>
               
               <div className="mt-2 flex gap-4 text-sm text-gray-600">
                 <span>📅 {new Date(event.start_time).toLocaleString()}</span>
                 <span>📏 {event.distance_km?.toFixed(1)} km</span>
                 <span>🏁 {event.type}</span>
               </div>
               
               <div className="mt-3 flex gap-2">
                 {event.signups_a > 0 && <span className="badge">A: {event.signups_a}</span>}
                 {event.signups_b > 0 && <span className="badge">B: {event.signups_b}</span>}
                 {event.signups_c > 0 && <span className="badge">C: {event.signups_c}</span>}
                 {event.signups_d > 0 && <span className="badge">D: {event.signups_d}</span>}
                 {event.signups_e > 0 && <span className="badge">E: {event.signups_e}</span>}
               </div>
             </div>
           ))}
         </div>
       </div>
     );
   }
   ```

---

## 📋 WEEK 3: Advanced Features (Dag 15-21)

### **DAG 15-17: Rider Profile Page** ⏱️ 12 uur

Include: Power curve chart, recent activities, race history

### **DAG 18-19: Event Preview Page** ⏱️ 8 uur

🔥 **KILLER FEATURE**: Pre-race analysis met predicted positions

### **DAG 20-21: Power Rankings** ⏱️ 8 uur

Leaderboards voor alle power durations

---

## 📋 WEEK 4: Polish & Deploy (Dag 22-28)

### **DAG 22-24: Testing & Bug Fixes** ⏱️ 12 uur

### **DAG 25-26: Railway Deployment** ⏱️ 8 uur

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy backend
cd backend
railway up

# Set environment variables in Railway dashboard
# Deploy frontend (Vite build)
cd frontend
npm run build
# Upload dist/ to Railway static site
```

### **DAG 27-28: Documentation & Handoff** ⏱️ 8 uur

---

## ✅ Success Criteria

- [ ] Database: 14 source tables + 10 views created
- [ ] Sync: Hourly club riders + events working
- [ ] Backend: API endpoints returning data
- [ ] Frontend: Team dashboard showing 80+ riders
- [ ] Frontend: Race calendar showing 856+ events
- [ ] Test: Rider 150437 profile loads correctly
- [ ] Deploy: Live on Railway

---

## 🎯 Start NOW - DAG 1

**Action**: Maak Supabase project aan en run migrations!

```bash
# 1. Go to https://supabase.com
# 2. New Project
# 3. Copy migrations/002_api_source_tables.sql
# 4. Paste in SQL Editor
# 5. Run
# 6. Repeat for 003_hybrid_views.sql
```

**Dan ben je klaar voor DAG 2!** 🚀
