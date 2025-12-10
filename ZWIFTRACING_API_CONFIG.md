# ZwiftRacing API Configuration

## API Base URL
```
https://zwift-ranking.herokuapp.com
```

## Authentication
```
Authorization: 650c6d2fc4ef6858d74cbef1
```

## Usage Example

### cURL
```bash
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  "https://zwift-ranking.herokuapp.com/public/riders/150437"
```

### JavaScript (axios)
```javascript
const API_BASE = 'https://zwift-ranking.herokuapp.com';
const API_KEY = '650c6d2fc4ef6858d74cbef1';

const response = await axios.get(
  `${API_BASE}/public/riders/150437`,
  {
    headers: { 'Authorization': API_KEY }
  }
);
```

### JavaScript (fetch)
```javascript
const response = await fetch(
  'https://zwift-ranking.herokuapp.com/public/riders/150437',
  {
    headers: { 'Authorization': '650c6d2fc4ef6858d74cbef1' }
  }
);
```

## Available Endpoints

### Individual Rider
```
GET /public/riders/{riderId}
Authorization: 650c6d2fc4ef6858d74cbef1
```

### Club Data (with all riders)
```
GET /public/clubs/{clubId}
Authorization: 650c6d2fc4ef6858d74cbef1
```

**TeamNL Cloud9 Club ID**: `11818`

## Rate Limits
- Individual rider: ~1 per 15 minutes
- Club endpoint: ~1 per 60 minutes
- Requires API key in Authorization header

## Test Data
- **Test Rider**: 150437 (Jeroen Diepenbroek / JRøne CloudRacer-9 @YT)
- **Test Club**: 11818 (TeamNL Cloud9) - 393 riders

## Data Retrieved (8 Dec 2024)
✅ 393 riders from club 11818 uploaded to Supabase
✅ Individual rider 150437 data uploaded
✅ All Racing Matrix views operational

## Notes
- API key must be included in every request
- Returns 401 Unauthorized if key is missing
- Backend hosted on Heroku
- Frontend: https://zwiftracing.app uses this API
