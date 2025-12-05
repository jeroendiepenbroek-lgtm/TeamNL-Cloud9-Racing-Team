# Copilot Instructions - TeamNL Cloud9 Racing Team

## Project Overview
Dashboard applicatie voor TeamNL Cloud9 racing team met ZwiftRacing.app API integratie. Backend-first architectuur met modulaire, type-safe TypeScript implementatie.

**Status**: Backend volledig geïmplementeerd, frontend volgt nog.

## Tech Stack

### Backend (Geïmplementeerd)
- **Runtime**: Node.js + TypeScript (ES Modules)
- **Framework**: Express.js voor REST API
- **Database**: Prisma ORM met SQLite (dev) / PostgreSQL (prod-ready)
- **API Client**: Axios met rate limiting
- **Validation**: Zod schemas
- **Scheduling**: node-cron voor automatische sync
- **Logging**: Custom logger met kleuren en timestamps

### Frontend (Te implementeren)
- Next.js 14 of React + Vite gepland

## Architectuur Principes

### 1. Modulaire Opbouw
Strikte scheiding tussen lagen:
```
API Layer (src/api/)           → External API communicatie
Service Layer (src/services/)  → Business logic & orchestration  
Repository Layer (src/database/) → Data access via Prisma
Utils (src/utils/)             → Gedeelde utilities
Types (src/types/)             → Type definities & validatie
```

### 2. Repository Pattern
Database toegang **alleen** via repositories (`src/database/repositories.ts`):
- `RiderRepository` - CRUD voor riders
- `ClubRepository` - Club data management
- `ResultRepository` - Race results
- `SyncLogRepository` - Sync monitoring

**Voorbeeld**:
```typescript
// ✅ Correct - gebruik repository
const rider = await riderRepo.getRider(zwiftId);

// ❌ Fout - direct Prisma gebruik vermijden buiten repositories
const rider = await prisma.rider.findUnique(...);
```

### 3. Type Safety met Zod
Alle API responses worden gevalideerd met Zod schemas (`src/types/api.types.ts`):
```typescript
const RiderSchema = z.object({
  riderId: z.number(),
  name: z.string(),
  // ...
});
```

### 4. Rate Limiting
ZwiftRacing.app API heeft strikte limits:
- Club sync: 1/60min
- Individual riders: 5/min  
- Bulk riders: 1/15min
- Results: 1/min

Alle calls via `ZwiftApiClient` die axios-rate-limit gebruikt. **Nooit direct fetch/axios gebruiken voor externe API**.

## Development Workflow

### Setup Commands
```bash
npm install              # Installeer dependencies
npm run db:generate      # Genereer Prisma client
npm run db:migrate       # Run database migrations
npm run dev              # Start dev server (tsx watch)
npm run sync             # Handmatige data sync
```

### Database Workflow
1. Wijzig `prisma/schema.prisma`
2. Run `npm run db:migrate` → creëert migratie
3. Prisma client wordt automatisch geregenereerd
4. Import types: `import { Rider } from '@prisma/client'`

### Adding New Endpoints
1. Voeg repository method toe (`src/database/repositories.ts`)
2. Voeg route toe in `src/api/routes.ts` met `asyncHandler`
3. Update `docs/API.md` met documentatie
4. Test met `curl` of Postman

## Code Conventies

### Nederlandstalig
- **UI teksten**: Nederlands
- **Logs & errors**: Nederlands  
- **Comments**: Nederlands voor domein logic
- **Code**: Engelse namen (variables, functions) zijn OK

**Voorbeeld**:
```typescript
// Haal alle actieve club members op
async getClubRiders(clubId: number) {
  return await prisma.rider.findMany({
    where: { clubId, isActive: true },
  });
}
```

### Error Handling
Gebruik custom errors (`src/types/errors.ts`):
```typescript
throw new ZwiftApiError('Fout bij ophalen data', 500, '/public/riders');
throw new RateLimitError('/public/clubs/11818');
throw new ValidationError('Ongeldige rider ID', { id: -1 });
```

### Async Patterns
Gebruik async/await consistent:
```typescript
// ✅ Correct
const riders = await syncService.syncClubMembers();
logger.info('Sync voltooid');

// ❌ Fout - vermijd .then()
syncService.syncClubMembers().then(riders => {...});
```

### Logging
Gebruik structured logger (`src/utils/logger.ts`):
```typescript
logger.info('Start sync', { clubId: 11818 });
logger.debug('Processing batch', { count: 50 }); // Alleen in dev
logger.warn('Rate limit bijna bereikt', { remaining: 1 });
logger.error('Sync gefaald', error);
```

## Belangrijke Bestanden

### Configuration
- `.env` - Environment variabelen (niet committen!)
- `src/utils/config.ts` - Config loader met validatie

### Database
- `prisma/schema.prisma` - Database schema (single source of truth)
- `src/database/client.ts` - Prisma singleton
- `src/database/repositories.ts` - All data access

### API
- `src/api/zwift-client.ts` - External API client (rate limited)
- `src/api/routes.ts` - Express endpoints
- `src/server.ts` - Server entry point + cron scheduler

### Services
- `src/services/sync.ts` - Data synchronization orchestration

## Data Sync Strategie

### Automatisch (Cron)
- Draait elke 60 min (configureerbaar via `SYNC_INTERVAL_MINUTES`)
- Alleen club members sync (1 API call)
- Logs naar database via `SyncLogRepository`

### Handmatig
- Via API: `POST /api/sync/club`
- Via CLI: `npm run sync`
- Voor event results: `POST /api/sync/event/:eventId`

### Best Practices
1. **Check laatste sync** voor re-syncing: `getLastSuccessfulSync()`
2. **Batch processing** voor grote datasets (50 items per batch)
3. **Error recovery** - log errors maar continue met volgende items
4. **Historical snapshots** - save rider history voor trends

## Common Tasks

### Nieuwe API Endpoint Toevoegen
```typescript
// In src/api/zwift-client.ts
async getNewData() {
  const response = await this.client.get('/public/new-endpoint');
  return NewDataSchema.parse(response.data);
}
```

### Nieuwe Database Entity
1. Add model in `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Create repository in `src/database/repositories.ts`
4. Add service methods in relevant service

### Database Query Optimalisatie
Gebruik Prisma's `include` en `select`:
```typescript
// ✅ Efficient - alleen benodigde velden
const riders = await prisma.rider.findMany({
  select: { id: true, name: true, ranking: true },
  where: { clubId },
  take: 20,
});

// ✅ Met relaties
const rider = await prisma.rider.findUnique({
  where: { zwiftId },
  include: { 
    club: true,
    raceResults: { take: 5, orderBy: { eventDate: 'desc' } }
  },
});
```

## Testing Strategy
- Unit tests met Vitest (nog te implementeren)
- API tests met supertest (nog te implementeren)
- Database tests met in-memory SQLite

## Deployment Checklist
1. Switch naar PostgreSQL: update `DATABASE_URL` in `.env`
2. Run migrations: `npm run db:migrate`
3. Build: `npm run build`
4. Start: `npm start`
5. Verify: Check `/api/health` endpoint
6. Monitor: Check `/api/sync/logs` voor sync status

## Troubleshooting

### Rate Limit Errors
```
RateLimitError: Rate limit bereikt voor endpoint: /public/clubs/11818
```
**Oplossing**: Wacht minimaal 60 min tussen club syncs. Check sync logs met `/api/sync/logs`.

### Database Lock (SQLite)
```
SqliteError: database is locked
```
**Oplossing**: 
1. Sluit Prisma Studio (`npm run db:studio`)
2. Of switch naar PostgreSQL voor concurrency

### Prisma Client Out of Sync
```
PrismaClientValidationError: Unknown field
```
**Oplossing**: Run `npm run db:generate` na schema wijzigingen.

## Resources
- [Prisma Docs](https://www.prisma.io/docs)
- [ZwiftRacing API](https://zwift-ranking.herokuapp.com) 
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- Project API docs: `docs/API.md`

