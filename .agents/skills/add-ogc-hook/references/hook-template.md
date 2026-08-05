# OGC hook template

A starting point for `packages/map-ui-lib/src/hooks/useThing.ts`. Adapt the names to your endpoint.

## The util (`utils/ogcApi.ts`)

```ts
export interface OgcThing {
  id: string;
  // ...other fields the endpoint returns
}

export async function fetchThing(
  baseUrl: string,
  collection: string,
  auth?: SourceAuth,
): Promise<OgcThing> {
  const url = new URL(`${baseUrl.replace(/\/$/, '')}/collections/${collection}/thing`);
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (auth?.type === 'query_param') {
    url.searchParams.set(auth.name, auth.value);
  } else if (auth?.type === 'header') {
    headers[auth.name] = auth.value;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`OGC API ${response.status} ${response.statusText} fetching ${url}`);
  }
  return (await response.json()) as OgcThing;
}
```

## The hook (`hooks/useThing.ts`)

```ts
import { useState, useEffect } from 'react';
import { fetchThing, type OgcThing, type SourceAuth } from '../utils/ogcApi';

export interface UseThingResult {
  thing: OgcThing | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch the "thing" sub-resource for a single OGC API collection.
 *
 * @param baseUrl    - The OGC API server base URL, or null to skip fetching
 * @param collection - The collection ID, or null to skip fetching
 * @param auth       - Optional source authentication
 */
export function useThing(
  baseUrl: string | null,
  collection: string | null,
  auth?: SourceAuth,
): UseThingResult {
  const [thing, setThing] = useState<OgcThing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Stable string key so the effect doesn't re-run on every render.
  const authKey = auth ? `${auth.type}:${auth.name}:${auth.value}` : '';

  useEffect(() => {
    if (!baseUrl || !collection) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchThing(baseUrl, collection, auth)
      .then((data) => {
        if (!cancelled) setThing(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setThing(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, collection, authKey]);

  return { thing, loading, error };
}
```

## The hook story (`hooks/useThing.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { useThing } from './useThing';

function ThingHarness({ baseUrl, collection }: { baseUrl: string; collection: string }) {
  const { thing, loading, error } = useThing(baseUrl, collection);
  if (loading) return <p>Loading…</p>;
  if (error) return <pre style={{ color: 'red' }}>{error.message}</pre>;
  if (!thing) return <p>No data.</p>;
  return <pre>{JSON.stringify(thing, null, 2)}</pre>;
}

const meta: Meta<typeof ThingHarness> = {
  title: 'Hooks/useThing',
  component: ThingHarness,
};
export default meta;
type Story = StoryObj<typeof ThingHarness>;

export const LocalTipg: Story = {
  args: { baseUrl: 'http://localhost:8001', collection: 'example.ne_110m_admin_0_countries' },
};
```

## Don't forget

Re-export from `packages/map-ui-lib/src/hooks/index.ts` and (if it should be a public API) `packages/map-ui-lib/src/main.ts`.
