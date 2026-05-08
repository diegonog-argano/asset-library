// Vite dev-mode plugin: exposes endpoints used by admin/dev UI.
//   POST /__edit-icon   — patch one entry in src/data/icons.json
//   POST /__sync-figma  — run scripts/sync-figma.js as a child process
// Both are dev-only (apply: 'serve') — never attached in production builds.

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.resolve('.');
const ICONS_JSON = path.resolve('src/data/icons.json');
const SYNC_SCRIPT = path.resolve('scripts/sync-figma.js');
const STATE_FILE = path.resolve('.sync-state.json');
const MAX_BODY_BYTES = 64 * 1024;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(text ? JSON.parse(text) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function handleEditIcon(req, res) {
  if (req.method !== 'POST') return false;
  try {
    const payload = await readJson(req);
    if (!payload?.id || typeof payload.id !== 'string') {
      send(res, 400, { ok: false, error: 'Missing id' });
      return true;
    }

    const text = await fs.readFile(ICONS_JSON, 'utf8');
    const data = JSON.parse(text);
    const idx = data.findIndex((a) => a.id === payload.id);
    if (idx === -1) {
      send(res, 404, { ok: false, error: 'Asset not found' });
      return true;
    }

    const current = data[idx];
    const next = { ...current };
    if (typeof payload.name === 'string' && payload.name.trim()) {
      next.name = payload.name.trim();
    }
    if (Array.isArray(payload.keywords)) {
      next.keywords = payload.keywords
        .map((k) => String(k).trim().toLowerCase())
        .filter(Boolean)
        .filter((k, i, arr) => arr.indexOf(k) === i);
    }
    data[idx] = next;

    await fs.writeFile(
      ICONS_JSON,
      JSON.stringify(data, null, 2) + '\n',
      'utf8'
    );
    send(res, 200, { ok: true, asset: next });
  } catch (err) {
    console.error('[dev-edit] error:', err);
    send(res, 500, { ok: false, error: err.message || 'Failed' });
  }
  return true;
}

let syncRunning = false;

async function handleSyncFigma(req, res) {
  if (req.method === 'GET') {
    let state = null;
    try {
      const text = await fs.readFile(STATE_FILE, 'utf8');
      state = JSON.parse(text);
    } catch {
      state = null;
    }
    send(res, 200, { ok: true, state, running: syncRunning });
    return true;
  }
  if (req.method !== 'POST') return false;
  if (syncRunning) {
    send(res, 409, { ok: false, error: 'Sync already in progress' });
    return true;
  }
  syncRunning = true;
  const child = spawn(process.execPath, [SYNC_SCRIPT], {
    cwd: ROOT,
    env: process.env,
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (b) => {
    stdout += b.toString();
  });
  child.stderr.on('data', (b) => {
    stderr += b.toString();
  });
  child.on('error', (err) => {
    syncRunning = false;
    send(res, 500, {
      ok: false,
      error: `Spawn failed: ${err.message}`,
    });
  });
  child.on('exit', async (code) => {
    syncRunning = false;
    if (code === 0) {
      let state = null;
      try {
        const text = await fs.readFile(STATE_FILE, 'utf8');
        state = JSON.parse(text);
      } catch {
        state = null;
      }
      send(res, 200, { ok: true, state, log: stdout });
    } else {
      send(res, 500, {
        ok: false,
        error: stderr.trim() || `Exited ${code}`,
        log: stdout,
      });
    }
  });
  return true;
}

export default function devEditPlugin() {
  return {
    name: 'asset-library:dev-edit',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__edit-icon', async (req, res, next) => {
        const handled = await handleEditIcon(req, res);
        if (!handled) next();
      });
      server.middlewares.use('/__sync-figma', async (req, res, next) => {
        const handled = await handleSyncFigma(req, res);
        if (!handled) next();
      });
    },
  };
}
