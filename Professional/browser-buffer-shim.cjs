// Inject the browser-compatible Buffer implementation into dependencies.
const { Buffer } = require('buffer');
if (typeof globalThis !== 'undefined' && !globalThis.Buffer) globalThis.Buffer = Buffer;
module.exports = { Buffer };
