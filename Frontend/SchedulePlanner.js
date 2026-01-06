/**
* Schedule Planning Module
* Handles all gift scheduling and amount calculation logic
*/
class SchedulePlanner {
    constructor(priceManager) {
        this.priceManager = priceManager;
    }
    
    /**
    * Generate date sequence based on start date, count, and period type
    */
    generateDateSequence(startDate, count, periodType) {
        const dates = [];
        const start = new Date(startDate + 'T00:00:00');
        
        for (let i = 0; i < count; i++) {
            const date = new Date(start);
            if (periodType === 'monthly') {
                date.setMonth(start.getMonth() + i);
            } else {
                date.setFullYear(start.getFullYear() + i);
            }
            dates.push(date.toISOString().slice(0, 10));
        }
        return dates;
    }
    
    
    /**
    * Create equal BTC amount schedule
    */
    createEqualBtcSchedule(totalBtc, startDate, count, periodType) {
        const dates = this.generateDateSequence(startDate, count, periodType);
        const btcPerPayment = totalBtc / count;
        
        return dates.map((date, index) => {
            return {
                date,
                btc: btcPerPayment,
                usd: btcPerPayment * this.priceManager.currentPrice
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
    * Parse manual schedule input
    */
    parseManualSchedule(manualScheduleText) {
        const lines = manualScheduleText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
        
        const schedule = [];
        for (const line of lines) {
            const [dateStr, btcStr] = line.split(',').map(part => part.trim());
            const btc = Number(btcStr);
            
            if (dateStr && !isNaN(btc) && btc > 0) {
                schedule.push({
                    date: dateStr,
                    btc,
                    price: this.priceManager.currentPrice,
                    usd: btc * this.priceManager.currentPrice
                });
            }
        }
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
}