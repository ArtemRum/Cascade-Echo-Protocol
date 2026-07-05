class CRTEffects {
  constructor(container) {
    this.container = container;
    this.effectsEl = null;
    this.canvas = null;
    this.ctx = null;
    this._noiseFrame = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return this;

    this.effectsEl = document.createElement('div');
    this.effectsEl.id = 'game-effects';

    const scanlines = document.createElement('div');
    scanlines.className = 'crt-scanlines';
    this.effectsEl.appendChild(scanlines);

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'noise-canvas';
    this.canvas.width = 128;
    this.canvas.height = 128;
    this.ctx = this.canvas.getContext('2d');
    this.effectsEl.appendChild(this.canvas);

    const vhs = document.createElement('div');
    vhs.className = 'vhs-overlay';
    this._vhsOverlay = vhs;
    this.effectsEl.appendChild(vhs);

    const flash = document.createElement('div');
    flash.className = 'glitch-flash';
    this.effectsEl.appendChild(flash);

    document.body.appendChild(this.effectsEl);
    this.initialized = true;
    return this;
  }

  _generateNoise() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = Math.random() * 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  staticBurst(duration) {
    if (duration === undefined) duration = 200 + Math.random() * 200;
    this.canvas.classList.add('active');
    const start = performance.now();
    const frame = () => {
      this._generateNoise();
      if (performance.now() - start < duration) {
        this._noiseFrame = requestAnimationFrame(frame);
      } else {
        this.canvas.classList.remove('active');
        this._noiseFrame = null;
      }
    };
    this._noiseFrame = requestAnimationFrame(frame);

    const flash = this.effectsEl.querySelector('.glitch-flash');
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
  }

  screenShake() {
    this.container.classList.remove('screen-shake');
    void this.container.offsetWidth;
    this.container.classList.add('screen-shake');
  }

  glitchLine() {
    this.container.classList.remove('glitch-horizontal');
    void this.container.offsetWidth;
    this.container.classList.add('glitch-horizontal');
  }

  vhsTracking(duration) {
    if (duration === undefined) duration = 600 + Math.random() * 400;
    this._vhsOverlay.innerHTML = '';
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const bar = document.createElement('div');
      bar.className = 'vhs-bar';
      const topOffset = Math.random() * 60;
      bar.style.top = topOffset + '%';
      bar.style.height = (2 + Math.random() * 6) + 'px';
      bar.style.animationDuration = (0.4 + Math.random() * 0.6) + 's';
      bar.style.animationDelay = (Math.random() * 0.3) + 's';
      this._vhsOverlay.appendChild(bar);
    }
    this._vhsOverlay.classList.add('active');
    setTimeout(() => {
      this._vhsOverlay.classList.remove('active');
      this._vhsOverlay.innerHTML = '';
    }, duration);
  }

  bloomBurst() {
    this.staticBurst(350);
    this.screenShake();
    this.glitchLine();
    this.vhsTracking(1000);
  }

  interference() {
    this.glitchLine();
    this.staticBurst(150);
  }

  destroy() {
    if (this._noiseFrame) {
      cancelAnimationFrame(this._noiseFrame);
      this._noiseFrame = null;
    }
    if (this.effectsEl && this.effectsEl.parentNode) {
      this.effectsEl.parentNode.removeChild(this.effectsEl);
    }
    this.initialized = false;
  }
}
