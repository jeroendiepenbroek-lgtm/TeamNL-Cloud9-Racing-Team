/**
 * Feature: Events Dashboard - STATE-OF-THE-ART UI/UX
 * US1-US6: Modern event cards met real-time countdown en intelligent refresh
 */

import { useEffect, useState, useMemo } from 'react';
import { 
  Calendar, MapPin, UserCheck, Timer, Users, UserCheck2,
  Minus, TrendingUp, ChevronUp, ChevronDown, Mountain
} from 'lucide-react';

// ZP Categories met correcte kleuren
const ZP_CATEGORIES: Record<string, { label: string; bgClass: string; textClass: string; iconBg: string; iconText: string }> = {
  'A': { label: 'A', bgClass: 'bg-red-50', textClass: 'text-red-800', iconBg: 'bg-red-100', iconText: 'text-red-700' },
  'B': { label: 'B', bgClass: 'bg-green-50', textClass: 'text-green-800', iconBg: 'bg-green-100', iconText: 'text-green-700' },
  'C': { label: 'C', bgClass: 'bg-blue-50', textClass: 'text-blue-800', iconBg: 'bg-blue-100', iconText: 'text-blue-700' },
  'D': { label: 'D', bgClass: 'bg-yellow-50', textClass: 'text-yellow-800', iconBg: 'bg-yellow-100', iconText: 'text-yellow-700' },
  'E': { label: 'E', bgClass: 'bg-purple-50', textClass: 'text-purple-800', iconBg: 'bg-purple-100', iconText: 'text-purple-700' },
};

// US2: Betere route profile badges met specifieke iconen
const ROUTE_PROFILES: Record<string, { icon: any; color: string; label: string }> = {
  'Flat': { icon: Minus, color: 'bg-emerald-50 text-emerald-700', label: 'Flat' },
  'Rolling': { icon: TrendingUp, color: 'bg-blue-50 text-blue-700', label: 'Rolling' },
  'Hilly': { icon: ChevronUp, color: 'bg-orange-50 text-orange-700', label: 'Hilly' },
  'Mountainous': { icon: Mountain, color: 'bg-red-50 text-red-700', label: 'Mountainous' },
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

// NEW: Format event start date/time (US2)
function formatEventDateTime(unix: number): { dayName: string; date: string; time: string } {
  const eventDate = new Date(unix * 1000);
  
  const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
  const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  
  const dayName = dayNames[eventDate.getDay()];
  const day = eventDate.getDate();
  const month = monthNames[eventDate.getMonth()];
  const year = eventDate.getFullYear();
  const hours = String(eventDate.getHours()).padStart(2, '0');
  const minutes = String(eventDate.getMinutes()).padStart(2, '0');
  
  return {
    dayName,
    date: `${day} ${month} ${year}`,
    time: `${hours}:${minutes}`
  };
}

// US6: Collapsible Category Team Section Component
function CategoryTeamSection({ 
  category, 
  riders, 
  catStyle 
}: { 
  category: string; 
  riders: TeamRider[]; 
  catStyle: { label: string; bgClass: string; textClass: string; iconBg: string; iconText: string } 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 flex items-center justify-center rounded-md ${catStyle.iconBg} ${catStyle.iconText} font-bold text-sm`}>
            {category}
          </div>
          <span className="text-sm font-medium text-slate-700">
            {riders.length} Team {riders.length === 1 ? 'Rider' : 'Riders'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1">
          <div className="flex flex-wrap gap-2">
            {riders.map((rider) => (
              <div
                key={rider.rider_id}
                className="px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-md text-xs font-medium"
              >
                {rider.rider_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'team'>('team');
  const [lookforwardHours, setLookforwardHours] = useState(36);
  const [, setCurrentTime] = useState(Date.now());

  // US5: Update current time elke minuut voor countdown refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60 * 1000); // Refresh every 60 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Haal lookforwardHours op uit config
        const configResponse = await fetch('/api/sync/config');
        let hours = 36; // Default fallback
        if (configResponse.ok) {
          const configData = await configResponse.json();
          hours = configData.lookforwardHours || 36;
          setLookforwardHours(hours);
        }
        
        const response = await fetch(`/api/events/upcoming?hours=${hours}`);
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    
    // US5: Poll config elke 30 seconden voor lookforwardHours updates
    const configPollInterval = setInterval(async () => {
      try {
        const configResponse = await fetch('/api/sync/config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          const newHours = configData.lookforwardHours || 36;
          if (newHours !== lookforwardHours) {
            setLookforwardHours(newHours);
            // Refresh events met nieuwe lookforward
            const response = await fetch(`/api/events/upcoming?hours=${newHours}`);
            if (response.ok) {
              const data = await response.json();
              setEvents(data.events || []);
            }
          }
        }
      } catch (error) {
        // Silent fail - config poll is niet kritiek
      }
    }, 30000); // Check elke 30 seconden
    
    return () => clearInterval(configPollInterval);
  }, [lookforwardHours]);

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
        {/* Header - US1: Prominenter met shadow en spacing */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-300">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-extrabold text-slate-900">
              Upcoming Events
            </h1>
          </div>
          <p className="text-slate-700 text-lg font-semibold ml-1 pl-1">
            Next <span className="font-bold text-blue-600">{lookforwardHours} hours</span> • {filteredEvents.length} events
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
            const dateTimeInfo = event.time_unix ? formatEventDateTime(event.time_unix) : null;
            const RouteIcon = event.route_profile ? ROUTE_PROFILES[event.route_profile]?.icon : Minus;
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

                  {/* US2: Datum en tijd */}
                  {dateTimeInfo && (
                    <div className="flex items-center gap-2 text-white/90 text-sm font-medium mb-3 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg inline-flex">
                      <Calendar className="w-4 h-4" />
                      <span className="font-bold">{dateTimeInfo.dayName}</span>
                      <span>{dateTimeInfo.date}</span>
                      <span className="text-white/70">•</span>
                      <span className="font-bold">{dateTimeInfo.time}</span>
                    </div>
                  )}

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
                  {/* Route Profile Badge */}
                  <div className="mb-4">
                    {routeProfile && (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${routeProfile.color} font-medium text-sm`}>
                        <RouteIcon className="w-4 h-4" />
                        <span>{routeProfile.label}</span>
                      </div>
                    )}
                  </div>

                  {/* US3, US4, US5: Compacte horizontale stats row - alleen iconen + getallen */}
                  <div className="flex items-center gap-6 mb-6 pb-4 border-b border-slate-200">
                    {/* Total signups (multi-person icon) */}
                    {event.total_signups !== undefined && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="w-5 h-5" />
                        <span className="text-lg font-bold">{event.total_signups}</span>
                      </div>
                    )}

                    {/* Team signups (orange checkmark) */}
                    {event.team_rider_count !== undefined && event.team_rider_count > 0 && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <UserCheck2 className="w-5 h-5" />
                        <span className="text-lg font-bold">{event.team_rider_count}</span>
                      </div>
                    )}

                    {/* Category badges met counts */}
                    {event.signups_by_category && (
                      <div className="flex items-center gap-2 ml-auto">
                        {['A', 'B', 'C', 'D', 'E'].map((cat) => {
                          const count = event.signups_by_category?.[cat] || 0;
                          if (count === 0) return null;
                          const catStyle = ZP_CATEGORIES[cat];
                          return (
                            <div 
                              key={cat} 
                              className={`px-2 py-1 rounded-md text-xs font-bold ${catStyle.iconBg} ${catStyle.iconText}`}
                              title={`Category ${cat}: ${count} riders`}
                            >
                              {cat}:{count}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* US6: Collapsible team member sections per category */}
                  {event.team_signups_by_category && Object.keys(event.team_signups_by_category).length > 0 && (
                    <div className="space-y-2">
                      {Object.entries(event.team_signups_by_category)
                        .filter(([_, riders]) => riders.length > 0)
                        .map(([cat, riders]) => {
                          const catStyle = ZP_CATEGORIES[cat];
                          return (
                            <CategoryTeamSection 
                              key={cat}
                              category={cat}
                              riders={riders}
                              catStyle={catStyle}
                            />
                          );
                        })}
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
                ? `No upcoming events with team riders in the next ${lookforwardHours} hours`
                : `No upcoming events in the next ${lookforwardHours} hours`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}