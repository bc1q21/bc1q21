import { build } from 'esbuild';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';

await build({
  entryPoints: ['browser-verifier-entry.mjs'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  outfile: 'professional-verifier.bundle.js',
  plugins: [polyfillNode()],
});
