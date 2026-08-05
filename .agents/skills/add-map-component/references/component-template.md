# Component template

A copy-pasteable starting point for a new component in `packages/map-ui-lib/src/components/<ComponentName>/`.

## `<ComponentName>.tsx`

```tsx
import { useState } from 'react';

export interface ExampleControlProps {
  /** The currently selected value (controlled). */
  value: string;
  /** All options to display. */
  options: Array<{ id: string; label: string }>;
  /** Called when the user picks a new option. */
  onChange: (id: string) => void;
  /** Optional className passthrough for layout overrides by the consumer. */
  className?: string;
}

export function ExampleControl({
  value,
  options,
  onChange,
  className = '',
}: ExampleControlProps) {
  const [open, setOpen] = useState(false);

  if (options.length === 0) {
    return (
      <p className={`mapui:m-0 mapui:text-sm mapui:text-gray-500 ${className}`}>
        No options available.
      </p>
    );
  }

  return (
    <div className={`mapui:flex mapui:flex-col mapui:gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:px-3 mapui:py-2 mapui:text-sm hover:mapui:bg-gray-50"
      >
        {options.find((o) => o.id === value)?.label ?? 'Select…'}
      </button>
      {open && (
        <ul className="mapui:m-0 mapui:list-none mapui:rounded mapui:border mapui:border-gray-200 mapui:bg-white mapui:p-1">
          {options.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className="mapui:w-full mapui:rounded mapui:px-2 mapui:py-1 mapui:text-left mapui:text-sm hover:mapui:bg-gray-100"
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

Notes:
- `value` and `onChange` are the controlled contract; nothing about the *selection* lives inside the component.
- `open` is purely UI state (is the dropdown showing?), so it's fine to keep local.
- Every Tailwind class is prefixed `mapui:`. Variants like `hover:` go *outside* the prefix.
- An optional `className` prop lets the consumer add layout (margins, widths) without needing to fork.

## `<ComponentName>.stories.tsx`

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ExampleControl } from './ExampleControl';

const meta: Meta<typeof ExampleControl> = {
  title: 'Controls/ExampleControl',
  component: ExampleControl,
  parameters: {
    docs: {
      description: {
        component: 'A controlled dropdown demonstrating the component conventions.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ExampleControl>;

const sampleOptions = [
  { id: 'a', label: 'Option A' },
  { id: 'b', label: 'Option B' },
  { id: 'c', label: 'Option C' },
];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('a');
    return (
      <div className="mapui:max-w-xs mapui:p-4">
        <ExampleControl value={value} options={sampleOptions} onChange={setValue} />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => (
    <div className="mapui:max-w-xs mapui:p-4">
      <ExampleControl value="" options={[]} onChange={() => {}} />
    </div>
  ),
};
```

## `index.ts`

```ts
export { ExampleControl } from './ExampleControl';
export type { ExampleControlProps } from './ExampleControl';
```

## Don't forget

Re-export from `packages/map-ui-lib/src/components/index.ts` and `packages/map-ui-lib/src/main.ts`.
