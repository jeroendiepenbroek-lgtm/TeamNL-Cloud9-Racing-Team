import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface SyncStatus {
  isEnabled: boolean;
  intervalHours: number;
  lastSync: string | null;
  nextSync: string | null;
  isRunning: boolean;
}

interface SyncLog {
  id: number;
  endpoint: string;
  status: 'success' | 'error' | 'running' | 'partial';
  records_processed: number;
  error_message: string | null;
  created_at: string;
}

export default function Sync() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Haal sync status en logs op
  const fetchData = async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        fetch('/api/auto-sync/status'),
        fetch('/api/sync-logs?limit=20')
      ]);
      
      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }
      
      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching sync data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh elke 30 seconden
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Pull to refresh (mobile only)
  usePullToRefresh(containerRef, {
    onRefresh: async () => {
      toast.loading('Verversing...', { duration: 1000 });
      await fetchData();
    },
    disabled: loading || isTriggering,
  });

  // Manual trigger
  const handleManualSync = async () => {
    setIsTriggering(true);
    
    try {
      const res = await fetch('/api/auto-sync/trigger', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Sync voltooid! ${data.result?.success || 0} riders bijgewerkt`);
        // Refresh data na sync
        setTimeout(fetchData, 2000);
      } else {
        toast.error(data.error || 'Sync gefaald');
      }
    } catch (error) {
      console.error('Manual sync error:', error);
      toast.error('Sync gefaald - controleer console');
    } finally {
      setIsTriggering(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6 transition-transform duration-300">
      {/* Status Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Auto-Sync Status</h1>
            <p className="text-gray-600">
              Automatische updates elke {status?.intervalHours || 1} uur
            </p>
          </div>
          
          <div className="flex gap-3">
            <a
              href="/sync/config"
              className="px-6 py-3 rounded-lg font-semibold transition-all bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg flex items-center gap-2"
            >
              ⚙️ Configuratie
            </a>
            <button
              onClick={handleManualSync}
              disabled={isTriggering || status?.isRunning}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                isTriggering || status?.isRunning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {isTriggering ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Bezig...
                </span>
              ) : status?.isRunning ? (
                'Sync loopt...'
              ) : (
                '🔄 Sync Nu'
              )}
            </button>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                status?.isRunning ? 'bg-yellow-500 animate-pulse' : 
                status?.isEnabled ? 'bg-green-500' : 'bg-gray-400'
              }`}></span>
              <span className="text-lg font-semibold text-gray-900">
                {status?.isRunning ? 'Bezig' : status?.isEnabled ? 'Actief' : 'Inactief'}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Laatste Sync</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDate(status?.lastSync || null)}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Volgende Sync</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDate(status?.nextSync || null)}
            </div>
          </div>
        </div>
      </div>

      {/* Sync Logs */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Sync Geschiedenis</h2>
        
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nog geen sync logs beschikbaar</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Riders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <tr key={log.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        log.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.status === 'success' ? '✓ Succes' :
                         log.status === 'partial' ? '⚠ Partial' :
                         log.status === 'error' ? '✗ Fout' :
                         '⏳ Bezig'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                      <div className="max-w-md truncate" title={log.endpoint}>
                        {log.endpoint}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <span className="font-semibold text-gray-900">
                        {log.records_processed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.error_message ? (
                        <span className="text-red-600 truncate max-w-xs inline-block" title={log.error_message}>
                          {log.error_message}
                        </span>
                      ) : (
                        <span className="text-green-600">✓ OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
