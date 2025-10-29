# 🚀 Development Workflow - Quick Reference

## 📝 Daily Workflow

### Nieuwe Feature Starten

```bash
git checkout develop
git pull origin develop
git checkout -b feature/mijn-feature
```

### Lokaal Ontwikkelen

```bash
npm run dev                    # Start development server
npm test                       # Run tests
npm run lint                   # Check code style
```

### Feature Pushen naar Staging

```bash
git add .
git commit -m "feat: add mijn feature"
git push origin feature/mijn-feature
# → Create PR naar 'develop' op GitHub
# → Merge → Auto-deploy naar staging
```

### Testen op Staging

```bash
# Staging URL: https://teamnl-staging.up.railway.app
curl https://teamnl-staging.up.railway.app/api/health
```

### Deploy naar Production

```bash
# Als staging OK:
# → Create PR van 'develop' → 'main' op GitHub
# → Review & Merge → Auto-deploy naar production
```

---

## 🌳 Branch Overzicht

| Branch | Purpose | Deploy naar | Auto-sync |
|--------|---------|-------------|-----------|
| `main` | Production stable | Production | ✅ AAN |
| `develop` | Staging/testing | Staging | ❌ UIT |
| `feature/*` | New features | Lokaal | ❌ UIT |
| `hotfix/*` | Urgent fixes | Direct main | ✅ AAN |

---

## 🔗 URLs & Access

### Local Development
```bash
http://localhost:3000
http://localhost:3000/favorites-manager.html

# Database
./prisma/dev.db (SQLite)
npx prisma studio
```

### Staging
```bash
https://teamnl-staging.up.railway.app
https://teamnl-staging.up.railway.app/api/health

# Database (via Railway)
railway db:connect staging
```

### Production
```bash
https://teamnl-cloud9.up.railway.app
https://teamnl-cloud9.up.railway.app/api/health

# Database (via Railway)
railway db:connect production
```

---

## 🛠️ Useful Commands

### Development
```bash
npm run dev              # Start with hot reload
npm run dev:watch        # Alternative hot reload
npm test                 # Run tests
npm run lint             # Lint code
npm run build            # Build production
```

### Database
```bash
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Create migration
npx prisma generate      # Generate Prisma client
npm run db:seed          # Seed test data
```

### Git
```bash
git status               # Check status
git log --oneline        # View commits
git branch -a            # List all branches
git checkout develop     # Switch branch
git pull origin develop  # Update branch
git merge feature/x      # Merge branch
```

### Railway
```bash
railway login            # Login to Railway
railway logs             # View logs
railway open             # Open dashboard
railway run npm start    # Run command
railway db:connect       # Connect to database
```

---

## 🔧 Troubleshooting

### Build fails locally
```bash
rm -rf node_modules package-lock.json
npm install
npm run db:generate
npm run build
```

### Database migration issues
```bash
# Development: safe to reset
rm prisma/dev.db
npm run db:migrate

# Staging: reset via Railway
railway db:reset staging

# Production: NEVER reset, only migrate forward!
```

### Merge conflicts
```bash
git checkout develop
git pull origin develop
git checkout feature/my-feature
git merge develop
# Resolve conflicts in VS Code
git add .
git commit -m "fix: resolve merge conflicts"
```

### Deployment stuck
```bash
# Check GitHub Actions
# → https://github.com/user/repo/actions

# Check Railway deployment
railway open
# → Deployments tab

# Rollback if needed
# Railway dashboard → Select previous deployment → Rollback
```

---

## 📋 Checklist voor PR

- [ ] Code werkt lokaal (geen errors)
- [ ] Tests draaien groen
- [ ] Lint errors opgelost
- [ ] Commit messages duidelijk
- [ ] Branch up-to-date met develop
- [ ] PR description invullen
- [ ] Screenshots/demo (indien UI changes)
- [ ] Breaking changes gedocumenteerd

---

## 🚨 Emergency Procedures

### Critical bug in production
```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# Fix bug
git commit -m "fix: critical bug description"
git push origin hotfix/critical-bug

# PR direct naar main (skip develop)
# Fast-track review & merge
```

### Rollback production
```bash
# Via Railway dashboard:
# 1. Go to Deployments
# 2. Find last working deployment
# 3. Click "Redeploy"

# Via git:
git revert HEAD
git push origin main
```

### Database emergency
```bash
# NEVER directly edit production database!
# Always via Prisma migrations

# If absolutely necessary:
railway db:backup production
# Make changes via Prisma Studio
# Test on staging first!
```

---

## 💡 Tips & Best Practices

✅ **DO:**
- Commit vaak (kleine, logische commits)
- Pull develop voor nieuwe feature branches
- Test lokaal voor pushen
- Code review voor merge naar develop
- Use staging voor acceptance testing
- Keep commits atomic en beschrijvend

❌ **DON'T:**
- Direct committen op main
- Force push naar shared branches
- Skip testing op staging
- Merge zonder review
- Commit debug code / console.logs
- Hardcode secrets in code

---

## 📞 Help & Support

- **Documentation**: `docs/DEV-PROD-WORKFLOW.md`
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **API Docs**: `docs/API.md`
- **Issues**: GitHub Issues tab
- **Questions**: Ask in team channel

---

**Last updated**: 2025-10-29
**Maintained by**: TeamNL Cloud9 Development Team
