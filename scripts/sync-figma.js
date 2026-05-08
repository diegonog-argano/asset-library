#!/usr/bin/env node
/**
 * Sync icons from a Figma file into the local asset library.
 *
 * Reads from:
 *   .env (gitignored): FIGMA_TOKEN, FIGMA_FILE_KEY
 *
 * Writes:
 *   public/icons/<id>.svg  for each component
 *   src/data/icons.json    full manifest with id, type, name, filename, keywords, category, dateAdded
 *   .sync-state.json       last-sync timestamp + counts (gitignored)
 *
 * Strategy:
 *   1. GET /v1/files/:key — full document tree (only file_content:read scope needed)
 *      walked locally to find every COMPONENT node + its containing frame name
 *   2. GET /v1/images/:key?ids=...&format=svg — temporary CDN URLs (batched, 100/req)
 *   3. fetch each SVG, slugify the component name, write to disk
 *   4. derive keywords/category from name + description (best-effort; user can refine via dev edit pill or JSON)
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ICONS_DIR = path.join(ROOT, 'public', 'icons');
const ICONS_JSON = path.join(ROOT, 'src', 'data', 'icons.json');
const STATE_FILE = path.join(ROOT, '.sync-state.json');

const FIGMA_BASE = 'https://api.figma.com/v1';
const BATCH_SIZE = 100;

// --- env loading (no dependency on dotenv) ---

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
  } catch {
    // No .env — rely on real env vars.
  }
}

// --- helpers ---

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function ensureUnique(slug, used) {
  if (!used.has(slug)) {
    used.add(slug);
    return slug;
  }
  let n = 2;
  while (used.has(`${slug}-${n}`)) n++;
  const next = `${slug}-${n}`;
  used.add(next);
  return next;
}

function deriveCategory(componentName, containingFrame) {
  // Convention 1: "Arrows / Arrow Right" → "arrows"
  if (componentName?.includes('/')) {
    const parts = componentName.split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) return slugify(parts[0]) || 'uncategorized';
  }
  // Convention 2: parent frame name in Figma
  if (containingFrame?.name) {
    return slugify(containingFrame.name) || 'uncategorized';
  }
  return 'uncategorized';
}

function deriveKeywords(componentName, description) {
  const words = new Set();
  for (const source of [componentName, description]) {
    if (!source) continue;
    for (const w of source
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))) {
      words.add(w);
    }
  }
  return Array.from(words).slice(0, 8);
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'icon', 'icons', 'symbol', 'figma',
]);

// Walk the Figma document tree and collect every COMPONENT node, along with
// the name of its nearest enclosing FRAME (used as a category fallback).
function collectComponents(document) {
  const out = [];
  function walk(node, frameName) {
    if (!node) return;
    const nextFrame =
      node.type === 'FRAME' || node.type === 'COMPONENT_SET'
        ? node.name
        : frameName;
    if (node.type === 'COMPONENT') {
      out.push({
        id: node.id,
        name: node.name,
        description: node.description,
        containingFrame: frameName ? { name: frameName } : null,
      });
    }
    if (node.children) for (const c of node.children) walk(c, nextFrame);
  }
  walk(document, null);
  return out;
}

// --- main ---

async function main() {
  await loadEnv();
  const TOKEN = process.env.FIGMA_TOKEN;
  const FILE = process.env.FIGMA_FILE_KEY;
  if (!TOKEN || !FILE) {
    console.error('Missing FIGMA_TOKEN or FIGMA_FILE_KEY. See .env.example.');
    process.exit(1);
  }
  const headers = { 'X-Figma-Token': TOKEN };

  console.log(`[sync] Fetching file tree for ${FILE}…`);
  const fileRes = await fetch(
    `${FIGMA_BASE}/files/${FILE}?geometry=paths`,
    { headers }
  );
  if (!fileRes.ok) {
    const body = await fileRes.text();
    throw new Error(`/files ${fileRes.status}: ${body.slice(0, 200)}`);
  }
  const fileJson = await fileRes.json();
  const components = collectComponents(fileJson.document);
  console.log(`[sync] Found ${components.length} components.`);
  if (components.length === 0) {
    throw new Error('No COMPONENT nodes found in this file.');
  }

  console.log('[sync] Resolving SVG render URLs…');
  const allIds = components.map((c) => c.id);
  const urlMap = {};
  for (const batch of chunk(allIds, BATCH_SIZE)) {
    const ids = encodeURIComponent(batch.join(','));
    const res = await fetch(
      `${FIGMA_BASE}/images/${FILE}?ids=${ids}&format=svg`,
      { headers }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`/images ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    Object.assign(urlMap, json.images || {});
  }

  // Wipe the icons directory first so deleted Figma components disappear locally.
  await fs.mkdir(ICONS_DIR, { recursive: true });
  for (const f of await fs.readdir(ICONS_DIR)) {
    if (f.toLowerCase().endsWith('.svg')) {
      await fs.unlink(path.join(ICONS_DIR, f));
    }
  }

  console.log('[sync] Downloading SVGs…');
  const usedSlugs = new Set();
  const items = [];
  let downloaded = 0;
  let skipped = 0;

  for (const c of components) {
    const url = urlMap[c.id];
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
      console.warn(`[sync]  ! failed ${c.id} (${c.name}): ${err.message}`);
      skipped++;
      continue;
    }

    const baseSlug =
      slugify(c.name?.split('/').pop() ?? '') ||
      slugify(c.name) ||
      `icon-${c.id.replace(':', '-')}`;
    const id = ensureUnique(baseSlug, usedSlugs);
    const filename = `${id}.svg`;
    await fs.writeFile(path.join(ICONS_DIR, filename), svg, 'utf8');

    items.push({
      id,
      type: 'icon',
      name: c.name?.replace(/^.*\//, '').trim() || id,
      filename,
      keywords: deriveKeywords(c.name, c.description),
      category: deriveCategory(c.name, c.containingFrame),
      dateAdded: new Date().toISOString().slice(0, 10),
      figma: { nodeId: c.id },
    });

    downloaded++;
    if (downloaded % 10 === 0) {
      process.stdout.write(`\r[sync]   ${downloaded}/${components.length}…`);
    }
  }
  process.stdout.write('\n');

  // Sort for stable diffs.
  items.sort((a, b) => a.id.localeCompare(b.id));
  await fs.writeFile(ICONS_JSON, JSON.stringify(items, null, 2) + '\n', 'utf8');

  const state = {
    syncedAt: new Date().toISOString(),
    fileKey: FILE,
    componentsFound: components.length,
    downloaded,
    skipped,
  };
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8');

  console.log(`[sync] Done. ${downloaded} downloaded, ${skipped} skipped.`);
  console.log(`[sync] Wrote ${path.relative(ROOT, ICONS_JSON)} and ${items.length} SVGs.`);
}

main().catch((err) => {
  console.error('[sync] FAILED:', err.message);
  process.exit(1);
});
