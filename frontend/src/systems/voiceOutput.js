import { apiClient } from './apiClient.js';

let currentSource = null;
let currentAudioCtx = null;
let currentUtterance = null;

function stopSpeaking() {
  if (currentSource) {
    try { currentSource.stop(); } catch {}
    currentSource = null;
  }
  if (currentAudioCtx) {
    try { currentAudioCtx.close(); } catch {}
    currentAudioCtx = null;
  }
  if (currentUtterance) {
    window.speechSynthesis?.cancel();
    currentUtterance = null;
  }
}

async function playAudioBuffer(response) {
  const arrayBuffer = await response.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  const source = audioCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(audioCtx.destination);
  currentAudioCtx = audioCtx;
  currentSource = source;

  return new Promise((resolve) => {
    source.onended = () => {
      currentSource = null;
      currentAudioCtx = null;
      resolve();
    };
    source.start();
  });
}

function browserSpeak(text, mood) {
  if (!('speechSynthesis' in window)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.pitch = mood === 'excited' ? 1.25 : mood === 'sleepy' ? 0.85 : 1.05;
    utterance.rate = mood === 'excited' ? 1.08 : mood === 'sleepy' ? 0.9 : 1;
    utterance.onend = () => { currentUtterance = null; resolve(); };
    utterance.onerror = () => { currentUtterance = null; resolve(); };
    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

export async function speak(text, mood, handlers = {}) {
  stopSpeaking();

  try {
    const result = await apiClient(
      '/api/speak',
      { method: 'POST', body: JSON.stringify({ text, mood }) },
      handlers,
    );

    // apiClient returns the raw Response for non-JSON content types (audio/mpeg)
    if (result && typeof result.arrayBuffer === 'function') {
      const provider = result.headers?.get?.('X-Eevee-Voice-Provider');
      if (provider) {
        console.info(`[voice] provider=${provider}`);
      }
      return await playAudioBuffer(result);
    }

    if (result?.provider || result?.reason || result?.message) {
      console.warn(
        `[voice] Falling back to browser TTS: provider=${result.provider || 'unknown'} reason=${result.reason || 'unknown'} message=${result.message || 'none'}`,
      );
    }
  } catch (error) {
    console.warn(`[voice] Falling back to browser TTS after API error: ${error.message || error}`);
  }

  return browserSpeak(text, mood);
}
