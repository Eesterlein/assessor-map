import type { PropertyDefinition } from './propertyMetadata';
import type { AvailableProperty, FetchDistinctValuesFn } from '../../types';
import { ColorPicker } from '../admin/ColorPicker';
import { FormField } from '../admin/FormField';
import { IconImagePicker } from './IconImagePicker';
import { DataDrivenColorEditor } from './DataDrivenColorEditor';
import { DataDrivenNumberEditor } from './DataDrivenNumberEditor';
import { DataDrivenIconEditor } from './DataDrivenIconEditor';
import type { ColorThemeId } from '../../utils/colorThemes';

function FxToggle({
  isExpression,
  onToggle,
  staticTitle = 'Switch to static value',
  expressionTitle = 'Switch to data-driven value',
}: {
  isExpression: boolean;
  onToggle: () => void;
  staticTitle?: string;
  expressionTitle?: string;
}) {
  return (
    <button
      type="button"
      title={isExpression ? staticTitle : expressionTitle}
      onClick={onToggle}
      className={[
        'mapui:cursor-pointer mapui:rounded mapui:border mapui:px-1.5 mapui:py-0.5 mapui:font-mono mapui:text-xs mapui:outline-none',
        'focus:mapui:ring-1 focus:mapui:ring-blue-400',
        isExpression
          ? 'mapui:border-blue-400 mapui:bg-blue-50 mapui:text-blue-700'
          : 'mapui:border-slate-300 mapui:bg-white mapui:text-slate-500 hover:mapui:border-blue-400 hover:mapui:text-blue-600',
      ].join(' ')}
    >
      fx
    </button>
  );
}

function extractExpressionFallback(expr: unknown[]): unknown {
  // ['match', ['get', p], v1, o1, ..., fallback]
  // ['case', test1, o1, ..., fallback]
  // ['interpolate', ['linear'], getter, stop1, o1, ...] → no explicit fallback; use last output
  return expr[expr.length - 1];
}

const inputClass =
  'mapui:rounded mapui:border mapui:border-slate-300 mapui:px-2 mapui:py-1 mapui:text-sm mapui:outline-none focus:mapui:border-blue-500 focus:mapui:ring-1 focus:mapui:ring-blue-500';

interface PropertyFieldProps {
  def: PropertyDefinition;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  availableIcons?: string[];
  availableProperties?: AvailableProperty[];
  onFetchDistinctValues?: FetchDistinctValuesFn;
  colorTheme?: ColorThemeId;
  onColorThemeChange?: (theme: ColorThemeId) => void;
}

function TranslateWidget({
  value,
  onChange,
}: {
  value: [number, number] | undefined;
  onChange: (v: [number, number]) => void;
}) {
  const x = value?.[0] ?? 0;
  const y = value?.[1] ?? 0;
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-2">
      <input
        type="number"
        step={0.5}
        value={x}
        onChange={(e) => onChange([parseFloat(e.target.value) || 0, y])}
        className={`${inputClass} mapui:w-20`}
        aria-label="X"
        placeholder="X"
      />
      <input
        type="number"
        step={0.5}
        value={y}
        onChange={(e) => onChange([x, parseFloat(e.target.value) || 0])}
        className={`${inputClass} mapui:w-20`}
        aria-label="Y"
        placeholder="Y"
      />
    </div>
  );
}

const PADDING_SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;

function PaddingWidget({
  value,
  onChange,
}: {
  value: [number, number, number, number] | undefined;
  onChange: (v: [number, number, number, number]) => void;
}) {
  const padding: [number, number, number, number] = [
    value?.[0] ?? 0,
    value?.[1] ?? 0,
    value?.[2] ?? 0,
    value?.[3] ?? 0,
  ];
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-2">
      {PADDING_SIDES.map((side, i) => (
        <input
          key={side}
          type="number"
          min={0}
          step={1}
          value={padding[i]}
          onChange={(e) => {
            const next = [...padding] as [number, number, number, number];
            next[i] = parseFloat(e.target.value) || 0;
            onChange(next);
          }}
          className={`${inputClass} mapui:w-16`}
          aria-label={side}
          placeholder={side[0]}
          title={side}
        />
      ))}
    </div>
  );
}

function OpacityWidget({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  const v = value ?? 1;
  return (
    <div className="mapui:flex mapui:items-center mapui:gap-2">
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={v}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mapui:flex-1"
      />
      <span className="mapui:w-8 mapui:text-right mapui:text-xs mapui:text-slate-600">
        {v.toFixed(2)}
      </span>
    </div>
  );
}

function WidgetContent({
  def,
  value,
  onChange,
  availableIcons,
  availableProperties,
  onFetchDistinctValues,
  colorTheme,
  onColorThemeChange,
}: {
  def: PropertyDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
  availableIcons?: string[];
  availableProperties?: AvailableProperty[];
  onFetchDistinctValues?: FetchDistinctValuesFn;
  colorTheme?: ColorThemeId;
  onColorThemeChange?: (theme: ColorThemeId) => void;
}) {
  switch (def.widget) {
    case 'color': {
      const isExpression = Array.isArray(value);
      const fallbackColor = isExpression
        ? ((value as unknown[])[(value as unknown[]).length - 1] as string | undefined) ?? '#000000'
        : '#000000';
      return (
        <div className="mapui:flex mapui:flex-col mapui:gap-1 mapui:w-full">
          <div className="mapui:flex mapui:items-center mapui:justify-end">
            <FxToggle
              isExpression={isExpression}
              onToggle={() => {
                if (isExpression) onChange(fallbackColor);
                else onChange(['match', ['get', ''], fallbackColor]);
              }}
              staticTitle="Switch to static color"
              expressionTitle="Switch to data-driven color"
            />
          </div>
          {isExpression ? (
            <DataDrivenColorEditor
              value={value as unknown[]}
              onChange={(expr) => onChange(expr)}
              availableProperties={availableProperties}
              onFetchDistinctValues={onFetchDistinctValues}
              theme={colorTheme}
              onThemeChange={onColorThemeChange}
            />
          ) : (
            <ColorPicker
              value={(value as string) ?? '#000000'}
              onChange={onChange}
              label={def.label}
            />
          )}
        </div>
      );
    }

    case 'opacity':
      return (
        <OpacityWidget
          value={value as number | undefined}
          onChange={onChange}
        />
      );

    case 'number': {
      const isExpression = Array.isArray(value);
      const staticInput = (
        <input
          type="number"
          min={def.min}
          max={def.max}
          step={def.step ?? 1}
          value={isExpression ? (def.min ?? 0) : ((value as number | undefined) ?? def.min ?? 0)}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={inputClass}
        />
      );
      if (!def.dataDriven) return staticInput;
      const fallbackNumber: number = isExpression
        ? (() => {
            const raw = extractExpressionFallback(value as unknown[]);
            const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
            return isNaN(n) ? (def.min ?? 1) : n;
          })()
        : ((value as number | undefined) ?? def.min ?? 1);
      return (
        <div className="mapui:flex mapui:flex-col mapui:gap-1 mapui:w-full">
          <div className="mapui:flex mapui:items-center mapui:justify-end">
            <FxToggle
              isExpression={isExpression}
              onToggle={() => {
                if (isExpression) onChange(fallbackNumber);
                else onChange(['match', ['get', ''], fallbackNumber]);
              }}
              staticTitle="Switch to static value"
              expressionTitle="Switch to data-driven value"
            />
          </div>
          {isExpression ? (
            <DataDrivenNumberEditor
              value={value as unknown[]}
              onChange={(expr) => onChange(expr)}
              availableProperties={availableProperties}
              onFetchDistinctValues={onFetchDistinctValues}
              min={def.min}
              max={def.max}
              step={def.step}
            />
          ) : (
            staticInput
          )}
        </div>
      );
    }

    case 'boolean':
      return (
        <input
          type="checkbox"
          checked={(value as boolean | undefined) ?? false}
          onChange={(e) => onChange(e.target.checked)}
          className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
        />
      );

    case 'enum':
      return (
        <select
          value={(value as string | undefined) ?? def.options?.[0] ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {def.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case 'translate':
      return (
        <TranslateWidget
          value={value as [number, number] | undefined}
          onChange={onChange}
        />
      );

    case 'padding':
      return (
        <PaddingWidget
          value={value as [number, number, number, number] | undefined}
          onChange={onChange}
        />
      );

    case 'dasharray':
    case 'stringArray': {
      const arr = value as unknown[] | undefined;
      const displayVal = arr ? arr.join(', ') : '';
      return (
        <input
          type="text"
          value={displayVal}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (!raw) {
              onChange(undefined);
              return;
            }
            if (def.widget === 'dasharray') {
              const nums = raw.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));
              onChange(nums.length > 0 ? nums : undefined);
            } else {
              const strs = raw.split(',').map((s) => s.trim()).filter(Boolean);
              onChange(strs.length > 0 ? strs : undefined);
            }
          }}
          placeholder={def.widget === 'dasharray' ? 'e.g. 2, 4' : 'comma-separated'}
          className={inputClass}
        />
      );
    }

    case 'text':
      return (
        <input
          type="text"
          value={(value as string | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={inputClass}
        />
      );

    case 'icon-image': {
      const isExpression = Array.isArray(value);
      const staticPicker = (
        <IconImagePicker
          value={isExpression ? '' : ((value as string | undefined) ?? '')}
          onChange={(v) => onChange(v ?? undefined)}
          availableIcons={availableIcons}
        />
      );
      if (!def.dataDriven) return staticPicker;
      const fallbackIcon: string = isExpression
        ? (() => {
            const raw = extractExpressionFallback(value as unknown[]);
            return typeof raw === 'string' ? raw : '';
          })()
        : ((value as string | undefined) ?? '');
      return (
        <div className="mapui:flex mapui:flex-col mapui:gap-1 mapui:w-full">
          <div className="mapui:flex mapui:items-center mapui:justify-end">
            <FxToggle
              isExpression={isExpression}
              onToggle={() => {
                if (isExpression) onChange(fallbackIcon || undefined);
                else onChange(['match', ['get', ''], fallbackIcon]);
              }}
              staticTitle="Switch to static icon"
              expressionTitle="Switch to data-driven icon"
            />
          </div>
          {isExpression ? (
            <DataDrivenIconEditor
              value={value as unknown[]}
              onChange={(expr) => onChange(expr)}
              availableProperties={availableProperties}
              onFetchDistinctValues={onFetchDistinctValues}
              availableIcons={availableIcons}
            />
          ) : (
            staticPicker
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

export function PropertyField({ def, value, onChange, availableIcons, availableProperties, onFetchDistinctValues, colorTheme, onColorThemeChange }: PropertyFieldProps) {
  const isOptional = def.enableDefault !== undefined;
  const isEnabled = value !== undefined;

  if (isOptional && def.widget === 'boolean') {
    const overrideValue = !def.enableDefault;
    return (
      <FormField label={def.label} description={def.description}>
        <input
          type="checkbox"
          checked={value === overrideValue}
          onChange={(e) => {
            onChange(def.key, e.target.checked ? overrideValue : undefined);
          }}
          className="mapui:h-4 mapui:w-4 mapui:accent-blue-600"
        />
      </FormField>
    );
  }

  if (isOptional) {
    return (
      <FormField label={def.label} description={def.description}>
        <div className="mapui:flex mapui:items-center mapui:gap-2">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => {
              onChange(def.key, e.target.checked ? def.enableDefault : undefined);
            }}
            className="mapui:h-4 mapui:w-4 mapui:shrink-0 mapui:accent-blue-600"
          />
          {isEnabled && (
            <WidgetContent
              def={def}
              value={value}
              onChange={(v) => onChange(def.key, v)}
              availableIcons={availableIcons}
              availableProperties={availableProperties}
              onFetchDistinctValues={onFetchDistinctValues}
              colorTheme={colorTheme}
              onColorThemeChange={onColorThemeChange}
            />
          )}
        </div>
      </FormField>
    );
  }

  return (
    <FormField label={def.label} description={def.description}>
      <WidgetContent
        def={def}
        value={value}
        onChange={(v) => onChange(def.key, v)}
        availableIcons={availableIcons}
        availableProperties={availableProperties}
        onFetchDistinctValues={onFetchDistinctValues}
        colorTheme={colorTheme}
        onColorThemeChange={onColorThemeChange}
      />
    </FormField>
  );
}
