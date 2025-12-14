import { useState, useEffect } from 'react';
import { RefreshCw, Settings, Clock, CheckCircle, AlertCircle, Zap, Activity, TrendingUp, Timer } from 'lucide-react';
import toast from 'react-hot-toast';

interface SyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastRun: string | null;
  nextRun: string | null;
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

interface SyncLog {
  id: string;
  started_at: string;
  completed_at?: string;
  sync_type: string;
  trigger_type: string;
  status: string;
  total_items: number;
  success_count: number;
  failed_count: number;
  duration_ms?: number;
}

export default function SyncManager() {
  const [config, setConfig] = useState<SyncConfig>({ 
    enabled: false, 
    intervalMinutes: 60,
    lastRun: null,
    nextRun: null
  });
  const [status, setStatus] = useState<SyncStatus>({ isRunning: false });
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editInterval, setEditInterval] = useState(60);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');

  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Load initial data
  useEffect(() => {
    loadConfig();
    loadStatus();
    loadRecentLogs();
    
    // Poll status every 10s
    const statusInterval = setInterval(loadStatus, 10000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!config.enabled || !config.nextRun) {
      setTimeUntilNext('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const next = new Date(config.nextRun!);
      const diff = next.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilNext('Binnenkort...');
        loadConfig(); // Refresh config to get new nextRun
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 0) {
        setTimeUntilNext(`${minutes}m ${seconds}s`);
      } else {
        setTimeUntilNext(`${seconds}s`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [config.enabled, config.nextRun]);

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/sync-config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setEditInterval(data.intervalMinutes);
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

  const loadRecentLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/sync-logs?limit=5`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRecentLogs(data.logs);
        }
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  const toggleAutoSync = async () => {
    try {
      const newEnabled = !config.enabled;
      const res = await fetch(`${API_BASE}/api/admin/sync-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: newEnabled,
          intervalMinutes: config.intervalMinutes
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConfig(data.config);
          toast.success(newEnabled ? '🟢 Auto-sync ingeschakeld' : '🔴 Auto-sync uitgeschakeld');
        }
      }
    } catch (err) {
      console.error('Failed to toggle auto-sync:', err);
      toast.error('Fout bij wijzigen auto-sync status');
    }
  };

  const updateInterval = async () => {
    if (editInterval < 5 || editInterval > 1440) {
      toast.error('Interval moet tussen 5 en 1440 minuten zijn');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/sync-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: config.enabled,
          intervalMinutes: editInterval
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConfig(data.config);
          setIsConfigOpen(false);
          toast.success(`⏱️ Interval ingesteld op ${editInterval} minuten`);
        }
      }
    } catch (err) {
      console.error('Failed to update interval:', err);
      toast.error('Fout bij wijzigen interval');
    }
  };

  const runManualSync = async () => {
    setIsSyncing(true);
    toast.loading('Sync gestart...', { id: 'sync' });
    
    try {
      const res = await fetch(`${API_BASE}/api/admin/sync-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(`✅ ${data.synced} riders gesynchroniseerd!`, { id: 'sync' });
          await Promise.all([loadStatus(), loadConfig(), loadRecentLogs()]);
        } else {
          toast.error(`❌ Sync gefaald: ${data.error}`, { id: 'sync' });
        }
      }
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error('❌ Sync fout', { id: 'sync' });
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
    return date.toLocaleDateString('nl-NL', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'auto': return '⏰';
      case 'manual': return '👤';
      case 'upload': return '📤';
      default: return '🔄';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Control Panel */}
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
        {/* Header with Status Indicator */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-xl backdrop-blur-xl ${
                config.enabled 
                  ? 'bg-green-500/30 ring-2 ring-green-300' 
                  : 'bg-white/30 ring-2 ring-white/50'
              }`}>
                <Zap className={`w-7 h-7 ${config.enabled ? 'text-green-100' : 'text-white'}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  Auto-Sync Manager
                  {status.isRunning && (
                    <span className="flex items-center gap-1 text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                      <Activity className="w-4 h-4 animate-pulse" />
                      Running...
                    </span>
                  )}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {config.enabled 
                    ? `Automatische sync elke ${config.intervalMinutes} minuten` 
                    : 'Momenteel uitgeschakeld - handmatige sync beschikbaar'
                  }
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="p-3 hover:bg-white/20 rounded-xl transition-all backdrop-blur-xl"
              title="Instellingen"
            >
              <Settings className={`w-6 h-6 text-white transition-transform ${isConfigOpen ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        {/* Configuration Panel */}
        {isConfigOpen && (
          <div className="border-t border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Interval Configuration */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Sync Interval
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="240"
                    step="5"
                    value={editInterval}
                    onChange={(e) => setEditInterval(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 border-2 border-blue-200 min-w-[100px]">
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={editInterval}
                      onChange={(e) => setEditInterval(parseInt(e.target.value))}
                      className="w-12 text-center font-bold text-lg text-gray-900 bg-transparent focus:outline-none"
                    />
                    <span className="text-sm text-gray-500 font-medium">min</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <Timer className="w-3 h-3" />
                  Min: 5 min • Max: 1440 min (24u) • Standaard: 60 min
                </p>
              </div>

              {/* Auto-Sync Toggle */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Auto-Sync Status
                </label>
                <div className="flex items-center justify-between bg-white rounded-lg p-4 border-2 border-blue-200">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {config.enabled ? '🟢 Ingeschakeld' : '🔴 Uitgeschakeld'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {config.enabled ? 'Sync draait automatisch' : 'Alleen handmatige sync'}
                    </p>
                  </div>
                  <button
                    onClick={toggleAutoSync}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all ${
                      config.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md ${
                        config.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={updateInterval}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-semibold flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Opslaan
              </button>
            </div>
          </div>
        )}

        {/* Status Cards Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Last Sync Card */}
            {status.lastSync && (
              <>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <Clock className="w-6 h-6 opacity-80" />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">Laatste Sync</span>
                  </div>
                  <p className="text-3xl font-black mb-2">{formatTimestamp(status.lastSync.timestamp)}</p>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <Timer className="w-4 h-4" />
                    <span>Duur: {formatDuration(status.lastSync.duration)}</span>
                  </div>
                </div>

                {/* Success Card */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <CheckCircle className="w-6 h-6 opacity-80" />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">Gesynchroniseerd</span>
                  </div>
                  <p className="text-3xl font-black mb-2">{status.lastSync.synced}</p>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <TrendingUp className="w-4 h-4" />
                    {status.lastSync.skipped > 0 ? (
                      <span>{status.lastSync.skipped} overgeslagen</span>
                    ) : (
                      <span>Alles succesvol</span>
                    )}
                  </div>
                </div>

                {/* Failed Card */}
                {status.lastSync.failed > 0 && (
                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <AlertCircle className="w-6 h-6 opacity-80" />
                      <span className="text-xs font-bold uppercase tracking-wider opacity-80">Mislukt</span>
                    </div>
                    <p className="text-3xl font-black mb-2">{status.lastSync.failed}</p>
                    <p className="text-sm opacity-90">Controleer logs voor details</p>
                  </div>
                )}
              </>
            )}

            {/* No data card */}
            {!status.lastSync && (
              <div className="col-span-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 text-center">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Nog geen sync uitgevoerd</p>
                <p className="text-sm text-gray-500 mt-1">Start een handmatige sync om te beginnen</p>
              </div>
            )}
          </div>

          {/* Next Run Countdown */}
          {config.enabled && timeUntilNext && (
            <div className="mt-4 bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500 p-2 rounded-lg">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Volgende automatische sync</p>
                    <p className="text-xs text-blue-700">Nog {timeUntilNext}</p>
                  </div>
                </div>
                <div className="text-2xl font-black text-blue-600">{timeUntilNext}</div>
              </div>
            </div>
          )}

          {/* Manual Sync Button */}
          <button
            onClick={runManualSync}
            disabled={isSyncing || status.isRunning}
            className="w-full mt-4 flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl font-bold text-lg"
          >
            <RefreshCw className={`w-6 h-6 ${(isSyncing || status.isRunning) ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing || status.isRunning ? 'Bezig met synchroniseren...' : 'Nu Synchroniseren'}
            </span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      {recentLogs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4 border-b border-gray-300">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recente Activiteit
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentLogs.map((log) => (
              <div key={log.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{getTriggerIcon(log.trigger_type)}</span>
                    <div>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        {log.sync_type}
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatTimestamp(log.started_at)}
                        {log.duration_ms && ` • ${formatDuration(log.duration_ms)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">Total</p>
                      <p className="font-bold text-gray-900">{log.total_items}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">Geslaagd</p>
                      <p className="font-bold text-green-600">{log.success_count}</p>
                    </div>
                    {log.failed_count > 0 && (
                      <div className="text-center">
                        <p className="text-gray-500 text-xs">Mislukt</p>
                        <p className="font-bold text-red-600">{log.failed_count}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          Smart Sync Informatie
        </h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span><strong>Handmatige sync</strong> werkt altijd, onafhankelijk van auto-sync status</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span><strong>Smart sync strategie:</strong> &lt;5 riders = individueel (1s delay), ≥5 riders = bulk (250ms delay)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span><strong>Auto-skip:</strong> Onbekende riders worden automatisch overgeslagen zonder errors</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span><strong>Real-time monitoring:</strong> Status updates elke 10 seconden automatisch</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
