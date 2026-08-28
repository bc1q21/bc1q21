/**
* Bitcoin Price Management Module
* Handles all price fetching and conversion logic
*/
class PriceManager {
    constructor() {
        this.currentPrice = null;
        this.priceAsOf = null;
        this.priceCached = false;
        this.priceStale = false;
        this.priceSource = null;
        this.priceEndpoint = '/bitcoin/price-usd';
        this.loadingPrice = false;
    }

    async loadPrice({ silent = false } = {}) {
        try {
            this.loadingPrice = true;

            const resp = await fetch(this.priceEndpoint, { cache: 'no-store' });
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }

            const data = await resp.json();

            if (
                typeof data.btc_usd !== 'number' ||
                !Number.isFinite(data.btc_usd) ||
                data.btc_usd <= 0
            ) {
                throw new Error('Invalid BTC/USD price');
            }

            this.currentPrice = data.btc_usd;
            this.priceAsOf = data.fetched_at || null;
            this.priceCached = !!data.cached;
            this.priceStale = !!data.stale;
            this.priceSource = data.source || null;

            return {
                success: true,
                price: this.currentPrice,
                stale: this.priceStale
            };
        } catch (error) {
            this.currentPrice = null;
            this.priceAsOf = null;
            this.priceCached = false;
            this.priceStale = false;
            this.priceSource = null;

            if (!silent) {
                console.error('Price loading failed:', error);
            }

            return {
                success: false,
                price: null,
                error: error.message
            };
        } finally {
            this.loadingPrice = false;
        }
    } 
    convertBtcToUsd(btcAmount) {
        if (!this.currentPrice || !btcAmount) return 0;
        return Number((btcAmount * this.currentPrice).toFixed(2));
    }
    
    convertUsdToBtc(usdAmount) {
        if (!this.currentPrice || !usdAmount) return 0;
        return Number((usdAmount / this.currentPrice).toFixed(8));
    }
    
    formatUSD(amount) {
        return '$' + (amount ?? 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    formatAsOf(iso) {
        return iso ? new Date(iso).toLocaleString() : '';
    }
}
