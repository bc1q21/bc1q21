// Browser-only compatibility shim for dependencies expecting Node's process global.
// No Node APIs or network access are provided.
const process = {
  browser: true,
  env: { NODE_ENV: 'production' },
  version: '',
  versions: {},
  nextTick(callback, ...args) { queueMicrotask(() => callback(...args)); },
};
if (typeof globalThis !== 'undefined' && !globalThis.process) globalThis.process = process;
module.exports = { process };
