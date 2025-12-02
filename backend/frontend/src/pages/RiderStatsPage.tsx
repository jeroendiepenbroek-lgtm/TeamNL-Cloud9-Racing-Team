import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, Zap, Trophy, Activity, Target } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RiderStats {
  rider_id: number;
  name: string;
  avatar_url?: string;
  country_code?: string;
  
  // vELO
  velo_rating: number;
  velo_max_30d?: number;
  velo_max_90d?: number;
  velo_rank?: string;
  
  // Power profile
  power_5s_w?: number;
  power_15s_w?: number;
  power_30s_w?: number;
  power_1m_w?: number;
  power_2m_w?: number;
  power_5m_w?: number;
  power_20m_w?: number;
  power_5s_wkg?: number;
  power_15s_wkg?: number;
  power_30s_wkg?: number;
  power_1m_wkg?: number;
  power_2m_wkg?: number;
  power_5m_wkg?: number;
  power_20m_wkg?: number;
  
  // Phenotype
  phenotype_sprinter?: number;
  phenotype_puncheur?: number;
  phenotype_pursuiter?: number;
  
  // Handicaps
  handicap_flat?: number;
  handicap_rolling?: number;
  handicap_hilly?: number;
  handicap_mountainous?: number;
  
  // Physical
  ftp?: number;
  weight_kg?: number;
  height_cm?: number;
  zp_category?: string;
  
  // Race stats
  race_wins: number;
  race_podiums: number;
  race_count_90d: number;
  race_dnfs: number;
}

export default function RiderStatsPage() {
  const { riderId } = useParams<{ riderId: string }>();
  const navigate = useNavigate();
  
  const { data: rider, isLoading, error } = useQuery<RiderStats>({
    queryKey: ['riderStats', riderId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders/team`);
      const riders = await res.json();
      const found = riders.find((r: any) => r.rider_id === parseInt(riderId!));
      if (!found) throw new Error('Rider not found');
      return found;
    },
    enabled: !!riderId,
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rider stats...</p>
        </div>
      </div>
    );
  }
  
  if (error || !rider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl">Rider not found</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Team
          </button>
        </div>
      </div>
    );
  }
  
  const getVeloTierColor = (tier?: string) => {
    const colors: Record<string, string> = {
      Diamond: 'from-cyan-400 to-blue-600',
      Ruby: 'from-red-400 to-pink-600',
      Emerald: 'from-emerald-400 to-green-600',
      Sapphire: 'from-blue-400 to-indigo-600',
      Amethyst: 'from-purple-400 to-violet-600',
      Cobalt: 'from-blue-500 to-blue-700',
      Bronze: 'from-orange-400 to-amber-600',
    };
    return colors[tier || ''] || 'from-gray-400 to-gray-600';
  };
  
  const getCountryFlag = (code?: string) => {
    if (!code) return '🌍';
    if (code === 'nl' || code === '528') return '🇳🇱';
    return '🌍';
  };
  
  const powerProfile = [
    { duration: '5s', watts: rider.power_5s_w, wkg: rider.power_5s_wkg, label: 'Sprint' },
    { duration: '15s', watts: rider.power_15s_w, wkg: rider.power_15s_wkg, label: 'Attack' },
    { duration: '30s', watts: rider.power_30s_w, wkg: rider.power_30s_wkg, label: 'Anaerobic' },
    { duration: '1min', watts: rider.power_1m_w, wkg: rider.power_1m_wkg, label: 'VO2 Max' },
    { duration: '2min', watts: rider.power_2m_w, wkg: rider.power_2m_wkg, label: 'AC' },
    { duration: '5min', watts: rider.power_5m_w, wkg: rider.power_5m_wkg, label: 'MAP' },
    { duration: '20min', watts: rider.power_20m_w, wkg: rider.power_20m_wkg, label: 'FTP' },
  ];
  
  const maxWatts = Math.max(...powerProfile.map(p => p.watts || 0));
  const maxWkg = Math.max(...powerProfile.map(p => p.wkg || 0));
  
  const wPerKg = rider.ftp && rider.weight_kg ? (rider.ftp / rider.weight_kg).toFixed(2) : null;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Team</span>
          </button>
        </div>
      </div>
      
      {/* Hero Section */}
      <div className={`bg-gradient-to-r ${getVeloTierColor(rider.velo_rank)} text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-start gap-8">
            {/* Avatar */}
            {rider.avatar_url && (
              <img
                src={rider.avatar_url}
                alt={rider.name}
                className="w-32 h-32 rounded-full border-4 border-white shadow-2xl"
              />
            )}
            
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-bold">{rider.name}</h1>
                <span className="text-4xl">{getCountryFlag(rider.country_code)}</span>
              </div>
              
              <div className="flex items-center gap-6 mt-4">
                {/* vELO Badge */}
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
                  <div className="text-sm opacity-90">vELO Rating</div>
                  <div className="text-3xl font-bold">{Math.floor(rider.velo_rating)}</div>
                  <div className="text-sm mt-1">{rider.velo_rank}</div>
                </div>
                
                {/* Category */}
                {rider.zp_category && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
                    <div className="text-sm opacity-90">Category</div>
                    <div className="text-3xl font-bold">{rider.zp_category}</div>
                  </div>
                )}
                
                {/* FTP */}
                {rider.ftp && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
                    <div className="text-sm opacity-90">FTP</div>
                    <div className="text-3xl font-bold">{rider.ftp}W</div>
                    {wPerKg && <div className="text-sm mt-1">{wPerKg} W/kg</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Physical Stats */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Physical Stats</h2>
            </div>
            
            <div className="space-y-4">
              {rider.weight_kg && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Weight</span>
                  <span className="font-semibold text-gray-900">{rider.weight_kg} kg</span>
                </div>
              )}
              {rider.height_cm && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Height</span>
                  <span className="font-semibold text-gray-900">{rider.height_cm} cm</span>
                </div>
              )}
              {wPerKg && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">W/kg</span>
                  <span className="font-semibold text-gray-900">{wPerKg}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Race Performance */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Race Stats (90d)</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Races</span>
                <span className="font-semibold text-gray-900">{rider.race_count_90d}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Wins</span>
                <span className="font-semibold text-green-600">{rider.race_wins}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Podiums</span>
                <span className="font-semibold text-blue-600">{rider.race_podiums}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">DNFs</span>
                <span className="font-semibold text-red-600">{rider.race_dnfs}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-gray-600">Win Rate</span>
                <span className="font-semibold text-gray-900">
                  {rider.race_count_90d > 0 
                    ? `${((rider.race_wins / rider.race_count_90d) * 100).toFixed(1)}%` 
                    : '-'}
                </span>
              </div>
            </div>
          </div>
          
          {/* vELO History */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">vELO Tracking</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Current</span>
                <span className="font-semibold text-gray-900">{Math.floor(rider.velo_rating)}</span>
              </div>
              {rider.velo_max_30d && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">30-day Max</span>
                  <span className="font-semibold text-blue-600">{Math.floor(rider.velo_max_30d)}</span>
                </div>
              )}
              {rider.velo_max_90d && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">90-day Max</span>
                  <span className="font-semibold text-indigo-600">{Math.floor(rider.velo_max_90d)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Power Profile Chart */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <Zap className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Power Profile</h2>
          </div>
          
          <div className="space-y-6">
            {powerProfile.map((point, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900 w-16">{point.duration}</span>
                    <span className="text-sm text-gray-600">{point.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">{point.watts || '-'}W</span>
                    {point.wkg && (
                      <span className="text-sm text-gray-600 ml-3">
                        {point.wkg.toFixed(2)} W/kg
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Bar visualization */}
                <div className="flex gap-2">
                  {/* Watts bar */}
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${((point.watts || 0) / maxWatts) * 100}%` }}
                    />
                  </div>
                  
                  {/* W/kg bar */}
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${((point.wkg || 0) / maxWkg) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-orange-500 rounded"></div>
              <span className="text-sm text-gray-600">Absolute Power (W)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
              <span className="text-sm text-gray-600">Relative Power (W/kg)</span>
            </div>
          </div>
        </div>
        
        {/* Phenotype Scores */}
        {(rider.phenotype_sprinter || rider.phenotype_puncheur || rider.phenotype_pursuiter) && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Rider Type Profile</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {rider.phenotype_sprinter && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Sprinter</span>
                    <span className="text-lg font-bold text-red-600">
                      {rider.phenotype_sprinter.toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-pink-500 h-full rounded-full"
                      style={{ width: `${rider.phenotype_sprinter}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Explosive power ability</p>
                </div>
              )}
              
              {rider.phenotype_puncheur && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Puncheur</span>
                    <span className="text-lg font-bold text-orange-600">
                      {rider.phenotype_puncheur.toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-yellow-500 h-full rounded-full"
                      style={{ width: `${rider.phenotype_puncheur}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Short climb ability</p>
                </div>
              )}
              
              {rider.phenotype_pursuiter && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Pursuiter</span>
                    <span className="text-lg font-bold text-blue-600">
                      {rider.phenotype_pursuiter.toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                      style={{ width: `${rider.phenotype_pursuiter}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Sustained power ability</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Route Handicaps */}
        {(rider.handicap_flat !== undefined || rider.handicap_rolling !== undefined || 
          rider.handicap_hilly !== undefined || rider.handicap_mountainous !== undefined) && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Route Preferences</h2>
            <p className="text-sm text-gray-600 mb-6">
              Time advantage (+) or disadvantage (-) in seconds compared to average rider
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rider.handicap_flat !== undefined && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Flat</span>
                    <span className={`text-lg font-bold ${rider.handicap_flat >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rider.handicap_flat >= 0 ? '+' : ''}{rider.handicap_flat.toFixed(1)}s
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-full rounded-full ${rider.handicap_flat >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ 
                        width: `${Math.min(100, Math.abs(rider.handicap_flat) / 2)}%`,
                        marginLeft: rider.handicap_flat < 0 ? 'auto' : '0'
                      }}
                    />
                  </div>
                </div>
              )}
              
              {rider.handicap_rolling !== undefined && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Rolling</span>
                    <span className={`text-lg font-bold ${rider.handicap_rolling >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rider.handicap_rolling >= 0 ? '+' : ''}{rider.handicap_rolling.toFixed(1)}s
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-full rounded-full ${rider.handicap_rolling >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ 
                        width: `${Math.min(100, Math.abs(rider.handicap_rolling) / 2)}%`,
                        marginLeft: rider.handicap_rolling < 0 ? 'auto' : '0'
                      }}
                    />
                  </div>
                </div>
              )}
              
              {rider.handicap_hilly !== undefined && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Hilly</span>
                    <span className={`text-lg font-bold ${rider.handicap_hilly >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rider.handicap_hilly >= 0 ? '+' : ''}{rider.handicap_hilly.toFixed(1)}s
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-full rounded-full ${rider.handicap_hilly >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ 
                        width: `${Math.min(100, Math.abs(rider.handicap_hilly) / 2)}%`,
                        marginLeft: rider.handicap_hilly < 0 ? 'auto' : '0'
                      }}
                    />
                  </div>
                </div>
              )}
              
              {rider.handicap_mountainous !== undefined && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Mountainous</span>
                    <span className={`text-lg font-bold ${rider.handicap_mountainous >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {rider.handicap_mountainous >= 0 ? '+' : ''}{rider.handicap_mountainous.toFixed(1)}s
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-full rounded-full ${rider.handicap_mountainous >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ 
                        width: `${Math.min(100, Math.abs(rider.handicap_mountainous) / 2)}%`,
                        marginLeft: rider.handicap_mountainous < 0 ? 'auto' : '0'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
