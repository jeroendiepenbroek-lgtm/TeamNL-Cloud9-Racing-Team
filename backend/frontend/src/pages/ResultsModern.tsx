/**
 * Feature: Results Dashboard - STATE-OF-THE-ART UI/UX
 * US1: Team Recent Results met power curves en vELO tracking
 */

import { useEffect, useState } from 'react';
import { 
  Trophy, TrendingUp, TrendingDown, Minus, Calendar, MapPin,
  Zap, Award, Clock, Users, ChevronDown, ChevronUp, UserCheck2
} from 'lucide-react';

// vELO Rating tiers - Matrix style (zoals RacingDataMatrixModern)
const VELO_TIERS = [
  { rank: 1, name: 'Diamond', min: 2200, color: 'from-cyan-400 to-blue-500', textColor: 'text-white' },
  { rank: 2, name: 'Ruby', min: 1900, max: 2200, color: 'from-red-500 to-pink-600', textColor: 'text-white' },
  { rank: 3, name: 'Emerald', min: 1650, max: 1900, color: 'from-emerald-400 to-green-600', textColor: 'text-white' },
  { rank: 4, name: 'Sapphire', min: 1450, max: 1650, color: 'from-blue-400 to-indigo-600', textColor: 'text-white' },
  { rank: 5, name: 'Amethyst', min: 1300, max: 1450, color: 'from-purple-400 to-violet-600', textColor: 'text-white' },
  { rank: 6, name: 'Platinum', min: 1150, max: 1300, color: 'from-slate-300 to-slate-500', textColor: 'text-white' },
  { rank: 7, name: 'Gold', min: 1000, max: 1150, color: 'from-yellow-400 to-amber-600', textColor: 'text-yellow-900' },
  { rank: 8, name: 'Silver', min: 850, max: 1000, color: 'from-gray-300 to-gray-500', textColor: 'text-gray-700' },
  { rank: 9, name: 'Bronze', min: 650, max: 850, color: 'from-orange-400 to-orange-700', textColor: 'text-orange-900' },
  { rank: 10, name: 'Copper', min: 0, max: 650, color: 'from-orange-600 to-red-800', textColor: 'text-white' },
];

// Helper: Bepaal vELO tier op basis van rating
const getVeloTier = (rating: number | null) => {
  if (!rating) return null;
  return VELO_TIERS.find(tier => 
    rating >= tier.min && (!tier.max || rating < tier.max)
  );
};

// US2: PEN kleuren zoals ZP Categories (A=rood, B=groen, C=blauw, D=geel, E=paars)
const PEN_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  'A': { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300', label: 'A' },
  'B': { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300', label: 'B' },
  'C': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', label: 'C' },
  'D': { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300', label: 'D' },
  'E': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', label: 'E' },
};

interface RaceResult {
  rider_id: number;
  rider_name: string;
  rank: number;
  time_seconds: number;
  avg_wkg: number;
  pen: string | null;  // US1: PEN per result
  velo_rating: number | null;
  velo_previous: number | null;  // US2: Voor delta berekening
  velo_change: number | null;
  power_5s: number | null;
  power_15s: number | null;
  power_30s: number | null;
  power_1m: number | null;
  power_2m: number | null;
  power_5m: number | null;
  power_20m: number | null;
  effort_score: number | null;
  race_points: number | null;
  delta_winner_seconds: number | null;  // US5: Delta tijd
}

interface EventResult {
  event_id: string | number;
  event_name: string;
  event_date: string;
  pen: string | null;
  total_riders: number | null;
  // US6: Route details (zoals Event Cards)
  event_type?: string;
  sub_type?: string;
  route_world?: string;
  route_name?: string;
  route_profile?: string;
  distance_km?: string;
  elevation_m?: number;
  laps?: number;
  results: RaceResult[];
}

interface ApiResponse {
  success: boolean;
  count: number;
  events_count: number;
  limit: number;
  days: number;
  events: EventResult[];
}

// Format tijd in MM:SS formaat
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// US5: Format delta tijd t.o.v. winnaar
function formatDeltaTime(deltaSeconds: number | null): string | null {
  if (!deltaSeconds || deltaSeconds === 0) return null;
  const mins = Math.floor(deltaSeconds / 60);
  const secs = Math.floor(deltaSeconds % 60);
  return `+${mins}:${secs.toString().padStart(2, '0')}`;
}

// US7: Format datum + tijd
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  
  const dayName = dayNames[date.getDay()];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${dayName} ${day} ${month} ${hours}:${minutes}`;
}

// US5+US7: vELO Badge - Matrix style met rank circle + rating + trend RECHTS (zoals Team Matrix)
function VeloBadge({ rating, change }: { rating: number | null; change: number | null }) {
  if (!rating) {
    return <span className="text-xs text-gray-400">-</span>;
  }
  
  const tier = getVeloTier(rating);
  if (!tier) return <span className="text-xs text-gray-400">{Math.floor(rating)}</span>;
  
  let TrendIcon = Minus;
  let trendColor = 'text-gray-400';
  
  if (change && change > 0) {
    TrendIcon = TrendingUp;
    trendColor = 'text-green-600';
  } else if (change && change < 0) {
    TrendIcon = TrendingDown;
    trendColor = 'text-red-600';
  }
  
  return (
    <div className="flex items-start gap-2">
      {/* Rank Circle Badge - Matrix style */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-br ${tier.color} ${tier.textColor} shadow-sm flex-shrink-0`}>
        {tier.rank}
      </div>
      
      {/* Rating + Tier Name + Trend ONDER (voor strakke uitlijning) */}
      <div className="flex flex-col items-start min-w-[60px]">
        <div className="font-bold text-gray-900 text-sm">
          {Math.floor(rating)}
        </div>
        <div className="text-[10px] text-gray-500 leading-tight">
          {tier.name}
        </div>
        {/* Trend ONDER rating */}
        {change !== null && change !== 0 && (
          <div className={`flex items-center gap-0.5 ${trendColor} mt-0.5`}>
            <TrendIcon className="w-2.5 h-2.5" />
            <span className="text-[10px] font-semibold">{change > 0 ? `+${change}` : change}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Power value badge met effort color coding
function PowerBadge({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-gray-300">-</span>;
  
  // Effort score color (simplified - kan later verfijnd worden met PR comparison)
  return (
    <span className="text-xs font-medium text-gray-700">
      {value.toFixed(1)}
    </span>
  );
}

// Rank badge met medal icons voor top 3
function RankBadge({ rank, totalRiders }: { rank: number; totalRiders: number | null }) {
  if (rank === 1) {
    return (
      <div className="flex items-center gap-1 text-yellow-600">
        <Trophy className="w-4 h-4" />
        <span className="font-bold">1st</span>
      </div>
    );
  }
  
  if (rank === 2) {
    return (
      <div className="flex items-center gap-1 text-gray-400">
        <Award className="w-4 h-4" />
        <span className="font-bold">2nd</span>
      </div>
    );
  }
  
  if (rank === 3) {
    return (
      <div className="flex items-center gap-1 text-amber-700">
        <Award className="w-4 h-4" />
        <span className="font-bold">3rd</span>
      </div>
    );
  }
  
  // Voor andere ranks: show position/total
  const totalText = totalRiders ? `/${totalRiders}` : '';
  return (
    <span className="text-sm font-medium text-gray-600">
      {rank}{totalText}
    </span>
  );
}

// Event card met collapsible results table - US1: Group by PEN
function EventCard({ event }: { event: EventResult }) {
  const [expanded, setExpanded] = useState(true);
  
  // US1: Groepeer results per PEN
  const resultsByPen = event.results.reduce((acc, result) => {
    const pen = result.pen || 'Unknown';
    if (!acc[pen]) acc[pen] = [];
    acc[pen].push(result);
    return acc;
  }, {} as Record<string, RaceResult[]>);
  
  // Sort PENs alphabetically (A, B, C, D, E)
  const sortedPens = Object.keys(resultsByPen).sort();
  
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Card Header - Event Info */}
      <div 
        className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Event Titel */}
            <div className="flex items-center gap-3 mb-3">
              <Trophy className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">{event.event_name}</h3>
            </div>
            
            {/* 2-kolom layout: Links = Route Info, Rechts = Meta */}
            <div className="grid md:grid-cols-[2fr,1fr] gap-4">
              {/* LEFT: Route Details - zoals Event Cards */}
              <div className="space-y-2">
                {/* Route World + Name */}
                {event.route_world && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-gray-900">{event.route_world}</span>
                    {event.route_name && (
                      <span className="text-sm text-gray-600">· {event.route_name}</span>
                    )}
                  </div>
                )}
                
                {/* Distance + Elevation + Profile */}
                <div className="flex items-center gap-3 text-sm">
                  {event.distance_km && (
                    <span className="font-mono font-bold text-gray-900">{event.distance_km} km</span>
                  )}
                  {event.elevation_m && (
                    <span className="text-gray-600">{event.elevation_m}m ↑</span>
                  )}
                  {event.route_profile && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {event.route_profile}
                    </span>
                  )}
                  {event.laps && event.laps > 1 && (
                    <span className="text-gray-600">{event.laps} laps</span>
                  )}
                </div>
                
                {/* Event Type + SubType */}
                {(event.event_type || event.sub_type) && (
                  <div className="flex items-center gap-2 text-xs">
                    {event.event_type && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-medium">
                        {event.event_type}
                      </span>
                    )}
                    {event.sub_type && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                        {event.sub_type}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* RIGHT: Datum + Riders count */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(event.event_date)}</span>
                </div>
              
                {event.total_riders && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{event.total_riders} riders</span>
                  </div>
                )}
                
                {/* Team Riders met oranje borstbeeld icon */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
                  <UserCheck2 className="w-4 h-4" />
                  <span className="font-bold">{event.results.length}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Expand/Collapse Button */}
          <button 
            className="p-2 hover:bg-white/50 rounded-lg transition"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
      
      {/* Results Table - Collapsible - US1: Grouped by PEN */}
      {expanded && (
        <div className="overflow-x-auto">
          {sortedPens.map((pen) => {
            const penResults = resultsByPen[pen].sort((a, b) => a.rank - b.rank);
            
            const penColor = PEN_COLORS[pen] || { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-300', label: pen };
            
            return (
              <div key={pen} className="border-b border-gray-200 last:border-b-0">
                {/* US1+US2: PEN Header met Category kleuren */}
                <div className={`${penColor.bg} px-4 py-2 border-b ${penColor.border}`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 ${penColor.bg} ${penColor.text} border-2 ${penColor.border} rounded-md text-sm font-bold`}>
                      PEN {penColor.label}
                    </span>
                    <span className={`text-sm ${penColor.text}`}>
                      {penResults.length} team {penResults.length === 1 ? 'rider' : 'riders'}
                    </span>
                  </div>
                </div>
                
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rider</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">vELO Live</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Time</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Avg W/kg</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">5s</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">15s</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">1m</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">5m</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">20m</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {penResults.map((result, idx) => (
                <tr 
                  key={`${result.rider_id}-${idx}`}
                  className="hover:bg-blue-50/50 transition-colors"
                >
                  {/* Rank */}
                  <td className="px-4 py-3">
                    <RankBadge rank={result.rank} totalRiders={event.total_riders} />
                  </td>
                  
                  {/* Rider Name */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{result.rider_name}</span>
                  </td>
                  
                  {/* vELO Badge - US2+US3 */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <VeloBadge 
                        rating={result.velo_rating} 
                        change={result.velo_change} 
                      />
                    </div>
                  </td>
                  
                  {/* Time: LINKS uitlijnen met clock icon */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {formatTime(result.time_seconds)}
                        </span>
                        {/* US3+US4: Delta alleen voor rank > 1, klein rechts */}
                        {result.rank > 1 && result.delta_winner_seconds && result.delta_winner_seconds > 0 && (
                          <span className="text-[10px] font-mono text-gray-500">
                            +{formatDeltaTime(result.delta_winner_seconds)?.replace('+', '')}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  {/* Avg W/kg */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {result.avg_wkg.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  
                  {/* Power Curves */}
                  <td className="px-4 py-3 text-center">
                    <PowerBadge value={result.power_5s} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PowerBadge value={result.power_15s} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PowerBadge value={result.power_1m} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PowerBadge value={result.power_5m} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PowerBadge value={result.power_20m} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main Results Dashboard Component
export default function ResultsModern() {
  const [events, setEvents] = useState<EventResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(365);
  const [limit, setLimit] = useState(50);

  // Fetch team results
  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/results/team/recent?days=${days}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }
      
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setEvents(data.events);
      } else {
        throw new Error('API returned success=false');
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Fout bij laden van results. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [days, limit]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-8 px-4 lg:px-8 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8" />
            <h1 className="text-3xl lg:text-4xl font-bold">Team Results</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Recent race results van TeamNL Cloud9 riders
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Periode:</label>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={30}>Laatste 30 dagen</option>
                <option value={60}>Laatste 60 dagen</option>
                <option value={90}>Laatste 90 dagen</option>
                <option value={180}>Laatste 180 dagen</option>
                <option value={365}>Laatste 365 dagen</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Max results:</label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            
            {!loading && (
              <div className="ml-auto text-sm text-gray-600">
                <span className="font-medium">{events.length}</span> events geladen
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Results laden...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-800 font-medium mb-2">⚠️ {error}</p>
            <button
              onClick={fetchResults}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Opnieuw proberen
            </button>
          </div>
        )}

        {/* Results List */}
        {!loading && !error && (
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Geen results gevonden voor deze periode</p>
                <p className="text-gray-500 text-sm mt-2">Probeer een langere periode te selecteren</p>
              </div>
            ) : (
              events.map((event) => (
                <EventCard key={event.event_id} event={event} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
