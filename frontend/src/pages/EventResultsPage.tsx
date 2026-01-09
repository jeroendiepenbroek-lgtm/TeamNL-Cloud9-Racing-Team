import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, TrendingUp, Trophy, Heart } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface EventResult {
  position: number;
  riderId: number;
  riderName: string;
  teamName?: string;
  category: string;
  pen: string;
  timeSeconds: number;
  deltaWinnerSeconds?: number;
  avgWkg: number;
  avgPowerWatts?: number;
  heartrateAvg?: number;
  heartrateMax?: number;
  power5s?: number;
  power15s?: number;
  power30s?: number;
  power1m?: number;
  power2m?: number;
  power5m?: number;
  power20m?: number;
  veloRating?: number;
  veloChange?: number;
  dnf: boolean;
  positionInCategory?: number;
  penTotal?: number;
}

interface EventData {
  eventId: string;
  eventName: string;
  eventDate: string;
  routeName?: string;
  routeWorld?: string;
  distanceKm?: number;
  elevationM?: number;
  laps?: number;
  eventType?: string;
  totalRiders?: number;
  results: EventResult[];
}

const formatTime = (seconds: number): string => {
  if (!seconds) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatDelta = (seconds?: number): string => {
  if (!seconds || seconds === 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `+${mins}:${secs.toString().padStart(2, '0')}` : `+${secs}s`;
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const EventResultsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showCloud9Only, setShowCloud9Only] = useState(false);

  useEffect(() => {
    fetchEventResults();
  }, [eventId]);

  const fetchEventResults = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/results/event/${eventId}`);
      const data = await response.json();
      
      if (data.success) {
        setEvent(data.event);
      } else {
        setError(data.error || 'Failed to load event results');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load event results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-semibold">Loading event results...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'Could not load event results'}</p>
          <button
            onClick={() => navigate('/results')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            ← Back to Results
          </button>
        </div>
      </div>
    );
  }

  const categories = ['all', ...Array.from(new Set(event.results.map(r => r.pen)))];
  const filteredResults = event.results.filter(result => {
    if (filterCategory !== 'all' && result.pen !== filterCategory) return false;
    if (showCloud9Only && !result.teamName?.includes('Cloud9') && !result.teamName?.includes('TeamNL')) return false;
    return true;
  });

  const cloud9Count = event.results.filter(r => 
    r.teamName?.includes('Cloud9') || r.teamName?.includes('TeamNL')
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/results')}
            className="mb-4 flex items-center gap-2 text-blue-100 hover:text-white transition"
          >
            ← Back to Results
          </button>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black mb-2">{event.eventName}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(event.eventDate)}
                </span>
                {event.routeWorld && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {event.routeWorld} {event.routeName && `· ${event.routeName}`}
                  </span>
                )}
                {event.distanceKm && (
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {event.distanceKm} km {event.elevationM && `· ${event.elevationM}m ↑`}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {event.totalRiders || event.results.length} riders
                  {cloud9Count > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-orange-500 rounded text-xs font-bold">
                      {cloud9Count} Cloud9
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Category:</span>
            <div className="flex gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${
                    filterCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'all' ? 'All' : `Cat ${cat}`}
                </button>
              ))}
            </div>
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCloud9Only}
              onChange={(e) => setShowCloud9Only(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded"
            />
            <span className="text-sm font-semibold text-gray-700">Cloud9 Only</span>
          </label>
          
          <div className="ml-auto text-sm text-gray-600">
            Showing <span className="font-bold">{filteredResults.length}</span> of {event.results.length} results
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Pos</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Rider</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Cat</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Time</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Δ</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">W/kg</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">HR Avg</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">vELO</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result, idx) => {
                  const isCloud9 = result.teamName?.includes('Cloud9') || result.teamName?.includes('TeamNL');
                  const positionIcon = result.position === 1 ? '🥇' : result.position === 2 ? '🥈' : result.position === 3 ? '🥉' : null;
                  
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-gray-100 hover:bg-blue-50 transition ${
                        isCloud9 ? 'bg-orange-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center gap-2">
                          {positionIcon && <span className="text-xl">{positionIcon}</span>}
                          <span className={`font-bold ${result.position <= 3 ? 'text-orange-600' : 'text-gray-700'}`}>
                            {result.position}
                          </span>
                          {result.dnf && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">DNF</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/results/rider/${result.riderId}`}
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {result.riderName}
                        </Link>
                        {isCloud9 && (
                          <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded font-bold">
                            Cloud9
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded font-bold text-xs ${
                          result.pen === 'A' ? 'bg-red-100 text-red-700' :
                          result.pen === 'B' ? 'bg-green-100 text-green-700' :
                          result.pen === 'C' ? 'bg-blue-100 text-blue-700' :
                          result.pen === 'D' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {result.pen}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                        {formatTime(result.timeSeconds)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-gray-600">
                        {formatDelta(result.deltaWinnerSeconds)}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">
                        {result.avgWkg?.toFixed(2) || '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        {result.heartrateAvg ? (
                          <span className="flex items-center justify-center gap-1">
                            <Heart className="w-3 h-3 text-red-500" />
                            {result.heartrateAvg}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {result.veloRating ? (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-gray-900">{Math.round(result.veloRating)}</span>
                            {result.veloChange && result.veloChange !== 0 && (
                              <span className={`text-xs font-semibold ${
                                result.veloChange > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {result.veloChange > 0 ? '+' : ''}{result.veloChange}
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventResultsPage;
