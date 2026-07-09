import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { mockDbModule, seedAdminUser, getCurrentPool } from './testDb.js';

let app: import('express').Express;

const ARCGIS_ROOT = 'https://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer';
// The exact corrupted value from the deployed DB (TODO.md P1)
const CORRUPTED_URL =
  '"http://server.arcgisonline.com/ArcGIS/res\\/services/USA_Topo_Maps/MapServer';

const arcgisServiceJson = {
  mapName: 'Layers',
  copyrightText: '© 2013 National Geographic Society, i-cubed',
  singleFusedMapCache: true,
  tileInfo: {
    rows: 256,
    cols: 256,
    spatialReference: { wkid: 102100, latestWkid: 3857 },
    lods: Array.from({ length: 16 }, (_, level) => ({ level })),
  },
};

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
  return `val-test-${sourceSeq}`;
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

describe('POST /api/sources — URL validation', () => {
  it('rejects the corrupted DB value with 400', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.post('/api/sources').send({
      source_id: nextSourceId(),
      url: CORRUPTED_URL,
      source_type: 'imagery',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid absolute http/);
  });

  it('rejects URLs with embedded whitespace', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.post('/api/sources').send({
      source_id: nextSourceId(),
      url: 'http://example.com/a b/c',
      source_type: 'features',
    });
    expect(res.status).toBe(400);
  });

  it('strips wrapping quotes and persists the normalized URL', async () => {
    installFetchSpy(() => jsonResponse({ collections: [] }));
    const agent = await authenticatedAgent();
    const sourceId = nextSourceId();
    const res = await agent.post('/api/sources').send({
      source_id: sourceId,
      url: '"http://tipg.local/ogc"',
      source_type: 'features',
      metadata: { collections: [] },
    });
    expect(res.status).toBe(201);
    expect(res.body.url).toBe('http://tipg.local/ogc');
  });

  it('rejects an ArcGIS MapServer root saved as a Style-URL basemap with guidance', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.post('/api/sources').send({
      source_id: nextSourceId(),
      url: ARCGIS_ROOT,
      source_type: 'basemap',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/From imagery source/);
  });

  it('accepts a relative style URL for basemaps', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.post('/api/sources').send({
      source_id: nextSourceId(),
      url: '/api/basemaps/abc/style.json',
      source_type: 'basemap',
    });
    expect(res.status).toBe(201);
    expect(res.body.url).toBe('/api/basemaps/abc/style.json');
  });

  it('rejects a relative URL for non-basemap sources', async () => {
    const agent = await authenticatedAgent();
    const res = await agent.post('/api/sources').send({
      source_id: nextSourceId(),
      url: '/not/absolute',
      source_type: 'features',
    });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/sources/:id — URL validation', () => {
  async function insertSource(sourceType = 'imagery'): Promise<string> {
    const pool = getCurrentPool();
    if (!pool) throw new Error('no pool');
    const result = await pool.query(
      `INSERT INTO map_admin.ogc_sources (source_id, url, source_type)
       VALUES ($1, $2, $3) RETURNING id`,
      [nextSourceId(), 'http://tipg.local/ogc', sourceType],
    );
    return (result.rows[0] as { id: string }).id;
  }

  it('rejects an invalid replacement URL with 400', async () => {
    const id = await insertSource();
    const agent = await authenticatedAgent();
    const res = await agent.put(`/api/sources/${id}`).send({ url: CORRUPTED_URL });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid absolute http/);
  });

  it('normalizes a quoted URL on update', async () => {
    const id = await insertSource();
    installFetchSpy(() => jsonResponse({ collections: [] }));
    const agent = await authenticatedAgent();
    const res = await agent
      .put(`/api/sources/${id}`)
      .send({ url: '"http://tipg.local/ogc2"', metadata: { collections: [] } });
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('http://tipg.local/ogc2');
  });
});

describe('ArcGIS source inspection', () => {
  it('persists metadata.arcgis when creating an ArcGIS imagery source without client metadata', async () => {
    installFetchSpy((url) => {
      if (url.startsWith(ARCGIS_ROOT) && url.includes('f=json')) {
        return jsonResponse(arcgisServiceJson);
      }
      return new Response('not found', { status: 404 });
    });
    const agent = await authenticatedAgent();
    const res = await agent.post('/api/sources').send({
      source_id: nextSourceId(),
      url: ARCGIS_ROOT,
      source_type: 'imagery',
    });
    expect(res.status).toBe(201);
    expect(res.body.metadata?.arcgis).toMatchObject({
      minZoom: 0,
      maxZoom: 15,
      tileSize: 256,
    });
    expect(res.body.metadata.arcgis.tileUrlTemplate).toBe(`${ARCGIS_ROOT}/tile/{z}/{y}/{x}`);
  });

  it('test-connection succeeds only for a cached Web-Mercator service', async () => {
    installFetchSpy(() => jsonResponse(arcgisServiceJson));
    const agent = await authenticatedAgent();
    const ok = await agent.post('/api/sources/test-connection').send({ url: ARCGIS_ROOT });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('success');

    installFetchSpy(() =>
      jsonResponse({ ...arcgisServiceJson, singleFusedMapCache: false }),
    );
    const bad = await agent.post('/api/sources/test-connection').send({ url: ARCGIS_ROOT });
    expect(bad.body.status).toBe('error');
    expect(bad.body.error).toMatch(/not a cached tile service/);
  });
});

describe('GET /api/basemaps/:id/style.json — ArcGIS synthesis', () => {
  it('synthesizes a raster style with the arcgis tile template and zoom range', async () => {
    const pool = getCurrentPool();
    if (!pool) throw new Error('no pool');

    const imagery = await pool.query(
      `INSERT INTO map_admin.ogc_sources (source_id, url, source_type, metadata)
       VALUES ($1, $2, 'imagery', $3) RETURNING id`,
      [
        nextSourceId(),
        ARCGIS_ROOT,
        JSON.stringify({
          arcgis: {
            tileUrlTemplate: `${ARCGIS_ROOT}/tile/{z}/{y}/{x}`,
            minZoom: 0,
            maxZoom: 15,
            tileSize: 256,
            wkid: 3857,
          },
        }),
      ],
    );
    const imageryId = (imagery.rows[0] as { id: string }).id;

    const basemap = await pool.query(
      `INSERT INTO map_admin.ogc_sources (source_id, url, source_type, metadata)
       VALUES ($1, '', 'basemap', $2) RETURNING id`,
      [nextSourceId(), JSON.stringify({ imagerySourceId: imageryId })],
    );
    const basemapId = (basemap.rows[0] as { id: string }).id;

    const res = await request(app).get(`/api/basemaps/${basemapId}/style.json`);
    expect(res.status).toBe(200);
    expect(res.body.sources.imagery.tiles).toEqual([`${ARCGIS_ROOT}/tile/{z}/{y}/{x}`]);
    expect(res.body.sources.imagery.maxzoom).toBe(15);
    expect(res.body.sources.imagery.minzoom).toBe(0);
    expect(res.body.layers[0].type).toBe('raster');
  });
});

describe('POST /api/sources/import — invalid URLs are skipped', () => {
  it('imports valid sources and reports invalid ones in skipped[]', async () => {
    const pool = getCurrentPool();
    if (!pool) throw new Error('no pool');
    await pool.query('DELETE FROM map_admin.map_configs');
    await pool.query(
      `INSERT INTO map_admin.map_configs (name, config) VALUES ($1, $2)`,
      [
        'import-test',
        JSON.stringify({
          sources: [
            { id: 'good-source', url: 'http://tipg.local/ogc' },
            { id: 'bad-source', url: CORRUPTED_URL },
          ],
          basemaps: [],
        }),
      ],
    );

    const agent = await authenticatedAgent();
    const res = await agent.post('/api/sources/import');
    expect(res.status).toBe(200);
    expect(res.body.skipped).toEqual([
      { id: 'bad-source', url: CORRUPTED_URL, error: expect.stringMatching(/valid absolute http/) },
    ]);
    expect(res.body.imported.features).toBeGreaterThanOrEqual(1);
  });
});
