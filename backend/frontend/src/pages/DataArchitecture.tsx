/**
 * Data Architecture Page
 * Visuele weergave van alle API integraties, endpoints en datavelden
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ApiEndpoint {
  status?: number;
  total_fields?: number;
  count?: number;
  structure?: string;
  sample?: any;
  sample_data?: any;  // Backwards compatibility
  top_level_keys?: string[];
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

export default function DataArchitecture() {
  const navigate = useNavigate();
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchApiData();
  }, []);

  const fetchApiData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/api-documentation');
      if (!response.ok) {
        throw new Error('Failed to fetch API documentation');
      }
      const data = await response.json();
      setApiData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleEndpoint = (endpoint: string) => {
    setExpandedEndpoints(prev => {
      const next = new Set(prev);
      if (next.has(endpoint)) {
        next.delete(endpoint);
      } else {
        next.add(endpoint);
      }
      return next;
    });
  };

  // Extract all nested fields from sample data recursively
  const extractAllFields = (obj: any, prefix = ''): Array<{path: string, type: string}> => {
    const fields: Array<{path: string, type: string}> = [];
    
    if (obj === null || obj === undefined) return fields;
    
    if (Array.isArray(obj)) {
      if (obj.length > 0) {
        // Process first item in array
        const arrayFields = extractAllFields(obj[0], prefix);
        arrayFields.forEach(f => fields.push({...f, type: `${f.type}[]`}));
      }
    } else if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        
        fields.push({ path: fullPath, type: valueType });
        
        // Recurse into nested objects/arrays
        if (typeof value === 'object' && value !== null) {
          const nestedFields = extractAllFields(value, fullPath);
          fields.push(...nestedFields);
        }
      });
    }
    
    return fields;
  };

  // Component voor het weergeven van alle fields met zoekfunctionaliteit
  const FieldsTable = ({ sample, totalFields }: { sample: any, totalFields?: number }) => {
    const [fieldSearch, setFieldSearch] = useState('');
    const allFields = extractAllFields(sample);
    
    const filteredFields = fieldSearch 
      ? allFields.filter(f => 
          f.path.toLowerCase().includes(fieldSearch.toLowerCase()) ||
          f.type.toLowerCase().includes(fieldSearch.toLowerCase())
        )
      : allFields;

    const getTypeBadgeColor = (type: string) => {
      if (type.includes('[]')) return 'bg-orange-100 text-orange-700';
      switch (type) {
        case 'string': return 'bg-blue-100 text-blue-700';
        case 'number': return 'bg-green-100 text-green-700';
        case 'boolean': return 'bg-purple-100 text-purple-700';
        case 'object': return 'bg-gray-100 text-gray-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    };

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-700">
            Alle {totalFields || allFields.length} Fields:
          </h4>
          <input
            type="text"
            placeholder="Zoek field..."
            value={fieldSearch}
            onChange={(e) => setFieldSearch(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {fieldSearch && (
          <p className="text-xs text-gray-500 mb-2">
            Toon {filteredFields.length} van {allFields.length} fields
          </p>
        )}
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 font-semibold text-gray-700">Field Path</th>
                <th className="text-left p-2 font-semibold text-gray-700 w-32">Type</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFields.map((field, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-2 font-mono text-gray-800">{field.path}</td>
                  <td className="p-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${getTypeBadgeColor(field.type)}`}>
                      {field.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getAuthBadge = (apiName: string) => {
    const authTypes = {
      'ZwiftRacing.app': { type: 'Public', color: 'bg-green-100 text-green-800', icon: '🔓' },
      'ZwiftPower': { type: 'Username/Password', color: 'bg-yellow-100 text-yellow-800', icon: '🔐' },
      'Zwift.com': { type: 'OAuth Bearer', color: 'bg-blue-100 text-blue-800', icon: '🔑' }
    };
    return authTypes[apiName as keyof typeof authTypes];
  };

  const getApiMetadata = (apiKey: string) => {
    const metadata = {
      zwift_racing: {
        name: 'ZwiftRacing.app',
        baseUrl: 'https://zwift-ranking.herokuapp.com/api',
        description: 'Community racing rankings en statistieken',
        authentication: 'Geen (public API)',
        credentials: undefined,
        rateLimit: 'Onbeperkt voor read operations',
        color: 'from-purple-500 to-purple-700'
      },
      zwift_power: {
        name: 'ZwiftPower',
        baseUrl: 'https://zwiftpower.com',
        description: 'Race results, FTP, power curve, KOM segments',
        authentication: 'Username/Password via zpdatafetch',
        credentials: 'jeroen.diepenbroek@gmail.com',
        rateLimit: '~60 requests/min',
        color: 'from-orange-500 to-orange-700'
      },
      zwift_com: {
        name: 'Zwift.com',
        baseUrl: 'https://us-or-rly101.zwift.com/api',
        description: 'Official Zwift API: profiles, activities, achievements',
        authentication: 'OAuth password grant (client_id: Zwift_Mobile_Link)',
        credentials: 'jeroen.diepenbroek@gmail.com',
        rateLimit: 'Onbekend (conservatief gebruik aanbevolen)',
        color: 'from-red-500 to-red-700'
      }
    };
    return metadata[apiKey as keyof typeof metadata];
  };

  const renderApiCard = (apiKey: string, endpoints: Record<string, ApiEndpoint>) => {
    const meta = getApiMetadata(apiKey);
    if (!meta) return null;

    const auth = getAuthBadge(meta.name);
    const totalFields = Object.values(endpoints).reduce((sum, ep) => sum + (ep.total_fields || 0), 0);
    const endpointCount = Object.keys(endpoints).length;

    return (
      <div key={apiKey} className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        {/* Header */}
        <div className={`bg-gradient-to-r ${meta.color} text-white p-6`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{meta.name}</h2>
              <p className="text-white/90 mb-3">{meta.description}</p>
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${auth.color}`}>
                  {auth.icon} {auth.type}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                  📊 {endpointCount} endpoints
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white">
                  🔢 {totalFields} fields
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* API Details */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Base URL</h3>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">{meta.baseUrl}</code>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Authentication</h3>
              <p className="text-sm text-gray-600">{meta.authentication}</p>
            </div>
            {meta.credentials && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Credentials</h3>
                <p className="text-sm text-gray-600">{meta.credentials}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Rate Limit</h3>
              <p className="text-sm text-gray-600">{meta.rateLimit}</p>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Endpoints & Data Fields</h3>
          <div className="space-y-3">
            {Object.entries(endpoints).map(([endpoint, data]) => {
              const isExpanded = expandedEndpoints.has(`${apiKey}-${endpoint}`);
              const method = endpoint.split(' ')[0];
              const path = endpoint.split(' ').slice(1).join(' ');
              
              return (
                <div key={endpoint} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Endpoint Header */}
                  <button
                    onClick={() => toggleEndpoint(`${apiKey}-${endpoint}`)}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        method === 'GET' ? 'bg-blue-100 text-blue-700' :
                        method === 'POST' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {method}
                      </span>
                      <code className="text-sm font-mono text-gray-700">{path}</code>
                      {data.status && (
                        <span className="text-xs text-green-600">✓ {data.status}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {data.count !== undefined && (
                        <span className="text-xs text-gray-500">{data.count} items</span>
                      )}
                      <span className="text-sm font-semibold text-gray-700">
                        {data.total_fields || 0} fields
                      </span>
                      <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                    </div>
                  </button>

                  {/* Endpoint Details */}
                  {isExpanded && (
                    <div className="p-4 bg-white border-t">
                      {data.description && (
                        <p className="text-sm text-gray-600 mb-3">{data.description}</p>
                      )}
                      
                      {data.note && (
                        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                          ℹ️ {data.note}
                        </div>
                      )}

                      {/* Top Level Keys */}
                      {data.top_level_keys && (
                        <div className="mb-3">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2">Top Level Fields:</h4>
                          <div className="flex flex-wrap gap-1">
                            {data.top_level_keys.map(key => (
                              <span key={key} className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                {key}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All Fields - Recursive Extraction */}
                      {(data.sample || data.sample_data) && (
                        <FieldsTable 
                          sample={data.sample || data.sample_data} 
                          totalFields={data.total_fields} 
                        />
                      )}

                      {/* Data Available */}
                      {data.data_available && (
                        <div className="mb-3">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2">Available Data:</h4>
                          <div className="flex flex-wrap gap-1">
                            {data.data_available.map(item => (
                              <span key={item} className="inline-block px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sample Data */}
                      {(data.sample || data.sample_data) && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 mb-2">Sample Data:</h4>
                          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto max-h-64">
                            {JSON.stringify(data.sample || data.sample_data, null, 2)}
                          </pre>
                        </div>
                      )}

                      {data.url && (
                        <a 
                          href={data.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-3 text-sm text-blue-600 hover:text-blue-800"
                        >
                          📖 View full documentation →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Laden van API architectuur...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !apiData) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error loading data</h2>
            <p className="text-red-600">{error || 'No data available'}</p>
            <button
              onClick={() => navigate('/admin')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Terug naar Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-8">
          <button
            onClick={() => navigate('/admin')}
            className="mb-6 inline-flex items-center text-white/80 hover:text-white transition-colors"
          >
            ← Terug naar Admin Dashboard
          </button>
          <h1 className="text-4xl font-bold mb-4">🏗️ Data Architectuur</h1>
          <p className="text-xl text-white/90 mb-6">
            Complete overzicht van alle API integraties, endpoints en datavelden
          </p>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold">{apiData.summary.total_endpoints}</div>
              <div className="text-white/80">Total Endpoints</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold">{apiData.summary.total_fields}+</div>
              <div className="text-white/80">Total Data Fields</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-3xl font-bold">3</div>
              <div className="text-white/80">API Integrations</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Architecture Overview */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🔄 System Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-4xl mb-2">📊</div>
              <h3 className="font-semibold text-purple-900 mb-1">ZwiftRacing.app</h3>
              <p className="text-sm text-purple-700">Community Rankings</p>
              <p className="text-xs text-purple-600 mt-2">Public API - No Auth</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="font-semibold text-orange-900 mb-1">ZwiftPower</h3>
              <p className="text-sm text-orange-700">Race Results & FTP</p>
              <p className="text-xs text-orange-600 mt-2">Username/Password</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
              <div className="text-4xl mb-2">🚴</div>
              <h3 className="font-semibold text-red-900 mb-1">Zwift.com</h3>
              <p className="text-sm text-red-700">Official Profiles & Activities</p>
              <p className="text-xs text-red-600 mt-2">OAuth Bearer Token</p>
            </div>
          </div>
          
          {/* Data Flow */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Data Flow</h3>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="px-3 py-2 bg-purple-100 text-purple-800 rounded">APIs</div>
              <span className="text-gray-400">→</span>
              <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded">Backend Services</div>
              <span className="text-gray-400">→</span>
              <div className="px-3 py-2 bg-green-100 text-green-800 rounded">Supabase Database</div>
              <span className="text-gray-400">→</span>
              <div className="px-3 py-2 bg-teal-100 text-teal-800 rounded">Admin Dashboard</div>
            </div>
          </div>
        </div>

        {/* API Cards */}
        <div className="space-y-8">
          {apiData.zwift_racing && renderApiCard('zwift_racing', apiData.zwift_racing)}
          {apiData.zwift_power && renderApiCard('zwift_power', apiData.zwift_power)}
          {apiData.zwift_com && renderApiCard('zwift_com', apiData.zwift_com)}
        </div>

        {/* Metadata */}
        {apiData.metadata && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Metadata</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Generated</h3>
                <p className="text-sm text-gray-600">{new Date(apiData.metadata.generated).toLocaleString('nl-NL')}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Test Rider</h3>
                <p className="text-sm text-gray-600">150437 (JRøne | CloudRacer-9 @YouTube)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
