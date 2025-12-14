import { useState, useEffect } from 'react';
import { 
  Settings, 
  RefreshCw, 
  Clock, 
  PlayCircle, 
  PauseCircle, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Database
} from 'lucide-react';

interface SyncConfig {
  enabled: boolean;
  interval_minutes: number;
  last_run?: string;
  next_run?: string;
}

interface SyncLog {
  id: number;
  sync_type: string;
  trigger_type: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'success' | 'failed';
  riders_synced: number;
  riders_failed: number;
  riders_skipped: number;
  error_message?: string;
}

export function AutoSyncPanel() {
  const [config, setConfig] = useState<SyncConfig>({
    enabled: false,
    interval_minutes: 60
  });
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSyncs: 0,
    successRate: 0,
    avgDuration: 0
  });

  // Load config and logs
  useEffect(() => {
    loadConfig();
    loadLogs();
    const interval = setInterval(loadLogs, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/sync-config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/admin/sync-logs?limit=10');
      const data = await response.json();
      setLogs(data);
      
      // Calculate stats
      if (data.length > 0) {
        const successful = data.filter((l: SyncLog) => l.status === 'success').length;
        const completed = data.filter((l: SyncLog) => l.completed_at).length;
        const durations = data
          .filter((l: SyncLog) => l.completed_at)
          .map((l: SyncLog) => 
            new Date(l.completed_at!).getTime() - new Date(l.started_at).getTime()
          );
        
        setStats({
          totalSyncs: data.length,
          successRate: completed > 0 ? (successful / completed) * 100 : 0,
          avgDuration: durations.length > 0 
            ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length / 1000 
            : 0
        });
        
        setLastSync(data[0].completed_at || data[0].started_at);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/sync-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        const updated = await response.json();
        setConfig(updated);
        alert('✅ Configuration saved successfully!');
      } else {
        throw new Error('Failed to save config');
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('❌ Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerManualSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/sync-all', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`✅ Sync complete!\n\nSynced: ${result.synced}\nFailed: ${result.failed}\nSkipped: ${result.skipped}`);
        loadLogs();
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      alert('❌ Manual sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'Running...';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-2xl font-bold text-gray-900">
                {config.enabled ? 'Active' : 'Paused'}
              </p>
            </div>
            {config.enabled ? (
              <PlayCircle className="w-10 h-10 text-green-500" />
            ) : (
              <PauseCircle className="w-10 h-10 text-gray-400" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.successRate.toFixed(0)}%
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.avgDuration.toFixed(1)}s
              </p>
            </div>
            <Clock className="w-10 h-10 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Sync</p>
              <p className="text-2xl font-bold text-gray-900">
                {lastSync ? formatRelativeTime(lastSync) : 'Never'}
              </p>
            </div>
            <Database className="w-10 h-10 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">Auto-Sync Configuration</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Enable Auto-Sync
              </label>
              <p className="text-sm text-gray-500">
                Automatically sync rider data at regular intervals
              </p>
            </div>
            <button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                config.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  config.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Sync Interval (minutes)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="5"
                max="1440"
                step="5"
                value={config.interval_minutes}
                onChange={(e) => setConfig({ ...config, interval_minutes: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                min="5"
                max="1440"
                value={config.interval_minutes}
                onChange={(e) => setConfig({ ...config, interval_minutes: parseInt(e.target.value) })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600 w-24">
                {config.interval_minutes >= 60 
                  ? `${(config.interval_minutes / 60).toFixed(1)}h` 
                  : `${config.interval_minutes}m`}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Recommended: 60 minutes for optimal performance
            </p>
          </div>

          {/* Next Run Info */}
          {config.enabled && config.next_run && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Next sync scheduled: {new Date(config.next_run).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={saveConfig}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>

            <button
              onClick={triggerManualSync}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Manual Sync Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Logs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="w-6 h-6 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-900">Recent Sync History</h2>
            </div>
            <span className="text-sm text-gray-500">{stats.totalSyncs} total syncs</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Results
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(log.status)}
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {log.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {log.trigger_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatRelativeTime(log.started_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(log.started_at, log.completed_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-green-600 font-medium">
                        ✓ {log.riders_synced}
                      </span>
                      {log.riders_failed > 0 && (
                        <span className="text-red-600 font-medium">
                          ✗ {log.riders_failed}
                        </span>
                      )}
                      {log.riders_skipped > 0 && (
                        <span className="text-yellow-600 font-medium">
                          ⊘ {log.riders_skipped}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No sync history yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Trigger a manual sync or enable auto-sync to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
