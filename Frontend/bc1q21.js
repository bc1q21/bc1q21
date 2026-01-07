// ====
// BC1Q21 BITCOIN GIFT WIZARD - REFACTORED FOR TRANSPARENCY & MAINTAINABILITY
// ====
// This file separates business logic from HTML rendering for better code auditing
// All cryptographic operations are clearly isolated and documented
// No private keys or sensitive data leave the browser
// ====


// ---- Step Help Video Links (easy to edit in one place) ----
const HELP_VIDEOS = {
    // Per-step links
    start: 'https://youtu.be/1RJarLZ9Ol0',
    welcome: 'https://youtu.be/bEgwt-rQo1g',
    gift_type: 'https://youtu.be/k5VFMU5UfZs',
    one_time_claim_date: 'https://youtu.be/QVOl9JIbS1s',
    schedule_duration: 'https://youtu.be/QBcEHQck2NE',
    equal_payouts: 'https://youtu.be/S4vWG-cdQVY',
    prefilled_equal_table: 'https://youtu.be/VmKv92i279k',
    schedule_or_manual: 'https://youtu.be/zkMnEv0PjLY',
    btc_value_projection: 'https://youtu.be/jfsRDUc5sT0',
    projected_table: 'https://youtu.be/KKvNp9wArPA',
    manual_entry: 'https://youtu.be/tgCVSQb9W-U',
    finish_schedule: 'https://youtu.be/zS2yiO69ZBw',
    recovery_words: 'https://youtu.be/nmLwOlxFFhI',
    add_funds: 'https://youtu.be/Fb0rmrw0zak',
    finish_share: 'https://youtu.be/your-finish-share-video',
    
    // Optional fallbacks per group (used when a step isn’t listed above)
    group_1: 'https://youtu.be/your-plan-overview',
    group_2: 'https://youtu.be/your-recovery-overview',
    group_3: 'https://youtu.be/your-add-funds-overview',
    group_4: 'https://youtu.be/your-finish-overview',
    
    // Last-resort default
    default: 'https://youtu.be/your-default-help'
};

const SERVICE_FEE_ADDRESS = 'bc1qvqajk78h2tqvajyzy8ffgd3p7a693gem9gvk2x';

// expose globally
window.TransactionManager = TransactionManager;


// ====
// ALPINE.JS STORE INITIALIZATION
// ====
document.addEventListener('alpine:init', () => {
    Alpine.store('planStore', {
        rows: [],
        cltv: [],
        fundingAddress: '',
        giftId: null,
        fundingTxid: null,
        distributionTxid: null
    });
});

// ====
// MAIN GIFT WIZARD COMPONENT (ALPINE.JS)
// ====
function giftWizard() {
    return {
        // ====
        // COMPONENT INITIALIZATION
        // ====
        
        // Core managers
        priceManager: null,
        schedulePlanner: null,
        navigationManager: null,
        cryptoManager: null,
        uiRenderer: null,
        backendClient: null,
        backendBaseUrl: '',
        
        // Form state
        disclaimerAccepted: false,
        btcAmount: null,
        usdAmount: null,
        serviceFee: null,
        networkFee: null,
        serviceFeeUsd: null,
        networkFeeUsd: null,
        totalGiftWithFees: null,
        totalGiftWithFeesUsd: null,
        amountUnit: 'BTC',
        giftType: '',
        claimDate: '',
        periodCount: null,
        periodType: 'monthly',
        firstPayment: '',
        equal: null,
        growthPct: 0,
        manualSchedule: '',
        userKey: '',
        amountStrategy: null,
        
        // Computed state
        scheduleRows: [],
        cltvAddresses: [],
        targetFiatPerPayout: 0,
        isGeneratingAddresses: false,
        giftCardPdfUrl: '',
        giftCardPdfRecipient: '',
        
        
        // Deposit monitoring and pipeline state
        depositDetected: false,
        depositConfirmed: false,
        depositStage: 'waiting', // waiting | insufficient | ready | processing | done | error
        depositTotals: {
            neededBtc: 0,
            totalBtc: 0,
            confirmedBtc: 0,
            remainingBtc: 0,
            excessBtc: 0
        },
        depositError: '',
        utxoResult: null,
        checkingDeposit: false,
        depositPollingActive: false,
        nextDepositCheckIn: 30,
        depositCheckIntervalId: null,
        depositCountdownIntervalId: null,
        pipelineStarted: false,
        
        distributionHex: '',
        distributionPosted: false,
        distributionPosting: false,
        
        
        async init() {
            // Initialize core managers
            this.priceManager = new PriceManager();
            this.schedulePlanner = new SchedulePlanner(this.priceManager);
            this.navigationManager = new NavigationManager(this);
            this.cryptoManager = new CryptoManager();
            this.uiRenderer = new UIRenderer();
            const backendBaseUrl = this.resolveBackendBaseUrl();
            this.backendBaseUrl = backendBaseUrl;
            this.backendClient = new BtcBackendClient({
                baseUrl: backendBaseUrl
            });
            
            // Load initial Bitcoin price
            await this.priceManager.loadPrice({ silent: true });
        },
        
        // Pick backend URL based on where the UI is served from
        resolveBackendBaseUrl() {
            const host = window.location.hostname;
            if (host === 'localhost' || host === '127.0.0.1') {
                return 'http://localhost/';
            }
            if (window.location.origin && window.location.origin.startsWith('http')) {
                return `${window.location.origin}/`;
            }
            return 'https://www.bc1q21.com/';
        },
        
        recipientPageUrl() {
            const base = (this.backendBaseUrl || '').replace(/\/$/, '');
            const addr = this.cryptoManager?.fundingAddress || Alpine.store('planStore')?.fundingAddress || '';
            if (!base || !addr) return '';
            return `${base}/app/gift/?address=${encodeURIComponent(addr)}`;
        },
        
        renderRecipientQr() {
            const el = this.$refs?.recipientQr;
            const url = this.recipientPageUrl();
            if (!el) return;
            el.innerHTML = '';
            if (!url || !window.QRCode) return;
            new QRCode(el, { text: url, width: 200, height: 200 });
        },

        ensureGiftCardPdf() {
            if (this.navigationState.stepGroup !== 4) return;
            const recipientUrl = this.recipientPageUrl();
            if (!recipientUrl) return;
            if (this.giftCardPdfRecipient === recipientUrl && this.giftCardPdfUrl) return;
            const base = (this.backendBaseUrl || window.location.origin || '').replace(/\/$/, '');
            this.giftCardPdfUrl = `${base}/bitcoin/giftcard.pdf?recipientUrl=${encodeURIComponent(recipientUrl)}`;
            this.giftCardPdfRecipient = recipientUrl;
        },
        
        // ====
        // NAVIGATION METHODS
        // ====
        
        get navigationState() {
            return {
                currentStep: this.navigationManager.currentStep,
                stepGroup: this.navigationManager.stepGroup,
                stepHistory: this.navigationManager.stepHistory,
                completedSteps: this.navigationManager.completedSteps
            };
        },
        
        navigateToStep(stepName) {
            console.log("giftWizard navigateToStep",stepName);
            return this.navigationManager.navigateToStep(stepName);
        },
        
        navigateForward() {
            console.log("giftWizard navigateForward");
            return this.navigationManager.navigateForward(this);
        },
        
        navigateBack() {
            return this.navigationManager.navigateBack();
        },
        
        canGoBack() {
            return this.navigationManager.canGoBack();
        },
        
        canContinue() {
            return this.navigationManager.canContinue(this);
        },
        
        getContinueText() {
            return this.navigationManager.stepGroup < 4 ? 'Continue' : 'Finish';
        },
        
        // ====
        // AMOUNT & UNIT CONVERSION METHODS
        // ====
        
        setUnit(unit) {
            this.amountUnit = unit;
            if (unit === 'BTC') {
                this.updateFromUSD();
            } else {
                this.updateFromBTC();
            }
        },
        
        updateFromBTC() {
            this.usdAmount = this.priceManager.convertBtcToUsd(this.btcAmount);
        },
        
        updateFromUSD() {
            this.btcAmount = this.priceManager.convertUsdToBtc(this.usdAmount);
        },
        
        formatUSD(amount) {
            return this.priceManager.formatUSD(amount);
        },
        
        // ====
        // SCHEDULE BUILDING METHODS
        // ====
        
        buildEqualTable() {
            console.log("buildEqualTable");
            this.scheduleRows = this.schedulePlanner.createEqualBtcSchedule(
                this.btcAmount,
                this.firstPayment,
                this.periodCount,
                this.periodType
            );
            Alpine.store('planStore').rows = this.scheduleRows;
        },
        
        buildEqualFiatTable() {
            this.scheduleRows = this.schedulePlanner.createEqualUsdSchedule(
                this.btcAmount,
                this.firstPayment,
                this.periodCount,
                this.periodType,
                this.growthPct
            );
            
            const totals = this.schedulePlanner.calculateScheduleTotals(this.scheduleRows);
            this.targetFiatPerPayout = totals.totalUsd / this.scheduleRows.length;
            Alpine.store('planStore').rows = this.scheduleRows;
        },
        
        prepopulateManualSchedule() {
            const dates = this.schedulePlanner.generateDateSequence(
                this.firstPayment,
                this.periodCount,
                this.periodType
            );
            const suggestedBtcPerDate = (this.btcAmount / this.periodCount).toFixed(8);
            this.manualSchedule = dates.map(date => `${date}, ${suggestedBtcPerDate}`).join('\n');
        },
        
        buildManualTable() {
            this.scheduleRows = this.schedulePlanner.parseManualSchedule(this.manualSchedule);
            Alpine.store('planStore').rows = this.scheduleRows;
        },
        
        finishOneTime() {
            this.periodCount = 1;
            this.periodType = 'monthly';
            this.firstPayment = this.claimDate;
            this.scheduleRows = [{
                date: this.claimDate,
                btc: Number(this.btcAmount),
                price: this.priceManager.currentPrice,
                usd: Number(this.btcAmount) * this.priceManager.currentPrice
            }];
            console.log(this.scheduleRows);
            Alpine.store('planStore').rows = this.scheduleRows;
        },
        
        // --- Deposit check (UTXOs) ---
        async checkDeposit(manual = false) {
            try {
                const addr = this.cryptoManager?.fundingAddress || Alpine.store('planStore')?.fundingAddress;
                if (!addr) {
                    this.depositStage = 'error';
                    this.depositError = 'No funding address yet.';
                    return;
                }
                
                Alpine.store('planStore').fundingAddress = addr;
                this.checkingDeposit = true;
                
                const res = await this.backendClient.fetchUtxos(addr);
                this.utxoResult = res;
                
                if (!res.success) {
                    this.depositStage = 'error';
                    this.depositError = res.error || 'Failed to check deposit.';
                    return;
                }
                
                const t = res.totals || {};
                const needed = Number(this.totalGiftWithFees || 0) || 0;
                const total = Number(t.btcTotal || 0);
                const confirmed = Number(t.btcConfirmed || 0);
                
                this.depositDetected = (t.count || 0) > 0;
                this.depositConfirmed = confirmed >= Math.max(0, needed - 1e-8);
                
                const remaining = Math.max(0, needed - total);
                const excess = Math.max(0, total - needed);
                
                this.depositTotals = {
                    neededBtc: needed,
                    totalBtc: total,
                    confirmedBtc: confirmed,
                    remainingBtc: remaining,
                    excessBtc: excess
                };
                
                if (!this.depositDetected) {
                    this.depositStage = 'waiting';
                } else if (total + 1e-8 < needed) {
                    this.depositStage = 'insufficient';
                } else {
                    // Deposit is enough or more
                    this.depositStage = 'ready';
                    // Stop further polling
                    this.depositPollingActive = false;
                    
                    // Start pipeline only once
                    if (!this.pipelineStarted) {
                        this.pipelineStarted = true;
                        this.startDistributionPipeline();
                    }
                }
                
                if (manual) {
                    this.nextDepositCheckIn = 30;
                }
            } catch (e) {
                this.depositStage = 'error';
                this.depositError = e.message || 'Failed to check deposit.';
            } finally {
                this.checkingDeposit = false;
            }
        },
        
        
        async startDistributionPipeline() {
            try {
                this.depositStage = 'processing';
                
                
                const utxos = (this.utxoResult && this.utxoResult.utxos) || [];
                if (!utxos.length) {
                    throw new Error('No UTXOs available to build the distribution transaction.');
                }
                
                const outputs = this.cltvAddresses.map((row) => ({
                    address: row.address,
                    value: Math.round(Number(row.btc || 0) * 1e8)
                }));
                
                const totalIn = utxos.reduce((acc, u) => acc + (Number(u.value) || 0), 0);
                const totalOutGifts = outputs.reduce((acc, o) => acc + (o.value || 0), 0);
                const fee = Number(this.networkFee || 0);
                const serviceFee = Number(this.serviceFee || 0);
                const change = totalIn - totalOutGifts - fee - serviceFee;
                
                if (change < 0) {
                    throw new Error('Deposit is not enough to cover gifts plus network fee.');
                }

                //service fee removed during testing
                outputs.push({
                    address: SERVICE_FEE_ADDRESS,
                    value: serviceFee
                });
                
                if (change > 546) { //dust limit
                    outputs.push({
                        address: this.cryptoManager.releaseAddress,
                        value: change
                    });
                }
                
                const wif = this.cryptoManager.wif;
                if (!window.TransactionManager || !window.TransactionManager.buildAndSignDistribution) {
                    throw new Error('TransactionManager.buildAndSignDistribution is not available.');
                }
                
                const firstTimestampBytes = new TextEncoder().encode(this.scheduleRows[0].date);

                // 2) Convert to hex (your current opReturn payload)
                const opReturnHex = this.cryptoManager?.bytesToHex(firstTimestampBytes);

                // 3) Encrypt it (async)
                const passphrase = this.cryptoManager.aesKeyAddress; // or wherever you store it
                const encryptedOpReturnHex = await window.encryptShortHex(opReturnHex, passphrase, 1);

                // 4) Build SPK and sign as before
                const spk = this.cryptoManager.buildP2WPKHScriptPubKeyFromPubkeyHex(
                this.cryptoManager.fundingPubkeyHex
                );

                const utxosForSigning = utxos.map(u => ({
                ...u,
                scriptPubKey: u.scriptPubKey || spk
                }));

                const result = await window.TransactionManager.buildAndSignDistribution({
                utxos: utxosForSigning,
                outputs,
                wif,
                opReturnHex: encryptedOpReturnHex
                });

                console.log("startDistributionPipeline result", result);
                
                if (!result || !result.hex) {
                    throw new Error('Failed to build signed distribution transaction.');
                }
                
                this.distributionHex = result.hex;
                
                // 3. Send signed hex to backend (backend will broadcast at the right time)
                this.distributionPosting = true;
                const broadcastRes = await this.backendClient.broadcastRawTx(this.distributionHex);
                
                if (!broadcastRes.success) {
                    throw new Error(broadcastRes.error || 'Backend rejected the transaction.');
                }
                
                if (broadcastRes.txid) {
                    Alpine.store('planStore').distributionTxid = broadcastRes.txid;
                }
                
                this.distributionPosted = true;
                this.depositStage = 'done';
            } catch (e) {
                console.error('startDistributionPipeline error', e);
                this.depositStage = 'error';
                this.depositError = e.message || 'Unexpected error while preparing your gift transaction.';
            } finally {
                this.distributionPosting = false;
            }
        },
        
        // ====
        // CALCULATION METHODS
        // ====
        
        totalBTC() {
            const totals = this.schedulePlanner.calculateScheduleTotals(this.scheduleRows);
            return totals.totalBtc;
        },
        
        totalUSD() {
            const totals = this.schedulePlanner.calculateScheduleTotals(this.scheduleRows);
            return totals.totalUsd;
        },
        
        manualScheduleTotalBTC() {
            if (!this.manualSchedule) return 0;
            const schedule = this.schedulePlanner.parseManualSchedule(this.manualSchedule);
            const totals = this.schedulePlanner.calculateScheduleTotals(schedule);
            return totals.totalBtc;
        },
        
        manualScheduleTotalUSD() {
            return this.manualScheduleTotalBTC() * this.priceManager.currentPrice;
        },
        
        // ====
        // CRYPTOGRAPHIC METHODS
        // ====
        
        get masterKey() {
            return this.cryptoManager.masterKey;
        },
        
        async handleKeysNew() {
            const result = await this.cryptoManager.generateNewMnemonic();
            
            if (result.success) {
                this.uiRenderer.renderRecoveryWords(result.mnemonic, 'keyResult');
                return true;
            } else {
                this.uiRenderer.renderError(result.error, 'keyResult');
                return false;
            }
        },
        
        //will be used if we allow the user to import their seed phrase
        saveUserKey() {
            const result = this.cryptoManager.importMnemonic(this.userKey);
            
            if (result.success) {
                this.uiRenderer.renderSuccess('Using your recovery words.', 'keyResult');
                return true;
            } else {
                this.uiRenderer.renderError(result.error, 'keyResult');
                return false;
            }
        },
        
        async handleDeriveCltv() {
            console.log("handleDeriveCltv");
            this.isGeneratingAddresses = true;
            
            try {
                const result = await this.cryptoManager.generateCltvAddresses(this.scheduleRows);
                
                if (result.success) {
                    this.cltvAddresses = [...result.addresses];
                    console.log('result:', result.addresses);
                    console.log('Copied to Alpine cltvAddresses:', this.cltvAddresses);
                } else {
                    console.error('Generation failed:', result.error);
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                this.isGeneratingAddresses = false;
            }
        },
        
        handleDisplaySegwit() {
            console.log("handleDisplaySegwit this.cryptoManager", this.cryptoManager);
            console.log("handleDisplaySegwit this.cryptoManager.fundingAddress", this.cryptoManager.fundingAddress);
            const totalAmount = this.totalGiftWithFees;
            this.uiRenderer.renderFundingAddress(this.cryptoManager.fundingAddress, totalAmount, 'fundingAddress');
            return true;
            
        },
        
        // ====
        // FEE CALCULATION
        // ====
        
        onFinishScheduleEnter() {
            this.serviceFee = this.schedulePlanner.calculateServiceFee(this.scheduleRows.length);
            this.networkFee = this.schedulePlanner.estimateNetworkFees(this.scheduleRows.length);
            
            this.serviceFeeUsd = this.serviceFee * this.priceManager.currentPrice / 100000000; 
            this.networkFeeUsd = this.networkFee * this.priceManager.currentPrice / 100000000;
            
            this.totalGiftWithFees = Math.round(this.btcAmount * 100000000 + this.serviceFee + this.networkFee) / 100000000
            this.totalGiftWithFeesUsd = (this.btcAmount * 100000000 + this.serviceFee + this.networkFee) * this.priceManager.currentPrice / 100000000;
            
        },
        
        
        initAddFundsStep() {
            const needed = Number(this.totalGiftWithFees || 0) || 0;
            
            this.depositTotals = {
                neededBtc: needed,
                totalBtc: 0,
                confirmedBtc: 0,
                remainingBtc: needed,
                excessBtc: 0
            };
            
            this.depositDetected = false;
            this.depositConfirmed = false;
            this.depositError = '';
            this.depositStage = 'waiting';
            this.utxoResult = null;
            this.pipelineStarted = false;
            this.distributionHex = '';
            this.distributionPosted = false;
            this.distributionPosting = false;
            
            // Start or restart polling
            this.depositPollingActive = true;
            this.nextDepositCheckIn = 30;
            
            // 1. Derive time-locked addresses from schedule
            this.handleDeriveCltv();
            
            if (this.depositCountdownIntervalId) {
                clearInterval(this.depositCountdownIntervalId);
            }
            if (this.depositCheckIntervalId) {
                clearInterval(this.depositCheckIntervalId);
            }
            
            // Countdown every second
            this.depositCountdownIntervalId = setInterval(() => {
                if (!this.depositPollingActive) return;
                if (this.nextDepositCheckIn > 0) {
                    this.nextDepositCheckIn--;
                }
            }, 1000);
            
            // Trigger a check every 30 seconds
            this.depositCheckIntervalId = setInterval(() => {
                if (!this.depositPollingActive) return;
                this.checkDeposit(false);
                this.nextDepositCheckIn = 30;
            }, 30000);
            
            // Kick off an immediate initial check
            this.checkDeposit(false);
        },
        
        getHelpUrl() {
            const step = this.navigationManager.currentStep;
            return (
                HELP_VIDEOS[step] ||
                HELP_VIDEOS[`group_${this.navigationManager.stepGroup}`] ||
                HELP_VIDEOS.default ||
                ''
            );
        }
        
    };
}


