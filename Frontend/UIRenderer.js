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

        const container = document.createElement('div');
        container.className = 'callout-critical';
        container.setAttribute('role', 'alert');
        container.setAttribute('aria-live', 'assertive');

        const title = document.createElement('div');
        title.className = 'callout-title';
        title.textContent = 'Recovery words - Write these down';
        container.appendChild(title);

        const p = document.createElement('p');
        p.textContent = `These ${words.length} words are the keys to your Bitcoin gift. `;
        const strong = document.createElement('strong');
        strong.textContent = 'Do not screenshot or store them online';
        p.appendChild(strong);
        p.appendChild(document.createTextNode('. Write them down, verify, seal, and deliver them to the recipient. We cannot recover these words and we will never ask for them.'));
        container.appendChild(p);

        const ol = document.createElement('ol');
        ol.className = 'seed-list';
        words.forEach((word, i) => {
            const li = document.createElement('li');
            const b = document.createElement('b');
            b.textContent = String(i + 1);
            li.appendChild(b);
            li.appendChild(document.createTextNode(word));
            ol.appendChild(li);
        });
        container.appendChild(ol);

        element.textContent = '';
        element.appendChild(container);
    }
    
    /**
    * Render funding address with QR code
    */
    renderFundingAddress(address, amount, targetElementId) {
        const element = document.getElementById(targetElementId);
        if (!element) return;

        const safeAmount = Number(amount) || 0;
        const bitcoinUri = `bitcoin:${address}${safeAmount ? `?amount=${safeAmount.toFixed(8)}` : ''}`;
        const qrId = `qr-${targetElementId}`;

        const container = document.createElement('div');
        container.className = 'callout';

        const label = document.createElement('strong');
        label.textContent = 'Funding Address:';
        container.appendChild(label);
        container.appendChild(document.createElement('br'));

        const addressBox = document.createElement('div');
        addressBox.className = 'mono';
        addressBox.style.cssText = 'background: #f8f9fa; padding: 0.5rem; border-radius: 4px; margin: 0.5rem 0;';
        addressBox.textContent = address;
        container.appendChild(addressBox);

        const qrDiv = document.createElement('div');
        qrDiv.id = qrId;
        qrDiv.style.margin = '1rem 0';
        container.appendChild(qrDiv);

        const small = document.createElement('small');
        small.className = 'muted';
        small.textContent = `Send the total gift amount to this address (${safeAmount.toFixed(8)} BTC).`;
        container.appendChild(small);

        element.textContent = '';
        element.appendChild(container);

        if (window.QRCode) {
            new QRCode(qrDiv, { text: bitcoinUri, width: 200, height: 200 });
        }
    }
    /**
    * Render error message
    */
    renderError(message, targetElementId) {
        const element = document.getElementById(targetElementId);
        if (!element) return;

        const span = document.createElement('span');
        span.style.color = 'red';
        span.textContent = message;
        element.textContent = '';
        element.appendChild(span);
    }

    /**
    * Render success message
    */
    renderSuccess(message, targetElementId) {
        const element = document.getElementById(targetElementId);
        if (!element) return;

        const div = document.createElement('div');
        div.className = 'pill';
        div.textContent = message;
        element.textContent = '';
        element.appendChild(div);
    }
}
