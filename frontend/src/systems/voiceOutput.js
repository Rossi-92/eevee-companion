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
      return await playAudioBuffer(result);
    }

    // Worker returned JSON — ElevenLabs not configured, fall through to browser TTS
  } catch {
    // Network/API error — fall through to browser TTS
  }

  return browserSpeak(text, mood);
}
