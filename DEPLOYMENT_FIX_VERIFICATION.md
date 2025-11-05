# Railway Deployment Fix - Verification Guide

## Problem That Was Fixed
Railway deployment was failing with error:
```
Error: Cannot find module '/app/src/server.js'
```

## Root Cause
- Backend source files are TypeScript (`.ts`) but package.json referenced JavaScript (`.js`)
- `tsx` runtime was missing from backend dependencies
- npm start was trying to run `node src/server.js` which didn't exist

## Solution Applied

### 1. Updated backend/package.json
**Dependencies:**
- ✅ Added `tsx: ^4.19.1` to dependencies (production)
- ✅ Added TypeScript types to devDependencies

**Scripts:**
- ✅ Changed `main`: `src/server.js` → `src/server.ts`
- ✅ Changed `start`: `node src/server.js` → `tsx src/server.ts`
- ✅ Changed `dev`: `nodemon --watch src --exec node src/server.js` → `tsx watch src/server.ts`

### 2. Updated railway.json
- ✅ Removed `buildCommand: "npm install"` to avoid conflicts
- ✅ Let nixpacks.toml handle installation
- ✅ Kept `startCommand: "npx tsx backend/src/server.ts"`

## Deployment Flow

### Build Phase (Nixpacks)
1. **Setup**: Installs Node.js 18 and npm 9
2. **Install**: 
   - Runs `cd backend && npm ci` → installs tsx and all dependencies
   - Runs `cd backend/frontend && npm ci` → installs frontend dependencies
3. **Build**:
   - Creates `backend/public/dist` directory
   - Builds frontend with `npm run build`

### Start Phase
- Runs: `npx tsx backend/src/server.ts`
- tsx is available because it's now in backend/package.json dependencies
- TypeScript files are executed directly without compilation

## Local Verification ✅

```bash
$ cd backend
$ npm install
$ npm start

> teamnl-cloud9-backend@0.1.0 start
> tsx src/server.ts

✅ Server successfully started on port 3000
```

## Railway Deployment Verification

### Expected Behavior
1. ✅ Build should complete without errors
2. ✅ Installation should include tsx package
3. ✅ Server should start successfully
4. ✅ Health check at `/health` should return 200 OK

### How to Verify on Railway

1. **Check Build Logs:**
   ```
   Installing dependencies...
   cd backend && npm ci
   [should show tsx being installed]
   ```

2. **Check Deployment Logs:**
   ```
   > tsx src/server.ts
   Starting server on port 3000...
   ✅ Server successfully started!
   ```

3. **Test Health Endpoint:**
   ```bash
   curl https://your-railway-url.railway.app/health
   ```
   Should return:
   ```json
   {
     "status": "ok",
     "service": "TeamNL Cloud9 Backend",
     "timestamp": "2024-11-05T...",
     "version": "2.0.0-clean"
   }
   ```

## Required Environment Variables
Make sure these are set in Railway:
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `ZWIFT_API_KEY`
- ✅ `PORT` (Railway sets automatically)
- ✅ `NODE_ENV=production`

## Troubleshooting

### If deployment still fails:

1. **Check if tsx is installed:**
   - Look for "tsx@4.19.1" in build logs
   
2. **Verify backend/package.json:**
   - Should have `"tsx": "^4.19.1"` in dependencies
   - Should have `"start": "tsx src/server.ts"`

3. **Check Railway configuration:**
   - Start command: `npx tsx backend/src/server.ts`
   - Builder: NIXPACKS
   - Root directory: `/` (project root)

4. **Check nixpacks.toml:**
   - Install phase should run `cd backend && npm ci`
   - Start command should be `npx tsx backend/src/server.ts`

## Success Indicators
- ✅ Build completes without "MODULE_NOT_FOUND" errors
- ✅ Server starts and listens on port (check logs for "Server successfully started!")
- ✅ Health check returns 200 OK
- ✅ API endpoints respond correctly

## Files Changed
- `backend/package.json` - Added tsx dependency and updated scripts
- `backend/package-lock.json` - Updated with new dependencies
- `railway.json` - Removed redundant buildCommand
