const AUDIO_FILES = {
  evolution: '/assets/audio/evolution.ogg',
  wake_chime: '/assets/audio/wake_chime.ogg',
  sleep_lullaby: '/assets/audio/sleep_lullaby.ogg',
  tap: '/assets/audio/tap.ogg',
  touch_chirp: '/assets/audio/touch_chirp.ogg',
  touch_giggle: '/assets/audio/touch_giggle.ogg',
  touch_swish: '/assets/audio/touch_swish.ogg',
};

class AudioManager {
  constructor() {
    this.audio = new Map();
    this.enabled = typeof Audio !== 'undefined';
    this.audioContext = null;
  }

  preloadAll() {
    if (!this.enabled) {
      return;
    }

    Object.entries(AUDIO_FILES).forEach(([name, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      this.audio.set(name, audio);
    });
  }

  playSound(name) {
    const source = this.audio.get(name);
    if (!source || !source.src) {
      this.playGeneratedCue(name);
      return;
    }

    try {
      source.currentTime = 0;
      source.play().catch(() => {
        this.playGeneratedCue(name);
      });
    } catch {
      this.playGeneratedCue(name);
    }
  }

  getAudioContext() {
    const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContextCtor();
    }

    return this.audioContext;
  }

  async playGeneratedCue(name) {
    const ctx = this.getAudioContext();
    if (!ctx) {
      return;
    }

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const patterns = GENERATED_CUES[name];
      if (!patterns) {
        return;
      }
      const startAt = ctx.currentTime + 0.01;
      patterns.forEach((tone, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = tone.type || 'sine';
        oscillator.frequency.setValueAtTime(tone.frequency, startAt + index * tone.delay);
        gain.gain.setValueAtTime(0.0001, startAt + index * tone.delay);
        gain.gain.exponentialRampToValueAtTime(
          tone.gain ?? 0.08,
          startAt + index * tone.delay + 0.02,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          startAt + index * tone.delay + tone.duration,
        );
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(startAt + index * tone.delay);
        oscillator.stop(startAt + index * tone.delay + tone.duration);
      });
    } catch {}
  }
}

const GENERATED_CUES = {
  tap: [
    { frequency: 660, duration: 0.08, delay: 0, gain: 0.05, type: 'triangle' },
  ],
  wake_chime: [
    { frequency: 740, duration: 0.12, delay: 0, gain: 0.06, type: 'sine' },
    { frequency: 988, duration: 0.16, delay: 0.12, gain: 0.05, type: 'sine' },
  ],
  sleep_lullaby: [
    { frequency: 392, duration: 0.18, delay: 0, gain: 0.05, type: 'sine' },
    { frequency: 294, duration: 0.2, delay: 0.14, gain: 0.04, type: 'sine' },
  ],
  touch_chirp: [
    { frequency: 880, duration: 0.07, delay: 0, gain: 0.05, type: 'triangle' },
  ],
  touch_giggle: [
    { frequency: 660, duration: 0.05, delay: 0, gain: 0.04, type: 'triangle' },
    { frequency: 784, duration: 0.05, delay: 0.06, gain: 0.04, type: 'triangle' },
  ],
  touch_swish: [
    { frequency: 520, duration: 0.12, delay: 0, gain: 0.04, type: 'sawtooth' },
  ],
  evolution: [
    { frequency: 523, duration: 0.12, delay: 0, gain: 0.05, type: 'sine' },
    { frequency: 659, duration: 0.12, delay: 0.1, gain: 0.05, type: 'sine' },
    { frequency: 784, duration: 0.22, delay: 0.2, gain: 0.05, type: 'sine' },
  ],
};

export const audioManager = new AudioManager();
