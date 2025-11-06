# Code Cleanup Guide

**TeamNL Cloud9 Racing Team - Obsolete Code Removal**

Na de deployment troubleshooting journey zitten er verschillende tijdelijke en achterhaalde bestanden in de repository. Deze guide identificeert wat verwijderd kan worden.

---

## 🗑️ Files to Remove

### 1. Root Level (Troubleshooting Artifacts)

#### `package.json.local` & `package-lock.json.local`
**Location**: `/workspaces/TeamNL-Cloud9-Racing-Team/`

**Why Remove**: 
- Tijdelijk hernoemd tijdens Railway debugging
- Root package.json/lock werden verward met backend deps
- Nu niet meer nodig - Railway gebruikt Dockerfile

**Action**:
```bash
rm package.json.local package-lock.json.local
```

---

#### `nixpacks.toml`
**Location**: `/workspaces/TeamNL-Cloud9-Racing-Team/`

**Why Remove**:
- Poging om Railway build te configureren
- Railway negeert dit bestand (gebruikt Dockerfile ipv nixpacks)
- Niet functioneel

**Action**:
```bash
rm nixpacks.toml
```

---

### 2. Documentation (Superseded)

#### `RE_UPLOAD_SUMMARY.md`
**Location**: `/workspaces/TeamNL-Cloud9-Racing-Team/`

**Why Remove/Archive**:
- Beschrijft oude re-upload functionaliteit
- Check of dit nog relevant is voor huidige versie
- Zo niet: verwijder of verplaats naar `docs/archive/`

**Action**:
```bash
# If obsolete:
rm RE_UPLOAD_SUMMARY.md

# Or archive:
mkdir -p docs/archive
git mv RE_UPLOAD_SUMMARY.md docs/archive/
```

---

#### `SOLUTION-SUMMARY.md` & `WORKFLOW_VERIFICATION.md`
**Location**: Root

**Why Review**:
- Mogelijk achterhaalde workflow beschrijvingen
- Check of informatie nog klopt na Railway migration
- Superseded by `docs/E2E_PRODUCTION_WORKFLOW.md`?

**Action**:
```bash
# Review content first, then:
git mv SOLUTION-SUMMARY.md docs/archive/
git mv WORKFLOW_VERIFICATION.md docs/archive/
```

---

### 3. Scripts (Obsolete/Unused)

#### `scripts/keepalive.js`
**Location**: `scripts/`

**Why Remove**:
- Node.js keepalive script (waarschijnlijk voor oude hosting)
- Railway heeft eigen keepalive mechanisme
- Niet meer nodig

**Action**:
```bash
rm scripts/keepalive.js
```

---

#### Debug/Test Scripts (Review Needed)
**Location**: `scripts/`

Mogelijk obsolete scripts:
- `sync-event-5129235-final.ts` - Specifiek event, waarschijnlijk test
- `sync-event-5129235.ts` - Duplicate?
- `sync-event-manual.ts` - Ad-hoc test?
- `sync-rider-150437-events.ts` - Specifieke rider test
- `sync-rider-150437.ts` - Duplicate?

**Action**:
```bash
# Review each file:
head -20 scripts/sync-event-5129235-final.ts

# If obsolete/duplicate:
rm scripts/sync-event-5129235-final.ts
rm scripts/sync-event-5129235.ts
# ... etc
```

**Criteria**:
- ✅ Keep: Generic scripts (sync-cli.ts, sync-favorites.ts)
- ❌ Remove: Hardcoded event/rider IDs voor specifieke tests
- 🤔 Review: Scripts met "manual", "test", "demo" in naam

---

### 4. Configuration Files

#### `ecosystem.config.js` (PM2 config)
**Location**: Root

**Why Review**:
- PM2 configuratie voor oude hosting setup?
- Railway gebruikt Docker/tsx direct (geen PM2)
- Check of lokaal nog gebruikt

**Action**:
```bash
# If not used locally:
rm ecosystem.config.js

# Or document usage in README if needed
```

---

### 5. Environment Variables (Railway)

**Not files, but cleanup needed in Railway dashboard**:

Remove these obsolete env vars from Railway:
- `DATABASE_URL` (Prisma) - Niet meer gebruikt
- `FIREBASE_*` - Als Firebase niet gebruikt
- `CRON_*` - Als cron disabled in production
- `AUTH_SECRET` - Als auth niet geïmplementeerd
- `SMTP_*` - Als email niet gebruikt

**Action**: Via Railway dashboard → Environment variables → Delete unused

---

## 📁 Files to KEEP (Don't Remove!)

### Root Config (Required)
- ✅ `Dockerfile` - Production build
- ✅ `railway.toml` - Railway builder config
- ✅ `.dockerignore` - Build optimization
- ✅ `tsconfig.json` - TypeScript config
- ✅ `package.json` (root) - Workspace config
- ✅ `eslint.config.js` - Code quality
- ✅ `vitest.config.ts` - Testing (future)
- ✅ `nodemon.json` - Local dev

### Scripts (Core)
- ✅ `scripts/sync-cli.ts` - Manual sync tool
- ✅ `scripts/sync-favorites.ts` - Favorites sync
- ✅ `scripts/import-team-members.ts` - Team import
- ✅ `scripts/rider-manager.ts` - Rider CRUD
- ✅ `scripts/e2e-test.ts` - Test suite

### Documentation (Current)
- ✅ `docs/E2E_PRODUCTION_WORKFLOW.md` - NEW: Complete workflow
- ✅ `docs/REGRESSION_TESTS.md` - NEW: Test suite
- ✅ `docs/API.md` - API reference
- ✅ `docs/ZWIFT_API_ENDPOINTS.md` - External API docs
- ✅ `README.md`, `QUICKSTART.md` - Project intro

---

## 🧹 Cleanup Execution Plan

### Phase 1: Safe Removals (Confirmed Obsolete)
```bash
cd /workspaces/TeamNL-Cloud9-Racing-Team

# Remove known obsolete files
rm package.json.local package-lock.json.local
rm nixpacks.toml
rm scripts/keepalive.js

# Commit
git add -A
git commit -m "🧹 Cleanup: Remove obsolete config files

- Remove package.json.local / package-lock.json.local (Railway debug artifacts)
- Remove nixpacks.toml (Railway uses Dockerfile)
- Remove keepalive.js (Railway has own keepalive)"

git push origin main
```

---

### Phase 2: Archive Old Docs
```bash
# Create archive directory
mkdir -p docs/archive

# Move superseded docs
git mv SOLUTION-SUMMARY.md docs/archive/
git mv WORKFLOW_VERIFICATION.md docs/archive/
git mv RE_UPLOAD_SUMMARY.md docs/archive/  # If obsolete

# Update README to reference new docs
# ... edit README.md ...

# Commit
git add -A
git commit -m "📚 Docs: Archive old workflow documentation

- Move superseded docs to archive/
- New docs: E2E_PRODUCTION_WORKFLOW.md, REGRESSION_TESTS.md"

git push origin main
```

---

### Phase 3: Script Cleanup (Requires Review)
```bash
# Review each script before removing
cd scripts

# List all scripts with dates
ls -lh *.ts | sort

# For each candidate:
head -30 <script-name>

# If obsolete (hardcoded test data, specific event/rider):
git rm <script-name>

# Example cleanup:
git rm sync-event-5129235-final.ts
git rm sync-event-5129235.ts
git rm sync-rider-150437.ts
git rm sync-rider-150437-events.ts

# Commit
git add -A
git commit -m "🧹 Scripts: Remove test-specific sync scripts

- Remove hardcoded event/rider test scripts
- Keep generic CLI tools (sync-cli, rider-manager, etc.)"

git push origin main
```

---

### Phase 4: Environment Variables
**Via Railway Dashboard**:
1. Open Railway project settings
2. Navigate to Environment Variables
3. Delete unused variables (see list above)
4. Redeploy (automatic)
5. Run regression tests to verify

---

## 🔍 Review Checklist

Before removing any file, verify:

1. **Not imported anywhere**:
```bash
# Search for imports
grep -r "import.*from.*<filename>" .
grep -r "require(.*<filename>" .
```

2. **Not referenced in package.json scripts**:
```bash
# Check package.json
grep "<filename>" package.json backend/package.json frontend/package.json
```

3. **Not used in Docker build**:
```bash
# Check Dockerfile
grep "<filename>" Dockerfile
```

4. **Not documented as required**:
```bash
# Check docs
grep -r "<filename>" docs/
```

---

## 📊 Cleanup Impact

### Before Cleanup:
- Root config files: ~15
- Scripts: ~30+
- Documentation: ~25+ MD files
- Total size: ~X MB

### After Cleanup (Estimated):
- Root config files: ~10 (33% reduction)
- Scripts: ~20 (33% reduction)
- Documentation: ~20 active + ~5 archived
- Total size reduction: ~X MB

### Benefits:
- ✅ Cleaner repository structure
- ✅ Less confusion for new developers
- ✅ Faster git operations
- ✅ Clear separation: active vs archived
- ✅ Better documentation (new comprehensive guides)

---

## ⚠️ Safety First

### Before Any Deletion:
1. **Commit current work**: `git add -A && git commit -m "Checkpoint"`
2. **Create backup branch**: `git checkout -b cleanup-backup`
3. **Return to main**: `git checkout main`
4. **Delete files**
5. **Test locally**: `docker build .` and run tests
6. **Push to Railway**: `git push`
7. **Run regression tests**: `./test-deployment.sh`
8. **If success**: Delete backup branch
9. **If failure**: `git reset --hard HEAD~1` and restore

### Rollback Plan:
```bash
# If cleanup breaks something:
git log --oneline -5  # Find commit before cleanup
git revert <commit-hash>

# Or hard reset (careful!):
git reset --hard <commit-before-cleanup>
git push --force origin main
```

---

## 🎯 Prioritized Cleanup Tasks

### HIGH Priority (Safe & Clear):
1. ✅ Remove `package.json.local`, `package-lock.json.local`
2. ✅ Remove `nixpacks.toml`
3. ✅ Remove `scripts/keepalive.js`

### MEDIUM Priority (Archive, Don't Delete):
4. 📦 Archive old workflow docs to `docs/archive/`
5. 📦 Review and cleanup Railway env vars

### LOW Priority (Requires Review):
6. 🤔 Review test-specific scripts (sync-event-*, sync-rider-*)
7. 🤔 Check if `ecosystem.config.js` used locally
8. 🤔 Review `RE_UPLOAD_SUMMARY.md` relevance

---

## 📝 Cleanup Log

Track cleanup progress:

| Date | Task | Files Removed | Commit | Status |
|------|------|---------------|--------|--------|
| 2025-11-06 | Phase 1 | nixpacks.toml, *.local | - | ⏳ Pending |
| ... | Phase 2 | Archived docs | - | ⏳ Pending |
| ... | Phase 3 | Test scripts | - | ⏳ Pending |
| ... | Phase 4 | Env vars | - | ⏳ Pending |

---

## ✅ Post-Cleanup Verification

After cleanup, verify:

```bash
# 1. Build succeeds
docker build -t test-clean .

# 2. Run regression tests
./test-deployment.sh

# 3. Check Railway deployment
git push origin main
# Wait for Railway build
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health

# 4. Verify no broken imports
cd backend && npx tsc --noEmit
cd ../frontend && npm run build
```

**All green? Cleanup successful! 🎉**

---

**Status**: 📋 Ready for execution  
**Estimated Time**: 30-60 minutes  
**Risk Level**: LOW (with backup strategy)  
**Next Step**: Execute Phase 1 (safe removals)
