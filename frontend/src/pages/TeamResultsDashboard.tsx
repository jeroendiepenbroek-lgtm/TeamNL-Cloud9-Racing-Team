import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, Award, Target, Users } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface TeamRiderStats {
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
  lastRaceDate?: string;
}

type SortField = 'riderName' | 'totalRaces' | 'totalWins' | 'totalPodiums' | 'winRate' | 'podiumRate' | 'avgPosition' | 'currentVelo';
type SortDirection = 'asc' | 'desc';

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const TeamResultsDashboard: React.FC = () => {
  const [riders, setRiders] = useState<TeamRiderStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('totalRaces');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTeamResults();
  }, []);

  const fetchTeamResults = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/results/team`);
      const data = await response.json();
      
      if (data.success) {
        setRiders(data.riders);
      } else {
        setError(data.error || 'Failed to load team results');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load team results');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedRiders = [...riders]
    .filter(rider => 
      rider.riderName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

  const totalRaces = riders.reduce((sum, r) => sum + r.totalRaces, 0);
  const totalWins = riders.reduce((sum, r) => sum + r.totalWins, 0);
  const totalPodiums = riders.reduce((sum, r) => sum + r.totalPodiums, 0);
  const avgVelo = riders.length > 0 
    ? riders.reduce((sum, r) => sum + r.currentVelo, 0) / riders.length 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-semibold">Loading team results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Results</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchTeamResults}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black mb-2">Cloud9 Team Results</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-orange-100">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {riders.length} Active Riders
                </span>
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  {totalRaces} Total Races
                </span>
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  {totalWins} Wins · {totalPodiums} Podiums
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Stats */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-600">Total Races</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{totalRaces}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-sm font-semibold text-gray-600">Total Wins</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{totalWins}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm font-semibold text-gray-600">Total Podiums</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{totalPodiums}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-semibold text-gray-600">Avg vELO</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{Math.round(avgVelo)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <input
            type="text"
            placeholder="Search riders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Riders Table */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th
                    onClick={() => handleSort('riderName')}
                    className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 transition"
                  >
                    Rider {sortField === 'riderName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('totalRaces')}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 transition"
                  >
                    Races {sortField === 'totalRaces' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('totalWins')}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 transition"
                  >
                    Wins {sortField === 'totalWins' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('totalPodiums')}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 transition"
                  >
                    Podiums {sortField === 'totalPodiums' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('winRate')}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 transition"
                  >
                    Win % {sortField === 'winRate' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('podiumRate')}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 transition"
                  >
                    Podium % {sortField === 'podiumRate' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('avgPosition')}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 transition"
                  >
                    Avg Pos {sortField === 'avgPosition' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('currentVelo')}
                    className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase cursor-pointer hover:bg-gray-200 transition"
                  >
                    vELO {sortField === 'currentVelo' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                    Last Race
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRiders.map((rider, idx) => (
                  <tr
                    key={rider.riderId}
                    className={`border-b border-gray-100 hover:bg-orange-50 transition ${
                      idx < 3 ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/results/rider/${rider.riderId}`}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {rider.riderName}
                      </Link>
                      {idx < 3 && (
                        <span className="ml-2 text-lg">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">
                      {rider.totalRaces}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-yellow-600">
                      {rider.totalWins}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-orange-600">
                      {rider.totalPodiums}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-sm font-bold ${
                        rider.winRate >= 0.3 ? 'bg-green-100 text-green-700' :
                        rider.winRate >= 0.1 ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {(rider.winRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-sm font-bold ${
                        rider.podiumRate >= 0.5 ? 'bg-green-100 text-green-700' :
                        rider.podiumRate >= 0.3 ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {(rider.podiumRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900">
                      #{rider.avgPosition.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-gray-900">
                          {Math.round(rider.currentVelo)}
                        </span>
                        {rider.veloChange30d && rider.veloChange30d !== 0 && (
                          <span className={`text-xs font-semibold ${
                            rider.veloChange30d > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {rider.veloChange30d > 0 ? '+' : ''}{rider.veloChange30d}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {rider.lastRaceDate ? formatDate(rider.lastRaceDate) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sortedRiders.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center mt-6">
            <div className="text-gray-400 text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Riders Found</h3>
            <p className="text-gray-600">Try adjusting your search term.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamResultsDashboard;
