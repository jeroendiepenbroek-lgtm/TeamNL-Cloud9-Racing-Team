# End-to-End Production Workflow

**TeamNL Cloud9 Racing Team - Complete Deployment Pipeline**

Status: ✅ **PRODUCTION READY** (06-11-2025)

---

## 🎯 Overzicht

Deze workflow beschrijft het complete proces van lokale development tot production deployment op Railway.

```
Local Dev → Git Push → Railway Build → Docker Deploy → Production Live
```

---

## 📦 Tech Stack

### Frontend
- **Framework**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Data**: TanStack Query + Table
- **Build output**: Static files → `backend/public/dist/`

### Backend
- **Runtime**: Node.js 22 + TypeScript (tsx)
- **Framework**: Express.js
- **Database**: Supabase PostgreSQL
- **API**: ZwiftRacing.app integration

### Deployment
- **Platform**: Railway.app
- **Region**: europe-west4
- **Builder**: Docker (custom Dockerfile)
- **Port**: Dynamic (Railway assigns, typically 8080)

---

## 🔄 Complete Workflow

### 1️⃣ **Local Development**

#### Setup
```bash
# Clone repository
git clone https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team.git
cd TeamNL-Cloud9-Racing-Team

# Install dependencies (backend)
cd backend
npm install

# Install frontend dependencies
cd frontend
npm install
```

#### Environment Variables
Create `backend/.env`:
```bash
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
NODE_ENV=development
PORT=3000
```

#### Run Locally
```bash
# Backend (from /backend)
npm start
# → Server on http://localhost:3000

# Frontend (from /backend/frontend)
npm run dev
# → Vite dev server on http://localhost:5173
# → Proxies /api calls to backend
```

---

### 2️⃣ **Code Changes & Commit**

```bash
# Make changes to code
# Example: Update backend/src/api/endpoints/riders.ts

# Stage changes
git add .

# Commit with conventional commits
git commit -m "✨ feat: Add new rider endpoint"

# Push to main branch
git push origin main
```

**Commit Types**:
- ✨ `feat:` - New feature
- 🐛 `fix:` - Bug fix
- 🔧 `chore:` - Maintenance
- 📝 `docs:` - Documentation
- 🎨 `style:` - Code style/formatting

---

### 3️⃣ **Railway Webhook Trigger**

Railway automatically detects git push via GitHub webhook:

```
GitHub Push → Railway Webhook → Build Triggered
```

**What Railway does**:
1. Pull latest commit from `main` branch
2. Detect `Dockerfile` (via `railway.toml`)
3. Start Docker build process

---

### 4️⃣ **Docker Build Process**

Railway executes multi-stage Docker build:

#### Stage 1: Frontend Build
```dockerfile
FROM node:22-alpine AS frontend-builder
WORKDIR /build
COPY backend/frontend/package*.json ./
RUN npm ci
COPY backend/frontend/ ./
RUN npm run build -- --outDir=/frontend-dist
```
- Installs frontend dependencies
- Runs Vite build
- Output: Static files in `/frontend-dist`

#### Stage 2: Backend Runtime
```dockerfile
FROM node:22-alpine AS final
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/src ./src
RUN mkdir -p public/dist
COPY --from=frontend-builder /frontend-dist/ ./public/dist/
```
- Installs backend dependencies (includes `tsx`)
- Copies backend source code
- Copies frontend build output

#### Start Command
```dockerfile
CMD ["/app/start.sh"]
```
- Custom start script with debug logging
- Checks environment variables
- Verifies dependencies
- Starts server: `npx tsx src/server.ts`

---

### 5️⃣ **Railway Deployment**

**Build Output** (typical):
```
✅ Building with Dockerfile
✅ Stage 1: Frontend build (8 sec)
✅ Stage 2: Backend install (5 sec)
✅ Stage 3: Final image (2 sec)
✅ Total build time: ~15 seconds
```

**Container Start** (Railway logs):
```
🚀 Starting TeamNL Cloud9 Backend...
📍 Working directory: /app
🔧 Environment Check:
   NODE_ENV: production
   PORT: 8080 (Railway dynamic)
   SUPABASE_URL: [SET]
   SUPABASE_SERVICE_ROLE_KEY: [SET]
   ZWIFT_API_KEY: [SET]
📦 Node modules check:
   ✅ tsx found
   ✅ express found
   ✅ dotenv found
🎯 Starting server on PORT 8080...
✅ Server successfully started!
```

---

### 6️⃣ **Production Access**

**URL**: https://teamnl-cloud9-racing-team-production.up.railway.app

#### Available Endpoints

**Health Check**:
```bash
GET /health
Response: {
  "status": "ok",
  "service": "TeamNL Cloud9 Backend",
  "version": "2.0.0-clean",
  "port": 8080,
  "timestamp": "2025-11-06T11:00:51.238Z"
}
```

**API Endpoints**:
```
GET  /api/clubs/:id          - Get club by ID
GET  /api/riders             - Get all riders
GET  /api/riders/team        - Get my team members (view_my_team)
GET  /api/events             - Get events
GET  /api/results/:eventId   - Get event results
GET  /api/history/:riderId   - Get rider history
GET  /api/sync-logs          - Get sync logs

POST /api/clubs/:id/sync     - Sync club data
POST /api/riders/sync        - Sync riders
POST /api/riders/team        - Add rider to team
POST /api/riders/team/bulk   - Bulk add riders
DELETE /api/riders/team/:id  - Remove from team
```

**Frontend**:
```
GET  /                       - React SPA (served from /public/dist)
```

---

## 🔐 Environment Variables (Railway)

**Required Variables** (5):

| Variable | Example | Purpose |
|----------|---------|---------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Database connection |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Bypass RLS (service access) |
| `ZWIFT_API_KEY` | `650c6d2f...` | ZwiftRacing API auth |
| `NODE_ENV` | `production` | Runtime mode |
| `PORT` | `8080` | Railway auto-sets (dynamic) |

**How to set**:
1. Railway Dashboard → Service → Settings → Variables
2. Add each variable with "New Variable" button
3. Mark secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ZWIFT_API_KEY`) as hidden
4. Railway redeploys automatically after changes

---

## 🐛 Troubleshooting

### Build Fails

**Symptom**: Railway build fails with npm errors

**Common causes**:
1. `package-lock.json` out of sync
   - Fix: `rm package-lock.json && npm install` in backend/
2. Missing dependencies in `package.json`
   - Fix: Ensure `tsx` is in dependencies (not devDependencies)

### Runtime 502 Error

**Symptom**: Build succeeds, but app returns 502

**Common causes**:
1. Port mismatch
   - Check: Server must listen on `process.env.PORT`
   - Verify: Railway logs show correct PORT (e.g., 8080)
2. Missing environment variables
   - Check: All 5 required vars set in Railway
   - Verify: Logs show `[SET]` for each variable
3. App crash at startup
   - Check: Railway logs for error messages
   - Common: Supabase connection errors

### Database Errors (PGRST116)

**Symptom**: `Cannot coerce result to single JSON object`

**Cause**: Using `.single()` on empty table

**Fix**: Use `.maybeSingle()` instead
```typescript
// ❌ Throws error if no rows
.single()

// ✅ Returns null if no rows
.maybeSingle()
```

---

## 📊 Performance Metrics

### Build Times
- Frontend build: ~8 seconds
- Backend install: ~5 seconds
- Docker image: ~2 seconds
- **Total**: ~15 seconds

### Deployment Times
- Railway detection: <5 seconds
- Build process: ~15 seconds
- Container start: ~3 seconds
- Health check: <1 second
- **Total**: ~25 seconds from push to live

### Response Times (production)
- Health endpoint: <10ms
- Database queries: 50-200ms (Supabase)
- API endpoints: 100-500ms (depends on query)

---

## 🔄 Rollback Procedure

If deployment fails or has issues:

```bash
# Option 1: Revert last commit
git revert HEAD
git push origin main
# → Railway auto-deploys previous version

# Option 2: Railway Dashboard
Railway Dashboard → Deployments → Click previous deployment → "Redeploy"
```

---

## 🚀 Best Practices

### 1. Test Locally First
```bash
# Always test Docker build locally before pushing
docker build -t test-backend .
docker run -p 3000:3000 --env-file backend/.env test-backend

# Test endpoints
curl http://localhost:3000/health
```

### 2. Small Commits
- One feature/fix per commit
- Clear commit messages
- Easy to revert if needed

### 3. Monitor Railway Logs
- Check build logs after each push
- Verify startup logs show no errors
- Monitor application logs for runtime issues

### 4. Environment Variable Management
- Never commit `.env` files
- Use `.env.example` as template
- Keep Railway variables in sync with local

### 5. Database Migrations
- Test migrations in Supabase Dashboard first
- Use numbered migrations: `001_`, `002_`, etc.
- Document changes in migration file comments

---

## 📈 Scaling Considerations

### Current Setup (Free Tier)
- 1 Railway service
- Dynamic port allocation
- Auto-sleep after inactivity (if enabled)
- 500MB RAM limit
- Shared CPU

### Future Scaling
- Upgrade Railway plan for:
  - More resources (RAM/CPU)
  - No auto-sleep
  - Custom domains
  - Multiple regions
- Add Redis for caching
- Implement horizontal scaling with load balancer

---

## 📝 Changelog

### 2025-11-06 - Production Ready ✅
- Docker multi-stage build working
- Railway deployment automated
- Environment variables configured
- Health checks passing
- API endpoints live
- Frontend served correctly

### Key Issues Resolved
1. ✅ Railway Railpack conflicts → Custom Dockerfile
2. ✅ Port binding (hardcoded 3000 → dynamic PORT)
3. ✅ package-lock.json sync issues → Regenerated backend lockfile
4. ✅ Supabase .single() errors → Changed to .maybeSingle()
5. ✅ tsx runtime in production → Added to dependencies

---

## 🎓 Learning Resources

- [Railway Documentation](https://docs.railway.app)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

**Status**: ✅ Production Workflow Operational  
**Last Updated**: 2025-11-06  
**Maintained By**: TeamNL Cloud9 Development Team
