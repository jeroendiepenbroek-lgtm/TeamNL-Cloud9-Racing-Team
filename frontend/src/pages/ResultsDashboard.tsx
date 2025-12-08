export default function ResultsDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">
          Results Dashboard
        </h1>
        <p className="text-gray-400 mb-8">Race resultaten, power curves & persoonlijke records</p>
        
        <div className="space-y-6">
          {/* Recent Results */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-orange-500 mr-2">🏁</span>
              Recente Resultaten
            </h2>
            <div className="space-y-3">
              <div className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white">Race naam</h3>
                    <p className="text-sm text-gray-400">Route: -</p>
                    <p className="text-sm text-gray-400">Datum: -</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-500">-</p>
                    <p className="text-xs text-gray-400">Positie</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Power Curve */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-blue-500 mr-2">📊</span>
              Power Curve
            </h2>
            <div className="h-48 flex items-center justify-center text-gray-500">
              <p>Power curve grafiek placeholder</p>
            </div>
          </div>

          {/* Personal Records */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-purple-500 mr-2">🎯</span>
              Persoonlijke Records
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Beste tijd</p>
                <p className="text-2xl font-bold text-orange-500">-</p>
                <p className="text-xs text-gray-500">Route naam</p>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Max watt</p>
                <p className="text-2xl font-bold text-blue-500">-W</p>
                <p className="text-xs text-gray-500">Sprint</p>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Beste FTP</p>
                <p className="text-2xl font-bold text-purple-500">-W</p>
                <p className="text-xs text-gray-500">20min avg</p>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-400">Hoogste positie</p>
                <p className="text-2xl font-bold text-green-500">-</p>
                <p className="text-xs text-gray-500">Race naam</p>
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
