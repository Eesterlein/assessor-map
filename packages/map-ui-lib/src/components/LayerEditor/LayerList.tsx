import { useState, useEffect, useRef } from 'react';
import type { LayerConfig, OgcApiSource } from '../../types';
import { slugify } from '../../utils/slugify';
import { ConfirmDialog } from '../admin/ConfirmDialog';
import { LayerEditor } from './LayerEditor';
import type { LayerEditorSection } from './LayerEditor';
import type { SourceGroup } from './buildSourceOptionGroups';

export interface LayerListProps {
  layers: LayerConfig[];
  onChange: (layers: LayerConfig[]) => void;
  availableSources: OgcApiSource[];
  availableIcons?: string[];
  /** Which editor sections to show. Forwarded to LayerEditor. */
  sections?: LayerEditorSection[];
  /** Hide basic fields in the editor. Forwarded to LayerEditor. */
  showBasicFields?: boolean;
  /** Hide add/remove/reorder controls. */
  readOnly?: boolean;
  /** When provided alongside `onDraftChange`, the new-layer draft becomes a fully controlled prop (consumer holds the state). Pass null to mean "not adding". */
  draftLayer?: LayerConfig | null;
  /** Required if `draftLayer` is provided. Called with the next draft on edits, and with null on cancel/save. */
  onDraftChange?: (draft: LayerConfig | null) => void;
  /** Optional grouping for the source dropdown. Forwarded to LayerEditor. */
  availableSourceGroups?: SourceGroup[];
}

const defaultLayer = (): LayerConfig => ({
  id: '',
  sourceId: '',
  collection: '',
  label: 'New Layer',
  visible: true,
  dataMode: 'vector-tiles',
});

export function LayerList({ layers, onChange, availableSources, availableIcons, sections, showBasicFields, readOnly, draftLayer, onDraftChange, availableSourceGroups }: LayerListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNewState, setAddingNewState] = useState(false);
  const [newLayerState, setNewLayerState] = useState<LayerConfig>(defaultLayer());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const isDraftControlled = onDraftChange !== undefined;
  const addingNew = isDraftControlled ? draftLayer != null : addingNewState;
  const newLayer = isDraftControlled ? (draftLayer ?? defaultLayer()) : newLayerState;
  const setNewLayer = (l: LayerConfig) => {
    if (isDraftControlled) onDraftChange!(l);
    else setNewLayerState(l);
  };
  const beginAddingNew = () => {
    if (isDraftControlled) onDraftChange!(defaultLayer());
    else {
      setAddingNewState(true);
      setNewLayerState(defaultLayer());
    }
  };
  const cancelAddingNew = () => {
    if (isDraftControlled) onDraftChange!(null);
    else setAddingNewState(false);
  };

  const newFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addingNew) return;
    requestAnimationFrame(() => {
      newFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      newFormRef.current?.querySelector<HTMLElement>('select, input, textarea, button')?.focus();
    });
  }, [addingNew]);

  const handleSaveNew = () => {
    const layerToSave = newLayer.id
      ? newLayer
      : { ...newLayer, id: slugify(newLayer.collection) || slugify(newLayer.label) || newLayer.sourceId };
    onChange([...layers, layerToSave]);
    if (isDraftControlled) onDraftChange!(null);
    else {
      setAddingNewState(false);
      setNewLayerState(defaultLayer());
    }
  };

  const handleUpdate = (updated: LayerConfig) => {
    onChange(layers.map((l) => (l.id === editingId ? updated : l)));
  };

  const handleDelete = (id: string) => {
    onChange(layers.filter((l) => l.id !== id));
    setConfirmDeleteId(null);
    if (editingId === id) setEditingId(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...layers];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === layers.length - 1) return;
    const updated = [...layers];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onChange(updated);
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, layerId: string) => {
    setDraggedId(layerId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', layerId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, layerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(layerId);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);

    const fromId = draggedId;
    setDraggedId(null);

    if (!fromId || fromId === targetId) return;

    const fromIndex = layers.findIndex((l) => l.id === fromId);
    const toIndex = layers.findIndex((l) => l.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...layers];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, layers[fromIndex]);
    onChange(reordered);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-3">
      <div className="mapui:flex mapui:items-center mapui:justify-between">
        <h3 className="mapui:m-0 mapui:text-sm mapui:font-semibold mapui:text-slate-700">
          Layers
        </h3>
        {!readOnly && (
          <button
            type="button"
            onClick={beginAddingNew}
            className="mapui:cursor-pointer mapui:rounded mapui:bg-blue-600 mapui:px-3 mapui:py-1 mapui:text-xs mapui:font-medium mapui:text-white hover:mapui:bg-blue-700"
          >
            + Add Layer
          </button>
        )}
      </div>

      {layers.length === 0 && !addingNew && (
        <p className="mapui:m-0 mapui:text-sm mapui:text-slate-500">No layers configured.</p>
      )}

      <ul className="mapui:m-0 mapui:list-none mapui:flex mapui:flex-col mapui:gap-2 mapui:p-0">
        {layers.map((layer, index) => {
          const isDragged = draggedId === layer.id;
          const isDragOver = dragOverId === layer.id;
          const isExpanded = editingId === layer.id;

          return (
            <li
              key={layer.id}
              draggable={!readOnly && !isExpanded}
              onDragStart={!readOnly && !isExpanded ? (e) => handleDragStart(e, layer.id) : undefined}
              onDragOver={!readOnly ? (e) => handleDragOver(e, layer.id) : undefined}
              onDragLeave={!readOnly ? handleDragLeave : undefined}
              onDrop={!readOnly ? (e) => handleDrop(e, layer.id) : undefined}
              onDragEnd={!readOnly ? handleDragEnd : undefined}
              className={[
                'mapui:rounded-lg mapui:border mapui:bg-white mapui:transition-colors',
                isDragOver ? 'mapui:border-blue-400 mapui:bg-blue-50' : 'mapui:border-slate-200',
                isDragged ? 'mapui:opacity-50' : 'mapui:opacity-100',
              ].join(' ')}
            >
              <div className="mapui:flex mapui:items-center mapui:justify-between mapui:gap-2 mapui:px-3 mapui:py-2">
                <div className="mapui:flex mapui:min-w-0 mapui:items-center mapui:gap-2">
                  {!readOnly && (
                    <>
                      <div className="mapui:flex mapui:shrink-0 mapui:flex-col mapui:gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          aria-label="Move layer up"
                          className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-slate-400 hover:mapui:text-slate-600 disabled:mapui:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === layers.length - 1}
                          aria-label="Move layer down"
                          className="mapui:cursor-pointer mapui:rounded mapui:border-none mapui:bg-transparent mapui:px-1 mapui:text-xs mapui:text-slate-400 hover:mapui:text-slate-600 disabled:mapui:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      <span
                        className="mapui:shrink-0 mapui:cursor-grab mapui:text-slate-400 active:mapui:cursor-grabbing"
                        aria-hidden="true"
                      >
                        ⠿
                      </span>
                    </>
                  )}
                  <div className="mapui:flex mapui:min-w-0 mapui:flex-col mapui:gap-0.5">
                    <span className="mapui:text-sm mapui:font-medium mapui:text-slate-800">
                      {layer.label || layer.id}
                    </span>
                    <span className="mapui:font-mono mapui:text-xs mapui:text-slate-500">
                      {layer.collection}
                    </span>
                    <div className="mapui:mt-1 mapui:flex mapui:flex-wrap mapui:gap-1">
                      <span className="mapui:rounded mapui:bg-slate-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-slate-700">
                        {layer.dataMode}
                      </span>
                      {(layer.styles?.length ?? 0) > 0 && (
                        <span className="mapui:rounded mapui:bg-purple-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-purple-700">
                          {layer.styles!.map((s) => s.type).join(' · ')}
                        </span>
                      )}
                      {layer.visible === false && (
                        <span className="mapui:rounded mapui:bg-amber-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-amber-700">
                          hidden
                        </span>
                      )}
                      {(layer.search?.fields?.length ?? 0) > 0 && (
                        <span className="mapui:rounded mapui:bg-blue-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-blue-700">
                          {layer.search!.fields.length} search fields
                        </span>
                      )}
                      {(layer.minZoom != null || layer.maxZoom != null) && (
                        <span className="mapui:rounded mapui:bg-cyan-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-cyan-700">
                          z{layer.minZoom ?? 0}–{layer.maxZoom ?? 24}
                        </span>
                      )}
                      {(layer.legend?.entries?.length ?? 0) > 0 && (
                        <span className="mapui:rounded mapui:bg-green-100 mapui:px-1.5 mapui:py-0.5 mapui:text-[10px] mapui:font-medium mapui:text-green-700">
                          {layer.legend!.entries.length} legend entries
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mapui:flex mapui:shrink-0 mapui:gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === layer.id ? null : layer.id)}
                    className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-slate-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-slate-600 hover:mapui:bg-slate-50"
                  >
                    {editingId === layer.id ? 'Close' : 'Edit'}
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(layer.id)}
                      className="mapui:cursor-pointer mapui:rounded mapui:border mapui:border-red-200 mapui:bg-white mapui:px-2 mapui:py-1 mapui:text-xs mapui:text-red-600 hover:mapui:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {editingId === layer.id && (
                <div className="mapui:border-t mapui:border-slate-100 mapui:p-3">
                  <LayerEditor
                    value={layer}
                    onChange={handleUpdate}
                    availableSources={availableSources}
                    availableIcons={availableIcons}
                    sections={sections}
                    showBasicFields={showBasicFields}
                    availableSourceGroups={availableSourceGroups}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!readOnly && addingNew && (
        <div
          ref={newFormRef}
          className="mapui:relative mapui:overflow-hidden mapui:rounded-lg mapui:border mapui:border-indigo-200 mapui:bg-indigo-50/50 mapui:p-4 mapui:shadow-sm"
          style={{ animation: 'mapui-form-pop 240ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
          {/* Left accent stripe */}
          <div className="mapui:pointer-events-none mapui:absolute mapui:inset-y-0 mapui:left-0 mapui:w-[3px] mapui:bg-indigo-400" />

          {/* Header row */}
          <div className="mapui:mb-3 mapui:flex mapui:items-center mapui:gap-2">
            <span className="mapui:inline-flex mapui:h-1.5 mapui:w-1.5 mapui:rounded-full mapui:bg-indigo-500" />
            <h4 className="mapui:m-0 mapui:text-sm mapui:font-semibold mapui:text-slate-800">
              New Layer
            </h4>
          </div>

          <LayerEditor
            value={newLayer}
            onChange={setNewLayer}
            availableSources={availableSources}
            availableIcons={availableIcons}
            sections={sections}
            showBasicFields={showBasicFields}
            availableSourceGroups={availableSourceGroups}
          />

          {/* Action row */}
          <div className="mapui:mt-3 mapui:flex mapui:justify-end mapui:gap-2 mapui:border-t mapui:border-indigo-100 mapui:pt-3">
            <button
              type="button"
              onClick={cancelAddingNew}
              className="mapui:cursor-pointer mapui:rounded-md mapui:border mapui:border-slate-300 mapui:bg-white mapui:px-3 mapui:py-1.5 mapui:text-xs mapui:text-slate-700 hover:mapui:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNew}
              disabled={!newLayer.sourceId || !newLayer.collection}
              className="mapui:cursor-pointer mapui:rounded-md mapui:bg-indigo-600 mapui:px-3 mapui:py-1.5 mapui:text-xs mapui:font-medium mapui:text-white hover:mapui:bg-indigo-700 disabled:mapui:cursor-not-allowed disabled:mapui:bg-slate-400 disabled:mapui:opacity-60"
            >
              Save Layer
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Remove Layer"
        description="Are you sure you want to remove this layer from the configuration?"
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
