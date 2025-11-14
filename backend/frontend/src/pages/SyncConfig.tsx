/**
 * Feature: Sync Configuration Dashboard
 * US1-US3: Configureer sync parameters via web interface
 */

import { useEffect, useState } from 'react';
import { Settings, Save, RotateCcw, Clock, Users, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface SyncConfig {
  nearEventThresholdMinutes: number;
  nearEventSyncIntervalMinutes: number;
  farEventSyncIntervalMinutes: number;
  riderSyncEnabled: boolean;
  riderSyncIntervalMinutes: number;
  lookforwardHours: number;
  checkIntervalMinutes: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  nearEventThresholdMinutes: 60,
  nearEventSyncIntervalMinutes: 10,
  farEventSyncIntervalMinutes: 60,
  riderSyncEnabled: true,
  riderSyncIntervalMinutes: 360,
  lookforwardHours: 36,
  checkIntervalMinutes: 5,
};

export default function SyncConfig() {
  const [config, setConfig] = useState<SyncConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/sync/config');
      if (!response.ok) throw new Error('Fout bij ophalen configuratie');
      const data = await response.json();
      setConfig(data);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/sync/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fout bij opslaan');
      }
      
      const result = await response.json();
      setConfig(result.config);
      setMessage({ type: 'success', text: 'Configuratie succesvol opgeslagen! Schedulers zijn herstart.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Weet je zeker dat je wilt resetten naar standaardwaarden?')) return;
    
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/sync/config/reset', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Fout bij resetten');
      
      const result = await response.json();
      setConfig(result.config);
      setMessage({ type: 'success', text: 'Configuratie gereset naar standaardwaarden' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof SyncConfig, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg shadow-purple-300">
              <Settings className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm">
              Sync Configuratie
            </h1>
          </div>
          <p className="text-slate-700 text-lg font-medium ml-1">
            Beheer synchronisatie intervallen en parameters
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
            )}
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Event Sync Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-800">Event Synchronisatie</h2>
          </div>

          <div className="space-y-6">
            {/* Lookforward Hours */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Lookforward Periode (uren)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={config.lookforwardHours}
                onChange={(e) => updateField('lookforwardHours', parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-blue-500 focus:outline-none font-medium"
              />
              <p className="text-xs text-slate-500 mt-1">
                Hoe ver vooruit events worden opgehaald (standaard: 36 uur)
              </p>
            </div>

            {/* Near Event Threshold */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                "Near Event" Drempel (minuten)
              </label>
              <input
                type="number"
                min="5"
                max="240"
                value={config.nearEventThresholdMinutes}
                onChange={(e) => updateField('nearEventThresholdMinutes', parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-blue-500 focus:outline-none font-medium"
              />
              <p className="text-xs text-slate-500 mt-1">
                Events binnen deze tijd worden als "near" beschouwd (standaard: 60 min)
              </p>
            </div>

            {/* Near Event Sync Interval */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Near Event Sync Interval (minuten)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={config.nearEventSyncIntervalMinutes}
                onChange={(e) => updateField('nearEventSyncIntervalMinutes', parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-blue-500 focus:outline-none font-medium"
              />
              <p className="text-xs text-slate-500 mt-1">
                Hoe vaak "near" events worden gesynchroniseerd (standaard: 10 min)
              </p>
            </div>

            {/* Far Event Sync Interval */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Far Event Sync Interval (minuten)
              </label>
              <input
                type="number"
                min="5"
                max="240"
                value={config.farEventSyncIntervalMinutes}
                onChange={(e) => updateField('farEventSyncIntervalMinutes', parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-blue-500 focus:outline-none font-medium"
              />
              <p className="text-xs text-slate-500 mt-1">
                Hoe vaak "far" events worden gesynchroniseerd (standaard: 60 min)
              </p>
            </div>

            {/* Check Interval */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Check Interval (minuten)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={config.checkIntervalMinutes}
                onChange={(e) => updateField('checkIntervalMinutes', parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-blue-500 focus:outline-none font-medium"
              />
              <p className="text-xs text-slate-500 mt-1">
                Hoe vaak scheduler checkt of sync nodig is (standaard: 5 min)
              </p>
            </div>
          </div>
        </div>

        {/* Rider Sync Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
            <Users className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-bold text-slate-800">Rider Synchronisatie</h2>
          </div>

          <div className="space-y-6">
            {/* Rider Sync Enabled */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Rider Sync Ingeschakeld
                </label>
                <p className="text-xs text-slate-500">
                  Periodieke synchronisatie van club members
                </p>
              </div>
              <button
                onClick={() => updateField('riderSyncEnabled', !config.riderSyncEnabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  config.riderSyncEnabled ? 'bg-green-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    config.riderSyncEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Rider Sync Interval */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Rider Sync Interval (minuten)
              </label>
              <input
                type="number"
                min="60"
                max="1440"
                step="60"
                value={config.riderSyncIntervalMinutes}
                onChange={(e) => updateField('riderSyncIntervalMinutes', parseInt(e.target.value))}
                disabled={!config.riderSyncEnabled}
                className={`w-full px-4 py-3 rounded-lg border-2 focus:border-orange-500 focus:outline-none font-medium ${
                  config.riderSyncEnabled 
                    ? 'border-slate-200 bg-white' 
                    : 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              />
              <p className="text-xs text-slate-500 mt-1">
                Hoe vaak riders worden gesynchroniseerd (standaard: 360 min / 6 uur)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <Save className="w-6 h-6" />
            {saving ? 'Opslaan...' : 'Opslaan & Herstarten'}
          </button>

          <button
            onClick={handleReset}
            disabled={saving}
            className="bg-white text-slate-600 border-2 border-slate-200 px-6 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <RotateCcw className="w-6 h-6" />
            Reset
          </button>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Let op:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Wijzigingen herstarten automatisch alle schedulers</li>
                <li>Lagere intervallen = meer API calls (let op rate limits!)</li>
                <li>Lookforward Hours beïnvloedt de Event dashboard weergave</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
