# Race Scanner Update - 2026-01-05

## Fixed: Events API Scanner

**Probleem**: Scanner gebruikte HTML scraping wat onbetrouwbaar was

**Oplossing**: Gebruik nu Events API direct:
- `/api/public/events` - paginated fetching van alle events
- Filter op time range (lookback period)
- Check elk event via Results API op team rider IDs
- Sla alleen events op waar team riders aan deelnemen

**Voordelen**:
- ✅ Veel sneller (geen HTML parsing)
- ✅ Betrouwbaarder (officiële API)
- ✅ Meer events coverage (niet gebonden aan rider pages)
- ✅ Rate limiting handling

## Deployment
Scanner draait elke 2 uur automatisch.
