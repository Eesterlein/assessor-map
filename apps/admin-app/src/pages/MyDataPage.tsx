import { useEffect, useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ConfirmDialog } from '@techtraverse/map-ui-lib';
import { LuTrash2, LuDatabase, LuLayers } from 'react-icons/lu';
import { DataUploadField } from '../components/DataUploadField';
import { GeometryBadge } from '../components/GeometryBadge';
import { VirtualLayerSetupModal } from '../components/VirtualLayerSetupModal';
import {
  listDatasets,
  deleteDataset,
  listVirtualMaps,
  createVirtualMap,
  deleteVirtualMap,
  type UploadedDataset,
  type VirtualMap,
} from '../utils/dataApi';

// Simple CSV header parser — reads only the first line.
function parseCsvHeader(text: string): string[] {
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  return firstLine.split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
}

// Simple CSV row parser (handles quoted fields).
function parseCsvRows(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvHeader(lines[0]);
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const v = values[i] ?? '';
      row[h] = isNaN(Number(v)) || v === '' ? v : Number(v);
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse the first sheet of an Excel file into columns + rows.
async function parseExcel(file: File): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet!, { defval: '' });
  const columns = raw.length > 0 ? Object.keys(raw[0]!).map(k => String(k)) : [];
  const rows = raw.map(r => {
    const out: Record<string, unknown> = {};
    for (const k of columns) out[k] = r[k];
    return out;
  });
  return { columns, rows };
}

const GEO_COLUMN_HINTS = new Set([
  'wkt', 'geom', 'geometry', 'shape', 'the_geom', 'geojson',
  'lat', 'lon', 'latitude', 'longitude', 'x', 'y',
  'easting', 'northing', 'point', 'polygon', 'line',
]);

function hasGeometryColumns(columns: string[]): boolean {
  return columns.some(c => GEO_COLUMN_HINTS.has(c.toLowerCase()));
}

export function MyDataPage() {
  const [datasets, setDatasets] = useState<UploadedDataset[]>([]);
  const [virtualMaps, setVirtualMaps] = useState<VirtualMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UploadedDataset | null>(null);
  const [confirmDeleteVm, setConfirmDeleteVm] = useState<VirtualMap | null>(null);

  // Virtual layer setup state
  const [pendingVirtualFile, setPendingVirtualFile] = useState<File | null>(null);
  const [pendingCsvColumns, setPendingCsvColumns] = useState<string[]>([]);
  const [pendingCsvRows, setPendingCsvRows] = useState<Record<string, unknown>[]>([]);
  const [savingVirtual, setSavingVirtual] = useState(false);

  const csvInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ds, vm] = await Promise.all([listDatasets(), listVirtualMaps()]);
      setDatasets(ds);
      setVirtualMaps(vm);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = async (ds: UploadedDataset) => {
    setConfirmDelete(null);
    try {
      await deleteDataset(ds.id);
      setNotice(`Deleted "${ds.label || ds.table_name}".`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleDeleteVm = async (vm: VirtualMap) => {
    setConfirmDeleteVm(null);
    try {
      await deleteVirtualMap(vm.id);
      setNotice(`Deleted virtual layer "${vm.name}".`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // When a CSV or Excel file is selected in the virtual layer drop zone
  const handleCsvPick = async (file: File) => {
    try {
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      let columns: string[];
      let rows: Record<string, unknown>[];
      if (isExcel) {
        ({ columns, rows } = await parseExcel(file));
      } else {
        const text = await file.text();
        columns = parseCsvHeader(text);
        rows = parseCsvRows(text);
      }
      if (hasGeometryColumns(columns)) {
        setError('This file appears to have geometry columns. Upload it in the GIS Data section above instead.');
        return;
      }
      setPendingCsvColumns(columns);
      setPendingCsvRows(rows);
      setPendingVirtualFile(file);
    } catch {
      setError('Failed to read file.');
    }
  };

  const geoDatasets = datasets.filter(d => d.geometry_type != null);

  const th = 'mapui:whitespace-nowrap mapui:px-4 mapui:py-2.5 mapui:font-medium';

  return (
    <div className="mapui:mx-auto mapui:max-w-6xl mapui:px-6 mapui:py-8">
      {/* ── GIS Data section ───────────────────────────────────── */}
      <div className="mapui:flex mapui:items-center mapui:gap-2.5">
        <h1 className="mapui:m-0 mapui:text-2xl mapui:font-bold mapui:tracking-tight mapui:text-slate-900">
          My Data
        </h1>
        {!loading && datasets.length > 0 && (
          <span className="mapui:rounded-full mapui:bg-slate-100 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:font-medium mapui:text-slate-500">
            {datasets.length}
          </span>
        )}
      </div>
      <p className="mapui:mt-1.5 mapui:mb-5 mapui:max-w-2xl mapui:text-sm mapui:text-slate-500">
        Upload GIS files (shapefiles, GeoJSON, etc.) to publish them as map layers.
      </p>

      <DataUploadField
        onUploaded={(r) => {
          setNotice(
            `Uploaded "${r.label || r.table_name}" (${r.feature_count} features).` +
              (r.crs_assumed ? ' Note: no CRS found — assumed EPSG:4326.' : '') +
              (r.tipgRefreshed ? '' : ' It may take a moment to appear.'),
          );
          void refresh();
        }}
      />

      {notice && (
        <div className="mapui:mt-4 mapui:rounded-lg mapui:border mapui:border-green-200 mapui:bg-green-50 mapui:px-3.5 mapui:py-2.5 mapui:text-sm mapui:text-green-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mapui:mt-4 mapui:rounded-lg mapui:border mapui:border-red-200 mapui:bg-red-50 mapui:px-3.5 mapui:py-2.5 mapui:text-sm mapui:text-red-700">
          {error}
        </div>
      )}

      <div className="mapui:mt-6 mapui:overflow-hidden mapui:rounded-xl mapui:border mapui:border-slate-200 mapui:bg-white mapui:shadow-sm">
        <div className="mapui:overflow-x-auto">
          <table className="mapui:w-full mapui:border-collapse mapui:text-sm">
            <thead className="mapui:bg-slate-50 mapui:text-left mapui:text-xs mapui:uppercase mapui:tracking-wide mapui:text-slate-500">
              <tr className="mapui:border-b mapui:border-slate-200">
                <th className={th}>Name</th>
                <th className={th}>Collection</th>
                <th className={th}>Geometry</th>
                <th className={`${th} mapui:text-right`}>Features</th>
                <th className={th}>CRS</th>
                <th className={th}>Uploaded</th>
                <th className="mapui:w-0 mapui:px-4 mapui:py-2.5" />
              </tr>
            </thead>
            <tbody className="mapui:divide-y mapui:divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="mapui:px-4 mapui:py-10 mapui:text-center mapui:text-sm mapui:text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && datasets.length === 0 && (
                <tr>
                  <td colSpan={7} className="mapui:px-4 mapui:py-16">
                    <div className="mapui:flex mapui:flex-col mapui:items-center mapui:gap-3 mapui:text-center">
                      <div className="mapui:flex mapui:h-12 mapui:w-12 mapui:items-center mapui:justify-center mapui:rounded-full mapui:bg-slate-100 mapui:text-slate-400">
                        <LuDatabase className="mapui:h-6 mapui:w-6" />
                      </div>
                      <div>
                        <p className="mapui:m-0 mapui:text-sm mapui:font-medium mapui:text-slate-700">No GIS datasets yet</p>
                        <p className="mapui:m-0 mapui:mt-0.5 mapui:text-sm mapui:text-slate-400">
                          Upload a GIS file above to get started.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && datasets.map((ds) => (
                <tr key={ds.id} className="mapui:group mapui:transition-colors mapui:hover:bg-blue-50/50">
                  <td className="mapui:px-4 mapui:py-2.5">
                    <span className="mapui:font-medium mapui:text-slate-800">{ds.label || ds.table_name}</span>
                    {ds.original_filename && (
                      <div className="mapui:mt-0.5 mapui:text-xs mapui:text-slate-400">{ds.original_filename}</div>
                    )}
                  </td>
                  <td className="mapui:px-4 mapui:py-2.5">
                    <span className="mapui:block mapui:max-w-[26ch] mapui:truncate mapui:font-mono mapui:text-xs mapui:text-slate-500" title={`uploads.${ds.table_name}`}>
                      uploads.{ds.table_name}
                    </span>
                  </td>
                  <td className="mapui:px-4 mapui:py-2.5"><GeometryBadge type={ds.geometry_type} /></td>
                  <td className="mapui:px-4 mapui:py-2.5 mapui:text-right mapui:font-mono mapui:text-[13px] mapui:text-slate-700">
                    {ds.feature_count?.toLocaleString() ?? '—'}
                  </td>
                  <td className="mapui:whitespace-nowrap mapui:px-4 mapui:py-2.5 mapui:text-slate-600">
                    EPSG:{ds.srid ?? 4326}
                    {ds.crs_assumed && (
                      <span className="mapui:ml-1.5 mapui:rounded mapui:bg-amber-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-amber-700" title="No CRS found — assumed EPSG:4326">
                        assumed
                      </span>
                    )}
                  </td>
                  <td className="mapui:whitespace-nowrap mapui:px-4 mapui:py-2.5 mapui:text-slate-500">
                    {new Date(ds.created_at).toLocaleDateString()}
                  </td>
                  <td className="mapui:px-4 mapui:py-2.5">
                    <div className="mapui:flex mapui:items-center mapui:justify-end mapui:gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(ds)}
                        aria-label={`Delete ${ds.label || ds.table_name}`}
                        className="mapui:rounded-md mapui:p-1.5 mapui:text-slate-400 mapui:transition-colors mapui:hover:bg-red-50 mapui:hover:text-red-600"
                      >
                        <LuTrash2 className="mapui:h-4 mapui:w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Virtual Layers section ─────────────────────────────── */}
      <div className="mapui:mt-10">
        <div className="mapui:flex mapui:items-center mapui:gap-2.5">
          <h2 className="mapui:m-0 mapui:text-xl mapui:font-bold mapui:tracking-tight mapui:text-slate-900 mapui:flex mapui:items-center mapui:gap-2">
            <LuLayers className="mapui:h-5 mapui:w-5 mapui:text-slate-500" />
            Virtual Layers
          </h2>
          {!loading && virtualMaps.length > 0 && (
            <span className="mapui:rounded-full mapui:bg-slate-100 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:font-medium mapui:text-slate-500">
              {virtualMaps.length}
            </span>
          )}
        </div>
        <p className="mapui:mt-1.5 mapui:mb-5 mapui:max-w-2xl mapui:text-sm mapui:text-slate-500">
          Upload a CSV or Excel file (no geometry required). The system will link each row to a matching GIS feature
          using a shared key like a parcel account number, letting you style and display your CSV attributes on the map.
        </p>

        {/* CSV drop zone for virtual layers */}
        <div
          className="mapui:cursor-pointer mapui:rounded-lg mapui:border-2 mapui:border-dashed mapui:border-purple-300 mapui:bg-purple-50 mapui:p-6 mapui:text-center mapui:text-sm hover:mapui:border-purple-400 hover:mapui:bg-purple-50/80"
          onClick={() => csvInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void handleCsvPick(f);
          }}
        >
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="mapui:hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleCsvPick(f);
              e.target.value = '';
            }}
          />
          <LuLayers className="mapui:mx-auto mapui:mb-2 mapui:h-6 mapui:w-6 mapui:text-purple-400" />
          <span className="mapui:text-slate-600">
            Drop a CSV or Excel file here, or <span className="mapui:text-purple-600 mapui:underline">browse</span> — no geometry required
          </span>
        </div>

        {/* Virtual layers list */}
        <div className="mapui:mt-6 mapui:overflow-hidden mapui:rounded-xl mapui:border mapui:border-slate-200 mapui:bg-white mapui:shadow-sm">
          <table className="mapui:w-full mapui:border-collapse mapui:text-sm">
            <thead className="mapui:bg-slate-50 mapui:text-left mapui:text-xs mapui:uppercase mapui:tracking-wide mapui:text-slate-500">
              <tr className="mapui:border-b mapui:border-slate-200">
                <th className={th}>Name</th>
                <th className={th}>Joins</th>
                <th className={th}>Key</th>
                <th className={`${th} mapui:text-right`}>Rows</th>
                <th className={th}>Created</th>
                <th className="mapui:w-0 mapui:px-4 mapui:py-2.5" />
              </tr>
            </thead>
            <tbody className="mapui:divide-y mapui:divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="mapui:px-4 mapui:py-8 mapui:text-center mapui:text-sm mapui:text-slate-400">Loading…</td>
                </tr>
              )}
              {!loading && virtualMaps.length === 0 && (
                <tr>
                  <td colSpan={6} className="mapui:px-4 mapui:py-12">
                    <div className="mapui:flex mapui:flex-col mapui:items-center mapui:gap-2 mapui:text-center">
                      <LuLayers className="mapui:h-8 mapui:w-8 mapui:text-slate-300" />
                      <p className="mapui:m-0 mapui:text-sm mapui:text-slate-500">No virtual layers yet</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && virtualMaps.map((vm) => (
                <tr key={vm.id} className="mapui:group mapui:transition-colors mapui:hover:bg-blue-50/50">
                  <td className="mapui:px-4 mapui:py-2.5 mapui:font-medium mapui:text-slate-800">{vm.name}</td>
                  <td className="mapui:px-4 mapui:py-2.5 mapui:font-mono mapui:text-xs mapui:text-slate-500">{vm.source_collection}</td>
                  <td className="mapui:px-4 mapui:py-2.5 mapui:text-slate-600">
                    <span className="mapui:font-mono mapui:text-xs">{vm.csv_key_column}</span>
                    <span className="mapui:mx-1 mapui:text-slate-400">→</span>
                    <span className="mapui:font-mono mapui:text-xs">{vm.key_field}</span>
                  </td>
                  <td className="mapui:px-4 mapui:py-2.5 mapui:text-right mapui:font-mono mapui:text-[13px] mapui:text-slate-700">
                    {vm.row_count?.toLocaleString() ?? '—'}
                  </td>
                  <td className="mapui:whitespace-nowrap mapui:px-4 mapui:py-2.5 mapui:text-slate-500">
                    {new Date(vm.created_at).toLocaleDateString()}
                  </td>
                  <td className="mapui:px-4 mapui:py-2.5">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteVm(vm)}
                      aria-label={`Delete ${vm.name}`}
                      className="mapui:rounded-md mapui:p-1.5 mapui:text-slate-400 mapui:transition-colors mapui:hover:bg-red-50 mapui:hover:text-red-600"
                    >
                      <LuTrash2 className="mapui:h-4 mapui:w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Virtual layer setup modal */}
      {pendingVirtualFile && (
        <VirtualLayerSetupModal
          csvFilename={pendingVirtualFile.name}
          csvColumns={pendingCsvColumns}
          geoDatasets={geoDatasets}
          onCancel={() => {
            setPendingVirtualFile(null);
            setPendingCsvColumns([]);
            setPendingCsvRows([]);
          }}
          onConfirm={async (opts) => {
            setSavingVirtual(true);
            try {
              await createVirtualMap({
                name: opts.name,
                source_collection: opts.source_collection,
                key_field: opts.key_field,
                csv_key_column: opts.csv_key_column,
                csv_columns: pendingCsvColumns,
                csv_rows: pendingCsvRows,
              });
              setPendingVirtualFile(null);
              setPendingCsvColumns([]);
              setPendingCsvRows([]);
              setNotice(`Virtual layer "${opts.name}" created.`);
              await refresh();
            } catch (err) {
              setPendingVirtualFile(null);
              setPendingCsvColumns([]);
              setPendingCsvRows([]);
              setError(err instanceof Error ? err.message : 'Failed to save virtual layer');
            } finally {
              setSavingVirtual(false);
            }
          }}
        />
      )}

      {savingVirtual && (
        <div className="mapui:fixed mapui:inset-0 mapui:z-50 mapui:flex mapui:items-center mapui:justify-center mapui:bg-black/20">
          <div className="mapui:rounded-lg mapui:bg-white mapui:px-6 mapui:py-4 mapui:shadow-xl mapui:text-sm mapui:text-slate-700">
            Saving virtual layer…
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete dataset"
        description={
          confirmDelete
            ? `Permanently delete "${confirmDelete.label || confirmDelete.table_name}"? This drops the table from the database.`
            : ''
        }
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmDeleteVm !== null}
        title="Delete virtual layer"
        description={
          confirmDeleteVm
            ? `Delete virtual layer "${confirmDeleteVm.name}"? Any maps using this layer will stop working.`
            : ''
        }
        onConfirm={() => confirmDeleteVm && handleDeleteVm(confirmDeleteVm)}
        onCancel={() => setConfirmDeleteVm(null)}
      />
    </div>
  );
}
