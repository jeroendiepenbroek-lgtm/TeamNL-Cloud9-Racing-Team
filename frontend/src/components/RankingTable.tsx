import { useTopRiders } from '../hooks/useRiders'

interface RankingTableProps {
  onSelectRider: (rider: any) => void
}

export function RankingTable({ onSelectRider }: RankingTableProps) {
  const { riders, loading } = useTopRiders(20)

  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
          Loading riders...
        </div>
      </div>
    )
  }

  const getCategoryBadge = (cat?: string | null) => {
    if (!cat) return null
    const catClass = `badge badge-cat-${cat.toLowerCase()}`
    return <span className={catClass}>{cat}</span>
  }

  return (
    <div className="card">
      <h2>🏁 Top Riders Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>FTP (W)</th>
            <th>Weight (kg)</th>
            <th>W/kg</th>
            <th>Category</th>
            <th>Club</th>
          </tr>
        </thead>
        <tbody>
          {riders.map((r, idx: number) => {
            const wPerKg = r.w_per_kg?.toFixed(2) ?? '-'
            return (
              <tr key={r.zwift_id} onClick={() => onSelectRider(r)}>
                <td><strong>{idx + 1}</strong></td>
                <td><strong>{r.name}</strong></td>
                <td>{r.ftp ?? '-'}</td>
                <td>{r.weight ?? '-'}</td>
                <td><strong>{wPerKg}</strong></td>
                <td>{getCategoryBadge(r.category_racing)}</td>
                <td>-</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
