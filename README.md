# Asset Library

A static, searchable icon library for design teams. Built with React + Vite, deploys to GitHub Pages, no backend.

## Quick start

```bash
npm install
npm run dev
```

The app runs at http://localhost:5173.

## Project layout

```
public/
  icons/             SVG files served as static assets
src/
  components/        Header, SearchBar, CategoryFilter, IconGrid, IconCard, IconModal
  data/icons.json    Asset manifest (id, name, filename, keywords, category, type)
  utils/svgColor.js  Color injection for SVG export
  styles/global.css
  App.jsx
  main.jsx
scripts/
  sync-figma.js      Figma REST API sync (scaffold only)
```

## Adding icons by hand

1. Drop the SVG into `public/icons/`.
2. Add an entry to `src/data/icons.json`:

```json
{
  "id": "my-icon",
  "type": "icon",
  "name": "My Icon",
  "filename": "my-icon.svg",
  "keywords": ["tag", "another-tag"],
  "category": "ui",
  "dateAdded": "2024-01-01"
}
```

Categories shown in the filter row are derived from the data — no extra config needed.

## Color picker

Inside the icon modal, swatches and a hex input drive a live preview. Color is applied by replacing `fill`/`stroke` attributes on shape elements in the SVG; `fill="none"` is preserved so outline icons keep their structure. The same colored SVG is used for **Copy SVG**, **Download SVG**, and **Download PNG** (canvas-rendered at 256px).

## Deploying to GitHub Pages

1. Set `base` in `vite.config.js` to match your repo path. The default is `/asset-library/`. For a user/org site (`<user>.github.io`), set `base` to `/`. You can also override per-build with `VITE_BASE`:

   ```bash
   VITE_BASE="/my-repo/" npm run build
   ```

2. Deploy:

   ```bash
   npm run deploy
   ```

   This runs `vite build` and pushes `dist/` to the `gh-pages` branch.

3. In your GitHub repo: **Settings → Pages → Source: `gh-pages` branch**.

## Figma sync (scaffold)

`scripts/sync-figma.js` is a stub. To wire it up, set:

```bash
export FIGMA_TOKEN="figd_xxx"
export FIGMA_FILE_KEY="abc123"
npm run sync-figma
```

The script outlines which Figma REST endpoints to call (`/v1/files/:key/components` and `/v1/images/:key`) and where to write the results.

## Future asset types

Each entry has a `type` field (currently `"icon"`). To add logos or templates later: drop them in `public/<type>/`, extend `icons.json` (or rename it to `assets.json`), and add a tab in `Header.jsx` that filters by `type`. The component layout is already split so swapping in a different grid per tab is straightforward.
