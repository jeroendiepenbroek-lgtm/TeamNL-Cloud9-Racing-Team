import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Calendar, MapPin, Users, Medal } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface RaceResult {
  event_id: number;
  event_name: string;
  event_date: string;
  event_type: string;
  rider_id: number;
  rider_name: string;
  position: number;
  category: string;
  avg_wkg?: number;
  avg_power?: number;
}

interface GroupedRace {
  eventId: number;
  eventName: string;
  eventDate: string;
  eventType: string;
  teamRiders: RaceResult[];
  bestPosition: number;
  totalTeamRiders: number;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Vandaag';
  if (diffDays === 1) return 'Gisteren';
  if (diffDays < 7) return `${diffDays} dagen geleden`;
  
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const TeamRaceResults: React.FC = () => {
  const [races, setRaces] = useState<GroupedRace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRaceResults();
  }, []);

  const fetchRaceResults = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/api/results/team-races`);
      const data = await response.json();
      
      if (data.success) {
        // Group results by event
        const grouped = new Map<number, GroupedRace>();
        
        data.results.forEach((result: RaceResult) => {
          if (!grouped.has(result.event_id)) {
            grouped.set(result.event_id, {
              eventId: result.event_id,
              eventName: result.event_name,
              eventDate: result.event_date,
              eventType: result.event_type,
              teamRiders: [],
              bestPosition: result.position,
              totalTeamRiders: 0
            });
          }
          
          const race = grouped.get(result.event_id)!;
          race.teamRiders.push(result);
          race.bestPosition = Math.min(race.bestPosition, result.position);
          race.totalTeamRiders++;
        });
        
        // Convert to array and sort by date (newest first)
        const racesArray = Array.from(grouped.values()).sort((a, b) => 
          new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
        );
        
        setRaces(racesArray);
      } else {
        setError(data.error || 'Geen race resultaten gevonden');
      }
    } catch (err: any) {
      setError(err.message || 'Kon race resultaten niet laden');
    } finally {
      setLoading(false);
    }
  };

  const getPositionBadge = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    if (position <= 10) return '🔟';
    return '📍';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mb-4"></div>
          <p className="text-white text-lg">Race resultaten laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-red-500 text-3xl">⚠️</div>
            <h3 className="text-xl font-bold text-white">Fout bij laden</h3>
          </div>
          <p className="text-red-200 mb-4">{error}</p>
          <button
            onClick={fetchRaceResults}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
          >
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  const totalRaces = races.length;
  const totalWins = races.filter(r => r.bestPosition === 1).length;
  const totalPodiums = races.filter(r => r.bestPosition <= 3).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-500 rounded-xl">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white">
                Cloud9 Team Results
              </h1>
              <p className="text-gray-300 text-lg mt-1">
                Races waar team riders aan hebben deelgenomen (laatste 90 dagen)
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-blue-400" />
              <span className="text-gray-300 text-sm font-medium">Total Races</span>
            </div>
            <p className="text-4xl font-black text-white">{totalRaces}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Medal className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-300 text-sm font-medium">Total Wins</span>
            </div>
            <p className="text-4xl font-black text-white">{totalWins}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Medal className="w-5 h-5 text-orange-400" />
              <span className="text-gray-300 text-sm font-medium">Total Podiums</span>
            </div>
            <p className="text-4xl font-black text-white">{totalPodiums}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <span className="text-gray-300 text-sm font-medium">Avg vELO</span>
            </div>
            <p className="text-4xl font-black text-white">1373</p>
          </div>
        </div>

        {/* Race Cards */}
        {races.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-12 text-center border border-white/20">
            <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Geen races gevonden</h3>
            <p className="text-gray-400">
              De race scanner is nog bezig met het verzamelen van resultaten, of er zijn nog geen races in de afgelopen 90 dagen.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {races.map((race) => (
              <div
                key={race.eventId}
                onClick={() => navigate(`/results/event/${race.eventId}`)}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:border-orange-500 hover:bg-white/20 transition-all cursor-pointer group"
              >
                {/* Race Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition">
                      {race.eventName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(race.eventDate)}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {race.eventType}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {race.totalTeamRiders} team {race.totalTeamRiders === 1 ? 'rider' : 'riders'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Best Position Badge */}
                  <div className="flex items-center gap-2 bg-orange-500/20 rounded-lg px-4 py-2 border border-orange-500/30">
                    <span className="text-2xl">{getPositionBadge(race.bestPosition)}</span>
                    <div>
                      <p className="text-xs text-orange-300 font-medium">Beste positie</p>
                      <p className="text-lg font-black text-white">#{race.bestPosition}</p>
                    </div>
                  </div>
                </div>

                {/* Team Riders in this Race */}
                <div className="space-y-2">
                  {race.teamRiders
                    .sort((a, b) => a.position - b.position)
                    .map((rider) => (
                      <div
                        key={rider.rider_id}
                        className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-xl">{getPositionBadge(rider.position)}</span>
                          <div>
                            <p className="text-white font-semibold">{rider.rider_name}</p>
                            <p className="text-xs text-gray-400">{rider.category}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          {rider.avg_wkg && (
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Avg W/kg</p>
                              <p className="text-sm font-bold text-cyan-400">{rider.avg_wkg.toFixed(1)}</p>
                            </div>
                          )}
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Positie</p>
                            <p className="text-lg font-black text-white">#{rider.position}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamRaceResults;
