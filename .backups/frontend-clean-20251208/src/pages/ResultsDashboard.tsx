/**
 * Results Dashboard - EMPTY TEMPLATE
 * 
 * Toont recent race results van team members
 */

export default function ResultsDashboard() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Results Dashboard</h1>
          <p className="text-gray-400">
            Recent race results en power data
          </p>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🏁</div>
          <h2 className="text-2xl font-semibold mb-2">Results Dashboard</h2>
          <p className="text-gray-400 mb-6">
            Dashboard wordt opnieuw gebouwd
          </p>
          <div className="text-sm text-gray-500">
            Features: Race results, power curves, personal records
          </div>
        </div>

        {/* Placeholder voor toekomstige features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-700">
            <div className="text-xl mb-2">🏆 Race Results</div>
            <p className="text-sm text-gray-400">
              Positions, finish times, categories
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-700">
            <div className="text-xl mb-2">📈 Power Curves</div>
            <p className="text-sm text-gray-400">
              Peak power per duration
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-700">
            <div className="text-xl mb-2">🎯 Personal Records</div>
            <p className="text-sm text-gray-400">
              Best W/kg per interval
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
