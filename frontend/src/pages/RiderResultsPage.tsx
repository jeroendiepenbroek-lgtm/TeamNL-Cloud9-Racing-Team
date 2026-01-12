import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, Trophy, TrendingUp, Calendar, Zap, Award, Target } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface RiderStats {
  riderId: number;
  riderName: string;
  totalRaces: number;
  totalWins: number;
  totalPodiums: number;
  winRate: number;
  podiumRate: number;
  avgPosition: number;
  bestPosition: number;
  currentVelo: number;
  veloChange30d?: number;
  avgWkg: number;
  avgHR?: number;
}

interface RaceHistory {
  eventId: string;
  eventName: string;
  eventDate: string;
  position: number;
  totalRiders: number;
  category: string;
  timeSeconds: number;
  avgWkg: number;
  veloRating: number;
  veloChange?: number;
  dnf: boolean;
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

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

const RiderResultsPage: React.FC = () => {
  const params = useParams<{ riderId: string }>();
  // Default to rider 150437 if no riderId in URL
  const riderId = params.riderId || '150437';
  const navigate = useNavigate();
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [history, setHistory] = useState<RaceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeHistory] = useState(true);

  useEffect(() => {
    fetchRiderResults();
  }, [riderId]);

  const fetchRiderResults = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_BASE}/api/results/rider/${riderId}${includeHistory ? '?includeHistory=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setHistory(data.history || []);
      } else {
        setError(data.error || 'Failed to load rider results');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load rider results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-semibold">Loading rider results...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Rider Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'Could not load rider results'}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/')}
            className="mb-4 flex items-center gap-2 text-blue-100 hover:text-white transition"
          >
            ← Back to Dashboard
          </button>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black mb-2">Race Results</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100">
                <span className="flex items-center gap-2">
                  Rider {stats.riderId}
                </span>
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  {stats.totalRaces} races • Last 90 days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="text-3xl font-black text-gray-900">{stats.totalWins}</div>
            <div className="text-sm text-gray-600">Wins</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 text-orange-500" />
            </div>
            <div className="text-3xl font-black text-gray-900">{stats.totalPodiums}</div>
            <div className="text-sm text-gray-600">Podiums</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-3xl font-black text-gray-900">{stats.avgPosition.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Avg Position</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8 text-purple-500" />
            </div>
            <div className="text-3xl font-black text-gray-900">{stats.avgWkg.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Avg W/kg</div>
          </div>
        </div>
      </div>

      {/* Results Table - ZwiftRacing.app Style */}
      <div className="max-w-full mx-auto px-4">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Race Results
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({history.length} races in last 90 days)
              </span>
            </h2>
          </div>

          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      vELO
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Pos
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[250px]">
                      Event
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Avg
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((race, idx) => {
                    const veloTrend = race.veloChange 
                      ? (race.veloChange > 0 ? '▲' : race.veloChange < 0 ? '▼' : '—')
                      : '—';
                    const veloColor = race.veloChange && race.veloChange !== 0
                      ? (race.veloChange > 0 ? 'text-green-600' : 'text-red-600')
                      : 'text-gray-400';
                    
                    return (
                      <tr 
                        key={idx}
                        className={`hover:bg-blue-50 transition cursor-pointer ${
                          race.position <= 3 ? 'bg-yellow-50' : ''
                        }`}
                        onClick={() => navigate(`/results/event/${race.eventId}`)}
                      >
                        {/* vELO Column */}
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 border-2 border-purple-300">
                              <span className="text-sm font-bold text-purple-700">
                                {Math.round(race.veloRating)}
                              </span>
                            </div>
                            <span className={`text-lg font-bold ${veloColor}`}>
                              {veloTrend}
                            </span>
                          </div>
                        </td>

                        {/* Position Column */}
                        <td className="px-3 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1">
                              {race.position === 1 && <span className="text-xl">🏆</span>}
                              {race.position === 2 && <span className="text-xl">🥈</span>}
                              {race.position === 3 && <span className="text-xl">🥉</span>}
                              <span className={`text-lg font-bold ${
                                race.position <= 3 ? 'text-orange-600' : 'text-gray-700'
                              }`}>
                                {race.position}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">/ {race.totalRiders}</span>
                          </div>
                        </td>

                        {/* Date Column */}
                        <td className="px-3 py-4 text-gray-700">
                          {formatDate(race.eventDate)}
                        </td>

                        {/* Event Column */}
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded font-bold text-xs ${
                              race.category === 'A' ? 'bg-red-500 text-white' :
                              race.category === 'B' ? 'bg-green-500 text-white' :
                              race.category === 'C' ? 'bg-blue-500 text-white' :
                              race.category === 'D' ? 'bg-yellow-500 text-white' :
                              'bg-gray-500 text-white'
                            }`}>
                              {race.category}
                            </span>
                            <Link
                              to={`/results/event/${race.eventId}`}
                              className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {race.eventName}
                            </Link>
                            <div className="flex items-center gap-2 ml-auto">
                              <span className="text-xs text-gray-500">👤</span>
                              <span className="text-xs text-gray-500">🚴</span>
                            </div>
                          </div>
                        </td>

                        {/* Avg W/kg Column */}
                        <td className="px-3 py-4 text-center">
                          <span className="font-bold text-gray-900">
                            {race.avgWkg?.toFixed(3) || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-5xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Events Yet</h3>
              <p className="text-gray-600">Race events will appear here once available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiderResultsPage;
