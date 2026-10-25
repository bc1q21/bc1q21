import { build } from 'esbuild';
import { polyfillNode } from 'esbuild-plugin-polyfill-node';
import { fileURLToPath } from 'node:url';

await build({
  entryPoints: ['browser-verifier-entry.mjs'],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
  outfile: 'professional-verifier.bundle.js',
  alias: {
    jsqr: fileURLToPath(import.meta.resolve('jsqr')),
    '@ngraveio/bc-ur': fileURLToPath(import.meta.resolve('@ngraveio/bc-ur')),
  },
  plugins: [polyfillNode()],
});
