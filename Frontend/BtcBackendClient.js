/**

Bitcoin Backend Bridge

Talks to bc1q21 backend: UTXO lookups + raw tx broadcast
*/


class BtcBackendClient {
    constructor({
        baseUrl = '',
        utxoPath = '/bitcoin/address/{address}/utxo',
        broadcastPath = '/bitcoin/sendrawtransaction',
        fetchOptions = {}
    } = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.utxoPath = utxoPath;
        this.broadcastPath = broadcastPath;
        this.fetchOptions = fetchOptions; // e.g., headers, credentials if needed
        this.loading = false;
    }
    
    _join(path) {
        return path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    }
    
    _fmtBtcFromSats(sats) {
        return Number((Number(sats || 0) / 1e8).toFixed(8));
    }
    
    /**
    * GET list of UTXOs for a bech32/base58 address
    * Returns { utxos, totals, confirmed, unconfirmed }
    */
    async fetchUtxos(address) {
        if (!address) throw new Error('Address required');
        try {
            this.loading = true;
            const url = this._join(
                this.utxoPath.replace('{address}', encodeURIComponent(address))
            );
            const resp = await fetch(url, {
                cache: 'no-store',
                ...this.fetchOptions
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const utxos = await resp.json();
            
            // Expected shape: [{ txid, vout, status:{confirmed, block_height, ...}, value }]
            const confirmed = utxos.filter(u => u?.status?.confirmed);
            const unconfirmed = utxos.filter(u => !u?.status?.confirmed);
            
            const sum = arr => arr.reduce((t, u) => t + (Number(u?.value) || 0), 0);
            const totals = {
                satsTotal: sum(utxos),
                btcTotal: this._fmtBtcFromSats(sum(utxos)),
                satsConfirmed: sum(confirmed),
                btcConfirmed: this._fmtBtcFromSats(sum(confirmed)),
                satsUnconfirmed: sum(unconfirmed),
                btcUnconfirmed: this._fmtBtcFromSats(sum(unconfirmed)),
                count: utxos.length,
                countConfirmed: confirmed.length,
                countUnconfirmed: unconfirmed.length
            };
            
            return { success: true, utxos, confirmed, unconfirmed, totals };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            this.loading = false;
        }
    }
    
    /**
    * POST a raw transaction hex to the backend
    * Returns { txid } on success or { error } on failure
    */
    async broadcastRawTx(hex) {
        if (!hex || typeof hex !== 'string') {
            return { success: false, error: 'Missing raw transaction hex' };
        }
        try {
            this.loading = true;
            const url = this._join(this.broadcastPath);
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(this.fetchOptions.headers || {}) },
                body: JSON.stringify({ hex }),
                ...this.fetchOptions
            });
            const data = await resp.json().catch(() => ({}));
            
            if (!resp.ok) {
                // Try to surface backend message
                //return { success: false, error: data?.error || `HTTP ${resp.status}` };  //EBORJA remove comment
            }
            
            if (data?.txid) return { success: true, txid: data.txid };
            if (data?.error) return { success: false, error: data.error };
            
            return { success: false, error: 'Unknown broadcast response' };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            this.loading = false;
        }
    }
}