/**
 * Events Dashboard - EMPTY TEMPLATE
 * 
 * Toont upcoming Zwift races (48h lookforward)
 */

export default function EventsDashboard() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Events Dashboard</h1>
          <p className="text-gray-400">
            Upcoming Zwift races en team signups
          </p>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-2xl font-semibold mb-2">Events Dashboard</h2>
          <p className="text-gray-400 mb-6">
            Dashboard wordt opnieuw gebouwd
          </p>
          <div className="text-sm text-gray-500">
            Features: 48h lookforward, team signups, route info
          </div>
        </div>

        {/* Placeholder voor toekomstige features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-700">
            <div className="text-xl mb-2">🔮 48h Lookforward</div>
            <p className="text-sm text-gray-400">
              Alle races binnen 48 uur
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-700">
            <div className="text-xl mb-2">👥 Team Signups</div>
            <p className="text-sm text-gray-400">
              Welke teamleden doen mee
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-700">
            <div className="text-xl mb-2">🗺️ Route Details</div>
            <p className="text-sm text-gray-400">
              Afstand, hoogtemeters, laps
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
