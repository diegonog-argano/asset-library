#!/usr/bin/env node
// One-shot cleanup of display names in src/data/icons.json.
// Strips variant suffixes ("AI (3) 1", "Calendar V2") that come from Figma
// component naming. id stays unique; only display name and keywords change.

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ICONS_JSON = path.join(ROOT, 'src', 'data', 'icons.json');

function cleanName(raw) {
  return (raw || '')
    .replace(/\s*\(\d+\)\s*/g, ' ')
    .replace(/\s+v\d+$/i, '')
    .replace(/\s+\d+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandKeywords(name, existing) {
  const set = new Set(existing.map((k) => k.toLowerCase()));
  // Add lowercase tokens from the cleaned name (no digits, no stop words).
  for (const token of (name || '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length >= 2 && !/^\d+$/.test(token)) set.add(token);
  }
  return Array.from(set);
}

const text = await fs.readFile(ICONS_JSON, 'utf8');
const data = JSON.parse(text);
let changed = 0;

for (const item of data) {
  const newName = cleanName(item.name);
  const newKeywords = expandKeywords(newName, item.keywords ?? []);
  if (newName !== item.name || newKeywords.length !== (item.keywords ?? []).length) {
    item.name = newName;
    item.keywords = newKeywords;
    changed++;
  }
}

await fs.writeFile(ICONS_JSON, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`[cleanup] Updated ${changed}/${data.length} entries.`);
