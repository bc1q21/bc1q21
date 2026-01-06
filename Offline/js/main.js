import { bip39 } from './lib/bip39.bundle.js';
import { wordlist as english } from './lib/scure.wordlist.english.js';
import { EntropyCollector } from './entropy.js'; // Adjust path as needed

const captureArea = document.getElementById('capture-area');
const progressBar = document.getElementById('progress');
const output = document.getElementById('output');

const entropyCollector = new EntropyCollector(
  captureArea,
  progressBar,
  64, // 64 bytes = 512 bits
  onEntropyCollected
);

entropyCollector.start();

async function onEntropyCollected(entropyString) {
  try {
    // Hash entropy using SHA-512
    const buffer = new TextEncoder().encode(entropyString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const entropyHex = hashHex.slice(0, 32); // First 128 bits (16 bytes)
    const entropyBytes = hexToBytes(entropyHex);

    const mnemonic = bip39.entropyToMnemonic(entropyBytes, english);

    output.innerHTML = `
      <h2>🎉 Seed Phrase Generated</h2>
      <p style="white-space: pre-wrap;">${mnemonic}</p>
    `;

    // Optionally: move to Wallet generation, TimeLock, etc.

  } catch (err) {
    output.textContent = `❌ Error generating seed: ${err.message}`;
  }
}

function hexToBytes(hex) {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
