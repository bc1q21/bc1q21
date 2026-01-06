// ============================================================================
// TRANSACTION MANAGER MODULE (scure-btc-signer)
// ============================================================================
//
// Assumes:
//  - utxos: [{ txid, vout, value, scriptPubKey }, ...]
//      txid: hex string (big-endian, typical block explorer txid) :contentReference[oaicite:4]{index=4}
//      vout: number
//      value: sats (number)
//      scriptPubKey: hex string (REQUIRED for segwit signing via witnessUtxo)
//  - outputs: [{ address, value }, ...] value in sats (number)
//  - wif: WIF private key for all inputs
//  - opReturnHex (optional): hex data to embed in OP_RETURN (no value)

class TransactionManager {
  static getBtc() {
    // You decide how you expose it in the browser bundle:
    // window.btcSigner = btc; OR window.btc = btc;
    const btc = window.btcSigner || window.btc;
    if (!btc) throw new Error('scure-btc-signer is not available on window (window.btcSigner/window.btc)');
    if (!btc.Transaction || !btc.WIF || !btc.Script) {
      throw new Error('scure-btc-signer is present but missing expected exports (Transaction/WIF/Script)');
    }
    return btc;
  }

  static hexToBytes(hex) {
    if (typeof hex !== 'string') throw new Error('hexToBytes expects a string');
    const h = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (h.length % 2 !== 0) throw new Error('Invalid hex length');
    const out = new Uint8Array(h.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    return out;
  }

    static buildOpReturnScript(dataBytes) {
    const len = dataBytes.length;

    // Standard pushes:
    // 0..75       => [len]
    // 76..255     => OP_PUSHDATA1 (0x4c) [len]
    // 256..65535  => OP_PUSHDATA2 (0x4d) [lenLE16]
    if (len <= 75) {
        const out = new Uint8Array(1 + 1 + len);
        out[0] = 0x6a;       // OP_RETURN
        out[1] = len;        // push len
        out.set(dataBytes, 2);
        return out;
    } else if (len <= 255) {
        const out = new Uint8Array(1 + 2 + len);
        out[0] = 0x6a;       // OP_RETURN
        out[1] = 0x4c;       // OP_PUSHDATA1
        out[2] = len;
        out.set(dataBytes, 3);
        return out;
    } else if (len <= 65535) {
        const out = new Uint8Array(1 + 3 + len);
        out[0] = 0x6a;       // OP_RETURN
        out[1] = 0x4d;       // OP_PUSHDATA2
        out[2] = len & 0xff;
        out[3] = (len >> 8) & 0xff;
        out.set(dataBytes, 4);
        return out;
    }

    throw new Error(`OP_RETURN too large: ${len} bytes`);
    }

  static buildAndSignDistribution({ utxos, outputs, wif, opReturnHex }) {
    const btc = this.getBtc();

    if (!Array.isArray(utxos) || utxos.length === 0) {
      throw new Error('No UTXOs provided for distribution transaction');
    }
    if (!Array.isArray(outputs) || outputs.length === 0) {
      throw new Error('No outputs provided for distribution transaction');
    }
    if (!wif) {
      throw new Error('Missing WIF for signing distribution transaction');
    }

    // Validate UTXOs
    for (const u of utxos) {
      if (!u.txid || typeof u.vout === 'undefined') throw new Error('UTXO missing txid or vout');
      if (typeof u.value === 'undefined') throw new Error('UTXO missing value (sats)');
      // Strongly recommended for segwit signing (witnessUtxo.script)
      if (!u.scriptPubKey) {
        throw new Error('UTXO missing scriptPubKey (required for SegWit witnessUtxo signing)');
      }
    }

    // Compute totals
    const inputTotal = utxos.reduce((sum, u) => sum + (Number(u.value) || 0), 0);
    const outputTotal = outputs.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
    const feeSats = Math.max(0, inputTotal - outputTotal);

    if (outputTotal > inputTotal) {
      throw new Error(`Outputs (${outputTotal} sats) exceed inputs (${inputTotal} sats)`);
    }

    // Decode WIF -> 32-byte privkey
    // Note: scure-btc-signer WIF supports compressed keys (current behavior). :contentReference[oaicite:5]{index=5}
    const privKey = btc.WIF().decode(wif);

    const tx = new btc.Transaction({ allowUnknownOutputs: true });


    // Add inputs (SegWit P2WPKH-style witnessUtxo)
    // txid is passed as bytes (big-endian txid as commonly shown in explorers). :contentReference[oaicite:6]{index=6}
    // witnessUtxo requires { amount: bigint, script: Bytes }. :contentReference[oaicite:7]{index=7}
    for (const u of utxos) {
      tx.addInput({
        txid: this.hexToBytes(u.txid),
        index: Number(u.vout),
        witnessUtxo: {
          amount: BigInt(Math.trunc(Number(u.value) || 0)),
          script: this.hexToBytes(u.scriptPubKey),
        },
      });
    }

    // Add normal outputs (amounts are bigint sats, NOT BTC strings). :contentReference[oaicite:8]{index=8}
    for (const o of outputs) {
      const valueSats = Math.trunc(Number(o.value) || 0);
      if (!o.address || valueSats <= 0) throw new Error(`Invalid output: ${JSON.stringify(o)}`);
      tx.addOutputAddress(o.address, BigInt(valueSats)); // defaults to mainnet NETWORK :contentReference[oaicite:9]{index=9}
    }

    // Optional OP_RETURN (0 sats, script only)
    if (opReturnHex) {
    const data = this.hexToBytes(opReturnHex);
    const script = this.buildOpReturnScript(data);
    tx.addOutput({ script, amount: 0n });
    }

    // Sign + finalize. :contentReference[oaicite:11]{index=11}
    tx.sign(privKey);
    tx.finalize();

    return {
      hex: tx.hex,
      summary: {
        inputTotal,
        outputTotal,
        feeSats,
        txid: tx.id,
      },
    };
  }

  // Build and sign a release transaction spending matured CLTV P2SH outputs to a single destination.
  static buildAndSignRelease({ utxos, outputs, wif, locktime }) {
    const btc = this.getBtc();

    if (!Array.isArray(utxos) || !utxos.length) throw new Error('No UTXOs provided for release transaction');
    if (!Array.isArray(outputs) || !outputs.length) throw new Error('No outputs provided for release transaction');
    if (!wif) throw new Error('Missing WIF for signing release transaction');

    for (const u of utxos) {
      if (!u.txid || typeof u.vout === 'undefined') throw new Error('UTXO missing txid or vout');
      if (typeof u.value === 'undefined') throw new Error('UTXO missing value (sats)');
      if (!u.scriptPubKey) throw new Error('UTXO missing scriptPubKey');
      if (!u.redeemScript) throw new Error('UTXO missing redeemScript for CLTV spend');
    }

    const inputTotal = utxos.reduce((sum, u) => sum + (Number(u.value) || 0), 0);
    const outputTotal = outputs.reduce((sum, o) => sum + (Number(o.value) || 0), 0);
    if (outputTotal > inputTotal) throw new Error(`Outputs (${outputTotal}) exceed inputs (${inputTotal})`);

    const txLocktime = typeof locktime === 'number'
      ? locktime
      : utxos.reduce((m, u) => Math.max(m, Number(u.locktime) || 0), 0);

    const privKey = btc.WIF().decode(wif);
    const tx = new btc.Transaction({
      allowUnknownOutputs: true,
      allowUnknownInputs: true,
      allowLegacyWitnessUtxo: true,
      lockTime: txLocktime || 0
    });

    for (const u of utxos) {
      tx.addInput({
        txid: this.hexToBytes(u.txid),
        index: Number(u.vout),
        sequence: typeof u.sequence === 'number' ? u.sequence : 0xfffffffe,
        // Prefer nonWitnessUtxo for legacy P2SH; fallback to witnessUtxo with allowLegacyWitnessUtxo
        nonWitnessUtxo: u.nonWitnessUtxo ? this.hexToBytes(u.nonWitnessUtxo) : undefined,
        witnessUtxo: u.nonWitnessUtxo ? undefined : {
          amount: BigInt(Math.trunc(Number(u.value) || 0)),
          script: this.hexToBytes(u.scriptPubKey),
        },
        redeemScript: this.hexToBytes(u.redeemScript),
      });
    }

    for (const o of outputs) {
      const valueSats = Math.trunc(Number(o.value) || 0);
      if (!o.address || valueSats <= 0) throw new Error(`Invalid output: ${JSON.stringify(o)}`);
      tx.addOutputAddress(o.address, BigInt(valueSats));
    }
    console.log("buildAndSignRelease tx",tx);
    tx.sign(privKey);
    tx.finalize();

    return {
      hex: tx.hex,
      summary: {
        inputTotal,
        outputTotal,
        feeSats: inputTotal - outputTotal,
        txid: tx.id,
        vsize: tx.vsize
      },
    };
  }
}
