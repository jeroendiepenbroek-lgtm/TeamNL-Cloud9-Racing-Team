/**
 * Feature: Events Dashboard - STATE-OF-THE-ART UI/UX
 * US1-US6: Modern event cards met real-time countdown en intelligent refresh
 */

import { useEffect, useState, useMemo } from 'react';
import { Calendar, MapPin, UserCheck, TrendingUp, Mountain, Activity, Timer } from 'lucide-react';

// ZP Categories met correcte kleuren
const ZP_CATEGORIES: Record<string, { label: string; bgClass: string; textClass: string; borderClass: string }> = {
  'A': { label: 'A', bgClass: 'bg-red-50', textClass: 'text-red-800', borderClass: 'border-red-200' },
  'B': { label: 'B', bgClass: 'bg-green-50', textClass: 'text-green-800', borderClass: 'border-green-200' },
  'C': { label: 'C', bgClass: 'bg-blue-50', textClass: 'text-blue-800', borderClass: 'border-blue-200' },
  'D': { label: 'D', bgClass: 'bg-yellow-50', textClass: 'text-yellow-800', borderClass: 'border-yellow-200' },
  'E': { label: 'E', bgClass: 'bg-purple-50', textClass: 'text-purple-800', borderClass: 'border-purple-200' },
};

// Route Profile Badges
const ROUTE_PROFILES: Record<string, { icon: any; color: string; label: string }> = {
  'Flat': { icon: Activity, color: 'bg-emerald-100 text-emerald-700 border-emerald-300', label: 'Flat' },
  'Rolling': { icon: TrendingUp, color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Rolling' },
  'Hilly': { icon: Mountain, color: 'bg-orange-100 text-orange-700 border-orange-300', label: 'Hilly' },
  'Mountainous': { icon: Mountain, color: 'bg-red-100 text-red-700 border-red-300', label: 'Mountainous' },
};

interface TeamRider {
  rider_id: number;
  rider_name: string;
  pen_name: string;
}

interface Event {
  event_id: string | number;
  title?: string;
  event_date: string;
  route_name?: string;
  route_world?: string;
  route_profile?: string;
  elevation_m?: number;
  distance_km?: string;
  time_unix?: number;
  total_signups?: number;
  team_rider_count?: number;
  team_riders?: TeamRider[];
  signups_by_category?: Record<string, number>;
  team_signups_by_category?: Record<string, TeamRider[]>;
  categories?: string[];
}

// US5: Countdown formatter - elke minuut refresh
function formatTimeUntil(unix: number): { text: string; urgent: boolean; veryUrgent: boolean } {
  const now = Math.floor(Date.now() / 1000);
  const diff = unix - now;
  
  if (diff < 0) return { text: 'Started', urgent: false, veryUrgent: true };
  
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  
  if (hours === 0) {
    return {
      text: `Starts in ${minutes}m`,
      urgent: true,
      veryUrgent: minutes <= 10
    };
  }
  
  if (hours < 24) {
    return {
      text: `Starts in ${hours}h ${minutes}m`,
      urgent: hours <= 1,
      veryUrgent: false
    };
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return {
    text: `Starts in ${days}d ${remainingHours}h`,
    urgent: false,
    veryUrgent: false
  };
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'team'>('team');
  const [, setCurrentTime] = useState(Date.now());

  // US5: Update current time elke minuut voor countdown refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60 * 1000); // Refresh every 60 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Fetch events with smart refresh
  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/events/upcoming?hours=36`);
      if (!response.ok) throw new Error('Failed to fetch events');
      
      const data = await response.json();
      setEvents(data.events || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    
    // Smart refresh: check every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchEvents();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filter === 'team') {
      return events.filter(e => (e.team_rider_count || 0) > 0);
    }
    return events;
  }, [events, filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-600 font-medium">Loading upcoming events...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-red-800 font-semibold mb-2">Error loading events</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Upcoming Events
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Next <span className="font-semibold text-blue-600">36 hours</span> • {filteredEvents.length} events
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('team')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              filter === 'team'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Team Events
            </div>
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              All Events
            </div>
          </button>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map((event) => {
            const timeInfo = event.time_unix ? formatTimeUntil(event.time_unix) : null;
            const RouteIcon = event.route_profile ? ROUTE_PROFILES[event.route_profile]?.icon : Activity;
            const routeProfile = event.route_profile ? ROUTE_PROFILES[event.route_profile] : null;

            return (
              <div
                key={event.event_id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 group"
              >
                {/* Card Header with Countdown */}
                <div className={`p-6 border-b ${
                  timeInfo?.veryUrgent ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white' :
                  timeInfo?.urgent ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white' :
                  'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold flex-1 pr-4">
                      {event.title || 'Untitled Event'}
                    </h3>
                    {timeInfo && (
                      <div className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 ${
                        timeInfo.veryUrgent ? 'bg-white/30 backdrop-blur-sm animate-pulse' :
                        timeInfo.urgent ? 'bg-white/20 backdrop-blur-sm' :
                        'bg-white/10 backdrop-blur-sm'
                      }`}>
                        <Timer className="w-4 h-4" />
                        {timeInfo.text}
                      </div>
                    )}
                  </div>

                  {/* US4: Route Info + Distance & Elevation in header */}
                  {event.route_name && (
                    <div className="flex items-center gap-2 text-white/90 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">{event.route_name}</span>
                      {event.route_world && (
                        <span className="text-white/70">• {event.route_world}</span>
                      )}
                      {event.distance_km && (
                        <span className="text-white/70">• {event.distance_km}km</span>
                      )}
                      {event.elevation_m !== undefined && (
                        <span className="text-white/70">• {event.elevation_m}m</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-6">
                  {/* Route Profile Badge + Total Signups */}
                  <div className="flex items-center justify-between mb-6">
                    {routeProfile && (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 ${routeProfile.color} font-semibold text-sm`}>
                        <RouteIcon className="w-4 h-4" />
                        {routeProfile.label}
                      </div>
                    )}
                    {event.total_signups !== undefined && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-800">{event.total_signups}</div>
                        <div className="text-xs text-slate-500 font-medium">Total Signups</div>
                      </div>
                    )}
                  </div>

                  {/* US1: Team Riders Count (prominent) */}
                  {event.team_rider_count !== undefined && event.team_rider_count > 0 && (
                    <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="w-5 h-5 text-blue-600" />
                        <span className="text-lg font-bold text-blue-800">
                          {event.team_rider_count} Team {event.team_rider_count === 1 ? 'Rider' : 'Riders'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* US3: Category Breakdown - All Signups + Team Signups */}
                  {event.signups_by_category && Object.keys(event.signups_by_category).length > 0 && (
                    <div className="mb-6">
                      <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
                        Signups by Category
                      </div>
                      <div className="space-y-2">
                        {['A', 'B', 'C', 'D', 'E'].map((cat) => {
                          const totalCount = event.signups_by_category?.[cat] || 0;
                          const teamRiders = event.team_signups_by_category?.[cat] || [];
                          
                          if (totalCount === 0) return null;
                          
                          const catStyle = ZP_CATEGORIES[cat];
                          return (
                            <div key={cat} className={`p-3 rounded-lg border-2 ${catStyle.bgClass} ${catStyle.borderClass}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 flex items-center justify-center rounded-full ${catStyle.bgClass} border-2 ${catStyle.borderClass}`}>
                                    <span className={`font-bold ${catStyle.textClass}`}>{cat}</span>
                                  </div>
                                  <div>
                                    <div className={`font-bold ${catStyle.textClass}`}>
                                      Category {cat}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                      {totalCount} {totalCount === 1 ? 'rider' : 'riders'}
                                      {teamRiders.length > 0 && (
                                        <span className="font-semibold text-blue-700"> • {teamRiders.length} from team</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* US2 & US3: Team riders in this category */}
                              {teamRiders.length > 0 && (
                                <div className="mt-2 pt-2 border-t-2 border-white/50">
                                  <div className="flex flex-wrap gap-2">
                                    {teamRiders.map((rider) => (
                                      <div
                                        key={rider.rider_id}
                                        className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold shadow-sm"
                                      >
                                        {rider.rider_name}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* US2: All Team Riders (fallback if no category breakdown) */}
                  {event.team_riders && event.team_riders.length > 0 && !event.team_signups_by_category && (
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-slate-700">
                          Team Riders ({event.team_riders.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {event.team_riders.map((rider) => (
                          <div
                            key={rider.rider_id}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm font-medium"
                          >
                            {rider.rider_name}
                            {rider.pen_name && ` • ${rider.pen_name}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">No events found</h3>
            <p className="text-slate-500">
              {filter === 'team' 
                ? 'No upcoming events with team riders in the next 36 hours'
                : 'No upcoming events in the next 36 hours'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
