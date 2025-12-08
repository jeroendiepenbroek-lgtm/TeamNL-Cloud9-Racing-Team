export default function RacingMatrix() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">
          Racing Matrix
        </h1>
        <p className="text-gray-400 mb-8">vELO tiers, power intervals & phenotype analyse</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* vELO Tiers */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-orange-500 mr-2">🏆</span>
              vELO Tiers
            </h2>
            <div className="space-y-2 text-gray-400">
              <div className="flex justify-between">
                <span>A Tier</span>
                <span className="text-green-400">1800+</span>
              </div>
              <div className="flex justify-between">
                <span>B Tier</span>
                <span className="text-blue-400">1400-1799</span>
              </div>
              <div className="flex justify-between">
                <span>C Tier</span>
                <span className="text-yellow-400">1000-1399</span>
              </div>
              <div className="flex justify-between">
                <span>D Tier</span>
                <span className="text-gray-400">&lt;1000</span>
              </div>
            </div>
          </div>

          {/* Power Intervals */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-blue-500 mr-2">⚡</span>
              Power Intervals
            </h2>
            <div className="space-y-2 text-gray-400">
              <div className="flex justify-between">
                <span>1 min</span>
                <span className="text-orange-400">- W</span>
              </div>
              <div className="flex justify-between">
                <span>5 min</span>
                <span className="text-orange-400">- W</span>
              </div>
              <div className="flex justify-between">
                <span>20 min</span>
                <span className="text-orange-400">- W</span>
              </div>
              <div className="flex justify-between">
                <span>FTP</span>
                <span className="text-orange-400">- W</span>
              </div>
            </div>
          </div>

          {/* Phenotype */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-purple-500 mr-2">🧬</span>
              Phenotype
            </h2>
            <div className="space-y-2 text-gray-400">
              <div className="flex justify-between">
                <span>Type</span>
                <span className="text-purple-400">-</span>
              </div>
              <div className="flex justify-between">
                <span>Sprinter</span>
                <span className="text-gray-500">-</span>
              </div>
              <div className="flex justify-between">
                <span>Allrounder</span>
                <span className="text-gray-500">-</span>
              </div>
              <div className="flex justify-between">
                <span>Climber</span>
                <span className="text-gray-500">-</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
          <p className="text-yellow-300 text-sm">
            ⚠️ Dashboard template - data integratie volgt later
          </p>
        </div>
      </div>
    </div>
  )
}
