# Sync Fix Samenvatting

## Problemen Geïdentificeerd

1. **Deprecated API**: `getRiderUpcomingEvents()` werkt niet betrouwbaar
2. **Event Sync Logic**: Oude code scande per rider (inefficiënt + deprecated)
3. **Database Schema**: sync_logs tabel mist 'details' kolom (niet kritiek)

## Oplossing

Gebruik `getEvents48Hours()` voor alle event syncs:
- Haalt ALLE events op (1x API call)
- Filtert op near/far threshold
- Veel efficiënter dan per-rider scanning

## Next Steps

1. Herschrijf syncNearEvents() om getEvents48Hours() te gebruiken
2. Herschrijf syncFarEvents() met zelfde pattern
3. Verwijder getRiderUpcomingEvents() calls
4. Test sync failures opnieuw
