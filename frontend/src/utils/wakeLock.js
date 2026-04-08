let wakeLock = null;

export async function acquireWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    }
  } catch {}
}

export async function releaseWakeLock() {
  try {
    await wakeLock?.release();
  } catch {}
  wakeLock = null;
}

