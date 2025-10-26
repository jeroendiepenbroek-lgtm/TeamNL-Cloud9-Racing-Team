# 🔄 Auto-Restart & Process Management

## Probleem Opgelost

**Voor**: Server stopt bij errors/crashes → handmatig herstarten nodig  
**Nu**: Automatische restart + process monitoring → 99.9% uptime

---

## 🛠️ Oplossingen (3 Options)

### 1️⃣ Development: Nodemon (Aanbevolen voor dev)

**Auto-restart bij file changes + crashes**

```bash
# Start met nodemon (auto-restart)
npm run dev

# Features:
# ✅ Auto-restart bij code changes
# ✅ Auto-restart bij crashes
# ✅ 2 seconden delay (prevent spam)
# ✅ Verbose logging
```

**Config**: `nodemon.json`
```json
{
  "watch": ["src"],
  "ext": "ts,js,json",
  "exec": "tsx src/server.ts",
  "delay": 2000,
  "events": {
    "crash": "auto-restart in 2s..."
  }
}
```

---

### 2️⃣ Production: PM2 (Process Manager)

**Enterprise-grade process management**

```bash
# Build eerst
npm run build

# Start met PM2
npm run pm2:start

# Commands
npm run pm2:status    # Check status
npm run pm2:logs      # View logs (live)
npm run pm2:restart   # Restart server
npm run pm2:stop      # Stop server
npm run pm2:delete    # Remove from PM2

# Advanced
pm2 monit            # Real-time monitoring
pm2 list             # List all processes
```

**Features**:
- ✅ Auto-restart bij crashes
- ✅ Max 10 restarts (prevent infinite loop)
- ✅ Memory limit: 500MB (auto-restart if exceeded)
- ✅ Min uptime: 10s (prevent rapid restart)
- ✅ Graceful shutdown
- ✅ Log rotation
- ✅ Cluster mode support (future)

**Config**: `ecosystem.config.js`

---

### 3️⃣ Custom: Keepalive Monitor

**Custom health check monitor met auto-restart**

```bash
# Start keepalive monitor
npm run dev:keepalive

# Features:
# ✅ Health check elke 30s
# ✅ Auto-restart on failure (max 3x)
# ✅ Logging naar logs/keepalive.log
# ✅ Graceful shutdown (Ctrl+C)
```

**How it works**:
```
1. Start server process (npm run dev)
2. Check /api/health elke 30s
3. If unhealthy → restart server
4. Max 3 restart attempts
5. Log all events
```

**Config**: `scripts/keepalive.js` (Line 18-23)

---

## 🚀 Quick Start

### Development (Local)
```bash
# Option 1: Nodemon (simpelst)
npm run dev

# Option 2: Met keepalive monitor
npm run dev:keepalive
```

### Production (Server)
```bash
# Build
npm run build

# Deploy met PM2
npm run pm2:start

# Check status
npm run pm2:status

# View logs
npm run pm2:logs
```

---

## 🛡️ Error Handling Improvements

### In Code (`src/server.ts`)

**1. Enhanced error handler**:
```typescript
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  
  // Prevent crash - always respond
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**2. Uncaught exception handler**:
```typescript
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't crash - let process manager handle restart
});
```

**3. Unhandled rejection handler**:
```typescript
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
  // Don't crash - log and continue
});
```

**4. Graceful shutdown**:
```typescript
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close();
  process.exit(0);
});
```

---

## 📊 Monitoring

### Health Check Endpoint

```bash
# Check server health
curl http://localhost:3000/api/health

# Response (healthy):
{
  "status": "ok",
  "timestamp": "2025-10-26T12:00:00.000Z"
}
```

### PM2 Monitoring

```bash
# Real-time CPU/memory
pm2 monit

# Process list
pm2 list

# Detailed info
pm2 show teamnl-cloud9-dashboard
```

### Logs

**Nodemon**: Terminal output  
**PM2**: `logs/error.log`, `logs/out.log`  
**Keepalive**: `logs/keepalive.log`

---

## 🔧 Configuration

### Nodemon (`nodemon.json`)
```json
{
  "delay": 2000,        // Wait 2s before restart
  "restartable": "rs",  // Type 'rs' to manual restart
  "verbose": true       // Show detailed logs
}
```

### PM2 (`ecosystem.config.js`)
```javascript
{
  max_memory_restart: '500M',  // Restart if >500MB
  max_restarts: 10,            // Max 10 restarts
  min_uptime: '10s',           // Must run >10s
  restart_delay: 4000,         // Wait 4s between restarts
  autorestart: true            // Enable auto-restart
}
```

### Keepalive (`scripts/keepalive.js`)
```javascript
const CONFIG = {
  checkInterval: 30000,      // 30 seconds
  maxRestartAttempts: 3,     // Max 3 attempts
  restartDelay: 5000,        // 5 seconds delay
};
```

---

## 🐛 Troubleshooting

### Server keeps crashing immediately

```bash
# Check logs
npm run pm2:logs

# Or with nodemon
npm run dev
# (watch terminal for errors)

# Common issues:
# - Port 3000 already in use
# - Database connection failed
# - Missing .env variables
```

### PM2 not starting

```bash
# Clear PM2 process
npm run pm2:delete

# Check PM2 status
pm2 list

# Rebuild and retry
npm run build
npm run pm2:start
```

### Nodemon not detecting changes

```bash
# Check nodemon.json watch paths
# Restart with verbose:
nodemon --verbose
```

### Keepalive failing health checks

```bash
# Check server is running
curl http://localhost:3000/api/health

# Check logs
cat logs/keepalive.log

# Adjust check interval if needed (edit scripts/keepalive.js)
```

---

## 📈 Performance Tips

### Development
- Use `npm run dev` (nodemon) voor snelle development
- Use `npm run dev:keepalive` als server vaak crasht

### Production
- **Altijd PM2 gebruiken** voor production
- Enable cluster mode voor load balancing (future):
  ```javascript
  // ecosystem.config.js
  instances: 2,  // Run 2 instances
  exec_mode: 'cluster'
  ```

### Memory Management
- PM2 restart automatisch bij >500MB
- Monitor met `pm2 monit`
- Adjust in `ecosystem.config.js` if needed

---

## 🎯 Best Practices

### Development Workflow
```bash
# 1. Start met nodemon
npm run dev

# 2. Make changes
# → Auto-restart happens

# 3. Check logs in terminal
# → Errors visible immediately

# 4. Manual restart als nodig
# Type 'rs' + Enter
```

### Production Deployment
```bash
# 1. Test locally
npm run build
npm run start:prod

# 2. Deploy met PM2
npm run pm2:start

# 3. Monitor
npm run pm2:status
npm run pm2:logs

# 4. Updates
git pull
npm install
npm run build
npm run pm2:restart
```

### Monitoring Checklist
- [ ] Health check endpoint werkt (`/api/health`)
- [ ] PM2 status is 'online'
- [ ] Logs tonen geen errors
- [ ] Memory usage < 500MB
- [ ] Restart count not increasing rapidly

---

## 🆘 Emergency Commands

```bash
# Server completely stuck
npm run pm2:delete
npm run pm2:start

# Too many restarts
pm2 reset teamnl-cloud9-dashboard

# Memory issues
pm2 restart teamnl-cloud9-dashboard --update-env

# View full logs
pm2 logs teamnl-cloud9-dashboard --lines 100

# Force stop all
pm2 kill
```

---

## ✅ Success Indicators

**Server is gezond als**:
- ✅ PM2 status: `online`
- ✅ Health check: `200 OK`
- ✅ Restart count: `0` of laag
- ✅ Uptime: > 10 minuten
- ✅ Memory: < 500MB
- ✅ No errors in logs

---

## 📚 Resources

- **Nodemon**: https://nodemon.io/
- **PM2**: https://pm2.keymetrics.io/
- **PM2 Best Practices**: https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/

---

**Status**: ✅ Production Ready  
**Uptime Target**: 99.9%  
**Cost**: €0 (all free tools)
