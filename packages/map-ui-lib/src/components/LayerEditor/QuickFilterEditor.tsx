import { useEffect, useState } from 'react';
import type { AvailableProperty, Cql2FilterConfig, FetchDistinctValuesFn } from '../../types';
import { generateId } from '../../utils/id';

export interface QuickFilterEditorProps {
  value: Cql2FilterConfig | undefined;
  onChange: (config: Cql2FilterConfig | undefined) => void;
  availableProperties: AvailableProperty[];
  onFetchDistinctValues?: FetchDistinctValuesFn;
}

interface SimpleRule {
  id: string;
  property: string;
  value: string;
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

/** Returns true if the filter config can be fully represented as a list of simple = rules. */
function isSimpleFilter(cfg: Cql2FilterConfig): boolean {
  if (cfg.combinator !== 'and') return false;
  return cfg.rules.every(
    (r) =>
      'property' in r &&
      'operator' in r &&
      r.operator === '=' &&
      'value' in r &&
      (r.value as { kind: string }).kind === 'static',
  );
}

/** Convert a simple Cql2FilterConfig to our flat rule list. */
function toSimpleRules(cfg: Cql2FilterConfig): SimpleRule[] {
  return cfg.rules.map((r) => {
    const rule = r as { id: string; property: string; value: { kind: string; value: string } };
    return { id: rule.id, property: rule.property, value: rule.value.value };
  });
}

/** Build a Cql2FilterConfig from a flat rule list. */
function fromSimpleRules(rules: SimpleRule[]): Cql2FilterConfig | undefined {
  const active = rules.filter((r) => r.property && r.value);
  if (active.length === 0) return undefined;
  return {
    id: generateId(),
    combinator: 'and',
    rules: active.map((r) => ({
      id: r.id,
      property: r.property,
      operator: '=' as const,
      value: { kind: 'static' as const, value: r.value },
    })),
  };
}

function ValueDropdown({
  property,
  value,
  onChange,
  onFetchDistinctValues,
}: {
  property: string;
  value: string;
  onChange: (v: string) => void;
  onFetchDistinctValues?: FetchDistinctValuesFn;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!property || !onFetchDistinctValues) {
      setOptions([]);
      return;
    }
    setLoading(true);
    onFetchDistinctValues(property)
      .then((vals) => setOptions(vals.map((v) => String(v))))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [property, onFetchDistinctValues]);

  if (options.length > 0) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} mapui:flex-1`}
      >
        <option value="">Any value…</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={loading ? 'Loading…' : 'Value…'}
      className={`${inputClass} mapui:flex-1`}
    />
  );
}

export function QuickFilterEditor({
  value,
  onChange,
  availableProperties,
  onFetchDistinctValues,
}: QuickFilterEditorProps) {
  const isComplex = value !== undefined && !isSimpleFilter(value);
  const [rules, setRules] = useState<SimpleRule[]>(() =>
    value && isSimpleFilter(value) ? toSimpleRules(value) : [{ id: generateId(), property: '', value: '' }],
  );

  // Sync inbound prop changes (e.g. when the CQL2 editor clears the filter)
  useEffect(() => {
    if (!value) {
      setRules([{ id: generateId(), property: '', value: '' }]);
    } else if (isSimpleFilter(value)) {
      setRules(toSimpleRules(value));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isComplex) {
    return (
      <p className="mapui:text-xs mapui:text-slate-500 mapui:italic">
        Advanced filter active — edit in the CQL2 Filter section below.
      </p>
    );
  }

  const stringProperties = availableProperties.filter((p) => p.type === 'string' || p.type === 'number');

  const updateRule = (index: number, patch: Partial<SimpleRule>) => {
    const next = rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    setRules(next);
    onChange(fromSimpleRules(next));
  };

  const removeRule = (index: number) => {
    const next = rules.filter((_, i) => i !== index);
    const after = next.length === 0 ? [{ id: generateId(), property: '', value: '' }] : next;
    setRules(after);
    onChange(fromSimpleRules(after));
  };

  const addRule = () => {
    setRules((prev) => [...prev, { id: generateId(), property: '', value: '' }]);
  };

  const clearAll = () => {
    const blank = [{ id: generateId(), property: '', value: '' }];
    setRules(blank);
    onChange(undefined);
  };

  const hasAnyActive = rules.some((r) => r.property && r.value);

  return (
    <div className="mapui:flex mapui:flex-col mapui:gap-2">
      {rules.map((rule, i) => (
        <div key={rule.id} className="mapui:flex mapui:items-center mapui:gap-1.5">
          {i === 0 ? (
            <span className="mapui:shrink-0 mapui:text-xs mapui:font-medium mapui:text-slate-600 mapui:w-10">Where</span>
          ) : (
            <span className="mapui:shrink-0 mapui:text-xs mapui:text-slate-400 mapui:w-10 mapui:text-right">and</span>
          )}
          <select
            value={rule.property}
            onChange={(e) => updateRule(i, { property: e.target.value, value: '' })}
            className={`${inputClass} mapui:flex-1`}
          >
            <option value="">Field…</option>
            {stringProperties.map((p) => (
              <option key={p.name} value={p.name}>{p.title ?? p.name}</option>
            ))}
          </select>
          <span className="mapui:text-xs mapui:text-slate-400">=</span>
          <ValueDropdown
            property={rule.property}
            value={rule.value}
            onChange={(v) => updateRule(i, { value: v })}
            onFetchDistinctValues={onFetchDistinctValues}
          />
          {rules.length > 1 && (
            <button
              type="button"
              onClick={() => removeRule(i)}
              className="mapui:shrink-0 mapui:rounded mapui:p-1 mapui:text-slate-400 hover:mapui:text-red-500"
              title="Remove condition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mapui:h-3.5 mapui:w-3.5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>
      ))}

      <div className="mapui:flex mapui:items-center mapui:gap-2">
        {rules.length < 4 && (
          <button
            type="button"
            onClick={addRule}
            className="mapui:rounded mapui:border mapui:border-dashed mapui:border-slate-300 mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:text-slate-600 hover:mapui:border-blue-400 hover:mapui:text-blue-600"
          >
            + Add condition
          </button>
        )}
        {hasAnyActive && (
          <button
            type="button"
            onClick={clearAll}
            className="mapui:rounded mapui:px-2 mapui:py-0.5 mapui:text-xs mapui:text-red-500 hover:mapui:underline"
          >
            Clear filter
          </button>
        )}
      </div>
    </div>
  );
}
