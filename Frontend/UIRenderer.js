/**
* UI Renderer Module
* Handles all HTML generation and DOM updates
* Separated from business logic for easier auditing
*/
class UIRenderer {
    constructor() {
        this.elementCache = new Map();
    }
    
    /**
    * Render recovery words display
    */
    renderRecoveryWords(mnemonic, targetElementId) {
        const element = document.getElementById(targetElementId);
        if (!element) return;
        
        const words = mnemonic.trim().split(/\s+/).filter(Boolean);
        
        element.innerHTML = `
            <div class="callout-critical" role="alert" aria-live="assertive">
                <div class="callout-title">Recovery words - Write these down</div>
                <p>
                    These ${words.length} words are the keys to your Bitcoin gift. 
                    <strong>Do not screenshot or store them online</strong>. 
                    Write them down, verify, seal, and deliver them to the recipient. 
                    We cannot recover these words and we will never ask for them.
                </p>
                <ol class="seed-list">
                    ${words.map((word, i) => `<li><b>${i + 1}</b>${this.escapeHTML(word)}</li>`).join('')}
                </ol>
            </div>
        `;
    }
    
    /**
    * Render funding address with QR code
    */
    renderFundingAddress(address, amount, targetElementId) {
        const element = document.getElementById(targetElementId);
        if (!element) return;
        
        const bitcoinUri = `bitcoin:${address}${amount ? `?amount=${amount}` : ''}`;
        
        element.innerHTML = `
            <div class="callout">
                <strong>Funding Address:</strong><br>
                <div class="mono" style="background: #f8f9fa; padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0;">
                    ${address}
                </div>
                <div id="qr-${targetElementId}" style="margin: 1rem 0;"></div>
                <small class="muted">Send the total gift amount to this address (${Number(amount).toFixed(8)} BTC).
                </small>
            </div>
        `;
        
        // Generate QR code if QRCode library is available
        if (window.QRCode) {
            const qrElement = document.getElementById(`qr-${targetElementId}`);
            if (qrElement) {
                new QRCode(qrElement, {
                    text: bitcoinUri,
                    width: 200,
                    height: 200
                });
            }
        }
    }
    /**
    * Render error message
    */
    renderError(message, targetElementId) {
        const element = document.getElementById(targetElementId);
        if (!element) return;
        
        element.innerHTML = `<span style="color: red;">${this.escapeHTML(message)}</span>`;
    }
    
    /**
    * Render success message
    */
    renderSuccess(message, targetElementId) {
        const element = document.getElementById(targetElementId);
        if (!element) return;
        
        element.innerHTML = `<div class="pill">${this.escapeHTML(message)}</div>`;
    }
    
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
