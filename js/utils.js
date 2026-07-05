class Utils {
  static ELF_BINARY = 'ELF...\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';

  static ANSI = {
    RESET: '\x1b[0m',
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m',
  };

  static hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  static md5Fake(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return ('00000000' + Math.abs(hash).toString(16)).slice(-8).repeat(4);
  }

  static _audioCtx = null;

  static beep(freq = 800, duration = 120) {
    try {
      if (!Utils._audioCtx) {
        Utils._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const osc = Utils._audioCtx.createOscillator();
      const gain = Utils._audioCtx.createGain();
      osc.connect(gain);
      gain.connect(Utils._audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, Utils._audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, Utils._audioCtx.currentTime + duration / 1000);
      osc.start();
      osc.stop(Utils._audioCtx.currentTime + duration / 1000);
    } catch (_) {}
  }
}
