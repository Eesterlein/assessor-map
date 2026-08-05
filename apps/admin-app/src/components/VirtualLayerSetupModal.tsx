/**
 * Modal shown after uploading a CSV without geometries.
 * Collects the virtual layer name, which CSV column is the join key,
 * and which uploaded PostGIS collection to join against.
 */
import { useState } from 'react';
import type { UploadedDataset } from '../utils/dataApi';

const inputClass =
  'mapui:w-full mapui:rounded mapui:border mapui:border-slate-300 mapui:px-3 mapui:py-2 mapui:text-sm mapui:outline-none focus:mapui:ring-2 focus:mapui:ring-blue-500';
const selectClass =
  'mapui:w-full mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-3 mapui:py-2 mapui:text-sm mapui:outline-none focus:mapui:ring-2 focus:mapui:ring-blue-500';
const labelClass = 'mapui:flex mapui:flex-col mapui:gap-1.5 mapui:text-xs mapui:font-medium mapui:text-slate-600';

export interface VirtualLayerSetupModalProps {
  /** Name of the uploaded CSV file (used as default layer name). */
  csvFilename: string;
  /** All column names parsed from the CSV header. */
  csvColumns: string[];
  /** Uploaded datasets that have geometry (for the "join against" picker). */
  geoDatasets: UploadedDataset[];
  onConfirm: (opts: {
    name: string;
    csv_key_column: string;
    source_collection: string;
    key_field: string;
  }) => void;
  onCancel: () => void;
}

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

export function VirtualLayerSetupModal({
  csvFilename,
  csvColumns,
  geoDatasets,
  onConfirm,
  onCancel,
}: VirtualLayerSetupModalProps) {
  const [name, setName] = useState(baseName(csvFilename));
  const [csvKeyColumn, setCsvKeyColumn] = useState(csvColumns[0] ?? '');
  const [selectedDataset, setSelectedDataset] = useState(geoDatasets[0]?.id ?? '');
  const [keyField, setKeyField] = useState('');

  const dataset = geoDatasets.find(d => d.id === selectedDataset);

  const canSubmit = name && csvKeyColumn && selectedDataset && keyField;

  return (
    <div className="mapui:fixed mapui:inset-0 mapui:z-50 mapui:flex mapui:items-center mapui:justify-center mapui:bg-black/40">
      <div className="mapui:w-full mapui:max-w-md mapui:rounded-xl mapui:border mapui:border-slate-200 mapui:bg-white mapui:p-6 mapui:shadow-xl">
        <div className="mapui:mb-5">
          <h2 className="mapui:m-0 mapui:text-base mapui:font-semibold mapui:text-slate-900">
            Set up Virtual Layer
          </h2>
          <p className="mapui:mt-1 mapui:text-sm mapui:text-slate-500">
            This CSV has no geometry. Set it up as a virtual layer by linking it to an existing
            GIS dataset using a shared key (like a parcel account number).
          </p>
        </div>

        <div className="mapui:flex mapui:flex-col mapui:gap-4">
          <label className={labelClass}>
            Layer name
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Parcel Data"
            />
          </label>

          <label className={labelClass}>
            CSV key column
            <span className="mapui:text-[11px] mapui:font-normal mapui:text-slate-400">
              Which column in this CSV holds the ID to match against?
            </span>
            <select
              className={selectClass}
              value={csvKeyColumn}
              onChange={(e) => setCsvKeyColumn(e.target.value)}
            >
              {csvColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Match against dataset
            <span className="mapui:text-[11px] mapui:font-normal mapui:text-slate-400">
              Which uploaded GIS layer should we join this data to?
            </span>
            <select
              className={selectClass}
              value={selectedDataset}
              onChange={(e) => {
                setSelectedDataset(e.target.value);
                setKeyField('');
              }}
            >
              <option value="">Select a dataset…</option>
              {geoDatasets.map(d => (
                <option key={d.id} value={d.id}>{d.label || d.table_name}</option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Join key field in GIS dataset
            <span className="mapui:text-[11px] mapui:font-normal mapui:text-slate-400">
              Which column in {dataset?.label || dataset?.table_name || 'that dataset'} matches the CSV key?
            </span>
            <input
              className={inputClass}
              value={keyField}
              onChange={(e) => setKeyField(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              placeholder="accountno"
            />
          </label>
        </div>

        <div className="mapui:mt-6 mapui:flex mapui:justify-end mapui:gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-4 mapui:py-2 mapui:text-sm mapui:text-slate-700 hover:mapui:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              onConfirm({
                name,
                csv_key_column: csvKeyColumn,
                source_collection: `uploads.${dataset!.table_name}`,
                key_field: keyField,
              });
            }}
            className="mapui:rounded mapui:bg-blue-600 mapui:px-4 mapui:py-2 mapui:text-sm mapui:font-medium mapui:text-white hover:mapui:bg-blue-700 disabled:mapui:opacity-50 disabled:mapui:cursor-not-allowed"
          >
            Save Virtual Layer
          </button>
        </div>
      </div>
    </div>
  );
}
