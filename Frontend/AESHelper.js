// aes-openssl-hex.js
// Output format (hex): "Salted__" (8 bytes) + salt (8 bytes) + ciphertext (N bytes)
// For short inputs like "2025-01-01", ciphertext is 16 bytes -> total 32 bytes -> 64 hex chars.

const te = new TextEncoder();
const td = new TextDecoder();

function toHex(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += u8[i].toString(16).padStart(2, "0");
  return s;
}
function fromHex(hex) {
  if (hex.length % 2) throw new Error("Invalid hex");
  const u8 = new Uint8Array(hex.length / 2);
  for (let i = 0; i < u8.length; i++) u8[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return u8;
}

function pkcs7Pad(data, blockSize = 16) {
  const padLen = blockSize - (data.length % blockSize || blockSize);
  const out = new Uint8Array(data.length + padLen);
  out.set(data);
  out.fill(padLen, data.length);
  return out;
}
function pkcs7Unpad(data) {
  if (data.length === 0) throw new Error("Bad padding");
  const padLen = data[data.length - 1];
  if (padLen < 1 || padLen > 16) throw new Error("Bad padding");
  for (let i = data.length - padLen; i < data.length; i++) {
    if (data[i] !== padLen) throw new Error("Bad padding");
  }
  return data.slice(0, data.length - padLen);
}

async function deriveKeyAndIv(passphrase, salt8, iterations = 1, keyBytes = 32, ivBytes = 16) {
  const baseKey = await crypto.subtle.importKey("raw", te.encode(passphrase), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt8, iterations },
    baseKey,
    (keyBytes + ivBytes) * 8
  );
  const all = new Uint8Array(bits);
  return { key: all.slice(0, keyBytes), iv: all.slice(keyBytes, keyBytes + ivBytes) };
}

export async function encryptShortHex(plaintext, passphrase, iterations = 1) {
  const salt = crypto.getRandomValues(new Uint8Array(8));
  const { key, iv } = await deriveKeyAndIv(passphrase, salt, iterations);

  const padded = pkcs7Pad(te.encode(plaintext), 16);

  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["encrypt"]);
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, cryptoKey, padded);
  const ct = new Uint8Array(ctBuf);

  const header = te.encode("Salted__"); // 8 bytes
  const out = new Uint8Array(header.length + salt.length + ct.length);
  out.set(header, 0);
  out.set(salt, 8);
  out.set(ct, 16);

  return toHex(out); // lowercase hex, like the site
}

export async function decryptShortHex(opensslHex, passphrase, iterations = 1) {
  const blob = fromHex(opensslHex);
  if (blob.length < 16) throw new Error("Too short");

  const header = td.decode(blob.slice(0, 8));
  if (header !== "Salted__") throw new Error("Missing Salted__");

  const salt = blob.slice(8, 16);
  const ct = blob.slice(16);

  const { key, iv } = await deriveKeyAndIv(passphrase, salt, iterations);

  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"]);
  const ptPaddedBuf = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, ct);
  const pt = pkcs7Unpad(new Uint8Array(ptPaddedBuf));

  return td.decode(pt);
}
