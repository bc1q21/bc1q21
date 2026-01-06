class EntropyCollector {
  /**
   * Initializes an entropy collector that listens for user movement and
   * builds an entropy pool until the target size is reached.
   *
   * @param {HTMLElement} targetElement - The element to capture movement from.
   * @param {HTMLElement} progressElement - A <progress> bar to visualize entropy.
   * @param {number} targetBytes - How much entropy (bytes) to collect.
   * @param {function(string):void} onComplete - Callback when entropy is ready.
   */
  constructor(targetElement, progressElement, targetBytes, onComplete) {
    this.target = targetElement;
    this.progress = progressElement;
    this.targetBytes = targetBytes;
    this.onComplete = onComplete;

    this.entropy = '';
    this.collected = 0;
    this.lastX = null;
    this.lastY = null;
    this.seedGenerated = false;

    this._mouseHandler = (e) => this._capture(e.clientX, e.clientY, Date.now());
    this._touchHandler = (e) => {
      const t = e.touches[0];
      if (t) this._capture(t.clientX, t.clientY, Date.now());
    };
  }

  /**
   * Start listening for entropy input.
   */
  start() {
    this.target.addEventListener('mousemove', this._mouseHandler);
    this.target.addEventListener('touchmove', this._touchHandler);
  }

  /**
   * Stop listening for entropy input.
   */
  stop() {
    this.target.removeEventListener('mousemove', this._mouseHandler);
    this.target.removeEventListener('touchmove', this._touchHandler);
  }

  /**
   * Get the raw entropy string (to be hashed or used in seed generation).
   */
  getEntropy() {
    return this.entropy;
  }

  /**
   * Internal method to record new entropy and update progress.
   */
  _capture(x, y, timestamp) {
    if (this.seedGenerated) return;
    if (x === this.lastX && y === this.lastY) return;

    this.lastX = x;
    this.lastY = y;

    this.entropy += `${x},${y},${timestamp};`;
    this.collected++;

    this._updateProgress();

    if (this.collected >= this.targetBytes * 2 && !this.seedGenerated) {
      this.seedGenerated = true;
      this.stop();
      this.onComplete(this.entropy);
    }
  }

  /**
   * Update the linked <progress> bar visually.
   */
  _updateProgress() {
    const percent = Math.min((this.collected / (this.targetBytes * 2)) * 100, 100);
    this.progress.value = percent;
  }
}

export { EntropyCollector };
