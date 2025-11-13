/**
 * Feature 1: Events Page
 * Shows upcoming events (48h lookforward) where team riders are registered
 */

import { useEffect, useState } from 'react';
import { Clock, Calendar, MapPin, Users, ExternalLink, UserCheck } from 'lucide-react';

// US3: ZP Categories met kleuren zoals in matrix
const ZP_CATEGORIES: Record<string, { color: string; label: string }> = {
  'A+': { color: 'bg-red-100 text-red-900 border-red-300', label: 'A+' },
  'A': { color: 'bg-red-50 text-red-800 border-red-200', label: 'A' },
  'B': { color: 'bg-green-50 text-green-800 border-green-200', label: 'B' },
  'C': { color: 'bg-blue-50 text-blue-800 border-blue-200', label: 'C' },
  'D': { color: 'bg-yellow-50 text-yellow-800 border-yellow-200', label: 'D' },
  'E': { color: 'bg-gray-50 text-gray-800 border-gray-200', label: 'E' },
};

interface Event {
  event_id: string | number;
  name?: string;
  title?: string;
  event_date: string;
  event_type?: string;
  sub_type?: string;
  route?: string;
  route_name?: string;
  route_world?: string;
  route_profile?: string; // US11: Flat, Rolling, Hilly, Mountainous
  elevation_m?: number; // US5: Hoogtemeters uit database
  distance_km?: string;
  distance_meters?: number;
  laps?: number; // US2: Aantal laps/ronden
  time_unix?: number;
  total_signups?: number;
  team_rider_count?: number;
  signups_by_category?: Record<string, number>;
  team_signups_by_category?: Record<string, TeamSignup[]>;
  event_url?: string;
  zwift_api_event_signups?: any[];
}

interface TeamSignup {
  rider_id: number;
  rider_name: string;
  // US8: Removed power_wkg5 and race_rating
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'team'>('team');

  useEffect(() => {
    fetchUpcomingEvents();
    // Refresh data every 5 minutes
    const dataInterval = setInterval(fetchUpcomingEvents, 5 * 60 * 1000);
    
    // US5: Refresh timers every minute (forces re-render)
    const timerInterval = setInterval(() => {
      setEvents(prev => [...prev]); // Force re-render to update timers
    }, 60 * 1000);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(timerInterval);
    };
  }, [filter]);

  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true);
      // US2: Fetch all events but apply filter client-side
      const response = await fetch(`/api/events/upcoming?hours=48`);
      
      if (!response.ok) {
        throw new Error('Fout bij ophalen events');
      }
      
      const data = await response.json();
      let allEvents = data.events || [];
      
      // Apply filter client-side
      if (filter === 'team') {
        allEvents = allEvents.filter((e: Event) => (e.team_rider_count || 0) > 0);
      }
      
      setEvents(allEvents);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Onbekende fout');
    } finally {
      setLoading(false);
    }
  };

  const getTimeUntilEvent = (eventDate: string): string => {
    const now = new Date();
    const event = new Date(eventDate);
    const diff = event.getTime() - now.getTime();
    
    if (diff < 0) return 'Started';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours < 1) return `${minutes}m`;
    if (hours < 24) return `${hours}u ${minutes}m`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}u`;
  };

  const formatEventDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDistance = (event: Event): string => {
    // US3: Gebruik distance_km als beschikbaar, anders fallback naar distance_meters
    if (event.distance_km) return `${event.distance_km} km`;
    if (event.distance_meters) {
      const km = (event.distance_meters / 1000).toFixed(1);
      return `${km} km`;
    }
    return '-';
  };

  if (loading && events.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Events laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Calendar className="w-8 h-8" />
                Aankomende Events
              </h1>
              <p className="mt-2 text-orange-100">
                Events in de komende 48 uur
              </p>
            </div>
            <button
              onClick={fetchUpcomingEvents}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? 'Laden...' : 'Ververs'}
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setFilter('team')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'team'
                  ? 'bg-white text-orange-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Users className="inline w-4 h-4 mr-2" />
              Met Team Riders
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-white text-orange-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Alle Events
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">Error: {error}</p>
          </div>
        )}

        {events.length === 0 && !loading ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Geen events gevonden
            </h3>
            <p className="text-gray-600">
              {filter === 'team'
                ? 'Geen events met team riders in de komende 48 uur'
                : 'Geen events in de komende 48 uur'}
            </p>
          </div>
        ) : (
          /* US4: Grid met fixed rows om mee-expanden te voorkomen */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {events.map((event) => (
              <EventCard
                key={event.event_id}
                event={event}
                timeUntil={getTimeUntilEvent(event.event_date)}
                formattedDate={formatEventDate(event.event_date)}
                distance={formatDistance(event)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EventCardProps {
  event: Event;
  timeUntil: string;
  formattedDate: string;
  distance: string;
}

function EventCard({ event, timeUntil, formattedDate, distance }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // US2 & US3: Extract signup counts
  const teamRiderCount = event.team_rider_count || 0;
  const totalSignups = event.total_signups || 0;
  
  const getEventTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'race':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'group_ride':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'workout':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // US11: Route profile badge color
  const getRouteProfileColor = (profile?: string) => {
    switch (profile?.toLowerCase()) {
      case 'flat':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rolling':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'hilly':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'mountainous':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isStartingSoon = () => {
    const match = timeUntil.match(/^(\d+)([um])/);
    if (!match) return false;
    const [, value, unit] = match;
    return (unit === 'u' && parseInt(value) < 2) || (unit === 'm');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-orange-200">
      {/* Card Header */}
      <div className="p-6">
        {/* Time Until Event */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-3 ${
          isStartingSoon()
            ? 'bg-red-100 text-red-700 animate-pulse'
            : 'bg-orange-100 text-orange-700'
        }`}>
          <Clock className="w-4 h-4" />
          {timeUntil}
        </div>

        {/* Event Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {event.name}
        </h3>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Calendar className="w-4 h-4" />
          {formattedDate}
        </div>

        {/* Event Type & Details */}
        <div className="flex flex-wrap gap-2 mb-4">
          {event.event_type && (
            <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${getEventTypeColor(event.event_type)}`}>
              {event.event_type}
            </span>
          )}
          {/* US9: Sub type badge */}
          {event.sub_type && (
            <span className="text-xs px-2 py-1 rounded-full border bg-purple-100 text-purple-800 border-purple-200 font-semibold">
              {event.sub_type}
            </span>
          )}
          {/* US11: Route profile badge */}
          {event.route_profile && (
            <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${getRouteProfileColor(event.route_profile)}`}>
              {event.route_profile}
            </span>
          )}
          {/* US1: Route info altijd tonen (met fallback) */}
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <MapPin className="w-3 h-3" />
            <span>
              {event.route_name || event.route || event.title || 'Route info niet beschikbaar'}
            </span>
            {event.route_world && (
              <span className="text-gray-400">• {event.route_world}</span>
            )}
          </div>
          {/* Distance */}
          {distance !== '-' && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="font-semibold">{distance}</span>
              {/* US2: Laps toevoegen als beschikbaar */}
              {event.laps && event.laps > 1 && (
                <span className="text-gray-500">({event.laps} laps)</span>
              )}
            </div>
          )}
          {/* US1: Elevation apart en prominent */}
          {event.elevation_m && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="font-semibold">↑ {Math.round(event.elevation_m)}m</span>
            </div>
          )}
        </div>

        {/* US2/US3: Signups with icons */}
        <div className="space-y-2">
          {/* US3: Altijd total signups tonen (ook 0) */}
          <div className="flex items-center gap-3">
            {/* US2: Total signups (inclusief team riders) */}
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="font-semibold text-gray-700">
                {totalSignups}
              </span>
            </div>
            
            {/* US2: Team riders apart weergeven (alleen als > 0) */}
            {teamRiderCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <UserCheck className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-orange-600">
                  {teamRiderCount}
                </span>
              </div>
            )}
          </div>
            
          {/* US2 & US3: Signups per categorie - altijd alle categorieën tonen met kleuren */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['A+', 'A', 'B', 'C', 'D', 'E'].map((cat) => {
              const count = event.signups_by_category?.[cat] || 0;
              const categoryStyle = ZP_CATEGORIES[cat] || ZP_CATEGORIES['E'];
              return (
                <span
                  key={cat}
                  className={`text-xs px-2 py-0.5 rounded border font-semibold ${categoryStyle.color}`}
                >
                  {cat}: {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* US2: Team Riders per Categorie */}
        {event.team_signups_by_category && Object.keys(event.team_signups_by_category).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
            >
              {expanded ? '▼' : '▶'} Team Riders per Categorie ({event.team_rider_count || 0})
            </button>
            
            {expanded && (
              <div className="mt-3 space-y-3">
                {Object.entries(event.team_signups_by_category).map(([category, riders]) => (
                  <div key={category} className="">
                    <div className="text-xs font-bold text-gray-500 mb-1.5">Categorie {category}</div>
                    <div className="space-y-1.5">
                      {/* US8: Team riders zonder W/kg en vELO */}
                      {riders.map((rider: TeamSignup) => (
                        <div key={rider.rider_id} className="text-sm bg-orange-50 rounded px-3 py-2">
                          <div className="font-semibold text-gray-900">{rider.rider_name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      {event.event_url && (
        <div className="bg-gray-50 px-6 py-3">
          <a
            href={event.event_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            Bekijk op ZwiftRacing
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}

