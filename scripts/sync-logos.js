#!/usr/bin/env node
/**
 * Sync Argano logo variants into the local asset library.
 *
 * Reads from .env:
 *   FIGMA_TOKEN
 *   FIGMA_LOGO_FILE_KEY  — Figma file containing the Logo COMPONENT_SET
 *   FIGMA_LOGO_NODE_ID   — node id of the Logo set (e.g. "5565:567")
 *
 * Writes:
 *   public/logos/<id>.svg    one file per variant
 *   src/data/logos.json      manifest with id, name, type, color, dimensions
 *   .sync-logos-state.json   last-sync timestamp + counts (gitignored)
 *
 * Strategy:
 *   1. GET /v1/files/:key/nodes?ids=:nodeId — fetch only the COMPONENT_SET subtree
 *   2. Walk children to collect COMPONENT variants
 *   3. GET /v1/images/:key?ids=...&format=svg — temporary CDN URLs
 *   4. Download each SVG, slug from variant properties
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LOGOS_DIR = path.join(ROOT, 'public', 'logos');
const LOGOS_JSON = path.join(ROOT, 'src', 'data', 'logos.json');
const STATE_FILE = path.join(ROOT, '.sync-logos-state.json');

const FIGMA_BASE = 'https://api.figma.com/v1';

async function loadEnv() {
  try {
    const text = await fs.readFile(path.join(ROOT, '.env'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

function parseVariantName(name) {
  const out = {};
  for (const part of name.split(',')) {
    const [k, v] = part.split('=').map((s) => s?.trim());
    if (k && v) out[k] = v;
  }
  return out;
}

function typeSlug(typeName) {
  // "Horizontal Logo" → "horizontal"; "Logomark" → "logomark"
  return (typeName || '')
    .toLowerCase()
    .replace(/\s*logo\s*$/, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-');
}

function colorSlug(colorName) {
  return (colorName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function collectVariants(node) {
  const out = [];
  function walk(n) {
    if (n.type === 'COMPONENT') out.push(n);
    if (n.children) for (const c of n.children) walk(c);
  }
  walk(node);
  return out;
}

async function main() {
  await loadEnv();
  const TOKEN = process.env.FIGMA_TOKEN;
  const FILE = process.env.FIGMA_LOGO_FILE_KEY;
  const NODE = process.env.FIGMA_LOGO_NODE_ID;
  if (!TOKEN || !FILE || !NODE) {
    console.error(
      'Missing FIGMA_TOKEN, FIGMA_LOGO_FILE_KEY, or FIGMA_LOGO_NODE_ID. See .env.example.'
    );
    process.exit(1);
  }
  const headers = { 'X-Figma-Token': TOKEN };

  console.log(`[logos] Fetching node ${NODE} from ${FILE}…`);
  const nodeRes = await fetch(
    `${FIGMA_BASE}/files/${FILE}/nodes?ids=${encodeURIComponent(NODE)}`,
    { headers }
  );
  if (!nodeRes.ok) {
    throw new Error(`/nodes ${nodeRes.status}: ${(await nodeRes.text()).slice(0, 200)}`);
  }
  const nodeJson = await nodeRes.json();
  const root = nodeJson.nodes?.[NODE]?.document;
  if (!root) throw new Error(`Node ${NODE} not found`);
  if (root.type !== 'COMPONENT_SET') {
    console.warn(`[logos] Note: node is ${root.type}, expected COMPONENT_SET — proceeding`);
  }

  const variants = collectVariants(root);
  console.log(`[logos] Found ${variants.length} variants.`);
  if (variants.length === 0) throw new Error('No COMPONENT variants in this node.');

  console.log('[logos] Resolving SVG render URLs…');
  const ids = variants.map((v) => v.id);
  const imgRes = await fetch(
    `${FIGMA_BASE}/images/${FILE}?ids=${encodeURIComponent(ids.join(','))}&format=svg`,
    { headers }
  );
  if (!imgRes.ok) {
    throw new Error(`/images ${imgRes.status}: ${(await imgRes.text()).slice(0, 200)}`);
  }
  const { images } = await imgRes.json();

  await fs.mkdir(LOGOS_DIR, { recursive: true });
  for (const f of await fs.readdir(LOGOS_DIR)) {
    if (f.toLowerCase().endsWith('.svg')) {
      await fs.unlink(path.join(LOGOS_DIR, f));
    }
  }

  console.log('[logos] Downloading SVGs…');
  const items = [];
  let downloaded = 0;
  let skipped = 0;
  const usedIds = new Set();

  for (const v of variants) {
    const url = images[v.id];
    if (!url) {
      skipped++;
      continue;
    }
    let svg;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      svg = await r.text();
    } catch (err) {
      console.warn(`[logos]  ! failed ${v.id} (${v.name}): ${err.message}`);
      skipped++;
      continue;
    }

    const props = parseVariantName(v.name);
    const t = typeSlug(props.Type);
    const c = colorSlug(props.Color);
    let id = t && c ? `${t}-${c}` : `logo-${v.id.replace(':', '-')}`;
    while (usedIds.has(id)) id = `${id}-x`;
    usedIds.add(id);

    const filename = `${id}.svg`;
    await fs.writeFile(path.join(LOGOS_DIR, filename), svg, 'utf8');

    items.push({
      id,
      type: 'logo',
      logoType: t || 'unknown',
      color: c || 'unknown',
      name:
        props.Type && props.Color
          ? `${props.Type} · ${props.Color}`
          : v.name,
      filename,
      width: v.absoluteBoundingBox?.width ?? null,
      height: v.absoluteBoundingBox?.height ?? null,
      figma: { nodeId: v.id },
    });
    downloaded++;
  }

  // Stable order: type then color (alphabetical-ish, but with Logomark/Horizontal/Vertical preferred)
  const TYPE_ORDER = ['logomark', 'horizontal', 'vertical'];
  const COLOR_ORDER = ['full', 'black', 'white', 'inverse'];
  items.sort((a, b) => {
    const ta = TYPE_ORDER.indexOf(a.logoType);
    const tb = TYPE_ORDER.indexOf(b.logoType);
    if (ta !== tb) return (ta < 0 ? 99 : ta) - (tb < 0 ? 99 : tb);
    const ca = COLOR_ORDER.indexOf(a.color);
    const cb = COLOR_ORDER.indexOf(b.color);
    if (ca !== cb) return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb);
    return a.id.localeCompare(b.id);
  });

  await fs.writeFile(LOGOS_JSON, JSON.stringify(items, null, 2) + '\n', 'utf8');
  await fs.writeFile(
    STATE_FILE,
    JSON.stringify(
      {
        syncedAt: new Date().toISOString(),
        fileKey: FILE,
        nodeId: NODE,
        variantsFound: variants.length,
        downloaded,
        skipped,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  console.log(`[logos] Done. ${downloaded} downloaded, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error('[logos] FAILED:', err.message);
  process.exit(1);
});
