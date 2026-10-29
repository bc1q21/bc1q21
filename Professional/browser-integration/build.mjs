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
    'bitcoinjs-lib': fileURLToPath(import.meta.resolve('bitcoinjs-lib')),
    '@noble/hashes/sha256': fileURLToPath(import.meta.resolve('@noble/hashes/sha256')),
    '@noble/curves/secp256k1': fileURLToPath(import.meta.resolve('@noble/curves/secp256k1')),
    jsqr: fileURLToPath(import.meta.resolve('jsqr')),
    '@ngraveio/bc-ur': fileURLToPath(import.meta.resolve('@ngraveio/bc-ur')),
  },
  plugins: [polyfillNode()],
});
