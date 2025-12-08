/**
 * Results Dashboard V2 - Team Dashboard UX + All Improvements
 * Met progressbar bij vELO, trend naast rating, filters, route details
 */

import { useEffect, useState } from 'react';
import { 
  Trophy, TrendingUp, TrendingDown, Minus, Calendar, MapPin,
  Zap, Award, Clock, Users, ChevronDown, ChevronUp, UserCheck2, Filter, DoorOpen, Heart
} from 'lucide-react';

// Decode HTML entities (ø → ø, etc.)
const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

// vELO Tiers - exacte copy van Team Dashboard
const VELO_TIERS = [
  { rank: 1, name: 'Diamond', min: 2200, color: 'from-cyan-400 to-blue-500', textColor: 'text-cyan-100' },
  { rank: 2, name: 'Ruby', min: 1900, max: 2200, color: 'from-red-500 to-pink-600', textColor: 'text-red-100' },
  { rank: 3, name: 'Emerald', min: 1650, max: 1900, color: 'from-emerald-400 to-green-600', textColor: 'text-emerald-100' },
  { rank: 4, name: 'Sapphire', min: 1450, max: 1650, color: 'from-blue-400 to-indigo-600', textColor: 'text-blue-100' },
  { rank: 5, name: 'Amethyst', min: 1300, max: 1450, color: 'from-purple-400 to-violet-600', textColor: 'text-purple-100' },
  { rank: 6, name: 'Platinum', min: 1150, max: 1300, color: 'from-slate-300 to-slate-500', textColor: 'text-slate-100' },
  { rank: 7, name: 'Gold', min: 1000, max: 1150, color: 'from-yellow-400 to-amber-600', textColor: 'text-yellow-900' },
  { rank: 8, name: 'Silver', min: 850, max: 1000, color: 'from-gray-300 to-gray-500', textColor: 'text-gray-700' },
  { rank: 9, name: 'Bronze', min: 650, max: 850, color: 'from-orange-400 to-orange-700', textColor: 'text-orange-900' },
  { rank: 10, name: 'Copper', min: 0, max: 650, color: 'from-orange-600 to-red-800', textColor: 'text-orange-100' },
];

const getVeloTier = (rating: number | null) => {
  if (!rating) return null;
  return VELO_TIERS.find(tier => 
    rating >= tier.min && (!tier.max || rating < tier.max)
  );
};

const getTierProgress = (rating: number, tier: typeof VELO_TIERS[0]): number => {
  if (!tier.max) return 100;
  const range = tier.max - tier.min;
  const progress = rating - tier.min;
  return Math.min(100, Math.max(0, (progress / range) * 100));
};

// Helper: Check of rijder een tier omhoog/omlaag is gegaan
const getVeloRankChange = (rating: number | null, previous: number | null): 'up' | 'down' | null => {
  if (!rating || !previous) return null;
  const currentTier = getVeloTier(rating);
  const previousTier = getVeloTier(previous);
  if (!currentTier || !previousTier) return null;
  
  // Lower rank number = better (Diamond = 1, Copper = 10)
  if (currentTier.rank < previousTier.rank) return 'up';
  if (currentTier.rank > previousTier.rank) return 'down';
  return null;
};

// PEN kleuren
const PEN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'A': { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300' },
  'B': { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300' },
  'C': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
  'D': { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
  'E': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300' },
};

interface RaceResult {
  rider_id: number;
  rider_name: string;
  rank: number;
  position: number | null;  // Overall finish position
  position_in_category: number | null;  // Position within category/pen
  total_riders: number | null;  // Total participants in event
  pen_total: number | null;  // Total participants in pen/category
  time_seconds: number;
  avg_wkg: number;
  pen: string | null;
  velo_rating: number | null;
  velo_previous: number | null;
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
  delta_winner_seconds: number | null;
  heartrate_avg: number | null;  // Average heartrate
  heartrate_max: number | null;  // Max heartrate
  dnf: boolean | null;
}

interface EventResult {
  event_id: string | number;
  event_name: string;
  event_date: string;
  pen: string | null;
  total_riders: number | null;
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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDeltaTime(deltaSeconds: number | null): string | null {
  if (!deltaSeconds || deltaSeconds === 0) return null;
  const mins = Math.floor(deltaSeconds / 60);
  const secs = Math.floor(deltaSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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

// vELO Badge met progressbar EN trend naast rating + tier change indicator
function VeloBadge({ rating, previous, change }: { rating: number | null; previous: number | null; change: number | null }) {
  if (!rating) {
    return <span className="text-xs text-gray-400">-</span>;
  }
  
  const tier = getVeloTier(rating);
  if (!tier) return <span className="text-xs text-gray-400">{Math.floor(rating)}</span>;
  
  const progress = getTierProgress(rating, tier);
  const rankChange = getVeloRankChange(rating, previous);
  
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
    <div className="flex items-center gap-2">
      {/* Rank Circle Badge met tier change indicator */}
      <div className="relative">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-br ${tier.color} ${tier.textColor} shadow-sm flex-shrink-0`}>
          {tier.rank}
        </div>
        {/* Tier Change Indicator (omhoog/omlaag in tier - bijv. Gold naar Platinum) */}
        {rankChange && (
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${rankChange === 'up' ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center shadow-md`}>
            {rankChange === 'up' ? (
              <ChevronUp className="w-3 h-3 text-white" strokeWidth={3} />
            ) : (
              <ChevronDown className="w-3 h-3 text-white" strokeWidth={3} />
            )}
          </div>
        )}
      </div>
      
      {/* Rating + Progressbar + Tier Name */}
      <div className="flex flex-col min-w-[60px]">
        <div className="font-bold text-gray-900 text-sm">
          {Math.floor(rating)}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1 mt-0.5">
          <div 
            className={`h-1 rounded-full bg-gradient-to-r ${tier.color}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          {tier.name}
        </div>
      </div>
      
      {/* Trend NAAST rating (niet onder) */}
      {change !== null && change !== 0 && (
        <div className={`flex items-center gap-0.5 ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span className="text-xs font-semibold">{change > 0 ? `+${change}` : change}</span>
        </div>
      )}
    </div>
  );
}

function PowerBadge({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-gray-300">-</span>;
  return (
    <span className="text-xs font-medium text-gray-700">
      {value.toFixed(1)}
    </span>
  );
}

// DNF Badge - Did Not Finish indicator
function DNFBadge() {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs font-semibold border border-red-300">
      <DoorOpen className="w-3 h-3" />
      <span>DNF</span>
    </div>
  );
}

function RankBadge({ rank, position, positionInCategory, penTotal, dnf }: { 
  rank: number; 
  position: number | null;
  positionInCategory: number | null;
  penTotal: number | null;
  dnf: boolean | null 
}) {
  // Toon DNF badge als rider niet gefinisht is
  if (dnf) {
    return <DNFBadge />;
  }
  
  // Primaire display: position_in_category (groot), penTotal ernaast
  const mainDisplay = positionInCategory || position || rank;
  
  // Toon penTotal als we position_in_category hebben
  const subDisplay = positionInCategory && penTotal
    ? `/${penTotal}`
    : null;
  
  if (rank === 1) {
    return (
      <div className="flex items-center gap-1 text-yellow-600">
        <Trophy className="w-4 h-4" />
        <span className="font-bold">1st</span>
        {subDisplay && (
          <span className="text-[10px] text-gray-500 ml-1">{subDisplay}</span>
        )}
      </div>
    );
  }
  
  if (rank === 2) {
    return (
      <div className="flex items-center gap-1 text-gray-400">
        <Award className="w-4 h-4" />
        <span className="font-bold">2nd</span>
        {subDisplay && (
          <span className="text-[10px] text-gray-500 ml-1">{subDisplay}</span>
        )}
      </div>
    );
  }
  
  if (rank === 3) {
    return (
      <div className="flex items-center gap-1 text-amber-700">
        <Award className="w-4 h-4" />
        <span className="font-bold">3rd</span>
        {subDisplay && (
          <span className="text-[10px] text-gray-500 ml-1">{subDisplay}</span>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-medium text-gray-600">
          {mainDisplay}
        </span>
        {subDisplay && (
          <span className="text-[10px] text-gray-500">{subDisplay}</span>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: EventResult }) {
  const [expanded, setExpanded] = useState(true);
  
  const resultsByPen = event.results.reduce((acc, result) => {
    const pen = result.pen || 'Unknown';
    if (!acc[pen]) acc[pen] = [];
    acc[pen].push(result);
    return acc;
  }, {} as Record<string, RaceResult[]>);
  
  const sortedPens = Object.keys(resultsByPen).sort();
  
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200">
      {/* Event Header - Volledige breedte gebruiken */}
      <div 
        className="p-6 bg-gradient-to-r from-blue-500 to-indigo-500 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          {/* LEFT: Event Title + Route Details */}
          <div className="flex-1 min-w-0">
            {/* Titel */}
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">{decodeHtmlEntities(event.event_name)}</span>
            </h3>
            
            {/* Route Details (als beschikbaar) */}
            {event.route_world && (
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin className="w-4 h-4" />
                  <span className="font-bold">{decodeHtmlEntities(event.route_world)}</span>
                  {event.route_name && (
                    <span className="text-white/70">· {decodeHtmlEntities(event.route_name)}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-sm text-white/80 flex-wrap">
                  {event.distance_km && (
                    <span className="font-mono font-bold">{event.distance_km} km</span>
                  )}
                  {event.elevation_m && (
                    <span>{event.elevation_m}m ↑</span>
                  )}
                  {event.route_profile && (
                    <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                      {event.route_profile}
                    </span>
                  )}
                  {event.laps && event.laps > 1 && (
                    <span>{event.laps} laps</span>
                  )}
                </div>
                
                {(event.event_type || event.sub_type) && (
                  <div className="flex items-center gap-2">
                    {event.event_type && (
                      <span className="px-2 py-0.5 bg-white/20 text-white rounded text-xs font-medium">
                        {event.event_type}
                      </span>
                    )}
                    {event.sub_type && (
                      <span className="px-2 py-0.5 bg-white/10 text-white/80 rounded text-xs">
                        {event.sub_type}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Datum + Riders */}
            <div className="flex items-center gap-4 text-sm text-white/80">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(event.event_date)}</span>
              </div>
              
              {/* Team Riders met vinkje */}
              <div className="flex items-center gap-1 text-orange-300">
                <UserCheck2 className="w-4 h-4" />
                <span className="font-bold">{event.results.length}</span>
              </div>
              
              {/* Totaal deelnemers met meervoudig borstbeeld */}
              {event.total_riders && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span className="font-semibold">{event.total_riders}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* RIGHT: Expand/Collapse */}
          <button 
            className="p-2 hover:bg-white/10 rounded-lg transition flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-white" />
            ) : (
              <ChevronDown className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>
      
      {/* Results Table */}
      {expanded && (
        <div className="overflow-x-auto">
          {sortedPens.map((pen) => {
            const penResults = resultsByPen[pen].sort((a, b) => a.rank - b.rank);
            const penColor = PEN_COLORS[pen] || { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-300' };
            
            return (
              <div key={pen} className="border-b border-gray-200 last:border-b-0">
                {/* PEN Header */}
                <div className={`${penColor.bg} px-4 py-2 border-b ${penColor.border}`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 ${penColor.bg} ${penColor.text} border-2 ${penColor.border} rounded-md text-sm font-bold`}>
                      PEN {pen}
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">vELO Live</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Avg W/kg</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-tight">HR Avg</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-tight">HR Max</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-tight">5s</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-tight">15s</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-tight">30s</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-tight">1m</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-tight">2m</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-tight">5m</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-tight">20m</th>
                    </tr>
                  </thead>
                  <tbody>
                    {penResults.map((result) => (
                      <tr key={result.rider_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <RankBadge 
                            rank={result.rank} 
                            position={result.position}
                            positionInCategory={result.position_in_category}
                            penTotal={result.pen_total}
                            dnf={result.dnf} 
                          />
                        </td>
                        
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{decodeHtmlEntities(result.rider_name)}</span>
                        </td>
                        
                        <td className="px-4 py-3">
                          <VeloBadge 
                            rating={result.velo_rating} 
                            previous={result.velo_previous}
                            change={result.velo_change} 
                          />
                        </td>
                        
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-mono font-medium text-gray-900">
                                {formatTime(result.time_seconds)}
                              </span>
                              {result.rank > 1 && result.delta_winner_seconds && result.delta_winner_seconds > 0 && (
                                <span className="text-[10px] font-mono text-gray-500">
                                  +{formatDeltaTime(result.delta_winner_seconds)?.replace('+', '')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-700">
                              {result.avg_wkg.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        
                        {/* HR Avg */}
                        <td className="px-4 py-3 text-center">
                          {result.heartrate_avg ? (
                            <div className="flex items-center justify-center gap-1">
                              <Heart className="w-3 h-3 text-red-500 fill-red-100" />
                              <span className="text-xs font-medium text-red-600">
                                {result.heartrate_avg}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                        
                        {/* HR Max */}
                        <td className="px-4 py-3 text-center">
                          {result.heartrate_max ? (
                            <div className="flex items-center justify-center gap-1">
                              <Heart className="w-3 h-3 text-red-700 fill-red-500" />
                              <span className="text-xs font-semibold text-red-700">
                                {result.heartrate_max}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                        
                        <td className="px-4 py-3 text-center">
                          <PowerBadge value={result.power_5s} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <PowerBadge value={result.power_15s} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <PowerBadge value={result.power_30s} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <PowerBadge value={result.power_1m} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <PowerBadge value={result.power_2m} />
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

export default function ResultsModern() {
  const [events, setEvents] = useState<EventResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(365);
  const [limit, setLimit] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');

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

  // Filter events based on search
  const filteredEvents = events.filter(event => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      event.event_name.toLowerCase().includes(term) ||
      event.results.some(r => r.rider_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-8">
      {/* Hero Header - Team Dashboard Style */}
      <div className="relative overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-95"></div>
        <div className="relative px-6 py-10">
          <div className="max-w-[98vw] mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-white/20 backdrop-blur-lg rounded-2xl shadow-2xl">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-5xl font-black text-white tracking-tight">
                  RESULTS DASHBOARD
                </h1>
                <p className="text-blue-100 text-xl font-semibold mt-2">
                  TeamNL Cloud9 Racing · Recent Race Results
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 bg-white/10 backdrop-blur-lg rounded-xl px-5 py-3 border border-white/20 shadow-xl">
              <span className="text-white/80 text-sm font-medium">Showing</span>
              <span className="text-white font-bold text-2xl">{filteredEvents.length}</span>
              <span className="text-white/80 text-sm font-medium">of</span>
              <span className="text-white font-bold text-2xl">{events.length}</span>
              <span className="text-white/80 text-sm font-medium">events</span>
              {searchTerm && (
                <>
                  <span className="text-white/60">·</span>
                  <span className="text-cyan-300 font-semibold text-sm">🔍 "{searchTerm}"</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-[98vw] mx-auto px-4">
        {/* Filters - Subtiel en State of the Art */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="🔍 Zoek event of rider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value={7}>7 dagen</option>
                <option value={30}>30 dagen</option>
                <option value={60}>60 dagen</option>
                <option value={90}>90 dagen</option>
              </select>
            </div>
            
            {/* Limit Filter */}
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value={20}>20 results</option>
              <option value={50}>50 results</option>
              <option value={100}>100 results</option>
              <option value={200}>200 results</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Results laden...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
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
            {filteredEvents.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-12 text-center border border-slate-200">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Geen results gevonden</p>
                <p className="text-gray-500 text-sm mt-2">
                  {searchTerm ? 'Probeer een andere zoekterm' : 'Probeer een langere periode te selecteren'}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <EventCard key={event.event_id} event={event} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
