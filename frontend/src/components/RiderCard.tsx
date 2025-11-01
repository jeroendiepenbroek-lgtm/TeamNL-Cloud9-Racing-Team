interface RiderCardProps {
  rider: any
}

export function RiderCard({ rider }: RiderCardProps) {
  if (!rider) {
    return (
      <div className="card">
        <h2>📊 Rider Details</h2>
        <p style={{ color: '#718096', textAlign: 'center', padding: '40px 20px' }}>
          Select a rider from the leaderboard to view details
        </p>
      </div>
    )
  }

  const wPerKg = rider.ftp && rider.weight ? (rider.ftp / rider.weight).toFixed(2) : 'N/A'

  return (
    <div className="card">
      <h2>📊 {rider.name}</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{rider.ftp || '-'}</div>
          <div className="stat-label">FTP (W)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{wPerKg}</div>
          <div className="stat-label">W/kg</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{rider.weight || '-'}</div>
          <div className="stat-label">Weight (kg)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{rider.categoryRacing || '-'}</div>
          <div className="stat-label">Category</div>
        </div>
      </div>

      <div style={{ marginTop: '16px', fontSize: '14px', color: '#4a5568' }}>
        <p><strong>Club:</strong> {rider.clubName || 'No club'}</p>
        <p><strong>Ranking:</strong> {rider.ranking || 'N/A'}</p>
        <p><strong>Country:</strong> {rider.countryCode || 'N/A'}</p>
        <p><strong>Gender:</strong> {rider.gender || 'N/A'}</p>
        {rider.age && <p><strong>Age:</strong> {rider.age}</p>}
      </div>
    </div>
  )
}
