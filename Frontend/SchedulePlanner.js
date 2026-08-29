/**
* Schedule Planning Module
* Handles all gift scheduling and amount calculation logic
*/
class SchedulePlanner {
    constructor(priceManager) {
        this.priceManager = priceManager;
    }
        /**
    * Permanent bc1q21 release-date ceiling.
    * Kept below Bitcoin's absolute 2106 timestamp limit.
    */
    get maxReleaseDate() {
        return '2105-12-31';
    }

    /**
    * Validate a date in strict YYYY-MM-DD format and enforce
    * the permanent bc1q21 maximum release date.
    */
    isValidReleaseDate(dateStr) {
    if (typeof dateStr !== 'string') return false;

    const value = dateStr.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsed = new Date(value + 'T00:00:00Z');

    if (Number.isNaN(parsed.getTime())) {
        return false;
    }

    if (parsed.toISOString().slice(0, 10) !== value) {
        return false;
    }

    const now = new Date();
    const today =
        `${now.getFullYear()}-` +
        `${String(now.getMonth() + 1).padStart(2, '0')}-` +
        `${String(now.getDate()).padStart(2, '0')}`;

    return value >= today && value <= this.maxReleaseDate;
}
    
    /**
    * Generate date sequence based on start date, count, and period type.
    * Rejects any schedule that contains an invalid date or a release date
    * later than December 31, 2105.
    */
    generateDateSequence(startDate, count, periodType) {
    const dates = [];

    if (!this.isValidReleaseDate(startDate)) {
        return [];
    }

    const start = new Date(startDate + 'T00:00:00Z');
    for (let i = 0; i < count; i++) {
        const date = new Date(start);

       if (periodType === 'monthly') {
    const targetMonth = new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() + i,
        1
    ));

    const lastDayOfTargetMonth = new Date(Date.UTC(
        targetMonth.getUTCFullYear(),
        targetMonth.getUTCMonth() + 1,
        0
    )).getUTCDate();

    targetMonth.setUTCDate(
        Math.min(start.getUTCDate(), lastDayOfTargetMonth)
    );

    date.setTime(targetMonth.getTime());
} else {
    date.setUTCFullYear(start.getUTCFullYear() + i);
}

        const dateString = date.toISOString().slice(0, 10);

        if (!this.isValidReleaseDate(dateString)) {
            return [];
        }

        dates.push(dateString);
    }

    return dates;
}    
    
    /**
     * Create equal BTC amount schedule.
     * Divide in whole satoshis so the payment rows always add
     * exactly back to the original gift amount.
     */
    createEqualBtcSchedule(totalBtc, startDate, count, periodType) {
        const dates = this.generateDateSequence(startDate, count, periodType);

        if (!Array.isArray(dates) || dates.length === 0 || !Number.isInteger(count) || count <= 0) {
            return [];
        }

        const totalSats = Math.round(Number(totalBtc) * 1e8);

        if (!Number.isSafeInteger(totalSats) || totalSats <= 0) {
            return [];
        }

        const baseSats = Math.floor(totalSats / count);
        const remainderSats = totalSats - (baseSats * count);

        return dates.map((date, index) => {
            const sats = baseSats + (index === dates.length - 1 ? remainderSats : 0);
            const btc = sats / 1e8;

            return {
                date,
                btc,
                usd: btc * this.priceManager.currentPrice
            };
        });
    }    
    
    /**
    * Create equal USD value schedule (price-adjusted).
    * totalBtc: total BTC to distribute
    * startDate: Date or ISO string
    * count: number of payments
    * periodType: 'monthly' | 'yearly'
    * growthPct: average annual growth in percent (e.g., 8 for 8%)
    */
    createEqualUsdSchedule(totalBtc, startDate, count, periodType, growthPct) {
        const dates = this.generateDateSequence(startDate, count, periodType);
        const basePrice = Number(this.priceManager?.currentPrice) || 0;
        const g = Math.max(0, Number(growthPct) || 0) / 100; // clamp to >= 0
        const now = new Date();
        
        if (!Array.isArray(dates) || dates.length === 0 || totalBtc <= 0 || basePrice <= 0) {
            return [];
        }
        
        // Project price for each payment date from today's price
        const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
        const projectedPrices = dates.map(d => {
            const date = new Date(d);
            const yearsFromNow = Math.max(0, (date - now) / msPerYear);
            const factor = Math.pow(1 + g, yearsFromNow);
            return basePrice * factor;
        });
        
        // Solve U so that sum_i (U / price_i) = totalBtc  =>  U = totalBtc / sum_i (1/price_i)
        const denom = projectedPrices.reduce((acc, p) => acc + (p > 0 ? 1 / p : 0), 0);
        const targetUsdPerPayment = denom > 0 ? (totalBtc / denom) : 0;
        
        // Build rows, round BTC to 8 decimals, fix last row to make totals exact
        let usedBtc = 0;
        const rows = dates.map((date, index) => {
            const price = projectedPrices[index];
            const btcRaw = price > 0 ? (targetUsdPerPayment / price) : 0;
            
            // Round to 8 decimals, last row gets the remainder to hit totalBtc exactly
            let btc;
            if (index < dates.length - 1) {
                btc = Number(btcRaw.toFixed(8));
                usedBtc += btc;
            } else {
                btc = Number((totalBtc - usedBtc).toFixed(8));
                usedBtc += btc;
            }
            
            return {
                date,
                btc,
                price,
                // Keep the displayed USD constant per payment (estimation)
                usd: Number(targetUsdPerPayment.toFixed(2))
            };
        });
        
        return rows;
    }
    
    
    /**
    * Parse manual schedule input.
    * Every line must contain a valid YYYY-MM-DD release date
    * no later than December 31, 2105, followed by a positive BTC amount.
    */
    parseManualSchedule(manualScheduleText) {
        if (typeof manualScheduleText !== 'string') {
            return [];
        }

        const lines = manualScheduleText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const schedule = [];

        for (const line of lines) {
            const parts = line.split(',').map(part => part.trim());

            if (parts.length !== 2) {
                return [];
            }

            const [dateStr, btcStr] = parts;
            const btc = Number(btcStr);

            if (!this.isValidReleaseDate(dateStr) || !Number.isFinite(btc) || btc <= 0) {
                return [];
            }

            schedule.push({
                date: dateStr,
                btc,
                price: this.priceManager.currentPrice,
                usd: btc * this.priceManager.currentPrice
            });
        }

        schedule.sort((a, b) => a.date.localeCompare(b.date));
        return schedule;
    }
    /**
    * Calculate totals for a schedule
    */
    calculateScheduleTotals(schedule) {
        return {
            totalBtc: schedule.reduce((sum, row) => sum + (row.btc || 0), 0),
            totalUsd: schedule.reduce((sum, row) => sum + (row.usd || 0), 0)
        };
    }
    
    /**
    * Calculate service fees based on number of dates
    */
    calculateServiceFee(scheduleLength) {
        return 1000 + Math.max(0, scheduleLength - 1) * 250; // sats
    }
    
    /**
    * Estimate network fees
    */
    estimateNetworkFees(scheduleLength) {
        return 500 + (scheduleLength * 250); // sats
    }

    /**
    * Minimum-priority fee floor (~1 sat/vbyte) for fee-spike fallback
    */
    estimateNetworkFeesLowPriority(scheduleLength) {
        return 300 + (scheduleLength * 100); // sats
    }
}
