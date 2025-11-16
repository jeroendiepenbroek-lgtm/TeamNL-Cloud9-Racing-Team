import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { Star, Trash2, UserPlus, Upload, Download, RefreshCw, Search, Users, TrendingUp, Award, Zap } from 'lucide-react';

// Types based on view_my_team + migration 007 (61 API fields)
interface TeamRider {
  // Primary key & core
  rider_id: number;
  name: string;
  gender: string | null;
  country: string | null;
  age: string | null; // "Vet", "30-39", etc. (TEXT not number!)
  height: number | null;
  weight: number | null;

  // ZwiftPower category & FTP
  zp_category: string | null; // A/B/C/D/E
  zp_ftp: number | null;

  // Power metrics (18 fields)
  power_wkg5: number | null;
  power_wkg15: number | null;
  power_wkg30: number | null;
  power_wkg60: number | null;
  power_wkg120: number | null;
  power_wkg300: number | null;
  power_wkg1200: number | null;
  power_w5: number | null;
  power_w15: number | null;
  power_w30: number | null;
  power_w60: number | null;
  power_w120: number | null;
  power_w300: number | null;
  power_w1200: number | null;
  power_cp: number | null; // Critical Power
  power_awc: number | null; // Anaerobic Work Capacity
  power_compound_score: number | null;
  power_rating: number | null;

  // Race stats (14 fields)
  race_last_rating: number | null;
  race_last_date: string | null;
  race_current_rating: number | null;
  race_current_date: string | null;
  race_max30_rating: number | null;
  race_max30_date: string | null;
  race_max90_rating: number | null;
  race_max90_date: string | null;
  race_finishes: number;
  race_dnfs: number | null;
  race_wins: number;
  race_podiums: number | null;
  race_disqualifications: number | null;
  race_upgrades: number | null;

  // Phenotype (7 fields)
  phenotype_value: string | null; // "Sprinter", "Climber", etc.
  phenotype_sprinter: number | null;
  phenotype_puncheur: number | null;
  phenotype_pursuiter: number | null;
  phenotype_climber: number | null;
  phenotype_tt: number | null;
  phenotype_bias: number | null;

  // Handicaps (4 fields)
  handicap_flat: number | null;
  handicap_rolling: number | null;
  handicap_hilly: number | null;
  handicap_mountainous: number | null;

  // Club
  club_id: number | null;
  club_name: string | null;

  // Computed (from riders_computed view)
  watts_per_kg: number | null; // zp_ftp / weight

  // Compatibility fields (old ZwiftRacing format)
  ranking: number | null; // DEPRECATED - use race_current_rating
  total_races_compat: number; // DEPRECATED - use race_finishes
  total_wins_compat: number; // DEPRECATED - use race_wins
  total_podiums_compat: number | null; // DEPRECATED - use race_podiums

  // Metadata
  id: number;
  created_at: string;
  last_synced: string;

  // Team membership (from my_team_members via view_my_team)
  team_added_at: string;
  is_favorite: boolean;
}

const API_BASE = '';

export default function RidersModern() {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Fetch team riders
  const { data, isLoading, error } = useQuery({
    queryKey: ['teamRiders'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders/team`);
      if (!res.ok) throw new Error('Failed to fetch riders');
      return res.json();
    },
    refetchInterval: 60000, // Refresh elke minuut
  });

  const riders: TeamRider[] = data || [];

  // Mutations
  const toggleFavorite = useMutation({
    mutationFn: async ({ zwiftId, isFavorite }: { zwiftId: number; isFavorite: boolean }) => {
      const res = await fetch(`${API_BASE}/api/riders/team/${zwiftId}/favorite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite }),
      });
      if (!res.ok) throw new Error('Failed to update favorite');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamRiders'] });
    },
  });

  const deleteRider = useMutation({
    mutationFn: async (zwiftId: number) => {
      const res = await fetch(`${API_BASE}/api/riders/team/${zwiftId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete rider');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamRiders'] });
    },
  });

  const triggerManualSync = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/auto-sync/trigger`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to trigger sync');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teamRiders'] });
      alert(`✅ Sync voltooid!\n\nSucces: ${data.result.success} riders\nErrors: ${data.result.errors}\nSkipped: ${data.result.skipped}`);
    },
    onError: (error: any) => {
      alert(`❌ Sync failed: ${error.message}`);
    },
  });

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'Nu';
    if (diffMin < 60) return `${diffMin}min geleden`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}u geleden`;
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Table columns - Modern responsive design
  const columnHelper = createColumnHelper<TeamRider>();
  const columns = [
    columnHelper.accessor('rider_id', {
      header: 'ID',
      size: 80,
      cell: (info) => <span className="text-xs sm:text-sm text-gray-500 font-mono">{info.getValue()}</span>,
    }),
    columnHelper.accessor('name', {
      header: 'Naam',
      size: 200,
      cell: (info) => <span className="text-xs sm:text-sm font-semibold text-gray-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor('club_name', {
      header: 'Club',
      size: 120,
      cell: (info) => <span className="text-xs sm:text-sm text-gray-600">{info.getValue() || 'TeamNL'}</span>,
    }),
    columnHelper.accessor('race_current_rating', {
      header: 'Ranking',
      size: 90,
      cell: (info) => {
        const val = info.getValue();
        return val ? (
          <span className="text-xs sm:text-sm font-medium text-emerald-600">{Math.round(val)}</span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        );
      },
    }),
    columnHelper.accessor('zp_category', {
      header: 'Cat',
      size: 60,
      cell: (info) => (
        <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded text-xs font-bold shadow-sm">
          {info.getValue() || '?'}
        </span>
      ),
    }),
    columnHelper.accessor('zp_ftp', {
      header: 'FTP',
      size: 80,
      cell: (info) => (
        info.getValue() ? (
          <span className="text-xs sm:text-sm text-gray-700">{info.getValue()}W</span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )
      ),
    }),
    columnHelper.accessor('watts_per_kg', {
      header: 'W/kg',
      size: 80,
      cell: (info) => (
        info.getValue() ? (
          <span className="text-xs sm:text-sm font-medium text-purple-600">{Number(info.getValue()).toFixed(2)}</span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )
      ),
    }),
    columnHelper.accessor('phenotype_value', {
      header: 'Type',
      size: 100,
      cell: (info) => {
        const value = info.getValue();
        const colors: Record<string, string> = {
          Sprinter: 'from-red-500 to-orange-500',
          Climber: 'from-green-500 to-emerald-500',
          Puncheur: 'from-yellow-500 to-amber-500',
          Pursuiter: 'from-blue-500 to-cyan-500',
          TT: 'from-indigo-500 to-purple-500',
        };
        return value ? (
          <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 bg-gradient-to-r ${colors[value] || 'from-gray-500 to-gray-600'} text-white rounded text-xs font-medium shadow-sm`}>
            {value}
          </span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        );
      },
    }),
    columnHelper.accessor('race_finishes', {
      header: 'Races',
      size: 70,
      cell: (info) => <span className="text-xs sm:text-sm text-gray-600">{info.getValue() || 0}</span>,
    }),
    columnHelper.accessor('race_wins', {
      header: 'Wins',
      size: 70,
      cell: (info) => (
        <span className="text-xs sm:text-sm font-bold text-yellow-600 flex items-center gap-1">
          <Award className="w-3 h-3" />
          {info.getValue() || 0}
        </span>
      ),
    }),
    columnHelper.accessor('race_podiums', {
      header: 'Podiums',
      size: 85,
      cell: (info) => <span className="text-xs sm:text-sm font-medium text-orange-600">{info.getValue() || 0}</span>,
    }),
    columnHelper.accessor('team_added_at', {
      header: 'Toegevoegd',
      size: 120,
      cell: (info) => (
        <span className="text-xs sm:text-sm text-gray-600">
          {formatTimestamp(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor('last_synced', {
      header: 'Laatste Sync',
      size: 120,
      cell: (info) => {
        const timestamp = formatTimestamp(info.getValue());
        const isRecent = timestamp === 'Nu' || timestamp.includes('min geleden');
        return (
          <span className={`text-xs sm:text-sm flex items-center gap-1 ${isRecent ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
            <Zap className={`w-3 h-3 ${isRecent ? 'text-green-500' : 'text-gray-400'}`} />
            {timestamp}
          </span>
        );
      },
    }),
    columnHelper.accessor('is_favorite', {
      header: '⭐',
      size: 50,
      cell: (info) => (
        <button
          onClick={() => toggleFavorite.mutate({ 
            zwiftId: info.row.original.rider_id,
            isFavorite: !info.getValue() 
          })}
          className="text-lg sm:text-xl hover:scale-125 transition-transform"
          title={info.getValue() ? 'Remove from favorites' : 'Add to favorites'}
        >
          {info.getValue() ? (
            <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
          ) : (
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
          )}
        </button>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acties',
      size: 80,
      cell: (info) => (
        <button
          onClick={() => {
            if (window.confirm(`Weet je zeker dat je ${info.row.original.name} wilt verwijderen uit het team?`)) {
              deleteRider.mutate(info.row.original.rider_id);
            }
          }}
          className="p-1.5 sm:p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition shadow-sm hover:shadow-md"
          disabled={deleteRider.isPending}
          title="Verwijder uit team"
        >
          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      ),
    }),
  ];

  const table = useReactTable({
    data: riders,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 pb-20 lg:pb-0">
      {/* Glassmorphism Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg">
                <Users className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold">Team Management</h1>
                <p className="text-xs sm:text-sm text-white/90 mt-1">Beheer je TeamNL Cloud9 riders</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-white/20 backdrop-blur-md rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2 sm:py-3 shadow-lg">
                <div className="text-xs sm:text-sm text-white/80">Team Grootte</div>
                <div className="text-2xl sm:text-3xl font-bold mt-0.5">{riders.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Actions Bar */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-white/20 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Zoek op naam of Zwift ID..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full pl-9 sm:pl-11 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
              />
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-blue-700 transition flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium shadow-md hover:shadow-lg"
              >
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Add Rider</span>
                <span className="sm:hidden">Add</span>
              </button>
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg sm:rounded-xl hover:from-green-600 hover:to-green-700 transition flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium shadow-md hover:shadow-lg"
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Bulk Upload</span>
                <span className="sm:hidden">Bulk</span>
              </button>
              <button
                onClick={() => triggerManualSync.mutate()}
                disabled={triggerManualSync.isPending || riders.length === 0}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg sm:rounded-xl hover:from-purple-600 hover:to-purple-700 transition flex items-center justify-center gap-1.5 sm:gap-2 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm font-medium shadow-md hover:shadow-lg"
                title={riders.length === 0 ? 'Voeg eerst riders toe om te synchen' : 'Sync alle team members met ZwiftRacing API'}
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${triggerManualSync.isPending ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{triggerManualSync.isPending ? 'Syncing...' : 'Sync All'}</span>
                <span className="sm:hidden">{triggerManualSync.isPending ? '...' : 'Sync'}</span>
              </button>
              <button
                onClick={() => {
                  const csv = generateCSV(riders);
                  downloadCSV(csv, 'teamnl-cloud9-riders.csv');
                }}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg sm:rounded-xl hover:from-gray-600 hover:to-gray-700 transition flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium shadow-md hover:shadow-lg"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
              <div className="text-sm sm:text-base text-gray-500">Loading team members...</div>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-4">❌</div>
              <div className="text-sm sm:text-base text-red-500 font-medium">Error loading riders</div>
            </div>
          ) : riders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">
                <Users className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-gray-300" />
              </div>
              <div className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Nog geen team leden</div>
              <div className="text-sm sm:text-base text-gray-500 mb-6">Voeg je eerste rider toe om te beginnen</div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition inline-flex items-center gap-2 shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                Add First Rider
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const hideOnMobile = ['club_name', 'phenotype_value', 'race_podiums', 'team_added_at'].includes(header.id);
                        const hideOnTablet = ['last_synced'].includes(header.id);
                        return (
                          <th
                            key={header.id}
                            className={`px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition ${
                              hideOnMobile ? 'hidden sm:table-cell' : ''
                            } ${hideOnTablet ? 'hidden lg:table-cell' : ''}`}
                            onClick={header.column.getToggleSortingHandler()}
                            style={{ width: header.getSize() }}
                          >
                            <div className="flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{
                                asc: ' ▲',
                                desc: ' ▼',
                              }[header.column.getIsSorted() as string] ?? ''}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition">
                      {row.getVisibleCells().map((cell) => {
                        const hideOnMobile = ['club_name', 'phenotype_value', 'race_podiums', 'team_added_at'].includes(cell.column.id);
                        const hideOnTablet = ['last_synced'].includes(cell.column.id);
                        return (
                          <td 
                            key={cell.id} 
                            className={`px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap ${
                              hideOnMobile ? 'hidden sm:table-cell' : ''
                            } ${hideOnTablet ? 'hidden lg:table-cell' : ''}`}
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && <AddRiderModal onClose={() => setShowAddModal(false)} />}
      {showBulkModal && <BulkUploadModal onClose={() => setShowBulkModal(false)} />}
    </div>
  );
}

// ============================================================================
// Add Rider Modal (US2)
// ============================================================================
function AddRiderModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [zwiftId, setZwiftId] = useState('');
  const [name, setName] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zwiftId: parseInt(zwiftId), name: name || undefined }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add rider');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teamRiders'] });
      alert(`✅ ${data.message}\n\n${data.synced || ''}`);
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6 border border-white/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Add Rider to TeamNL Cloud9</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Zwift ID</label>
            <input
              type="number"
              value={zwiftId}
              onChange={(e) => setZwiftId(e.target.value)}
              placeholder="150437"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Naam <span className="text-gray-400 text-xs">(optioneel - wordt automatisch opgehaald)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wordt automatisch gesynchroniseerd"
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          {mutation.isPending && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-200 border-t-blue-600"></div>
              <span>Rider toevoegen en data synchroniseren van ZwiftRacing API...</span>
            </div>
          )}

          {mutation.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {mutation.error.message}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => mutation.mutate()}
              disabled={!zwiftId || mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition shadow-lg font-medium text-sm"
            >
              {mutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add & Sync Rider
                </span>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Bulk Upload Modal (US3)
// ============================================================================
function BulkUploadModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [parsedRiders, setParsedRiders] = useState<Array<{ zwiftId: number; name?: string }>>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseRiders(content);
    };
    reader.readAsText(file);
  };

  const parseRiders = (content: string) => {
    const lines = content.split('\n').filter((l) => l.trim());
    const riders = lines
      .map((line) => {
        // Support formats: "zwiftId,name" or just "zwiftId"
        const parts = line.split(',').map((p) => p.trim());
        const zwiftId = parseInt(parts[0]);
        // Stuur alleen zwiftId - backend haalt echte naam op van ZwiftRacing API
        return { zwiftId };
      })
      .filter((r) => !isNaN(r.zwiftId));

    setParsedRiders(riders);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/riders/team/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riders: parsedRiders }),
      });
      if (!res.ok) throw new Error('Failed to upload riders');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamRiders'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto border border-white/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Bulk Upload Riders</h2>
        </div>

        <div className="space-y-4">
          {/* File upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 sm:p-8 text-center hover:border-blue-400 transition">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl text-white">
                <Upload className="w-8 h-8" />
              </div>
              <span className="text-base sm:text-lg text-gray-700 font-medium">
                Upload CSV or TXT file
              </span>
              <span className="text-xs sm:text-sm text-gray-500">
                Format: één Zwift ID per regel (naam wordt automatisch opgehaald van ZwiftRacing API)
              </span>
            </label>
          </div>

          {/* Preview */}
          {parsedRiders.length > 0 && (
            <div>
              <h3 className="font-medium mb-2 text-sm sm:text-base text-gray-800">
                Preview ({parsedRiders.length} riders)
              </h3>
              <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Namen worden opgehaald van ZwiftRacing API tijdens upload
              </div>
              <div className="border rounded-xl max-h-64 overflow-y-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 text-left font-semibold text-gray-700">#</th>
                      <th className="px-3 sm:px-4 py-2 text-left font-semibold text-gray-700">Zwift ID</th>
                      <th className="px-3 sm:px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRiders.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-blue-50 transition">
                        <td className="px-3 sm:px-4 py-2 text-gray-600">{i + 1}</td>
                        <td className="px-3 sm:px-4 py-2 font-mono text-gray-800">{r.zwiftId}</td>
                        <td className="px-3 sm:px-4 py-2 text-green-600 font-medium">✓ Klaar voor upload</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mutation.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {mutation.error.message}
            </div>
          )}

          {mutation.isSuccess && mutation.data && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              ✅ Success: {mutation.data.results.success} riders added,{' '}
              {mutation.data.results.skipped} skipped
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => mutation.mutate()}
              disabled={parsedRiders.length === 0 || mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition shadow-lg font-medium text-sm"
            >
              {mutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload {parsedRiders.length} Riders
                </span>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CSV Export Helper
// ============================================================================
function generateCSV(riders: TeamRider[]): string {
  const headers = [
    'Zwift ID',
    'Name',
    'Club',
    'Ranking',
    'Category',
    'FTP',
    'Weight',
    'W/kg',
    'Phenotype',
    'Races',
    'Wins',
    'Podiums',
    'Team Added',
    'Last Synced',
  ];
  const rows = riders.map((r) => [
    r.rider_id,
    r.name,
    r.club_name || '',
    r.race_current_rating || '',
    r.zp_category || '',
    r.zp_ftp || '',
    r.weight || '',
    r.watts_per_kg || '',
    r.phenotype_value || '',
    r.race_finishes || 0,
    r.race_wins || 0,
    r.race_podiums || 0,
    r.team_added_at,
    r.last_synced,
  ]);

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
