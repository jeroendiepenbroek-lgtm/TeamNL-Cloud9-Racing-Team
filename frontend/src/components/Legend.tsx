export function Legend() {
  return (
    <div className="card">
      <h3>📋 Performance Legend</h3>
      <div className="legend">
        <div className="legend-item">
          <div className="legend-color perf-excellent"></div>
          <span><strong>Excellent:</strong> ≥ 4.5 W/kg</span>
        </div>
        <div className="legend-item">
          <div className="legend-color perf-good"></div>
          <span><strong>Good:</strong> 4.0 - 4.5 W/kg</span>
        </div>
        <div className="legend-item">
          <div className="legend-color perf-average"></div>
          <span><strong>Average:</strong> 3.5 - 4.0 W/kg</span>
        </div>
        <div className="legend-item">
          <div className="legend-color perf-below"></div>
          <span><strong>Below:</strong> &lt; 3.5 W/kg</span>
        </div>
      </div>

      <h3 style={{ marginTop: '20px' }}>🏆 Category Badges</h3>
      <div className="legend">
        <div className="legend-item">
          <span className="badge badge-cat-a">A</span>
          <span>Elite (4.6+ W/kg)</span>
        </div>
        <div className="legend-item">
          <span className="badge badge-cat-b">B</span>
          <span>Advanced (3.9-4.5)</span>
        </div>
        <div className="legend-item">
          <span className="badge badge-cat-c">C</span>
          <span>Intermediate (3.2-3.8)</span>
        </div>
        <div className="legend-item">
          <span className="badge badge-cat-d">D</span>
          <span>Beginner (2.5-3.1)</span>
        </div>
        <div className="legend-item">
          <span className="badge badge-cat-e">E</span>
          <span>Novice (&lt; 2.5)</span>
        </div>
      </div>
    </div>
  )
}
