import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResultsDashboard.css';

interface RaceResult {
  id: number;
  event_id: string;
  rider_id: number;
  rider_name: string;
  pen: string;
  rank: number;
  total_riders: number;
  velo_rating?: number;
  velo_previous?: number;
  velo_change?: number;
  time_seconds: number;
  delta_winner_seconds?: number;
  avg_wkg: number;
  effort_score?: number;
  race_points?: number;
  is_disqualified: boolean;
  power_5s?: number;
  power_15s?: number;
  power_30s?: number;
  power_1m?: number;
  power_2m?: number;
  power_5m?: number;
  power_20m?: number;
}

interface EventGroup {
  event_id: string;
  event_name: string;
  event_date: string;
  event_type: string;
  sub_type?: string;
  route_name?: string;
  results: RaceResult[];
}

interface TeamResultsResponse {
  count: number;
  events_count: number;
  limit: number;
  days: number;
  events: EventGroup[];
}

const ResultsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TeamResultsResponse | null>(null);
  const [limit, setLimit] = useState(20);
  const [days, setDays] = useState(90);

  useEffect(() => {
    fetchTeamResults();
  }, [limit, days]);

  const fetchTeamResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/results/team?limit=${limit}&days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch results');
      const json = await response.json();
      setData(json);
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVeloColor = (rating?: number): string => {
    if (!rating) return 'velo-unknown';
    if (rating <= 2) return 'velo-high'; // Green (top tier)
    if (rating <= 4) return 'velo-mid';  // Blue (mid tier)
    return 'velo-low';                    // Purple (developing)
  };

  const getVeloTrend = (change?: number): string => {
    if (!change) return '→';
    return change > 0 ? '↑' : change < 0 ? '↓' : '→';
  };

  const getPowerClass = (value?: number, effortScore?: number): string => {
    if (!value || !effortScore) return '';
    if (effortScore >= 100) return 'power-pr';        // Yellow - Personal Record
    if (effortScore >= 95) return 'power-near';       // Grey - Near Best
    if (effortScore >= 90) return 'power-good';       // Orange - Good Effort
    return '';
  };

  const handleRiderClick = (riderId: number) => {
    navigate(`/results/rider/${riderId}`);
  };

  if (loading) {
    return (
      <div className="results-dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Resultaten laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-dashboard">
        <div className="error">
          <h2>Fout bij laden</h2>
          <p>{error}</p>
          <button onClick={fetchTeamResults}>Opnieuw proberen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-dashboard">
      <div className="dashboard-header">
        <h1>Team Resultaten</h1>
        <div className="filters">
          <label>
            Aantal races:
            <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
          <label>
            Periode:
            <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
              <option value="30">30 dagen</option>
              <option value="60">60 dagen</option>
              <option value="90">90 dagen</option>
            </select>
          </label>
        </div>
        <div className="stats-summary">
          <span className="stat">
            <strong>{data?.events_count || 0}</strong> events
          </span>
          <span className="stat">
            <strong>{data?.count || 0}</strong> resultaten
          </span>
        </div>
      </div>

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

      <div className="results-container">
        {data?.events.map((event) => (
          <div key={event.event_id} className="event-group">
            <div className="event-header">
              <div className="event-info">
                <span className="event-date">{formatDate(event.event_date)}</span>
                <h3 className="event-name">{event.event_name}</h3>
                {event.route_name && (
                  <span className="event-route">{event.route_name}</span>
                )}
              </div>
              <div className="event-meta">
                {event.event_type && (
                  <span className={`event-type type-${event.event_type.toLowerCase()}`}>
                    {event.event_type}
                  </span>
                )}
                {event.sub_type && (
                  <span className="event-subtype">{event.sub_type}</span>
                )}
              </div>
            </div>

            <div className="results-table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Pen</th>
                    <th>Pos</th>
                    <th>vELO</th>
                    <th>Naam</th>
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
                  </tr>
                </thead>
                <tbody>
                  {event.results.map((result) => (
                    <tr 
                      key={result.id} 
                      className={result.is_disqualified ? 'disqualified' : ''}
                      onClick={() => handleRiderClick(result.rider_id)}
                    >
                      <td className={`pen pen-${result.pen?.toLowerCase()}`}>
                        {result.pen || '-'}
                      </td>
                      <td className="rank">
                        {result.rank}
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
                      <td className="rider-name">{result.rider_name}</td>
                      <td className="time">{formatTime(result.time_seconds)}</td>
                      <td className="delta">{formatDelta(result.delta_winner_seconds)}</td>
                      <td className="avg-wkg">{result.avg_wkg?.toFixed(2) || '-'}</td>
                      <td className={getPowerClass(result.power_5s, result.effort_score)}>
                        {result.power_5s?.toFixed(2) || '-'}
                      </td>
                      <td className={getPowerClass(result.power_15s, result.effort_score)}>
                        {result.power_15s?.toFixed(2) || '-'}
                      </td>
                      <td className={getPowerClass(result.power_30s, result.effort_score)}>
                        {result.power_30s?.toFixed(2) || '-'}
                      </td>
                      <td className={getPowerClass(result.power_1m, result.effort_score)}>
                        {result.power_1m?.toFixed(2) || '-'}
                      </td>
                      <td className={getPowerClass(result.power_2m, result.effort_score)}>
                        {result.power_2m?.toFixed(2) || '-'}
                      </td>
                      <td className={getPowerClass(result.power_5m, result.effort_score)}>
                        {result.power_5m?.toFixed(2) || '-'}
                      </td>
                      <td className={getPowerClass(result.power_20m, result.effort_score)}>
                        {result.power_20m?.toFixed(2) || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {(!data?.events || data.events.length === 0) && (
        <div className="no-results">
          <p>Geen resultaten gevonden voor de geselecteerde periode.</p>
        </div>
      )}
    </div>
  );
};

export default ResultsDashboard;
