import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { mockDbModule, seedAdminUser, getCurrentPool } from './testDb.js';

let app: import('express').Express;

async function authenticatedAgent(): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ username: 'admin', password: 'admin' });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status}`);
  }
  return agent;
}

function installFetchSpy(handler: (url: string) => Response | Promise<Response>) {
  const spy = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    return handler(url);
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

let sourceSeq = 0;
function nextSourceId(): string {
  sourceSeq += 1;
  return `meta-test-${sourceSeq}`;
}

const WMTS_URL = 'https://wmts.local/GetCapabilities';
const WMTS_METADATA = {
  wmtsLayer: 'bluesky-high',
  wmtsStyle: 'RGB',
  wmtsFormat: 'image/jpeg',
  wmtsTileMatrixSet: 'bluesky-high',
  wmtsTileSize: 256,
};

async function insertWmtsSource(): Promise<string> {
  const pool = getCurrentPool();
  if (!pool) throw new Error('no pool');
  const result = await pool.query(
    `INSERT INTO map_admin.ogc_sources (source_id, url, source_type, metadata)
     VALUES ($1, $2, 'wmts', $3) RETURNING id`,
    [nextSourceId(), WMTS_URL, JSON.stringify(WMTS_METADATA)],
  );
  return (result.rows[0] as { id: string }).id;
}

beforeAll(async () => {
  await mockDbModule();
  await seedAdminUser('admin', 'admin');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  ({ app } = await import('../index.js'));
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PUT /api/sources/:id — metadata persistence', () => {
  it('persists client metadata when the URL is unchanged', async () => {
    const id = await insertWmtsSource();
    const agent = await authenticatedAgent();
    const res = await agent.put(`/api/sources/${id}`).send({
      url: WMTS_URL,
      metadata: { ...WMTS_METADATA, wmtsMaxZoom: 20 },
    });
    expect(res.status).toBe(200);
    expect(res.body.metadata?.wmtsMaxZoom).toBe(20);
    expect(res.body.metadata_updated_at).toBeTruthy();
  });

  it('preserves existing metadata when the body omits it', async () => {
    const id = await insertWmtsSource();
    const agent = await authenticatedAgent();
    const res = await agent.put(`/api/sources/${id}`).send({ label: 'renamed' });
    expect(res.status).toBe(200);
    expect(res.body.label).toBe('renamed');
    expect(res.body.metadata).toEqual(WMTS_METADATA);
  });

  it('prefers client metadata over auto-inspection when the URL changed', async () => {
    const id = await insertWmtsSource();
    const fetchSpy = installFetchSpy(() => jsonResponse({ collections: [] }));
    const agent = await authenticatedAgent();
    const res = await agent.put(`/api/sources/${id}`).send({
      url: 'https://wmts.other/GetCapabilities',
      metadata: { ...WMTS_METADATA, wmtsMaxZoom: 19 },
    });
    expect(res.status).toBe(200);
    expect(res.body.metadata?.wmtsMaxZoom).toBe(19);
    // Client metadata short-circuits server-side inspection entirely
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('auto-inspects when the URL changed and no metadata is provided', async () => {
    const id = await insertWmtsSource();
    installFetchSpy(() => jsonResponse({ collections: [] }));
    const agent = await authenticatedAgent();
    const res = await agent
      .put(`/api/sources/${id}`)
      .send({ url: 'http://tipg.local/ogc-moved' });
    expect(res.status).toBe(200);
    // inspectSource results always carry inspectedAt — the old wmts metadata is replaced
    expect(res.body.metadata?.inspectedAt).toBeTruthy();
    expect(res.body.metadata?.wmtsLayer).toBeUndefined();
  });
});
