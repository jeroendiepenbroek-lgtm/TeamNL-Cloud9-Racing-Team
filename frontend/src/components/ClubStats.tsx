import { useClubStats } from '../hooks/useClubStats'

export function ClubStats() {
  const { stats, loading } = useClubStats()

  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
          Loading stats...
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>📈 Club Statistics</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalRiders}</div>
          <div className="stat-label">Total Riders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalEvents}</div>
          <div className="stat-label">Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgFTP}</div>
          <div className="stat-label">Avg FTP (W)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgWPerKg}</div>
          <div className="stat-label">Avg W/kg</div>
        </div>
      </div>
    </div>
  )
}
