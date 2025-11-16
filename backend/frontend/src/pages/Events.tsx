/**
 * Feature: Events Page - REBUILT
 * US1-US12: Complete event cards rebuild met team signups
 * - US5: 48h lookforward
 * - US6: Aparte view voor team events
 * - US7: Tijd refresh elke minuut
 * - US8-US9: Smart signup refresh (≤1u = 10min, >1u = 60min)
 */

import { useEffect, useState } from 'react';
import { Clock, Calendar, MapPin, Users, ExternalLink, UserCheck, TrendingUp } from 'lucide-react';

// US11: ZP Categories met JUISTE kleuren volgens de image
const ZP_CATEGORIES: Record<string, { color: string; label: string; bgClass: string; textClass: string; borderClass: string }> = {
  'A': { 
    color: 'bg-red-50 text-red-800 border-red-200', 
    label: 'A',
    bgClass: 'bg-red-50',
    textClass: 'text-red-800',
    borderClass: 'border-red-200'
  },
  'B': { 
    color: 'bg-green-50 text-green-800 border-green-200', 
    label: 'B',
    bgClass: 'bg-green-50',
    textClass: 'text-green-800',
    borderClass: 'border-green-200'
  },
  'C': { 
    color: 'bg-blue-50 text-blue-800 border-blue-200', 
    label: 'C',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-800',
    borderClass: 'border-blue-200'
  },
  'D': { 
    color: 'bg-yellow-50 text-yellow-800 border-yellow-200', 
    label: 'D',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-800',
    borderClass: 'border-yellow-200'
  },
  'E': { 
    color: 'bg-purple-50 text-purple-800 border-purple-200', 
    label: 'E',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-800',
    borderClass: 'border-purple-200'
  },
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

interface EventsProps {
  readOnly?: boolean
}

export default function Events({ readOnly = false }: EventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'team'>('team'); // US6: Default = team events

  useEffect(() => {
    fetchUpcomingEvents();
    
    // US7: Refresh timers every minute (forces re-render for countdown)
    const timerInterval = setInterval(() => {
      setEvents(prev => [...prev]); // Force re-render to update timers
    }, 60 * 1000);
    
    // US8-US9: Smart refresh logic voor signup updates
    // US8: Events ≤1u voor start = refresh elke 10min
    // US9: Events >1u voor start = refresh elk uur
    // Implementatie: 10min refresh (dekken beide cases af)
    const smartRefreshInterval = setInterval(() => {
      fetchUpcomingEvents();
    }, 10 * 60 * 1000); // 10 minuten
    
    return () => {
      clearInterval(timerInterval);
      clearInterval(smartRefreshInterval);
    };
  }, [filter]); // Re-fetch when filter changes

  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true);
      // US5: Fetch events for next 48 hours
      const response = await fetch(`/api/events/upcoming?hours=48`);
      
      if (!response.ok) {
        throw new Error('Fout bij ophalen events');
      }
      
      const data = await response.json();
      let allEvents = data.events || [];
      
      // US6: Apply filter client-side
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
      {/* Archive Banner */}
      {readOnly && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mx-auto max-w-7xl mt-4">
          <div className="flex items-center gap-2">
            <span className="text-amber-700 font-bold">📦 Archief Modus</span>
            <span className="text-amber-600 text-sm">Alleen-lezen versie voor referentie</span>
          </div>
        </div>
      )}
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

          {/* US6: Filter Tabs - Aparte view voor team events */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setFilter('team')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'team'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <UserCheck className="inline w-4 h-4 mr-2" />
              Met Team Riders
              {filter === 'team' && events.length > 0 && (
                <span className="ml-2 bg-orange-600 text-white px-2 py-0.5 rounded-full text-xs">
                  {events.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-white text-orange-600 shadow-md'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Calendar className="inline w-4 h-4 mr-2" />
              Alle Events
              {filter === 'all' && events.length > 0 && (
                <span className="ml-2 bg-orange-600 text-white px-2 py-0.5 rounded-full text-xs">
                  {events.length}
                </span>
              )}
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
  
  // US4: Extract signup counts (totaal inclusief team)
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

  // US10: Route profile badge - Professioneel en subtiel
  const getRouteProfileBadge = (profile?: string) => {
    if (!profile) return null;
    
    const profiles: Record<string, { icon: string; color: string; label: string }> = {
      'flat': { 
        icon: '─', 
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Flat'
      },
      'rolling': { 
        icon: '〰', 
        color: 'bg-sky-50 text-sky-700 border-sky-200',
        label: 'Rolling'
      },
      'hilly': { 
        icon: '⌃', 
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Hilly'
      },
      'mountainous': { 
        icon: '▲', 
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        label: 'Mountain'
      },
    };
    
    const config = profiles[profile.toLowerCase()];
    if (!config) return null;
    
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${config.color}`}>
        <span className="text-sm">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const isStartingSoon = () => {
    const match = timeUntil.match(/^(\d+)([um])/);
    if (!match) return false;
    const [, value, unit] = match;
    return (unit === 'u' && parseInt(value) < 2) || (unit === 'm');
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-orange-300">
      {/* Card Header */}
      <div className="p-5">
        {/* US7: Time Until Event - Updates every minute */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-3 ${
          isStartingSoon()
            ? 'bg-red-100 text-red-700 animate-pulse'
            : 'bg-orange-100 text-orange-700'
        }`}>
          <Clock className="w-4 h-4" />
          {timeUntil}
        </div>

        {/* US1: Event Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {event.name || event.title}
        </h3>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Calendar className="w-4 h-4" />
          {formattedDate}
        </div>

        {/* US3: Route info & US10: Route profile badge */}
        <div className="space-y-2 mb-4">
          {/* Route Name & World */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">
                {event.route_name || 'Route naam niet beschikbaar'}
              </div>
              {event.route_world && (
                <div className="text-xs text-gray-500">
                  {event.route_world}
                </div>
              )}
            </div>
          </div>

          {/* Distance, Elevation & Profile Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {distance !== '-' && (
              <span className="text-sm font-semibold text-gray-700">
                {distance}
              </span>
            )}
            {event.elevation_m && (
              <span className="text-sm text-gray-600">
                <TrendingUp className="inline w-3.5 h-3.5 mr-0.5" />
                {Math.round(event.elevation_m)}m
              </span>
            )}
            {event.laps && event.laps > 1 && (
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                {event.laps} laps
              </span>
            )}
            {/* US10: Route Profile Badge */}
            {getRouteProfileBadge(event.route_profile)}
          </div>
        </div>

        {/* Event Type & Sub Type */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {event.event_type && (
            <span className={`text-xs px-2 py-1 rounded border font-semibold ${getEventTypeColor(event.event_type)}`}>
              {event.event_type}
            </span>
          )}
          {event.sub_type && (
            <span className="text-xs px-2 py-1 rounded border bg-purple-50 text-purple-800 border-purple-200 font-semibold">
              {event.sub_type}
            </span>
          )}
        </div>

        {/* US4: Sign-ups - Total & Team */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-3">
            {/* US4: Total signups (inclusief team riders) */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Totaal:</span>
              <span className="font-bold text-gray-900 text-lg">
                {totalSignups}
              </span>
            </div>
            
            {/* US4: Team riders apart (alleen tonen als > 0) */}
            {teamRiderCount > 0 && (
              <div className="flex items-center gap-2 bg-orange-100 px-3 py-1 rounded-md">
                <UserCheck className="w-4 h-4 text-orange-700" />
                <span className="text-sm text-orange-700 font-medium">Team:</span>
                <span className="font-bold text-orange-800 text-lg">
                  {teamRiderCount}
                </span>
              </div>
            )}
          </div>
            
          {/* US11: Signups per categorie met JUISTE KLEUREN (A t/m E) */}
          <div className="flex flex-wrap gap-1.5">
            {['A', 'B', 'C', 'D', 'E'].map((cat) => {
              const count = event.signups_by_category?.[cat] || 0;
              const categoryStyle = ZP_CATEGORIES[cat] || ZP_CATEGORIES['E'];
              return (
                <span
                  key={cat}
                  className={`text-xs px-2.5 py-1 rounded border font-semibold ${categoryStyle.color}`}
                >
                  {cat}: {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* US12: Team Riders List - Namen van team sign-ups */}
        {event.team_signups_by_category && Object.keys(event.team_signups_by_category).length > 0 && (
          <div className="border-t border-gray-200 pt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-left text-sm font-semibold text-orange-700 hover:text-orange-800 flex items-center justify-between group"
            >
              <span className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Mijn Team Riders ({teamRiderCount})
              </span>
              <span className="text-xs text-gray-400 group-hover:text-orange-600 transition-colors">
                {expanded ? '▲ Verberg' : '▼ Toon'}
              </span>
            </button>
            
            {expanded && (
              <div className="mt-3 space-y-2.5">
                {Object.entries(event.team_signups_by_category)
                  .sort(([catA], [catB]) => catA.localeCompare(catB))
                  .map(([category, riders]) => {
                    const categoryStyle = ZP_CATEGORIES[category] || ZP_CATEGORIES['E'];
                    return (
                      <div key={category} className="bg-gray-50 rounded-lg p-3">
                        {/* US11: Categorie badge met juiste kleuren */}
                        <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border font-bold mb-2 ${categoryStyle.color}`}>
                          Cat {category}
                          <span className="font-normal">({riders.length})</span>
                        </div>
                        <div className="space-y-1.5 mt-2">
                          {/* US12: Team riders namen (zonder extra stats) */}
                          {riders.map((rider: TeamSignup) => (
                            <div 
                              key={rider.rider_id} 
                              className={`text-sm rounded px-3 py-1.5 border ${categoryStyle.bgClass} ${categoryStyle.borderClass}`}
                            >
                              <div className={`font-semibold ${categoryStyle.textClass}`}>
                                {rider.rider_name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {/* Sign-up Link */}
          <a
            href={`https://www.zwift.com/events/view/${event.event_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
          >
            Sign Up
            <ExternalLink className="w-4 h-4" />
          </a>
          
          {/* ZwiftRacing Link */}
          {event.event_url && (
            <a
              href={event.event_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
              Bekijk op ZwiftRacing
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

