// Keep the printable gift-card PDF preview CSP-safe.
// Alpine updates a data attribute on the wrapper; this script mirrors it to the ignored iframe.
document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.getElementById('giftCardPreviewWrapper');
    const preview = document.getElementById('giftCardPreview');

    if (!wrapper || !preview) return;

    const syncPreview = () => {
        const url = wrapper.dataset.pdfUrl || '';

        if (url) {
            if (preview.getAttribute('src') !== url) {
                preview.setAttribute('src', url);
            }
        } else {
            preview.removeAttribute('src');
        }
    };

    const observer = new MutationObserver(syncPreview);
    observer.observe(wrapper, {
        attributes: true,
        attributeFilter: ['data-pdf-url']
    });

    syncPreview();
});
