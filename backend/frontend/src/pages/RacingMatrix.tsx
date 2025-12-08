/**
 * Racing Matrix Dashboard - EMPTY TEMPLATE
 * 
 * Toont rider power matrix met vELO tiers en power intervals
 */

export default function RacingMatrix() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Racing Matrix</h1>
          <p className="text-gray-400">
            Power analysis en vELO rankings van alle team members
          </p>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-semibold mb-2">Racing Matrix</h2>
          <p className="text-gray-400 mb-6">
            Dashboard wordt opnieuw gebouwd
          </p>
          <div className="text-sm text-gray-500">
            Features: vELO tiers, power intervals, phenotype analysis
          </div>
        </div>

        {/* Placeholder voor toekomstige features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-700">
            <div className="text-xl mb-2">🏆 vELO Tiers</div>
            <p className="text-sm text-gray-400">
              Diamond, Ruby, Emerald rankings
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-700">
            <div className="text-xl mb-2">⚡ Power Intervals</div>
            <p className="text-sm text-gray-400">
              5s, 15s, 30s, 1min, 5min, 20min
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-700">
            <div className="text-xl mb-2">🧬 Phenotype</div>
            <p className="text-sm text-gray-400">
              Sprinter, Climber, All-rounder
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
