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
    if (!source) {
      return;
    }

    try {
      source.currentTime = 0;
      source.play().catch(() => {});
    } catch {}
  }
}

export const audioManager = new AudioManager();

