import { useState, useEffect } from 'react';
import { RefreshCw, Settings, Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react';

interface SyncConfig {
  enabled: boolean;
  interval_minutes: number;
  last_run?: string;
  next_run?: string;
}

interface SyncStatus {
  isRunning: boolean;
  lastSync?: {
    timestamp: string;
    duration: number;
    synced: number;
    failed: number;
    skipped: number;
  };
}

export default function SyncManager() {
  const [config, setConfig] = useState<SyncConfig>({ enabled: false, interval_minutes: 60 });
  const [status, setStatus] = useState<SyncStatus>({ isRunning: false });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editInterval, setEditInterval] = useState('60');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Load config
  useEffect(() => {
    loadConfig();
    loadStatus();
    const interval = setInterval(loadStatus, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/sync-config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setEditInterval(String(data.interval_minutes));
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const loadStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/sync-status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  };

  const toggleAutoSync = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/sync-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !config.enabled })
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to toggle auto-sync:', err);
    }
  };

  const updateInterval = async () => {
    const minutes = parseInt(editInterval);
    if (minutes < 5 || minutes > 1440) {
      alert('Interval moet tussen 5 en 1440 minuten zijn');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/sync-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval_minutes: minutes })
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setIsConfigOpen(false);
      }
    } catch (err) {
      console.error('Failed to update interval:', err);
    }
  };

  const runManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/sync-all`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Sync complete:', data);
        await loadStatus();
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'zojuist';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m geleden`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}u geleden`;
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${config.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Zap className={`w-6 h-6 ${config.enabled ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Auto-Sync</h2>
            <p className="text-sm text-gray-500">
              {config.enabled ? `Draait elke ${config.interval_minutes} minuten` : 'Momenteel uitgeschakeld'}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Instellingen"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Config Panel */}
      {isConfigOpen && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sync Interval (minuten)
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                min="5"
                max="1440"
                value={editInterval}
                onChange={(e) => setEditInterval(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={updateInterval}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Opslaan
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Min: 5 min • Max: 1440 min (24u) • Standaard: 60 min
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700">Auto-Sync Status</span>
            <button
              onClick={toggleAutoSync}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Status Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Last Sync */}
        {status.lastSync && (
          <>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-medium text-blue-600">LAATSTE SYNC</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatTimestamp(status.lastSync.timestamp)}</p>
              <p className="text-sm text-gray-600 mt-1">
                Duur: {formatDuration(status.lastSync.duration)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-xs font-medium text-green-600">GESYNCHRONISEERD</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{status.lastSync.synced}</p>
              <p className="text-sm text-gray-600 mt-1">
                {status.lastSync.skipped > 0 && `${status.lastSync.skipped} overgeslagen`}
              </p>
            </div>

            {status.lastSync.failed > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-medium text-red-600">MISLUKT</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{status.lastSync.failed}</p>
                <p className="text-sm text-gray-600 mt-1">Controleer logs</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Next Run */}
      {config.enabled && config.next_run && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Volgende sync: {formatTimestamp(config.next_run)}
            </span>
          </div>
        </div>
      )}

      {/* Manual Sync Button */}
      <button
        onClick={runManualSync}
        disabled={isSyncing || status.isRunning}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
      >
        <RefreshCw className={`w-5 h-5 ${(isSyncing || status.isRunning) ? 'animate-spin' : ''}`} />
        <span className="font-medium">
          {isSyncing || status.isRunning ? 'Synchroniseren...' : 'Nu Synchroniseren'}
        </span>
      </button>

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Handmatige sync werkt onafhankelijk van auto-sync status</p>
        <p>• Smart sync: &lt;5 riders = individueel, ≥5 riders = bulk</p>
        <p>• Onbekende riders worden automatisch overgeslagen</p>
      </div>
    </div>
  );
}
