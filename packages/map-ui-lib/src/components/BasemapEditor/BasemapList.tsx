import { useState } from 'react';
import type { BasemapConfig } from '../../types';
import { resolveDisplayLabel } from '../../utils/labelUtils';
import { ConfirmDialog } from '../admin/ConfirmDialog';
import { BasemapEditor } from './BasemapEditor';

export interface BasemapListProps {
  basemaps: BasemapConfig[];
  onChange: (basemaps: BasemapConfig[]) => void;
}

const defaultBasemap = (): BasemapConfig => ({ id: '', label: 'New Basemap', url: '' });

export function BasemapList({ basemaps, onChange }: BasemapListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newBasemap, setNewBasemap] = useState<BasemapConfig>(defaultBasemap());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleUpdate = (updated: BasemapConfig) => {
    onChange(basemaps.map((b) => (b.id === editingId ? updated : b)));
  };

  const handleSaveNew = () => {
    onChange([...basemaps, newBasemap]);
    setAddingNew(false);
    setNewBasemap(defaultBasemap());
  };

  const handleDelete = (id: string) => {
    onChange(basemaps.filter((b) => b.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <div className="mapui:flex mapui:items-center mapui:justify-between">
        <h3 className="mapui:m-0 mapui:text-sm mapui:font-semibold mapui:text-slate-700">
          Basemaps
        </h3>
        <button
          type="button"
          onClick={() => { setAddingNew(true); setNewBasemap(defaultBasemap()); }}
          className="mapui:cursor-pointer mapui:rounded mapui:bg-blue-600 mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-medium mapui:text-white hover:mapui:bg-blue-700"
        >
          + Add Basemap
        </button>
      </div>

      {basemaps.length === 0 && !addingNew && (
        <p className="mapui:m-0 mapui:text-sm mapui:text-slate-500">No basemaps configured.</p>
      )}

      <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-2 mapui:p-0">
        {basemaps.map((basemap) => (
          <li
            key={basemap.id}
            className="mapui:rounded-lg mapui:border mapui:border-slate-200 mapui:bg-white"
          >
            <div className="mapui:flex mapui:items-center mapui:gap-3 mapui:px-3 mapui:py-2">
              {basemap.thumbnail && (
                <img
                  src={basemap.thumbnail}
                  alt=""
                  className="mapui:h-10 mapui:w-14 mapui:shrink-0 mapui:rounded mapui:object-cover"
                />
              )}
              <div className="mapui:flex-1 mapui:overflow-hidden">
                <span className="mapui:block mapui:text-sm mapui:font-medium mapui:text-slate-800">
                  {resolveDisplayLabel(basemap)}
                </span>
                <span className="mapui:block mapui:truncate mapui:font-mono mapui:text-xs mapui:text-slate-500">
                  {basemap.url}
                </span>
              </div>
              <div className="mapui:flex mapui:shrink-0 mapui:gap-1">
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === basemap.id ? null : basemap.id)}
                  className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-slate-600 hover:mapui:bg-slate-50"
                >
                  {editingId === basemap.id ? 'Close' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(basemap.id)}
                  className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-red-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-red-600 hover:mapui:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>

            {editingId === basemap.id && (
              <div className="mapui:border-t mapui:border-slate-100 mapui:p-3">
                <BasemapEditor value={basemap} onChange={handleUpdate} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {addingNew && (
        <div className="mapui:rounded-lg mapui:border mapui:border-blue-200 mapui:bg-blue-50 mapui:p-3">
          <p className="mapui:m-0 mapui:mb-3 mapui:text-xs mapui:font-semibold mapui:text-blue-700">
            New Basemap
          </p>
          <BasemapEditor value={newBasemap} onChange={setNewBasemap} />
          <div className="mapui:mt-3 mapui:flex mapui:gap-2">
            <button
              type="button"
              onClick={handleSaveNew}
              disabled={!newBasemap.id || !newBasemap.url}
              className="mapui:cursor-pointer mapui:rounded mapui:bg-blue-600 mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-medium mapui:text-white hover:mapui:bg-blue-700 disabled:mapui:cursor-not-allowed disabled:mapui:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setAddingNew(false)}
              className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-3 mapui:py-1 mapui:text-xs mapui:text-slate-700 hover:mapui:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Remove Basemap"
        description="Are you sure you want to remove this basemap from the configuration?"
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
