/**
* Navigation State Manager
* Handles wizard step navigation and validation
*/
class NavigationManager {
    constructor(owner) {
        this.owner = owner; 
        this.currentStep = 'welcome';
        this.stepGroup = 1;
        this.stepHistory = ['welcome'];
        this.completedSteps = new Set();
        this.stepData = {};
    }
    
    getStepConfig() {
        return {
            // Step Group 1: Plan
            'welcome': {
                group: 1,
                canGoBack: false,
                validate: (context) => context.disclaimerAccepted === true,
                getNextStep: () => 'start'
            },
            'start': {
                group: 1,
                canGoBack: true,
                validate: (context) => context.priceManager.currentPrice && Number(context.btcAmount) > 0,
                getNextStep: () => 'gift_type'
            },
            'gift_type': {
                group: 1,
                canGoBack: true,
                validate: () => false, // Uses branching buttons
                getNextStep: () => null
            },
            'one_time_claim_date': {
                group: 1,
                canGoBack: true,
                validate: (context) => !!context.claimDate,
                getNextStep: () => {
                    this.owner.finishOneTime();
                    return 'finish_schedule';
                }
            },
            'schedule_duration': {
                group: 1,
                canGoBack: true,
                validate: (context) => !!context.periodCount && !!context.periodType && !!context.firstPayment,
                getNextStep: () => 'equal_payouts'
            },
            'equal_payouts': {
                group: 1,
                canGoBack: true,
                validate: () => false, // Uses branching buttons
                getNextStep: () => null
            },
            'prefilled_equal_table': {
                group: 1,
                canGoBack: true,
                validate: () => true,
                getNextStep: () => 'finish_schedule'
            },
            'schedule_or_manual': {
                group: 1,
                canGoBack: true,
                validate: (context) => !!context.amountStrategy,
                getNextStep: (context) => {
                    if (context.amountStrategy === 'suggest')
                        {
                        return 'btc_value_projection';
                    }
                    else
                        {
                        this.owner.prepopulateManualSchedule();
                        return 'manual_entry';
                    }
                }
            },
            'btc_value_projection': {
                group: 1,
                canGoBack: true,
                validate: () => true, // Optional fields
                getNextStep: () => {
                    this.owner.buildEqualFiatTable();//I get an error here
                    return 'projected_table';
                }
            },
            'projected_table': {
                group: 1,
                canGoBack: true,
                validate: () => true,
                getNextStep: () => 'finish_schedule'
            },
            'manual_entry': {
                group: 1,
                canGoBack: true,
                validate: (context) => {
                    if (!context.manualSchedule?.trim()) return false;
                    const schedule = context.schedulePlanner.parseManualSchedule(context.manualSchedule);
                    const totals = context.schedulePlanner.calculateScheduleTotals(schedule);
                    const difference = Math.abs(totals.totalBtc - (context.btcAmount || 0));
                    return difference < 0.00001;
                },
                getNextStep: () => {
                    this.owner.buildManualTable(); 
                    return 'projected_table';
                }
            },
            'finish_schedule': {
                group: 1,
                canGoBack: true,
                validate: () => true,
                getNextStep: () => 'recovery_words'
            },
            // Step Group 2: Recovery Words
            'recovery_words': {
                group: 2,
                canGoBack: true,
                validate: (context) => !!context.cryptoManager.masterKey,
                getNextStep: () => {
                    this.owner.handleDisplaySegwit();
                    this.owner.initAddFundsStep();
                    return 'add_funds';
                }
            },
            // Step Group 3: Add Funds
            'add_funds': {
                group: 3,
                canGoBack: true,
                validate: () => true,
                getNextStep: () => 'finish_share'
            },
            // Step Group 4: Finish & Share
            'finish_share': {
                group: 4,
                canGoBack: false,
                validate: () => true,
                getNextStep: () => null
            }
        };
    }
    
    navigateToStep(stepName) {
        const stepConfig = this.getStepConfig();
        if (!stepConfig[stepName]) {
            console.error(`Unknown step: ${stepName}`);
            return false;
        }
        
        this.addStepToHistory(this.currentStep);
        this.currentStep = stepName;
        this.stepGroup = stepConfig[stepName].group;
        return true;
    }
    
    navigateForward(context) {
        const stepConfig = this.getStepConfig();
        const currentStepConfig = stepConfig[this.currentStep];
        
        if (!currentStepConfig) {
            console.error(`No config found for step: ${this.currentStep}`);
            return false;
        }
        
        if (!currentStepConfig.validate(context)) {
            console.log('Validation failed for current step');
            return false;
        }
        
        this.completedSteps.add(this.currentStep);
        const nextStep = typeof currentStepConfig.getNextStep === 'function'
        ? currentStepConfig.getNextStep(context)
        : currentStepConfig.getNextStep();
        
        if (!nextStep) {
            console.error('No next step defined');
            return false;
        }
        
        return this.navigateToStep(nextStep);
    }
    
    navigateBack() {
        if (!this.canGoBack()) return false;
        
        if (this.stepHistory.length >= 1) {
            const previousStep = this.stepHistory[this.stepHistory.length - 1];
            this.currentStep = previousStep;
            this.stepHistory.pop();
            
            const stepConfig = this.getStepConfig();
            if (stepConfig[previousStep]) {
                this.stepGroup = stepConfig[previousStep].group;
            }
            return true;
        }
        return false;
    }
    
    addStepToHistory(step) {
        if (step && this.stepHistory[this.stepHistory.length - 1] !== step) {
            this.stepHistory.push(step);
        }
    }
    
    canGoBack() {
        const stepConfig = this.getStepConfig();
        const currentStepConfig = stepConfig[this.currentStep];
        return currentStepConfig && currentStepConfig.canGoBack && this.stepHistory.length >= 1;
    }
    
    canContinue(context) {
        const stepConfig = this.getStepConfig();
        const currentStepConfig = stepConfig[this.currentStep];
        return currentStepConfig && currentStepConfig.validate(context);
    }
    
    reset() {
        this.currentStep = 'welcome';
        this.stepGroup = 1;
        this.stepHistory = ['welcome'];
        this.completedSteps = new Set();
        this.stepData = {};
    }
}
