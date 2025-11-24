import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './RiderResultsView.css';

interface PersonalRecord {
  id: number;
  rider_id: number;
  duration: string;
  best_wkg: number;
  event_id?: string;
  event_date?: string;
  previous_best?: number;
  achieved_at: string;
}

interface RaceResult {
  id: number;
  event_id: string;
  rider_id: number;
  rider_name: string;
  event_name: string;
  event_date: string;
  event_type?: string;
  sub_type?: string;
  route_world?: string;
  route_name?: string;
  route_profile?: string;
  distance_km?: string;
  elevation_m?: number;
  pen: string;
  rank: number;
  total_riders?: number;
  velo_rating?: number;
  velo_previous?: number;
  velo_change?: number;
  time_seconds: number;
  delta_winner_seconds?: number;
  avg_wkg: number;
  effort_score?: number;
  race_points?: number;
  power_5s?: number;
  power_15s?: number;
  power_30s?: number;
  power_1m?: number;
  power_2m?: number;
  power_5m?: number;
  power_20m?: number;
}

interface RiderStats {
  rider_id: number;
  period_days: number;
  total_races: number;
  wins: number;
  podiums: number;
  top10: number;
  avg_rank: number;
  avg_wkg: number;
  avg_effort_score: number;
}

interface RiderResultsResponse {
  rider_id: number;
  count: number;
  days: number;
  results: RaceResult[];
  personal_records: PersonalRecord[];
}

// US3: Decode HTML entities (ø → ø, etc.)
const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

const RiderResultsView: React.FC = () => {
  const { riderId } = useParams<{ riderId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RiderResultsResponse | null>(null);
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [days, setDays] = useState(90);
  const [searchTerm, setSearchTerm] = useState('');
  const [limitResults, setLimitResults] = useState(50);

  useEffect(() => {
    if (riderId) {
      fetchRiderData();
    }
  }, [riderId, days]);

  const fetchRiderData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Parallel fetch results and stats
      const [resultsRes, statsRes] = await Promise.all([
        fetch(`/api/results/rider/${riderId}?days=${days}&limit=100`),
        fetch(`/api/results/rider/${riderId}/stats?days=${days}`)
      ]);

      if (!resultsRes.ok || !statsRes.ok) throw new Error('Failed to fetch rider data');

      const resultsData = await resultsRes.json();
      const statsData = await statsRes.json();

      // US1: Ensure results stay in DESC order (recent first)
      if (resultsData.results) {
        resultsData.results.sort((a: RaceResult, b: RaceResult) => 
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        );
      }

      setData(resultsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDelta = (seconds?: number): string => {
    if (!seconds) return '-';
    const sign = seconds > 0 ? '+' : '';
    return `${sign}${seconds}s`;
  };

  const getVeloTrend = (change?: number): string => {
    if (!change) return '→';
    return change > 0 ? '↑' : change < 0 ? '↓' : '→';
  };

  const getVeloColor = (rating?: number): string => {
    if (!rating) return 'velo-unknown';
    if (rating <= 2) return 'velo-high';
    if (rating <= 4) return 'velo-mid';
    return 'velo-low';
  };

  const getPRForDuration = (duration: string): PersonalRecord | undefined => {
    return data?.personal_records.find(pr => pr.duration === duration);
  };

  const getEffortClass = (value?: number, duration?: string): string => {
    if (!value || !duration) return '';
    
    const pr = getPRForDuration(duration);
    if (!pr) return '';
    
    const percentage = (value / pr.best_wkg) * 100;
    if (percentage >= 100) return 'power-pr';
    if (percentage >= 95) return 'power-near';
    if (percentage >= 90) return 'power-good';
    return '';
  };

  const getRankBadgeClass = (rank: number): string => {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    if (rank <= 10) return 'rank-top10';
    return '';
  };

  if (loading) {
    return (
      <div className="rider-results-view">
        <div className="loading">
          <div className="spinner"></div>
          <p>Resultaten laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rider-results-view">
        <div className="error">
          <h2>Fout bij laden</h2>
          <p>{error}</p>
          <button onClick={fetchRiderData}>Opnieuw proberen</button>
          <button onClick={() => navigate('/results')}>Terug naar team</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rider-results-view">
      {/* Header with Stats */}
      <div className="rider-header">
        <button className="back-button" onClick={() => navigate('/results')}>
          ← Terug naar team
        </button>
        
        <h1>Rider #{riderId} - Resultaten</h1>
        
        <div className="period-selector">
          <label>Periode:</label>
          <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
            <option value="7">7 dagen</option>
            <option value="30">30 dagen</option>
            <option value="60">60 dagen</option>
            <option value="90">90 dagen (max)</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total_races}</div>
            <div className="stat-label">Races</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.wins}</div>
            <div className="stat-label">Overwinningen</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.podiums}</div>
            <div className="stat-label">Podiums</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.top10}</div>
            <div className="stat-label">Top 10</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avg_rank.toFixed(1)}</div>
            <div className="stat-label">Gem. Positie</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avg_wkg.toFixed(2)}</div>
            <div className="stat-label">Gem. W/kg</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avg_effort_score}%</div>
            <div className="stat-label">Gem. Effort</div>
          </div>
        </div>
      )}

      {/* Personal Records */}
      {data?.personal_records && data.personal_records.length > 0 && (
        <div className="pr-section">
          <h2>Personal Records</h2>
          <div className="pr-grid">
            {['5s', '15s', '30s', '1m', '2m', '5m', '20m'].map(duration => {
              const pr = getPRForDuration(duration);
              return (
                <div key={duration} className="pr-card">
                  <div className="pr-duration">{duration}</div>
                  <div className="pr-value">
                    {pr ? `${pr.best_wkg.toFixed(2)} W/kg` : '-'}
                  </div>
                  {pr && pr.event_date && (
                    <div className="pr-date">
                      {new Date(pr.event_date).toLocaleDateString('nl-NL', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Power Legend */}
      <div className="power-legend">
        <span className="legend-title">Power Kleuren:</span>
        <span className="legend-item">
          <span className="power-pr">4.50</span> Personal Best (100%+)
        </span>
        <span className="legend-item">
          <span className="power-near">4.28</span> Near Best (95%+)
        </span>
        <span className="legend-item">
          <span className="power-good">4.05</span> Good Effort (90%+)
        </span>
      </div>

      {/* US4: Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Zoek op event of route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <label>Toon:</label>
          <select 
            value={limitResults} 
            onChange={(e) => setLimitResults(parseInt(e.target.value))}
            className="limit-select"
          >
            <option value="10">10 resultaten</option>
            <option value="25">25 resultaten</option>
            <option value="50">50 resultaten</option>
            <option value="100">Alle resultaten</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div className="results-section">
        <h2>Race Geschiedenis ({(() => {
          const filtered = data?.results.filter(r => 
            r.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.route_name && r.route_name.toLowerCase().includes(searchTerm.toLowerCase()))
          ) || [];
          return Math.min(filtered.length, limitResults);
        })()} van {data?.count || 0} races)</h2>
        
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Event</th>
                <th>Pen</th>
                <th>Pos</th>
                <th>vELO</th>
                <th>Tijd</th>
                <th>Δ</th>
                <th>Avg</th>
                <th>5s</th>
                <th>15s</th>
                <th>30s</th>
                <th>1m</th>
                <th>2m</th>
                <th>5m</th>
                <th>20m</th>
                <th>Effort</th>
              </tr>
            </thead>
            <tbody>
              {data?.results
                .filter(result => 
                  result.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (result.route_name && result.route_name.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .slice(0, limitResults)
                .map((result) => (
                <tr key={result.id}>
                  <td className="date">
                    {new Date(result.event_date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="event-name">
                    <div className="event-title">
                      {decodeHtmlEntities(result.event_name)}
                    </div>
                    {result.route_name && (
                      <div className="event-route">
                        {result.route_world && `${result.route_world} • `}
                        {result.route_name}
                        {result.route_profile && ` • ${result.route_profile}`}
                        {result.distance_km && ` • ${result.distance_km}km`}
                        {result.elevation_m && ` • ${result.elevation_m}m ↗`}
                      </div>
                    )}
                  </td>
                  <td className={`pen pen-${result.pen?.toLowerCase()}`}>
                    {result.pen || '-'}
                  </td>
                  <td className={`rank ${getRankBadgeClass(result.rank)}`}>
                    {result.rank || '-'}
                    {result.total_riders && (
                      <span className="total"> / {result.total_riders}</span>
                    )}
                  </td>
                  <td>
                    {result.velo_rating && (
                      <span className={`velo-badge ${getVeloColor(result.velo_rating)}`}>
                        {result.velo_rating}
                        <span className="velo-trend">
                          {getVeloTrend(result.velo_change)}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="time">{formatTime(result.time_seconds)}</td>
                  <td className="delta">{formatDelta(result.delta_winner_seconds)}</td>
                  <td className="avg-wkg">{result.avg_wkg?.toFixed(2) || '-'}</td>
                  <td className={getEffortClass(result.power_5s, '5s')}>
                    {result.power_5s?.toFixed(2) || '-'}
                  </td>
                  <td className={getEffortClass(result.power_15s, '15s')}>
                    {result.power_15s?.toFixed(2) || '-'}
                  </td>
                  <td className={getEffortClass(result.power_30s, '30s')}>
                    {result.power_30s?.toFixed(2) || '-'}
                  </td>
                  <td className={getEffortClass(result.power_1m, '1m')}>
                    {result.power_1m?.toFixed(2) || '-'}
                  </td>
                  <td className={getEffortClass(result.power_2m, '2m')}>
                    {result.power_2m?.toFixed(2) || '-'}
                  </td>
                  <td className={getEffortClass(result.power_5m, '5m')}>
                    {result.power_5m?.toFixed(2) || '-'}
                  </td>
                  <td className={getEffortClass(result.power_20m, '20m')}>
                    {result.power_20m?.toFixed(2) || '-'}
                  </td>
                  <td className="effort-score">
                    {result.effort_score ? `${result.effort_score}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(!data?.results || data.results.length === 0) && (
        <div className="no-results">
          <p>Geen resultaten gevonden voor de geselecteerde periode.</p>
        </div>
      )}
    </div>
  );
};

export default RiderResultsView;
