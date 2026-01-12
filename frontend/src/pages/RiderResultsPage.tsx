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
            onClick={() => navigate('/results')}
            className="mb-4 flex items-center gap-2 text-blue-100 hover:text-white transition"
          >
            ← Back to Results
          </button>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black mb-2">{stats.riderName}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-blue-100">
                <span className="flex items-center gap-2">
                  Rider ID: {stats.riderId}
                </span>
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  {stats.totalRaces} races
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Races */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-600">Total Races</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{stats.totalRaces}</p>
          </div>

          {/* Wins */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-sm font-semibold text-gray-600">Wins</span>
            </div>
            <p className="text-3xl font-black text-gray-900">
              {stats.totalWins}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({(stats.winRate * 100).toFixed(1)}%)
              </span>
            </p>
          </div>

          {/* Podiums */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm font-semibold text-gray-600">Podiums</span>
            </div>
            <p className="text-3xl font-black text-gray-900">
              {stats.totalPodiums}
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({(stats.podiumRate * 100).toFixed(1)}%)
              </span>
            </p>
          </div>

          {/* vELO Rating */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-semibold text-gray-600">vELO Rating</span>
            </div>
            <p className="text-3xl font-black text-gray-900">
              {Math.round(stats.currentVelo)}
              {stats.veloChange30d && stats.veloChange30d !== 0 && (
                <span className={`text-sm font-semibold ml-2 ${
                  stats.veloChange30d > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.veloChange30d > 0 ? '+' : ''}{stats.veloChange30d}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-semibold text-gray-600">Avg Power</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{stats.avgWkg.toFixed(2)} W/kg</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-gray-600">Best Position</span>
            </div>
            <p className="text-2xl font-black text-gray-900">
              {stats.bestPosition === 1 ? '🥇' : stats.bestPosition === 2 ? '🥈' : stats.bestPosition === 3 ? '🥉' : ''} #{stats.bestPosition}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-semibold text-gray-600">Avg Position</span>
            </div>
            <p className="text-2xl font-black text-gray-900">#{stats.avgPosition.toFixed(1)}</p>
          </div>
        </div>

        {/* Race History */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Race History
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({history.length} races)
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Event</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Pos</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Cat</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Time</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">W/kg</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">vELO</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((race, idx) => {
                    const positionIcon = race.position === 1 ? '🥇' : race.position === 2 ? '🥈' : race.position === 3 ? '🥉' : null;
                    
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-gray-100 hover:bg-blue-50 transition ${
                          race.position <= 3 ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(race.eventDate)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/results/event/${race.eventId}`}
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {race.eventName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {positionIcon && <span className="text-lg">{positionIcon}</span>}
                            <span className={`font-bold ${race.position <= 3 ? 'text-orange-600' : 'text-gray-700'}`}>
                              {race.position}/{race.totalRiders}
                            </span>
                            {race.dnf && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">DNF</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded font-bold text-xs ${
                            race.category === 'A' ? 'bg-red-100 text-red-700' :
                            race.category === 'B' ? 'bg-green-100 text-green-700' :
                            race.category === 'C' ? 'bg-blue-100 text-blue-700' :
                            race.category === 'D' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {race.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                          {formatTime(race.timeSeconds)}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">
                          {race.avgWkg?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-gray-900">{Math.round(race.veloRating)}</span>
                            {race.veloChange && race.veloChange !== 0 && (
                              <span className={`text-xs font-semibold ${
                                race.veloChange > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {race.veloChange > 0 ? '+' : ''}{race.veloChange}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Race History Yet</h3>
            <p className="text-gray-600">Race history will appear here once available in the database.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderResultsPage;
