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

// Types based on view_my_team
interface TeamRider {
  rider_id: number;
  zwift_id: number;
  name: string;
  club_id: number | null;
  club_name: string | null;
  category_racing: string | null;
  category_zftp: string | null;
  ranking: number | null;
  ranking_score: number | null;
  ftp: number | null;
  weight: number | null;
  watts_per_kg: number | null;
  country: string | null;
  gender: string | null;
  age: number | null;
  total_races: number;
  total_wins: number;
  total_podiums: number;
  rider_created_at: string;
  rider_last_synced: string;
  rider_updated_at: string;
  team_added_at: string;
  is_favorite: boolean;
}

const API_BASE = '';

export default function Riders() {
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

  // Table columns
  const columnHelper = createColumnHelper<TeamRider>();
  const columns = [
    columnHelper.accessor('zwift_id', {
      header: 'Zwift ID',
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
    columnHelper.accessor('ranking', {
      header: 'Ranking',
      cell: (info) => info.getValue() || '-',
    }),
    columnHelper.accessor('category_racing', {
      header: 'Cat',
      cell: (info) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
          {info.getValue() || '?'}
        </span>
      ),
    }),
    columnHelper.accessor('ftp', {
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
    columnHelper.accessor('total_races', {
      header: 'Races',
      cell: (info) => info.getValue() || 0,
    }),
    columnHelper.accessor('total_wins', {
      header: 'Wins',
      cell: (info) => (
        <span className="font-semibold text-yellow-600">{info.getValue() || 0}</span>
      ),
    }),
    columnHelper.accessor('is_favorite', {
      header: '⭐',
      cell: (info) => (
        <button
          onClick={() => toggleFavorite.mutate({ 
            zwiftId: info.row.original.zwift_id, 
            isFavorite: !info.getValue() 
          })}
          className="text-2xl hover:scale-110 transition-transform"
        >
          {info.getValue() ? '⭐' : '☆'}
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
              deleteRider.mutate(info.row.original.zwift_id);
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
        <h1 className="text-3xl font-bold text-gray-800">TeamNL Cloud9 - Riders</h1>
        <p className="text-gray-600 mt-2">Beheer je team members en track performance</p>
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
                  riders.reduce((sum, r) => sum + (r.ranking || 0), 0) / riders.length
                )
              : '-'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Avg FTP</div>
          <div className="text-2xl font-bold text-purple-600">
            {riders.filter((r) => r.ftp).length > 0
              ? Math.round(
                  riders.filter((r) => r.ftp).reduce((sum, r) => sum + (r.ftp || 0), 0) /
                    riders.filter((r) => r.ftp).length
                )
              : '-'}
            W
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-500 text-sm">Total Wins</div>
          <div className="text-2xl font-bold text-yellow-600">
            {riders.reduce((sum, r) => sum + (r.total_wins || 0), 0)}
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
        body: JSON.stringify({ zwiftId: parseInt(zwiftId), name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add rider');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamRiders'] });
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {mutation.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {mutation.error.message}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={() => mutation.mutate()}
              disabled={!zwiftId || !name || mutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Adding...' : 'Add Rider'}
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
    r.zwift_id,
    r.name,
    r.club_name || '',
    r.ranking || '',
    r.category_racing || '',
    r.ftp || '',
    r.weight || '',
    r.watts_per_kg || '',
    r.total_races || 0,
    r.total_wins || 0,
    r.total_podiums || 0,
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

