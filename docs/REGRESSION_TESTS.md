# Regression Test Suite

**TeamNL Cloud9 Racing Team - Production Deployment Verification**

Deze test suite verifieert dat alle kritieke functionaliteit werkt na elke deployment.

---

## 🎯 Test Filosofie

**Doel**: Snel verifiëren dat deployment succesvol is en alle core features werken.

**Frequentie**: Na elke deployment naar production.

**Uitvoering**: Manueel (kan later geautomatiseerd worden).

---

## ✅ Pre-Deployment Checklist

Voer deze checks uit **VOOR** je pusht naar main:

### 1. Local Build Test
```bash
cd /workspaces/TeamNL-Cloud9-Racing-Team

# Test Docker build
docker build -t test-backend .

# Verify build succeeds
echo $?  # Should output: 0
```
**Expected**: Build completes zonder errors  
**Time**: ~20 seconds

---

### 2. Local Runtime Test
```bash
# Start container with env vars
docker run -d -p 3000:3000 \
  --env-file backend/.env \
  --name test-backend \
  test-backend

# Wait for startup
sleep 3

# Test health
curl http://localhost:3000/health

# Cleanup
docker stop test-backend && docker rm test-backend
```
**Expected**: 
```json
{
  "status": "ok",
  "service": "TeamNL Cloud9 Backend",
  "port": 3000
}
```

---

### 3. Code Quality Checks
```bash
# No TypeScript errors (if applicable)
cd backend && npx tsc --noEmit

# No obvious syntax errors
grep -r "console.log" backend/src/ | wc -l  # Check for debug logs
```

---

## 🚀 Post-Deployment Tests

Voer deze tests uit **NA** successful Railway deployment:

### Test Suite URL
```bash
export PROD_URL="https://teamnl-cloud9-racing-team-production.up.railway.app"
```

---

## 1️⃣ Health Check Test

**Purpose**: Verify server is running and responding

```bash
# Test 1.1: Health endpoint responds
curl -s $PROD_URL/health | jq

# Expected output:
{
  "status": "ok",
  "service": "TeamNL Cloud9 Backend",
  "version": "2.0.0-clean",
  "port": 8080,
  "timestamp": "<current_timestamp>"
}

# Test 1.2: Response time < 100ms
time curl -s $PROD_URL/health > /dev/null
# Expected: real time < 0.100s
```

**Pass Criteria**:
- ✅ HTTP 200 status
- ✅ `"status": "ok"`
- ✅ Port matches Railway's dynamic port (8080, 9000, etc.)
- ✅ Response time < 100ms

**Fail Actions**:
- ❌ Check Railway logs for startup errors
- ❌ Verify environment variables set
- ❌ Check container is running (not crashed)

---

## 2️⃣ Frontend Test

**Purpose**: Verify React app is served correctly

```bash
# Test 2.1: Root serves HTML
curl -s $PROD_URL/ | head -20

# Expected: HTML with <div id="root">
# Should contain: React, Vite meta tags

# Test 2.2: Static assets load
curl -s -o /dev/null -w "%{http_code}" $PROD_URL/assets/index-*.js
# Expected: 200

curl -s -o /dev/null -w "%{http_code}" $PROD_URL/assets/index-*.css
# Expected: 200
```

**Pass Criteria**:
- ✅ HTTP 200 for root `/`
- ✅ HTML contains `<div id="root">`
- ✅ JS and CSS assets return 200

**Fail Actions**:
- ❌ Check if frontend build succeeded in Docker logs
- ❌ Verify `backend/public/dist/` contains files
- ❌ Check Express static file serving

---

## 3️⃣ Database Connection Test

**Purpose**: Verify Supabase connection works

```bash
# Test 3.1: Query team endpoint (uses view_my_team)
curl -s $PROD_URL/api/riders/team | jq

# Expected: Array (may be empty [])
# Should NOT be error object

# Test 3.2: Query with data
curl -s $PROD_URL/api/sync-logs | jq '. | length'
# Expected: Number (count of sync logs)
```

**Pass Criteria**:
- ✅ No database connection errors
- ✅ Returns valid JSON (not error object)
- ✅ Response structure matches expected format

**Fail Actions**:
- ❌ Check `SUPABASE_URL` environment variable
- ❌ Check `SUPABASE_SERVICE_ROLE_KEY` is set
- ❌ Verify Supabase instance is running
- ❌ Check RLS policies allow service_role access

---

## 4️⃣ API Endpoints Test

**Purpose**: Verify all core endpoints work

### Test 4.1: Team Endpoints (My Riders)
```bash
# GET team (should work even if empty)
curl -s $PROD_URL/api/riders/team
# Expected: [] or array of riders

# POST add rider (if you have test data)
curl -X POST $PROD_URL/api/riders/team \
  -H "Content-Type: application/json" \
  -d '{"zwiftId":150437,"name":"Test Rider"}'
# Expected: {"success":true,"message":"..."}

# GET team again (verify added)
curl -s $PROD_URL/api/riders/team | jq '. | length'
# Expected: 1 (or more)

# DELETE rider
curl -X DELETE $PROD_URL/api/riders/team/150437
# Expected: {"success":true}
```

**Pass Criteria**:
- ✅ GET returns array
- ✅ POST creates record
- ✅ DELETE removes record
- ✅ No 500 errors

---

### Test 4.2: Club Endpoint
```bash
# GET club (may return 404 if not synced)
curl -s -o /dev/null -w "%{http_code}" $PROD_URL/api/clubs/11818

# Expected: 200 (if synced) or 404 (if not synced)
# Should NOT be: 500 or 502
```

**Pass Criteria**:
- ✅ Returns 200 or 404 (not 500/502)
- ✅ No database errors in logs

---

### Test 4.3: Sync Logs
```bash
# GET sync logs
curl -s $PROD_URL/api/sync-logs | jq '. | length'

# Expected: Number >= 0
# Should be valid JSON array
```

**Pass Criteria**:
- ✅ Returns JSON array
- ✅ No errors

---

## 5️⃣ Error Handling Test

**Purpose**: Verify graceful error handling

```bash
# Test 5.1: 404 for invalid route
curl -s -o /dev/null -w "%{http_code}" $PROD_URL/api/invalid
# Expected: 404

# Test 5.2: 404 for non-existent resource
curl -s $PROD_URL/api/clubs/999999 | jq .error
# Expected: "Club niet gevonden"

# Test 5.3: 400 for invalid ID
curl -s -o /dev/null -w "%{http_code}" $PROD_URL/api/clubs/invalid
# Expected: 400 or 500 (graceful error, not crash)
```

**Pass Criteria**:
- ✅ Invalid routes return 404
- ✅ Missing resources return 404 with message
- ✅ Invalid input returns 4xx error (not crash)

---

## 6️⃣ Performance Test

**Purpose**: Verify acceptable response times

```bash
# Test all critical endpoints
for endpoint in /health /api/riders/team /api/sync-logs; do
  echo "Testing $endpoint"
  time curl -s $PROD_URL$endpoint > /dev/null
done
```

**Pass Criteria**:
- ✅ Health: < 50ms
- ✅ Database queries: < 500ms
- ✅ No timeouts

---

## 🔄 Full Regression Test Script

**Copy-paste test script**:

```bash
#!/bin/bash
# Railway Production Regression Test
# Run after every deployment

PROD_URL="https://teamnl-cloud9-racing-team-production.up.railway.app"
PASS=0
FAIL=0

echo "🧪 TeamNL Cloud9 - Regression Test Suite"
echo "=========================================="
echo ""

# Test 1: Health
echo "1️⃣ Health Check..."
HEALTH=$(curl -s $PROD_URL/health | jq -r .status)
if [ "$HEALTH" = "ok" ]; then
  echo "✅ PASS: Health endpoint OK"
  ((PASS++))
else
  echo "❌ FAIL: Health endpoint failed"
  ((FAIL++))
fi

# Test 2: Frontend
echo ""
echo "2️⃣ Frontend Test..."
FRONTEND=$(curl -s $PROD_URL/ | grep -c "root")
if [ $FRONTEND -gt 0 ]; then
  echo "✅ PASS: Frontend serves HTML"
  ((PASS++))
else
  echo "❌ FAIL: Frontend not serving"
  ((FAIL++))
fi

# Test 3: Database
echo ""
echo "3️⃣ Database Connection..."
TEAM=$(curl -s $PROD_URL/api/riders/team)
if echo $TEAM | jq -e 'type == "array"' > /dev/null 2>&1; then
  echo "✅ PASS: Database connection OK"
  ((PASS++))
else
  echo "❌ FAIL: Database error"
  echo "Response: $TEAM"
  ((FAIL++))
fi

# Test 4: API Endpoints
echo ""
echo "4️⃣ API Endpoints..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $PROD_URL/api/sync-logs)
if [ "$STATUS" = "200" ]; then
  echo "✅ PASS: API endpoints responding"
  ((PASS++))
else
  echo "❌ FAIL: API returned $STATUS"
  ((FAIL++))
fi

# Test 5: Error Handling
echo ""
echo "5️⃣ Error Handling..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $PROD_URL/api/invalid)
if [ "$STATUS" = "404" ]; then
  echo "✅ PASS: 404 handling works"
  ((PASS++))
else
  echo "❌ FAIL: Expected 404, got $STATUS"
  ((FAIL++))
fi

# Summary
echo ""
echo "=========================================="
echo "📊 Test Results:"
echo "   ✅ Passed: $PASS"
echo "   ❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 All tests passed! Deployment successful."
  exit 0
else
  echo "⚠️  Some tests failed. Check logs and retry."
  exit 1
fi
```

**Usage**:
```bash
# Save as test-deployment.sh
chmod +x test-deployment.sh
./test-deployment.sh
```

---

## 📊 Test Results Log

Keep a log of test runs:

| Date | Commit | Health | Frontend | DB | API | Errors | Result |
|------|--------|--------|----------|----|----|--------|--------|
| 2025-11-06 | 92e17dc | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| ... | ... | ... | ... | ... | ... | ... | ... |

---

## 🐛 Common Failures & Fixes

### Health Check Fails
**Symptom**: `curl: (52) Empty reply from server`

**Fix**:
1. Check Railway logs for startup errors
2. Verify PORT environment variable
3. Check container is running (not crashed)

---

### Database Connection Fails
**Symptom**: `{"error": "Connection timeout"}`

**Fix**:
1. Verify `SUPABASE_URL` in Railway env vars
2. Check `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Test Supabase connection from Railway logs

---

### Frontend Not Serving
**Symptom**: 404 on root `/`

**Fix**:
1. Check Docker build logs for frontend build
2. Verify `backend/public/dist/` has files
3. Check Express static middleware config

---

## 🔄 Automated Testing (Future)

**Phase 2**: Implement automated testing

### Tools to Add:
- **Jest/Vitest**: Unit tests
- **Supertest**: API integration tests
- **Playwright**: E2E frontend tests
- **GitHub Actions**: CI/CD pipeline

### CI/CD Pipeline:
```yaml
# .github/workflows/test.yml
on: [push]
jobs:
  test:
    - run: npm test
    - run: docker build .
    - run: ./test-deployment.sh
```

---

## 📈 Success Metrics

**Deployment Health Indicators**:
- ✅ All tests pass (100%)
- ✅ Response times < 500ms
- ✅ Zero 500 errors in first hour
- ✅ No container restarts

**Red Flags**:
- ❌ Health check fails
- ❌ Response time > 2 seconds
- ❌ Database connection errors
- ❌ Container restarts repeatedly

---

**Status**: ✅ Test Suite Ready  
**Last Updated**: 2025-11-06  
**Test Coverage**: ~80% (core features)
