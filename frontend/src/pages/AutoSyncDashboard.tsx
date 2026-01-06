import DualSyncManager from '../components/DualSyncManager';

export default function AutoSyncDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">
            🚀 Auto-Sync Management
          </h1>
          <p className="text-gray-300 text-lg">
            Beheer rider sync en race scan schedulers
          </p>
        </div>

        {/* Dual Sync Manager - Shows both schedulers */}
        <DualSyncManager />
      </div>
    </div>
  );
}
