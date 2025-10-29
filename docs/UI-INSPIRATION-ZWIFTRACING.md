# 🎨 UI Inspiratie: ZwiftRacing.app Analysis

**Scan datum**: 29 oktober 2025  
**Doel**: Design inspiratie voor Rider Dashboard (US1, US2, US3)  
**Bron**: https://zwiftracing.app/riders/150437

---

## 📱 Rider Profile Overview

**URL**: `/riders/150437`

### **Header Section** (Hero area)
- **Avatar/Photo**: Rider profile image (large, circular)
- **Rider Name**: "JRøne | CloudRacer-9 @YouTube" (prominent, h1)
- **Flag**: Country flag icon (NL 🇳🇱)
- **Racing Category**: Badge/pill met category (B)
- **Verified Badge**: Optional verified icon

### **Key Stats Cards** (Top row - Horizontaal)
Visuele cards met icon + value + label:

1. **Race Rating Card**
   - 🏆 Current Rating: **1377** (groot, bold)
   - Max 90-day: 1472.8 (smaller, gray)
   - Trend indicator: ↑/↓ arrow + percentage

2. **Power Profile Card**
   - ⚡ FTP: **270w** (groot)
   - w/kg: **3.65** (smaller)
   - Category: B (badge)

3. **Racing Stats Card**
   - 🏁 Total Races: **25** (23 finishes + 2 DNFs)
   - Wins: X
   - Podiums: Y
   - Win rate: Z%

4. **Phenotype Card**
   - 🎯 Primary: **Sprinter** (96.5/100)
   - Visual bar chart van scores
   - Secondary types met scores

5. **Club Card**
   - 👥 Club: **TeamNL**
   - Members: 422
   - Link naar club page

### **Navigation Tabs** (Sub-menu onder header)
```
[Dashboard] [Results] [Races] [Stats] [Compare]
   ^^^^       ^^^^      ^^^^
   US1        US2       US3
```

---

## 📊 Dashboard Tab (US1 Mapping)

**URL**: `/riders/150437/dashboard`

### **Layout Structure**

#### **Section 1: Rating Trend Chart** (Full width)
- **Chart Type**: Line graph met gradient fill
- **Timeframe**: Last 90 days (default)
- **Filter Buttons**: [30d] [60d] [90d] [All Time]
- **Y-Axis**: Rating (1300-1500)
- **X-Axis**: Date
- **Features**:
  - Hover tooltip: Date + exact rating
  - Key events marked: Race results als dots op line
  - Color coding: Green (increase), Red (decrease)
  - Current rating indicator: Horizontal line + label

#### **Section 2: Recent Activity** (Left column, 60%)
- **Card title**: "Recent Races" of "Activity Timeline"
- **List items** (per race):
  ```
  [Date]  [Event Name]               [Position]  [Rating Δ]
  Oct 28  WTRL TTT - Route X          12/45      +15 ↑
  Oct 25  ZRL Race - Volcano Circuit  8/38       +8 ↑
  Oct 20  Community Race - Flat       DNF        -5 ↓
  ```
- **Click**: Navigeert naar event detail (US3)
- **Visual**: 
  - Position badge met color (Gold/Silver/Bronze voor top 3)
  - Rating delta met arrow + color

#### **Section 3: Performance Metrics** (Right column, 40%)
- **Card title**: "Performance Overview"
- **Metrics** (small stat boxes):
  - Avg Position: X / Y riders
  - Avg Power: Z watts
  - Avg Speed: A km/h
  - Consistency: B% (finish rate)

#### **Section 4: Phenotype Breakdown** (Full width)
- **Visual**: Horizontal bar chart
  ```
  Sprinter    [██████████████████████████] 96.5
  Time Trial  [███████████████           ] 75.0
  Climber     [██████████                ] 50.2
  All-Rounder [████████                  ] 40.1
  ```
- **Interactive**: Click bar → details

#### **Section 5: Upcoming Races** (Optional)
- **Card**: "Registered for upcoming events"
- **List**: Event name, date, time
- **Empty state**: "No upcoming races"

---

## 🏆 Results Tab (US2 Mapping)

**URL**: `/riders/150437/results`

### **Layout Structure**

#### **Filters & Search** (Top bar)
- **Date Range**: [Last 30 days ▼] [Last 90 days] [All Time]
- **Event Type**: [All ▼] [Race] [TTT] [Group Ride]
- **Route Filter**: [All Routes ▼]
- **Search**: "Search by event name..."
- **Sort**: [Date ▼] [Position] [Rating Change]

#### **Results Table** (Main content)
```
┌────────────┬──────────────────────────┬──────────┬────────┬──────────┬────────────┐
│ Date       │ Event Name               │ Route    │ Pos    │ Rating Δ │ Details    │
├────────────┼──────────────────────────┼──────────┼────────┼──────────┼────────────┤
│ 2025-10-28 │ WTRL TTT Championship    │ Volcano  │ 12/45  │ +15 ↑   │ [View →]   │
│ 2025-10-25 │ ZRL Team Race - Week 4   │ Flat     │ 8/38   │ +8 ↑    │ [View →]   │
│ 2025-10-20 │ Community Crit Race      │ London   │ DNF    │ -5 ↓    │ [View →]   │
│ 2025-10-15 │ Herd Racing Series R3    │ Alpe     │ 25/50  │ +2 ↑    │ [View →]   │
└────────────┴──────────────────────────┴──────────┴────────┴──────────┴────────────┘
```

**Table Features**:
- **Sticky header**: Header blijft fixed bij scrollen
- **Zebra striping**: Alternate row colors
- **Hover effect**: Row highlight op hover
- **Click action**: Click row → Navigate to event detail (US3)
- **Mobile responsive**: Stack columns op small screens

#### **Pagination** (Bottom)
```
[← Previous]  Page 1 of 3  [10 per page ▼]  [Next →]
```

#### **Summary Stats** (Sidebar or top)
- **Total Results**: 25
- **Date Range**: Oct 2024 - Oct 2025
- **Avg Position**: 15/40
- **Best Result**: 2nd place (Event X)

---

## 🏁 Event Detail Page (US3 Mapping)

**URL**: `/events/[eventId]` (from results click)

### **Header Section**
- **Event Name**: "WTRL TTT Championship - Week 8" (h1)
- **Event Date**: October 28, 2025, 20:00 UTC
- **Route**: Volcano Circuit (10 laps, 42.3 km)
- **Category**: B (1-3.9 w/kg)
- **Total Riders**: 45 finishers, 3 DNF

### **Your Result** (Highlighted Card - Top)
```
╔════════════════════════════════════════════════════════════╗
║  🎯 YOUR RESULT - JRøne | CloudRacer-9 @YouTube           ║
╠════════════════════════════════════════════════════════════╣
║  Position: 12 / 45                   Rating Change: +15 ↑ ║
║  Finish Time: 1:02:45                                      ║
║  Avg Power: 245w (3.31 w/kg)        Max Power: 450w       ║
║  Avg Speed: 40.5 km/h               Avg HR: 165 bpm       ║
║  Normalized Power: 258w             Work: 921 kJ          ║
╚════════════════════════════════════════════════════════════╝
```

**Visual Elements**:
- Border highlight (accent color)
- Sticky op scroll (blijft boven results table)
- Expand/collapse toggle voor extra stats

### **Full Results Table**
```
┌──────┬─────────────────────────────┬──────────┬────────────┬────────────┬─────────┐
│ Pos  │ Rider Name                  │ Team     │ Time       │ Avg Power  │ Rating  │
├──────┼─────────────────────────────┼──────────┼────────────┼────────────┼─────────┤
│ 🥇 1 │ John Smith                  │ TeamA    │ 1:00:12    │ 280w       │ 1450    │
│ 🥈 2 │ Jane Doe                    │ TeamB    │ 1:00:45    │ 275w       │ 1425    │
│ 🥉 3 │ Bob Johnson                 │ TeamC    │ 1:01:30    │ 268w       │ 1400    │
│ ...  │ ...                         │ ...      │ ...        │ ...        │ ...     │
│ ★ 12 │ JRøne | CloudRacer-9        │ TeamNL   │ 1:02:45    │ 245w       │ 1377    │
│      │         (YOU)               │          │            │            │         │
│ ...  │ ...                         │ ...      │ ...        │ ...        │ ...     │
│   45 │ Last Rider                  │ Solo     │ 1:15:20    │ 180w       │ 1100    │
├──────┴─────────────────────────────┴──────────┴────────────┴────────────┴─────────┤
│ DNF                                                                                │
│   3 riders did not finish                                                         │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**Table Features**:
- **Your row highlighted**: Background color + star icon
- **Medal icons**: Top 3 positions
- **Clickable rider names**: → Rider profile
- **Sortable columns**: Click header to sort
- **Context rows**: Show 3-5 riders voor en na jouw positie (collapsed anderen)
- **Expand button**: "Show all 45 riders" toggle

### **Event Stats** (Sidebar or bottom)
- **Fastest Lap**: Rider name, time
- **Avg Finish Time**: 1:05:30
- **Power Range**: 180w - 350w
- **Speed Range**: 35 - 45 km/h

### **Event Details** (Collapsible section)
- **Organizer**: WTRL
- **Event Type**: Team Time Trial
- **Registration**: Closed
- **Zwift Event ID**: 123456

---

## 🎨 Design Patterns Observed

### **Color Scheme**
- **Primary**: Dark blue/purple (#1a1f36)
- **Accent**: Orange/yellow (#ff6b35) voor CTAs
- **Success**: Green (#4caf50) voor positive deltas
- **Error**: Red (#f44336) voor negative deltas
- **Neutral**: Gray shades voor secondary info

### **Typography**
- **Headings**: Sans-serif, bold (Inter, Roboto, or similar)
- **Body**: Sans-serif, regular, 16px base
- **Stats**: Monospace voor numbers (better alignment)

### **Card Layout**
```css
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 16px;
  margin-bottom: 16px;
}
```

### **Responsive Breakpoints**
- Desktop: 1200px+ (multi-column)
- Tablet: 768px-1199px (2 columns)
- Mobile: <768px (single column, stacked)

### **Icons**
- **Library**: Font Awesome of Heroicons
- **Usage**: 
  - 🏆 Rating/ranking
  - ⚡ Power/FTP
  - 🏁 Racing/finishes
  - 👥 Team/club
  - 📊 Stats/charts
  - 🎯 Phenotype/category

### **Data Visualization**
- **Charts**: Line charts voor trends (Chart.js of Recharts)
- **Bars**: Horizontal bars voor phenotype scores
- **Badges**: Pills voor categories, positions
- **Sparklines**: Mini charts in table cells (optional)

---

## 🚀 Feature Priorities voor Ons Dashboard

### **MUST HAVE** (US1 + US2)
1. ✅ **Rider Header**: Name, avatar, flag, category badge
2. ✅ **Stats Cards**: Rating, FTP, Racing stats, Phenotype, Club
3. ✅ **Rating Trend Chart**: Line graph, 90 days, interactive
4. ✅ **Recent Results Table**: Date, event, position, rating delta
5. ✅ **Navigation**: Clear tabs/links tussen pages

### **NICE TO HAVE** (Later)
- 📊 Phenotype bar chart (visual breakdown)
- 🔍 Filters & search in results table
- 📱 Mobile-responsive design
- 🎨 Dark mode toggle
- 📈 Comparison met andere riders

### **SKIP** (Out of scope)
- ❌ Upcoming races (niet in roadmap)
- ❌ Social features (comments, likes)
- ❌ Live race tracking
- ❌ Video replays

---

## 📋 Implementation Notes

### **Data Mapping: ZwiftRacing.app → Ons Dashboard**

| ZwiftRacing Field | Our Database Field | API Endpoint |
|-------------------|-------------------|--------------|
| Rider Name | `riders.name` | `/api/riders/:id` |
| Racing Category | `riders.categoryRacing` | `/api/riders/:id` |
| FTP | `riders.ftp` | `/api/riders/:id` |
| w/kg | `riders.ftp / riders.weightKg` | Calculated |
| Current Rating | `rider_race_ratings.currentRating` | `/api/riders/:id` |
| Max 90 Rating | `rider_race_ratings.max90Rating` | `/api/riders/:id` |
| Total Finishes | `riders.totalFinishes` | `/api/riders/:id` |
| Phenotype | `rider_phenotypes.*` | `/api/riders/:id` |
| Club | `clubs.name` via `riders.clubId` | `/api/riders/:id` (include) |
| Recent Results | `race_results + events` JOIN | `/api/riders/:id/events?days=90` |
| Event Details | `events + race_results` | `/api/events/:id` |

### **Frontend Dependencies**
```json
{
  "chart.js": "^4.4.0",           // Rating trend chart
  "date-fns": "^2.30.0",          // Date formatting
  "heroicons": "^2.0.18"          // Icons (optional, can use Font Awesome)
}
```

**OR use CDN** (no build step):
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/date-fns@2.30.0/index.min.js"></script>
```

---

## 🎯 Next Steps

1. **Create wireframes** based on deze layouts
2. **Start met US1**: Implement basic rider profile page (no events yet)
3. **Prototype chart**: Test Chart.js integration
4. **Build results table**: Sortable, clickable rows
5. **Event detail page**: Full results met highlight

**Ready to start building!** 🚀
