/**
 * Feature: Results Dashboard - STATE-OF-THE-ART UI/UX
 * US1: Team Recent Results met power curves en vELO tracking
 */

import { useEffect, useState } from 'react';
import { 
  Trophy, TrendingUp, TrendingDown, Minus, Calendar,
  Zap, Award, Clock, Users, ChevronDown, ChevronUp
} from 'lucide-react';

// vELO Rating kleuren en badges
const VELO_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-red-100', text: 'text-red-800', label: 'vELO 1' },
  2: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'vELO 2' },
  3: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'vELO 3' },
  4: { bg: 'bg-green-100', text: 'text-green-800', label: 'vELO 4' },
  5: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'vELO 5' },
  6: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'vELO 6' },
  7: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'vELO 7' },
};

interface RaceResult {
  rider_id: number;
  rider_name: string;
  rank: number;
  time_seconds: number;
  avg_wkg: number;
  velo_rating: number | null;
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
}

interface EventResult {
  event_id: string | number;
  event_name: string;
  event_date: string;
  pen: string | null;
  total_riders: number | null;
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

// Format datum (friendly format)
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
  const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  
  const dayName = dayNames[date.getDay()];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  
  return `${dayName} ${day} ${month}`;
}

// vELO Badge component met trend arrow
function VeloBadge({ rating, change }: { rating: number | null; change: number | null }) {
  if (!rating) {
    return <span className="text-xs text-gray-400">-</span>;
  }
  
  const colors = VELO_COLORS[rating] || { bg: 'bg-gray-100', text: 'text-gray-800', label: `vELO ${rating}` };
  
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
    <div className="flex items-center gap-1">
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
        {rating}
      </span>
      {change !== null && change !== 0 && (
        <TrendIcon className={`w-3 h-3 ${trendColor}`} />
      )}
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

// Event card met collapsible results table
function EventCard({ event }: { event: EventResult }) {
  const [expanded, setExpanded] = useState(true);
  
  // Sort results by rank
  const sortedResults = [...event.results].sort((a, b) => a.rank - b.rank);
  
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Card Header - Event Info */}
      <div 
        className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">{event.event_name}</h3>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(event.event_date)}</span>
              </div>
              
              {event.pen && (
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                    {event.pen}
                  </span>
                </div>
              )}
              
              {event.total_riders && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{event.total_riders} riders</span>
                </div>
              )}
              
              <div className="flex items-center gap-1 text-blue-600 font-medium">
                <span>{event.results.length} team riders</span>
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
      
      {/* Results Table - Collapsible */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rider</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">vELO</th>
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
              {sortedResults.map((result, idx) => (
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
                  
                  {/* vELO Badge */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <VeloBadge rating={result.velo_rating} change={result.velo_change} />
                    </div>
                  </td>
                  
                  {/* Time */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-mono text-gray-700">
                        {formatTime(result.time_seconds)}
                      </span>
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
