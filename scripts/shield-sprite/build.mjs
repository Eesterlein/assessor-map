/**
 * Shield sprite builder — source of truth for the bundled default
 * highway-shield sprite sheet (`sprites/shields/`).
 *
 * Rasterizes the 6 generic SVG shield silhouettes in ./src/ into SDF
 * (signed-distance-field) atlases at 1x and 2x pixel ratios, packs them
 * with potpack, and writes sprite.json / sprite.png / sprite@2x.json /
 * sprite@2x.png into BOTH app public dirs:
 *   - apps/map-client/public/sprites/shields/
 *   - apps/admin-app/public/sprites/shields/
 *
 * SDF output means the icons are tintable at runtime via the `icon-color`
 * paint property (and can take `icon-halo-*`).
 *
 * Why not @mapbox/spritezero? It depends on node-mapnik native bindings,
 * which fail to build on current Node toolchains (spiked 2026-07: node-gyp
 * failure under Node 25/darwin-arm64). This hand-rolled sharp + potpack
 * pipeline produces the same spec-shaped output.
 *
 * Usage: `pnpm build:shields` (from the repo root).
 *
 * SDF conventions match TinySDF / MapLibre glyph rendering:
 *   alpha = 255 - 255 * (signedDistance / radius + cutoff), clamped to 0..255
 * with cutoff 0.25, so the shape edge (distance 0) sits at alpha ~191
 * (= the 0.75 buffer MapLibre's SDF shader expects).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import potpack from 'potpack';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

/** Icon names, in atlas order. Each maps to src/<name>.svg (30x30 viewBox). */
const ICONS = [
  'shield-generic',
  'shield-interstate',
  'shield-us-route',
  'shield-state',
  'shield-circle',
  'shield-rect',
];

/** Design size of each SVG (px at 1x). */
const BASE_SIZE = 30;
/** Transparent buffer added around each shape (px at 1x) so the SDF has halo room. */
const BUFFER = 4;
/** SDF falloff radius (px at 1x); scaled by pixelRatio. */
const SDF_RADIUS = 8;
/** TinySDF-standard cutoff: shape edge lands at alpha 255*(1-cutoff) ≈ 191. */
const SDF_CUTOFF = 0.25;
/** Supersampling factor for the rasterization the SDF is measured on. */
const SUPERSAMPLE = 4;
/** Transparent padding between icons in the packed atlas (px). */
const ATLAS_PAD = 2;

const OUTPUT_DIRS = [
  join(repoRoot, 'apps', 'map-client', 'public', 'sprites', 'shields'),
  join(repoRoot, 'apps', 'admin-app', 'public', 'sprites', 'shields'),
];

/**
 * 1D squared Euclidean distance transform (Felzenszwalb & Huttenlocher).
 * Operates in-place on `f` (length n) using scratch arrays d, v, z.
 */
function edt1d(f, d, v, z, n) {
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  let k = 0;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
  for (let q = 0; q < n; q++) f[q] = d[q];
}

/** 2D squared EDT over a Float64Array grid (w x h), in place. */
function edt2d(grid, w, h) {
  const size = Math.max(w, h);
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Uint32Array(size);
  const z = new Float64Array(size + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, d, v, z, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = f[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1d(f, d, v, z, w);
    for (let x = 0; x < w; x++) grid[y * w + x] = f[x];
  }
}

const INF = 1e20;

/**
 * Computes an SDF alpha bitmap (Uint8Array, iconSize^2) for one SVG at the
 * given pixel ratio. The SVG is rasterized supersampled, a signed distance
 * is measured on the high-res binary mask, then sampled at target-pixel
 * centers and mapped through the TinySDF alpha formula.
 */
async function renderSdf(svgPath, pixelRatio) {
  const shapeSize = BASE_SIZE * pixelRatio;
  const buffer = BUFFER * pixelRatio;
  const iconSize = shapeSize + 2 * buffer;
  const radius = SDF_RADIUS * pixelRatio;

  const hiShape = shapeSize * SUPERSAMPLE;
  const hiBuffer = buffer * SUPERSAMPLE;
  const hiSize = iconSize * SUPERSAMPLE;

  const { data, info } = await sharp(readFileSync(svgPath))
    .resize(hiShape, hiShape)
    .extend({
      top: hiBuffer,
      bottom: hiBuffer,
      left: hiBuffer,
      right: hiBuffer,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== hiSize || info.height !== hiSize || info.channels !== 4) {
    throw new Error(`Unexpected raster shape for ${svgPath}: ${info.width}x${info.height}x${info.channels}`);
  }

  // Binary inside/outside masks from the supersampled alpha channel.
  const n = hiSize * hiSize;
  const gridOuter = new Float64Array(n); // squared distance to nearest inside pixel
  const gridInner = new Float64Array(n); // squared distance to nearest outside pixel
  for (let i = 0; i < n; i++) {
    const inside = data[i * 4 + 3] >= 128;
    gridOuter[i] = inside ? 0 : INF;
    gridInner[i] = inside ? INF : 0;
  }
  edt2d(gridOuter, hiSize, hiSize);
  edt2d(gridInner, hiSize, hiSize);

  // Sample at target-pixel centers; convert to target-px signed distance.
  const alpha = new Uint8Array(iconSize * iconSize);
  for (let y = 0; y < iconSize; y++) {
    for (let x = 0; x < iconSize; x++) {
      const hx = Math.min(hiSize - 1, Math.round((x + 0.5) * SUPERSAMPLE - 0.5));
      const hy = Math.min(hiSize - 1, Math.round((y + 0.5) * SUPERSAMPLE - 0.5));
      const hi = hy * hiSize + hx;
      const d = (Math.sqrt(gridOuter[hi]) - Math.sqrt(gridInner[hi])) / SUPERSAMPLE;
      const a = Math.round(255 - 255 * (d / radius + SDF_CUTOFF));
      alpha[y * iconSize + x] = Math.max(0, Math.min(255, a));
    }
  }
  return { alpha, iconSize };
}

/** Builds one atlas (png buffer + sprite index object) for a pixel ratio. */
async function buildAtlas(pixelRatio) {
  const rendered = [];
  for (const name of ICONS) {
    const svgPath = join(__dirname, 'src', `${name}.svg`);
    const { alpha, iconSize } = await renderSdf(svgPath, pixelRatio);
    rendered.push({ name, alpha, w: iconSize + ATLAS_PAD * 2, h: iconSize + ATLAS_PAD * 2, iconSize });
  }

  const { w: atlasW, h: atlasH } = potpack(rendered);

  // Compose RGBA atlas: black RGB, SDF in alpha (MapLibre samples .a for SDF).
  const atlas = new Uint8Array(atlasW * atlasH * 4);
  const index = {};
  for (const icon of rendered) {
    const ox = icon.x + ATLAS_PAD;
    const oy = icon.y + ATLAS_PAD;
    for (let y = 0; y < icon.iconSize; y++) {
      for (let x = 0; x < icon.iconSize; x++) {
        atlas[((oy + y) * atlasW + (ox + x)) * 4 + 3] = icon.alpha[y * icon.iconSize + x];
      }
    }
    index[icon.name] = {
      x: ox,
      y: oy,
      width: icon.iconSize,
      height: icon.iconSize,
      pixelRatio,
      sdf: true,
    };
  }

  const png = await sharp(Buffer.from(atlas.buffer), {
    raw: { width: atlasW, height: atlasH, channels: 4 },
  })
    .png()
    .toBuffer();
  return { png, index };
}

async function main() {
  for (const pixelRatio of [1, 2]) {
    const suffix = pixelRatio === 2 ? '@2x' : '';
    const { png, index } = await buildAtlas(pixelRatio);
    const json = `${JSON.stringify(index, null, 2)}\n`;
    for (const dir of OUTPUT_DIRS) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `sprite${suffix}.png`), png);
      writeFileSync(join(dir, `sprite${suffix}.json`), json);
      console.log(`wrote ${join(dir, `sprite${suffix}.{png,json}`)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
