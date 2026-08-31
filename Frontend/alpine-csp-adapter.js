// Alpine CSP compatibility adapter for bc1q21.
// Registers the existing page components and keeps unsupported CSP expressions out of HTML.
document.addEventListener('alpine:init', () => {
    if (typeof giftWizard === 'function') {
        Alpine.data('giftWizard', () => {
            const component = giftWizard();

            component.progressStyle = function () {
                return 'width:' + (((this.navigationState.stepGroup - 1) / 3) * 100) + '%';
            };

            component.chooseOneTimeGift = function () {
                this.giftType = 'one';
                this.navigateToStep('one_time_claim_date');
            };

            component.chooseMultipleGift = function () {
                this.giftType = 'multiple';
                this.navigateToStep('schedule_duration');
            };

            component.chooseEqualPayouts = function () {
                this.equal = true;
                this.buildEqualTable();
                this.navigateToStep('prefilled_equal_table');
            };

            component.chooseVariablePayouts = function () {
                this.equal = false;
                this.navigateToStep('schedule_or_manual');
            };

            component.hasCurrentPrice = function () {
                return Boolean(this.priceManager && this.priceManager.currentPrice);
            };

            component.hasGrowthProjection = function () {
                return Number(this.growthPct) > 0;
            };

            component.formatCurrentBtcPrice = function () {
                const price = this.priceManager && this.priceManager.currentPrice;
                return Number(price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
            };

            component.formatProjectedBtcPrice = function (years) {
                const price = Number(this.priceManager && this.priceManager.currentPrice) || 0;
                const growth = Number(this.growthPct) || 0;
                return (price * Math.pow(1 + (growth / 100), years))
                    .toLocaleString(undefined, { maximumFractionDigits: 0 });
            };

            component.manualScheduleTotalsMatch = function () {
                return Math.abs(this.manualScheduleTotalBTC() - (this.btcAmount || 0)) < 0.00000001;
            };

            component.manualScheduleTotalClass = function () {
                return this.manualScheduleTotalsMatch() ? '' : 'accent';
            };

            component.resizeManualSchedule = function (element) {
                if (!element) return;
                requestAnimationFrame(() => {
                    element.style.height = 'auto';
                    element.style.height = element.scrollHeight + 'px';
                });
            };

            component.giftAmountBtcText = function () {
                return (Number(this.btcAmount) || 0).toFixed(8) + ' BTC';
            };

            component.giftAmountUsdText = function () {
                const price = Number(this.priceManager && this.priceManager.currentPrice) || 0;
                return this.formatUSD((Number(this.btcAmount) || 0) * price);
            };

            component.serviceFeeSatsText = function () {
                return (1000 + Math.max(0, this.scheduleRows.length - 1) * 250) + ' sats';
            };

            component.totalDepositBtcText = function () {
                return (Number(this.totalGiftWithFees) || 0).toFixed(8) + ' BTC';
            };

            return component;
        });
    }

    if (typeof recipientPage === 'function') {
        Alpine.data('recipientPage', () => {
            const component = recipientPage();

            component.mempoolAddressUrl = function (address) {
                return 'https://mempool.space/address/' + address;
            };

            return component;
        });
    }
});
