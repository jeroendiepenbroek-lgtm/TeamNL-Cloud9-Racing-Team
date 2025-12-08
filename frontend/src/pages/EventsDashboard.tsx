export default function EventsDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">
          Events Dashboard
        </h1>
        <p className="text-gray-400 mb-8">48h lookforward, team signups & route details</p>
        
        <div className="space-y-6">
          {/* Upcoming Events */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-orange-500 mr-2">📅</span>
              Aankomende Events (48h)
            </h2>
            <div className="space-y-3 text-gray-400">
              <div className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white">Event naam</h3>
                    <p className="text-sm">Route: -</p>
                    <p className="text-sm">Afstand: - km</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Start: -</p>
                    <p className="text-xs text-gray-500">- deelnemers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Signups */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-blue-500 mr-2">👥</span>
              Team Signups
            </h2>
            <div className="space-y-2 text-gray-400">
              <div className="flex justify-between p-2 bg-gray-700/20 rounded">
                <span>Rider naam</span>
                <span className="text-green-400">Aangemeld</span>
              </div>
            </div>
          </div>

          {/* Route Details */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-purple-500 mr-2">🗺️</span>
              Route Details
            </h2>
            <div className="grid grid-cols-2 gap-4 text-gray-400">
              <div>
                <p className="text-sm text-gray-500">Afstand</p>
                <p className="text-lg text-white">- km</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Hoogtemeters</p>
                <p className="text-lg text-white">- m</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Route type</p>
                <p className="text-lg text-white">-</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg gradient</p>
                <p className="text-lg text-white">-%</p>
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
