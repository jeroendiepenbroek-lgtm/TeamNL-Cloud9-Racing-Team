/**
 * Results Dashboard - Placeholder voor rebuild
 * Minimale versie om crashes te voorkomen
 */

import { useParams, useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';

export default function ResultsDashboard() {
  const { riderId } = useParams<{ riderId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <Trophy className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Results Dashboard</h1>
          <p className="text-gray-600 mb-6">
            Modern results dashboard wordt gebouwd...
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              ✅ Backend API ready<br />
              ✅ NEAR sync fixed<br />
              🔨 Frontend UI in development
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Terug naar Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
