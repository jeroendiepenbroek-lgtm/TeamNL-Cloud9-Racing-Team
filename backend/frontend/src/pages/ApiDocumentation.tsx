/**
 * API Documentation Page
 * Complete overzicht van alle 3 APIs: ZwiftRacing.app, ZwiftPower, Zwift.com
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ApiEndpoint {
  status?: number;
  total_fields?: number;
  count?: number;
  structure?: string;
  sample?: any;
  data_available?: string[];
  description?: string;
  url?: string;
  note?: string;
}

interface ApiData {
  zwift_racing: Record<string, ApiEndpoint>;
  zwift_power: Record<string, ApiEndpoint>;
  zwift_com: Record<string, ApiEndpoint>;
  summary: {
    total_endpoints: number;
    total_fields: number;
  };
  metadata?: {
    generated: string;
    apis: Record<string, any>;
  };
}

interface ApiStatus {
  status: string;
  response_time_ms?: string;
  last_checked: string;
  error?: string;
}

export default function ApiDocumentation() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'zwift_racing' | 'zwift_power' | 'zwift_com'>('zwift_racing');
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [apiStatus, setApiStatus] = useState<Record<string, ApiStatus> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApiDocumentation();
    loadApiStatus();
    
    // Refresh status every 60 seconds
    const interval = setInterval(loadApiStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadApiDocumentation() {
    try {
      const response = await fetch('/api/admin/api-documentation');
      if (!response.ok) {
        throw new Error('Failed to load API documentation');
      }
      const data = await response.json();
      setApiData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function loadApiStatus() {
    try {
      const response = await fetch('/api/admin/api-documentation/status');
      if (response.ok) {
        const data = await response.json();
        setApiStatus(data);
      }
    } catch (err) {
      console.error('Failed to load API status:', err);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '✅';
      case 'offline': return '❌';
      case 'degraded': return '⚠️';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading API documentation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/50 border border-red-500 text-white p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-2">❌ Error</h2>
            <p>{error}</p>
            <button
              onClick={() => navigate('/admin')}
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded"
            >
              ← Terug naar Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!apiData) return null;

  const tabs = [
    { id: 'zwift_racing', label: 'ZwiftRacing.app', icon: '🏁', color: 'from-orange-500 to-red-600' },
    { id: 'zwift_power', label: 'ZwiftPower', icon: '⚡', color: 'from-yellow-500 to-orange-600' },
    { id: 'zwift_com', label: 'Zwift.com Official', icon: '🌐', color: 'from-blue-500 to-indigo-600' }
  ] as const;

  const renderEndpoints = (endpoints: Record<string, ApiEndpoint>) => {
    return (
      <div className="space-y-4">
        {Object.entries(endpoints).map(([endpoint, data]) => (
          <div key={endpoint} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-mono text-blue-400 mb-2">{endpoint}</h3>
                {data.description && (
                  <p className="text-gray-400 text-sm mb-2">{data.description}</p>
                )}
                {data.url && (
                  <p className="text-gray-500 text-xs font-mono mb-2">{data.url}</p>
                )}
              </div>
              {data.status && (
                <span className={`px-3 py-1 rounded text-sm ${data.status === 200 ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                  {data.status}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {data.total_fields && (
                <div className="bg-gray-900/50 p-3 rounded">
                  <div className="text-gray-400 text-xs mb-1">Total Fields</div>
                  <div className="text-white text-2xl font-bold">{data.total_fields}</div>
                </div>
              )}
              {data.count && (
                <div className="bg-gray-900/50 p-3 rounded">
                  <div className="text-gray-400 text-xs mb-1">Count</div>
                  <div className="text-white text-2xl font-bold">{data.count}</div>
                </div>
              )}
              {data.structure && (
                <div className="bg-gray-900/50 p-3 rounded">
                  <div className="text-gray-400 text-xs mb-1">Structure</div>
                  <div className="text-white text-lg font-mono">{data.structure}</div>
                </div>
              )}
            </div>

            {data.data_available && (
              <div className="bg-gray-900/30 p-4 rounded">
                <div className="text-gray-400 text-sm font-semibold mb-2">Available Data:</div>
                <ul className="text-gray-300 text-sm space-y-1">
                  {data.data_available.map((item, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-green-400 mr-2">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.note && (
              <div className="mt-4 bg-yellow-900/20 border border-yellow-700/50 p-3 rounded">
                <p className="text-yellow-300 text-sm">ℹ️ {data.note}</p>
              </div>
            )}

            {data.sample && typeof data.sample === 'object' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-blue-400 hover:text-blue-300 text-sm">
                  View sample data →
                </summary>
                <pre className="mt-2 bg-gray-900 p-3 rounded overflow-x-auto text-xs text-gray-300">
                  {JSON.stringify(data.sample, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="mb-4 text-blue-400 hover:text-blue-300 flex items-center gap-2"
          >
            ← Terug naar Admin
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                📚 API Documentation
              </h1>
              <p className="text-gray-400">
                Complete overzicht van alle 3 Zwift Racing APIs
              </p>
            </div>
            
            {apiData.summary && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Coverage</div>
                <div className="text-white text-3xl font-bold">
                  {apiData.summary.total_endpoints} endpoints
                </div>
                <div className="text-blue-400 text-xl">
                  {apiData.summary.total_fields}+ fields
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API Status */}
        {apiStatus && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">🔌 Live API Status</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(apiStatus).map(([api, status]) => (
                <div key={api} className="bg-gray-900/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium capitalize">
                      {api.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(status.status)}`}>
                      {getStatusIcon(status.status)} {status.status}
                    </span>
                  </div>
                  {status.response_time_ms && (
                    <div className="text-gray-500 text-xs">
                      Response time: {status.response_time_ms}
                    </div>
                  )}
                  <div className="text-gray-600 text-xs mt-1">
                    {new Date(status.last_checked).toLocaleTimeString('nl-NL')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6">
          {activeTab === 'zwift_racing' && renderEndpoints(apiData.zwift_racing)}
          {activeTab === 'zwift_power' && renderEndpoints(apiData.zwift_power)}
          {activeTab === 'zwift_com' && renderEndpoints(apiData.zwift_com)}
        </div>

        {/* Metadata */}
        {apiData.metadata && (
          <div className="mt-8 bg-gray-800/30 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">ℹ️ Metadata</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {Object.entries(apiData.metadata.apis).map(([api, info]: [string, any]) => (
                <div key={api} className="bg-gray-900/50 p-4 rounded">
                  <h3 className="text-white font-semibold mb-2 capitalize">
                    {api.replace('_', ' ')}
                  </h3>
                  <div className="text-gray-400 text-sm space-y-1">
                    <div>
                      <span className="text-gray-500">Base URL:</span>
                      <br />
                      <code className="text-blue-400 text-xs">{info.base_url}</code>
                    </div>
                    <div>
                      <span className="text-gray-500">Auth:</span> {info.auth}
                    </div>
                    {info.rate_limits && typeof info.rate_limits === 'object' && (
                      <div>
                        <span className="text-gray-500">Rate Limits:</span>
                        <ul className="text-xs mt-1">
                          {Object.entries(info.rate_limits).map(([key, value]) => (
                            <li key={key}>• {key}: {value as string}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
