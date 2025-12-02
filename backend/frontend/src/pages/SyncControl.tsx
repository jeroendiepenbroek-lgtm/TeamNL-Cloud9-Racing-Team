/**
 * Sync Control Dashboard - Modern & Clean
 * Beheer sync scheduler voor TeamNL Cloud9
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Users,
  Calendar,
  Trophy,
  Trash2,
  Zap
} from 'lucide-react';

interface SchedulerStatus {
  isRunning: boolean;
  lastRiderSync: string | null;
  lastEventSync: string | null;
  lastResultsSync: string | null;
  lastCleanup: string | null;
}

interface SyncLog {
  id: number;
  endpoint: string;
  status: string;
  records_processed: number;
  synced_at: string;
  created_at: string;
  error_message?: string | null;
}

const API_BASE = '';

export default function SyncControl() {
  const [triggering, setTriggering] = useState<string | null>(null);

  // Fetch scheduler status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<SchedulerStatus>({
    queryKey: ['scheduler-status'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/scheduler/status`);
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      return data.success ? data : { isRunning: false, lastRiderSync: null, lastEventSync: null, lastResultsSync: null, lastCleanup: null };
    },
    refetchInterval: 5000, // Every 5s
  });

  // Fetch recent sync logs
  const { data: logsData, isLoading: logsLoading } = useQuery<{ count: number; logs: SyncLog[] }>({
    queryKey: ['sync-logs'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/sync-logs?limit=15`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
    refetchInterval: 10000, // Every 10s
  });

  const logs = logsData?.logs || [];

  const handleTrigger = async (action: string) => {
    setTriggering(action);
    try {
      const res = await fetch(`${API_BASE}/api/scheduler/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Failed to ${action}`);
      
      setTimeout(() => {
        refetchStatus();
        setTriggering(null);
      }, 2000);
    } catch (error) {
      console.error(`Error ${action}:`, error);
      setTriggering(null);
      alert(`Error: ${error}`);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'partial': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Activity className="w-8 h-8 text-indigo-600" />
                Sync Control Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Beheer automatische data synchronisatie</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full font-semibold ${
                status?.isRunning 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {status?.isRunning ? '● Running' : '○ Stopped'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Manual Sync Triggers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleTrigger('trigger-rider')}
              disabled={triggering !== null}
              className="flex items-center gap-3 p-4 border-2 border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              <Users className="w-5 h-5 text-indigo-600" />
              <div className="text-left">
                <div className="font-semibold">Sync Riders</div>
                <div className="text-sm text-gray-600">Club members</div>
              </div>
            </button>

            <button
              onClick={() => handleTrigger('trigger-event')}
              disabled={triggering !== null}
              className="flex items-center gap-3 p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <Calendar className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <div className="font-semibold">Sync Events</div>
                <div className="text-sm text-gray-600">Upcoming races</div>
              </div>
            </button>

            <button
              onClick={() => handleTrigger('trigger-results')}
              disabled={triggering !== null}
              className="flex items-center gap-3 p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              <Trophy className="w-5 h-5 text-green-600" />
              <div className="text-left">
                <div className="font-semibold">Sync Results</div>
                <div className="text-sm text-gray-600">Race results</div>
              </div>
            </button>

            <button
              onClick={() => handleTrigger('trigger-cleanup')}
              disabled={triggering !== null}
              className="flex items-center gap-3 p-4 border-2 border-orange-200 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5 text-orange-600" />
              <div className="text-left">
                <div className="font-semibold">Cleanup</div>
                <div className="text-sm text-gray-600">Old events</div>
              </div>
            </button>
          </div>
        </div>

        {/* Last Sync Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-700">Riders</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatTimestamp(status?.lastRiderSync || null)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-700">Events</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatTimestamp(status?.lastEventSync || null)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-700">Results</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatTimestamp(status?.lastResultsSync || null)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Trash2 className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-gray-700">Cleanup</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatTimestamp(status?.lastCleanup || null)}
            </p>
          </div>
        </div>

        {/* Recent Sync Logs */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Recent Sync Activity
          </h2>
          
          {logsLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No sync logs yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(log.status)}`}>
                      {getStatusIcon(log.status)}
                      <span className="capitalize">{log.status}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{log.endpoint}</p>
                      <p className="text-sm text-gray-600">
                        {log.records_processed} records • {formatTimestamp(log.synced_at)}
                      </p>
                      {log.error_message && (
                        <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Note: Stub Scheduler</p>
              <p>De scheduler is momenteel in stub-modus. Automatische syncs zijn uitgeschakeld. Gebruik de manual triggers hierboven om data te synchroniseren.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
