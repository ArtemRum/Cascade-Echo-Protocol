class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.ambientNodes = {};
    this.tensionGain = null;
    this.tensionOsc1 = null;
    this.tensionOsc2 = null;
    this.tensionLFO = null;
    this._initialized = false;
    this._volume = 0.3;
  }

  init() {
    if (this._initialized) return this;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._volume;
      this.master.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.5;
      this.ambientGain.connect(this.master);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.master);

      this._initialized = true;
    } catch (e) {
      console.warn('AudioManager: AudioContext not available', e);
    }
    return this;
  }

  _ensureInit() {
    if (!this._initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this._initialized;
  }

  _createNoiseBuffer(duration, type) {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buffer = this.ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);
    if (type === 'white') {
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'brown') {
      let val = 0;
      for (let i = 0; i < len; i++) {
        val += (Math.random() * 2 - 1) * 0.02;
        if (val > 1) val = 1;
        if (val < -1) val = -1;
        data[i] = val;
      }
    }
    return buffer;
  }

  _stopAmbientLayer(name) {
    const n = this.ambientNodes[name];
    if (n) {
      try { n.stop(); } catch (_) {}
      try { n.disconnect(); } catch (_) {}
    }
    this.ambientNodes[name] = null;
  }

  startAmbient() {
    if (!this._ensureInit()) return;
    this._stopAmbientLayer('drone');
    this._stopAmbientLayer('subbass');
    this._stopAmbientLayer('harmonic');
    this._stopAmbientLayer('tension');
    this._setupDrone();
    this._setupSubBass();
    this._setupHarmonic();
    this._setupTension();
  }

  _setupDrone() {
    const buffer = this._createNoiseBuffer(4, 'brown');
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 0.7;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.12;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    src.start();
    this.ambientNodes.drone = src;
  }

  _setupSubBass() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 35;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.03;
    const oscGain = this.ctx.createGain();
    oscGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(oscGain.gain);
    osc.connect(oscGain);
    oscGain.connect(this.ambientGain);
    osc.start();
    lfo.start();
    this.ambientNodes.subbass = osc;
  }

  _setupHarmonic() {
    const buffer = this._createNoiseBuffer(4, 'white');
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 1.5;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 400;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    src.start();
    lfo.start();
    this.ambientNodes.harmonic = src;
  }

  _setupTension() {
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 80;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 96;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.5;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 50;
    const distortion = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = (Math.PI + 2) * x / (Math.PI + Math.abs(x));
    }
    distortion.curve = curve;
    const mixGain = this.ctx.createGain();
    mixGain.gain.value = 0.5;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);
    osc1.connect(mixGain);
    osc2.connect(mixGain);
    mixGain.connect(distortion);
    distortion.connect(gain);
    gain.connect(this.ambientGain);
    osc1.start();
    osc2.start();
    lfo.start();
    this.tensionGain = gain;
    this.tensionLFO = lfo;
    this.ambientNodes.tension = osc1;
  }

  setAmbientTension(level) {
    if (!this.tensionGain || !this.ctx) return;
    level = Math.max(0, Math.min(1, level));
    const now = this.ctx.currentTime;
    this.tensionGain.gain.cancelScheduledValues(now);
    this.tensionGain.gain.setTargetAtTime(level * 0.06, now, 1.5);
    this.tensionLFO.frequency.cancelScheduledValues(now);
    this.tensionLFO.frequency.setTargetAtTime(0.5 + level * 2, now, 1.0);
  }

  stopAmbient() {
    if (!this._initialized) return;
    const now = this.ctx.currentTime;
    if (this.ambientGain) {
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.setTargetAtTime(0, now, 0.001);
    }
    setTimeout(() => {
      for (const key of ['drone', 'subbass', 'harmonic', 'tension']) {
        this._stopAmbientLayer(key);
      }
    }, 200);
  }

  playBloom() {
    if (!this._ensureInit()) return;
    const now = this.ctx.currentTime;

    const buffer = this._createNoiseBuffer(0.3, 'white');
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.35);

    const rumble = this.ctx.createOscillator();
    rumble.type = 'sine';
    rumble.frequency.value = 60;
    const rGain = this.ctx.createGain();
    rGain.gain.setValueAtTime(0.12, now);
    rGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    rumble.connect(rGain);
    rGain.connect(this.sfxGain);
    rumble.start(now);
    rumble.stop(now + 0.55);

    if (this.tensionGain) {
      const boost = 0.06;
      this.tensionGain.gain.cancelScheduledValues(now);
      this.tensionGain.gain.setValueAtTime(this.tensionGain.gain.value, now);
      this.tensionGain.gain.setTargetAtTime(boost, now, 0.05);
      this.tensionGain.gain.setTargetAtTime(boost * 0.3, now + 0.3, 1.0);
    }
  }

  playInterference() {
    if (!this._ensureInit()) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 8; i++) {
      const t = now + i * 0.03 + Math.random() * 0.02;
      const buffer = this._createNoiseBuffer(0.03, 'white');
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08 + Math.random() * 0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000 + Math.random() * 3000;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      src.start(t);
      src.stop(t + 0.04);
    }

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
    const oGain = this.ctx.createGain();
    oGain.gain.setValueAtTime(0.06, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(oGain);
    oGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playEmail() {
    if (!this._ensureInit()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(1200, now + 0.08);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setValueAtTime(0.12, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playConnect() {
    if (!this._ensureInit()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playDisconnect() {
    if (!this._ensureInit()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playWarning() {
    if (!this._ensureInit()) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.3;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 60;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.28);
    }
  }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this._volume;
  }

  mute() {
    if (this.master) this.master.gain.value = 0;
  }

  unmute() {
    if (this.master) this.master.gain.value = this._volume;
  }

  toggle() {
    if (this.master) {
      this.master.gain.value > 0 ? this.mute() : this.unmute();
    }
  }

  destroy() {
    this.stopAmbient();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this._initialized = false;
  }
}
