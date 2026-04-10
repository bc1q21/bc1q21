// =============================================================================
// bc1q21 – Client-editable content configuration
// =============================================================================
// This file is intentionally excluded from SRI (Subresource Integrity) checks
// so the client can update it freely without recomputing cryptographic hashes.
//
// SAFE TO EDIT: video URLs, gift page help URL.
//
// DO NOT move cryptographic logic, addresses, fee settings, or key-derivation
// parameters here. Those belong in the SRI-protected .js files.
// =============================================================================

window.BC1Q21_CONFIG = {

    // -------------------------------------------------------------------------
    // Help video URLs – one per wizard step and one for the gift recipient page.
    // Update these whenever new tutorial videos are published.
    // -------------------------------------------------------------------------
    helpVideos: {
        // Per-step links (key = navigationState.currentStep value)
        start:                 'https://youtu.be/1RJarLZ9Ol0',
        welcome:               'https://youtu.be/78kwx8sf-hM',
        gift_type:             'https://youtu.be/k5VFMU5UfZs',
        one_time_claim_date:   'https://youtu.be/QVOl9JIbS1s',
        schedule_duration:     'https://youtu.be/QBcEHQck2NE',
        equal_payouts:         'https://youtu.be/S4vWG-cdQVY',
        prefilled_equal_table: 'https://youtu.be/VmKv92i279k',
        schedule_or_manual:    'https://youtu.be/zkMnEv0PjLY',
        btc_value_projection:  'https://youtu.be/jfsRDUc5sT0',
        projected_table:       'https://youtu.be/KKvNp9wArPA',
        manual_entry:          'https://youtu.be/tgCVSQb9W-U',
        finish_schedule:       'https://youtu.be/zS2yiO69ZBw',
        recovery_words:        'https://youtu.be/nmLwOlxFFhI',
        add_funds:             'https://youtu.be/Fb0rmrw0zak',
        finish_share:          'https://youtu.be/XQGlT9WoVPA',

        // Fallbacks per step-group (used when the exact step has no entry above)
        group_1: 'https://youtu.be/your-plan-overview',
        group_2: 'https://youtu.be/your-recovery-overview',
        group_3: 'https://youtu.be/your-add-funds-overview',
        group_4: 'https://youtu.be/your-finish-overview',

        // Last-resort default
        default: 'https://youtu.be/your-default-help'
    },

    // Help video shown on the gift recipient page
    giftHelpUrl: 'https://youtu.be/WcSpTlghGUc',

    // Service fee collection address
    serviceFeeAddress: 'bc1qvqajk78h2tqvajyzy8ffgd3p7a693gem9gvk2x'

};
