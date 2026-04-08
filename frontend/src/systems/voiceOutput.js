import { apiClient } from './apiClient.js';

let currentUtterance = null;

export async function speak(text, mood, handlers = {}) {
  try {
    await apiClient(
      '/api/speak',
      {
        method: 'POST',
        body: JSON.stringify({ text, mood }),
      },
      handlers,
    );
  } catch {}

  if (!('speechSynthesis' in window)) {
    return;
  }

  return new Promise((resolve) => {
    if (currentUtterance) {
      window.speechSynthesis.cancel();
      currentUtterance = null;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.pitch = mood === 'excited' ? 1.25 : mood === 'sleepy' ? 0.85 : 1.05;
    utterance.rate = mood === 'excited' ? 1.08 : mood === 'sleepy' ? 0.9 : 1;
    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };
    utterance.onerror = () => {
      currentUtterance = null;
      resolve();
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

