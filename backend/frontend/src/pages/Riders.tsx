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
import { useFavorites } from '../hooks/useFavorites';

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

export default function Riders() {
  const queryClient = useQueryClient();
  const { toggleFavorite, isFavorite } = useFavorites();
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

  // Table columns
  const columnHelper = createColumnHelper<TeamRider>();
  const columns = [
    columnHelper.accessor('rider_id', {
      header: 'Rider ID',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('name', {
      header: 'Naam',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('club_name', {
      header: 'Club',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('race_current_rating', {
      header: 'Ranking',
      cell: (info) => {
        const val = info.getValue();
        return val ? Math.round(val) : '-';
      },
    }),
    columnHelper.accessor('zp_category', {
      header: 'Cat',
      cell: (info) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
          {info.getValue() || '?'}
        </span>
      ),
    }),
    columnHelper.accessor('zp_ftp', {
      header: 'FTP',
      cell: (info) => (info.getValue() ? `${info.getValue()}W` : '-'),
    }),
    columnHelper.accessor('weight', {
      header: 'Weight',
      cell: (info) => (info.getValue() ? `${info.getValue()}kg` : '-'),
    }),
    columnHelper.accessor('watts_per_kg', {
      header: 'W/kg',
      cell: (info) => (info.getValue() ? `${Number(info.getValue()).toFixed(2)}` : '-'),
    }),
    columnHelper.accessor('race_finishes', {
      header: 'Races',
      cell: (info) => info.getValue() || 0,
    }),
    columnHelper.accessor('race_wins', {
      header: 'Wins',
      cell: (info) => (
        <span className="font-semibold text-yellow-600">{info.getValue() || 0}</span>
      ),
    }),
    columnHelper.display({
      id: 'favorite',
      header: '⭐',
      cell: (info) => (
        <button
          onClick={() => toggleFavorite(info.row.original.rider_id)}
          className="text-2xl hover:scale-110 transition-transform"
          title={isFavorite(info.row.original.rider_id) ? 'Verwijder favoriet' : 'Voeg toe als favoriet'}
        >
          {isFavorite(info.row.original.rider_id) ? '⭐' : '☆'}
        </button>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <button
          onClick={() => {
            if (window.confirm(`Weet je zeker dat je ${info.row.original.name} wilt verwijderen?`)) {
              deleteRider.mutate(info.row.original.rider_id);  // Fixed: rider_id
            }
          }}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
          disabled={deleteRider.isPending}
        >
          {deleteRider.isPending ? '...' : '🗑️ Delete'}
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          CLOUDRACER - Team Riders
        </h1>
        <p className="text-gray-600 mt-2">🚴 Beheer je team members en track performance 📊</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Total Riders</div>
          <div className="text-2xl font-bold text-blue-600">{riders.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Avg Ranking</div>
          <div className="text-2xl font-bold text-green-600">
            {riders.length > 0
              ? Math.round(
                  riders.reduce((sum, r) => sum + (r.race_current_rating || 0), 0) / riders.length
                )
              : '-'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Avg FTP</div>
          <div className="text-2xl font-bold text-purple-600">
            {riders.filter((r) => r.zp_ftp).length > 0
              ? Math.round(
                  riders.filter((r) => r.zp_ftp).reduce((sum, r) => sum + (r.zp_ftp || 0), 0) /
                    riders.filter((r) => r.zp_ftp).length
                )
              : '-'}
            W
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Total Wins</div>
          <div className="text-2xl font-bold text-yellow-600">
            {riders.reduce((sum, r) => sum + (r.race_wins || 0), 0)}
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          {/* Search */}
          <input
            type="text"
            placeholder="🔍 Zoek op naam of Zwift ID..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <span>➕</span> Add Rider
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <span>📤</span> Bulk Upload
            </button>
            <button
              onClick={() => triggerManualSync.mutate()}
              disabled={triggerManualSync.isPending || riders.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
              title={riders.length === 0 ? 'Voeg eerst riders toe om te synchen' : 'Sync alle team members met ZwiftRacing API'}
            >
              <span>🔄</span> {triggerManualSync.isPending ? 'Syncing...' : 'Sync All'}
            </button>
            <button
              onClick={() => {
                const csv = generateCSV(riders);
                downloadCSV(csv, 'teamnl-cloud9-riders.csv');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <span>📥</span> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading riders...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">Error loading riders</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: '▲',
                            desc: '▼',
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && riders.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">Geen riders gevonden</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Voeg eerste rider toe
            </button>
          </div>
        )}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Add Rider to TeamNL Cloud9</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zwift ID</label>
            <input
              type="number"
              value={zwiftId}
              onChange={(e) => setZwiftId(e.target.value)}
              placeholder="150437"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Naam <span className="text-gray-400 text-xs">(optioneel - wordt automatisch opgehaald)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wordt automatisch gesynchroniseerd"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {mutation.isPending && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Rider toevoegen en data synchroniseren van ZwiftRacing API...</span>
            </div>
          )}

          {mutation.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {mutation.error.message}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => mutation.mutate()}
              disabled={!zwiftId || mutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? '🔄 Syncing...' : '➕ Add & Sync Rider'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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
  const [parsedRiders, setParsedRiders] = useState<Array<{ zwiftId: number; name: string }>>([]);

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
        const name = parts[1] || `Rider ${zwiftId}`;
        return { zwiftId, name };
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Bulk Upload Riders</h2>

        <div className="space-y-4">
          {/* File upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <span className="text-4xl">�</span>
              <span className="text-gray-700 font-medium">
                Upload CSV or TXT file
              </span>
              <span className="text-sm text-gray-500">
                Format: zwiftId,name (one per line)
              </span>
            </label>
          </div>

          {/* Preview */}
          {parsedRiders.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">
                Preview ({parsedRiders.length} riders)
              </h3>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Zwift ID</th>
                      <th className="px-4 py-2 text-left">Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRiders.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{i + 1}</td>
                        <td className="px-4 py-2">{r.zwiftId}</td>
                        <td className="px-4 py-2">{r.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mutation.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {mutation.error.message}
            </div>
          )}

          {mutation.isSuccess && mutation.data && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✅ Success: {mutation.data.results.success} riders added,{' '}
              {mutation.data.results.skipped} skipped
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => mutation.mutate()}
              disabled={parsedRiders.length === 0 || mutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Uploading...' : `Upload ${parsedRiders.length} Riders`}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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
    'Races',
    'Wins',
    'Podiums',
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
    r.race_finishes || 0,
    r.race_wins || 0,
    r.race_podiums || 0,
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

