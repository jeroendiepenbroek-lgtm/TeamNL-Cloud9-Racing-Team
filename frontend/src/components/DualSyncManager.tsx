import { useState, useEffect } from 'react';
import { RefreshCw, Users, Trophy, Clock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface SyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastRun: string | null;
  nextRun: string | null;
}

export default function DualSyncManager() {
  const [riderConfig, setRiderConfig] = useState<SyncConfig | null>(null);
  const [raceConfig, setRaceConfig] = useState<SyncConfig | null>(null);
  const [riderCountdown, setRiderCountdown] = useState<string>('');
  const [raceCountdown, setRaceCountdown] = useState<string>('');

  const API_BASE = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    loadConfigs();
    const interval = setInterval(loadConfigs, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Update countdowns every second
  useEffect(() => {
    const updateCountdowns = () => {
      if (riderConfig?.nextRun) {
        setRiderCountdown(getTimeUntil(riderConfig.nextRun));
      }
      if (raceConfig?.nextRun) {
        setRaceCountdown(getTimeUntil(raceConfig.nextRun));
      }
    };

    updateCountdowns();
    const timer = setInterval(updateCountdowns, 1000);
    return () => clearInterval(timer);
  }, [riderConfig, raceConfig]);

  const loadConfigs = async () => {
    try {
      // Load team_riders config
      const riderRes = await fetch(`${API_BASE}/api/admin/sync-config/team_riders`);
      if (riderRes.ok) {
        setRiderConfig(await riderRes.json());
      }

      // Load race_results config
      const raceRes = await fetch(`${API_BASE}/api/admin/sync-config/race_results`);
      if (raceRes.ok) {
        setRaceConfig(await raceRes.json());
      }
    } catch (err) {
      console.error('Failed to load sync configs:', err);
    }
  };

  const getTimeUntil = (nextRun: string): string => {
    const now = new Date();
    const next = new Date(nextRun);
    const diff = next.getTime() - now.getTime();

    if (diff <= 0) return 'Binnenkort...';

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (hours > 0) return `${hours}u ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const triggerSync = async (syncType: 'riders' | 'races') => {
    const endpoint = syncType === 'riders' ? '/api/admin/sync-all' : '/api/admin/scan-race-results';
    const loadingMsg = syncType === 'riders' ? 'Riders sync gestart...' : 'Race scan gestart...';
    
    toast.loading(loadingMsg, { id: 'sync' });
    
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || '✅ Sync gestart!', { id: 'sync' });
          setTimeout(loadConfigs, 2000); // Reload configs after 2s
        } else {
          toast.error(data.error || 'Sync failed', { id: 'sync' });
        }
      }
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error('❌ Sync fout', { id: 'sync' });
    }
  };

  const formatLastRun = (lastRun: string | null): string => {
    if (!lastRun) return 'Nooit';
    
    const date = new Date(lastRun);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Zojuist';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m geleden`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}u geleden`;
    
    return date.toLocaleDateString('nl-NL', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Rider Sync Card */}
      <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg border border-blue-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/30 rounded-xl backdrop-blur-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Rider Sync</h3>
              <p className="text-blue-100 text-xs">Team roster updates</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              riderConfig?.enabled 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {riderConfig?.enabled ? '✓ Actief' : '○ Inactief'}
            </span>
          </div>

          {/* Interval */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">Interval:</span>
            <span className="text-sm font-bold text-gray-900">
              Elke {riderConfig?.intervalMinutes || '?'} minuten
            </span>
          </div>

          {/* Last Run */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">Laatste sync:</span>
            <span className="text-sm font-medium text-gray-700">
              {formatLastRun(riderConfig?.lastRun || null)}
            </span>
          </div>

          {/* Next Run Countdown */}
          {riderConfig?.enabled && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Volgende sync:</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{riderCountdown}</span>
              </div>
            </div>
          )}

          {/* Manual Trigger */}
          <button
            onClick={() => triggerSync('riders')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Nu synchroniseren
          </button>
        </div>
      </div>

      {/* Race Results Sync Card */}
      <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl shadow-lg border border-orange-200 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-red-500 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/30 rounded-xl backdrop-blur-xl">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Race Scan</h3>
              <p className="text-orange-100 text-xs">Results from ZwiftRacing</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">Status:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              raceConfig?.enabled 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {raceConfig?.enabled ? '✓ Actief' : '○ Inactief'}
            </span>
          </div>

          {/* Interval */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">Interval:</span>
            <span className="text-sm font-bold text-gray-900">
              Elke {raceConfig?.intervalMinutes || '?'} minuten
            </span>
          </div>

          {/* Last Run */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">Laatste scan:</span>
            <span className="text-sm font-medium text-gray-700">
              {formatLastRun(raceConfig?.lastRun || null)}
            </span>
          </div>

          {/* Next Run Countdown */}
          {raceConfig?.enabled && (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Volgende scan:</span>
                </div>
                <span className="text-lg font-bold text-orange-600">{raceCountdown}</span>
              </div>
            </div>
          )}

          {/* Manual Trigger */}
          <button
            onClick={() => triggerSync('races')}
            className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <Zap className="w-4 h-4" />
            Nu scannen
          </button>
        </div>
      </div>
    </div>
  );
}
