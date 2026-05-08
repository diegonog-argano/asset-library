import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import devEditPlugin from './scripts/dev-edit-plugin.js';

// Set base to "/<repo-name>/" for GitHub Pages project sites,
// or "/" for user/organization sites. Override with VITE_BASE if needed.
const base = process.env.VITE_BASE ?? '/asset-library/';

export default defineConfig({
  plugins: [react(), devEditPlugin()],
  base,
});
