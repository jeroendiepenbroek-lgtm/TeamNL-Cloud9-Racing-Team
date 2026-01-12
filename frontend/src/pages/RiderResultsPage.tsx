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

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Events
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({history.length} races in last 90 days)
              </span>
            </h2>
          </div>

          {history.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {history.map((race, idx) => {
                const positionIcon = race.position === 1 ? '🥇' : race.position === 2 ? '🥈' : race.position === 3 ? '🥉' : null;
                const positionColor = race.position <= 3 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white';
                
                return (
                  <div
                    key={idx}
                    onClick={() => navigate(`/results/event/${race.eventId}`)}
                    className={`border-2 ${positionColor} rounded-lg p-5 hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02]`}
                  >
                    {/* Event Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">
                          {race.eventName}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {formatDate(race.eventDate)}
                        </p>
                      </div>
                      {positionIcon && (
                        <span className="text-3xl ml-2">{positionIcon}</span>
                      )}
                    </div>

                    {/* Position Badge */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                        race.position <= 3 
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <span className="text-2xl font-black">{race.position}</span>
                        <span className="text-sm font-medium">/ {race.totalRiders}</span>
                      </div>
                      
                      <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                        race.category === 'A' ? 'bg-red-100 text-red-700' :
                        race.category === 'B' ? 'bg-green-100 text-green-700' :
                        race.category === 'C' ? 'bg-blue-100 text-blue-700' :
                        race.category === 'D' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        Cat {race.category}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
                      <div>
                        <div className="text-xs text-gray-500">Time</div>
                        <div className="font-mono font-bold text-gray-900">{formatTime(race.timeSeconds)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">W/kg</div>
                        <div className="font-bold text-gray-900">{race.avgWkg?.toFixed(2) || '-'}</div>
                      </div>
                      {race.veloRating > 0 && (
                        <>
                          <div>
                            <div className="text-xs text-gray-500">vELO</div>
                            <div className="font-bold text-gray-900">{Math.round(race.veloRating)}</div>
                          </div>
                          {race.veloChange !== 0 && (
                            <div>
                              <div className="text-xs text-gray-500">Change</div>
                              <div className={`font-bold ${race.veloChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {race.veloChange > 0 ? '+' : ''}{race.veloChange}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Click Indicator */}
                    <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                      <span className="text-xs text-blue-600 font-semibold">
                        View Full Results →
                      </span>
                    </div>
                  </div>
                );
              })}
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
