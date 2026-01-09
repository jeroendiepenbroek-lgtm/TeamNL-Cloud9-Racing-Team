# Railway Deployment - Quick Reference

## 🚀 Quick Commands

```bash
# Setup (eenmalig)
./setup-railway.sh

# Handmatige deploy
railway up

# Logs bekijken
railway logs --follow

# Status checken
railway status

# Environment variables
railway variables
```

## 📋 GitHub Secrets Required

Ga naar: **GitHub → Settings → Secrets → Actions**

Voeg toe:
1. `RAILWAY_TOKEN` - Genereer in Railway Dashboard → Account Settings → Tokens
2. `RAILWAY_APP_URL` - Vind in Railway Dashboard (bijv. https://your-app.up.railway.app)

## ⚡ Automatische Deployment

Triggers:
- Push naar `main` branch
- Push naar `fresh-start-v4` branch
- Handmatig via GitHub Actions

## 🔍 Troubleshooting

### Deployment faalt?
```bash
# Check logs
railway logs

# Rebuild lokaal
docker build -t test-build .

# Test health check
curl https://your-app.up.railway.app/health
```

### Need to rollback?
```bash
railway rollback
```

## 📖 Volledige Documentatie

Zie [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) voor complete instructies.
