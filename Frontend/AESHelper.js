// AESHelper.js
//
// bc1q21 encrypted release-date formats:
//
// Legacy:
//   "Salted__" (8 bytes) + salt (8 bytes) + AES-CBC ciphertext
//   PBKDF2-SHA256, 1 iteration.
//   Retained ONLY so existing gifts remain recoverable.
//
// Current:
//   "BC1Q21G1" (8 bytes) + salt (16 bytes) + IV (12 bytes)
//   + AES-GCM ciphertext/authentication tag.
//   PBKDF2-SHA256 with 100,000 iterations.
//
// Both formats are encoded as lowercase hex.

const te = new TextEncoder();
const td = new TextDecoder();

const LEGACY_HEADER = "Salted__";
const CURRENT_HEADER = "BC1Q21G1";
const CURRENT_ITERATIONS = 100000;

function toHex(u8) {
  let s = "";
  for (let i = 0; i < u8.length; i++) {
    s += u8[i].toString(16).padStart(2, "0");
  }
  return s;
}

function fromHex(hex) {
  if (typeof hex !== "string" || hex.length % 2) {
    throw new Error("Invalid hex");
  }

  const u8 = new Uint8Array(hex.length / 2);

  for (let i = 0; i < u8.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error("Invalid hex");
    u8[i] = byte;
  }

  return u8;
}

function pkcs7Unpad(data) {
  if (data.length === 0) throw new Error("Bad padding");

  const padLen = data[data.length - 1];

  if (padLen < 1 || padLen > 16 || padLen > data.length) {
    throw new Error("Bad padding");
  }

  for (let i = data.length - padLen; i < data.length; i++) {
    if (data[i] !== padLen) throw new Error("Bad padding");
  }

  return data.slice(0, data.length - padLen);
}

async function deriveLegacyKeyAndIv(
  passphrase,
  salt8,
  iterations = 1,
  keyBytes = 32,
  ivBytes = 16
) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    te.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt8,
      iterations
    },
    baseKey,
    (keyBytes + ivBytes) * 8
  );

  const all = new Uint8Array(bits);

  return {
    key: all.slice(0, keyBytes),
    iv: all.slice(keyBytes, keyBytes + ivBytes)
  };
}

async function deriveCurrentKey(passphrase, salt16) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    te.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt16,
      iterations: CURRENT_ITERATIONS
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decryptLegacyHex(blob, passphrase, iterations = 1) {
  if (blob.length < 16) throw new Error("Too short");

  const header = td.decode(blob.slice(0, 8));

  if (header !== LEGACY_HEADER) {
    throw new Error("Missing Salted__");
  }

  const salt = blob.slice(8, 16);
  const ct = blob.slice(16);

  const { key, iv } = await deriveLegacyKeyAndIv(
    passphrase,
    salt,
    iterations
  );

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  const ptPaddedBuf = await crypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv
    },
    cryptoKey,
    ct
  );

  const pt = pkcs7Unpad(new Uint8Array(ptPaddedBuf));

  return td.decode(pt);
}

export async function encryptShortHex(plaintext, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await deriveCurrentKey(passphrase, salt);

  const ctBuf = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: te.encode(CURRENT_HEADER),
      tagLength: 128
    },
    cryptoKey,
    te.encode(plaintext)
  );

  const ct = new Uint8Array(ctBuf);
  const header = te.encode(CURRENT_HEADER);

  const out = new Uint8Array(
    header.length + salt.length + iv.length + ct.length
  );

  out.set(header, 0);
  out.set(salt, header.length);
  out.set(iv, header.length + salt.length);
  out.set(ct, header.length + salt.length + iv.length);

  return toHex(out);
}

export async function decryptShortHex(
  encryptedHex,
  legacyPassphrase,
  currentPassphrase = legacyPassphrase
) {
  const blob = fromHex(encryptedHex);

  if (blob.length < 8) throw new Error("Too short");

  const header = td.decode(blob.slice(0, 8));

  // Backward compatibility for every gift created with the legacy format.
  if (header === LEGACY_HEADER) {
    return decryptLegacyHex(blob, legacyPassphrase, 1);
  }

  if (header !== CURRENT_HEADER) {
    throw new Error("Unknown encrypted data format");
  }

  const minimumLength = 8 + 16 + 12 + 16;

  if (blob.length < minimumLength) {
    throw new Error("Encrypted data too short");
  }

  const salt = blob.slice(8, 24);
  const iv = blob.slice(24, 36);
  const ct = blob.slice(36);

  const cryptoKey = await deriveCurrentKey(currentPassphrase, salt);

  const ptBuf = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: te.encode(CURRENT_HEADER),
      tagLength: 128
    },
    cryptoKey,
    ct
  );

  return td.decode(new Uint8Array(ptBuf));
}
