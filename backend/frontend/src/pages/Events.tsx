/**
 * Feature 1: Events Page
 * Shows upcoming events (48h lookforward) where team riders are registered
 */

import { useEffect, useState } from 'react';
import { Clock, Calendar, MapPin, Users, ExternalLink, TrendingUp } from 'lucide-react';

interface Event {
  event_id: number;
  name: string;
  event_date: string;
  event_type?: string;
  description?: string;
  route?: string;
  distance_meters?: number;
  organizer?: string;
  event_url?: string;
  confirmed_signups?: number;
  tentative_signups?: number;
  total_signups?: number;
  team_riders?: any[];
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'team'>('team');

  useEffect(() => {
    fetchUpcomingEvents();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUpcomingEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchUpcomingEvents = async () => {
    try {
      setLoading(true);
      const hasTeamRiders = filter === 'team';
      const response = await fetch(`/api/events/upcoming?hasTeamRiders=${hasTeamRiders}`);
      
      if (!response.ok) {
        throw new Error('Fout bij ophalen events');
      }
      
      const data = await response.json();
      setEvents(data.events || []);
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

  const formatDistance = (meters?: number): string => {
    if (!meters) return '-';
    const km = (meters / 1000).toFixed(1);
    return `${km} km`;
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard
                key={event.event_id}
                event={event}
                timeUntil={getTimeUntilEvent(event.event_date)}
                formattedDate={formatEventDate(event.event_date)}
                distance={formatDistance(event.distance_meters)}
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

  const isStartingSoon = () => {
    const match = timeUntil.match(/^(\d+)([um])/);
    if (!match) return false;
    const [, value, unit] = match;
    return (unit === 'u' && parseInt(value) < 2) || (unit === 'm');
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      {/* Card Header */}
      <div className="p-6">
        {/* Time Until Event */}
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold mb-3 ${
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
          {event.route && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <MapPin className="w-3 h-3" />
              {event.route}
            </div>
          )}
          {distance !== '-' && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <TrendingUp className="w-3 h-3" />
              {distance}
            </div>
          )}
        </div>

        {/* Signups */}
        {(event.total_signups || 0) > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-700">
              {event.total_signups} ingeschreven
            </span>
            {event.team_riders && event.team_riders.length > 0 && (
              <span className="text-orange-600 font-bold">
                ({event.team_riders.length} team)
              </span>
            )}
          </div>
        )}

        {/* Team Riders Preview */}
        {event.team_riders && event.team_riders.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm text-orange-600 hover:text-orange-700 font-semibold"
            >
              {expanded ? 'Verberg' : 'Toon'} team riders ({event.team_riders.length})
            </button>
            
            {expanded && (
              <div className="mt-2 space-y-1">
                {event.team_riders.map((rider: any) => (
                  <div key={rider.rider_id} className="text-sm flex items-center justify-between">
                    <span className="text-gray-700">{rider.name}</span>
                    {rider.zp_category && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                        Cat {rider.zp_category}
                      </span>
                    )}
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

