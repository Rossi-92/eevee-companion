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
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
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

export async function speak(text, mood, handlers = {}) {
  stopSpeaking();

  const result = await apiClient(
    '/api/speak',
    { method: 'POST', body: JSON.stringify({ text, mood }) },
    handlers,
  );

  if (result && typeof result.arrayBuffer === 'function') {
    const provider = result.headers?.get?.('X-Eevee-Voice-Provider');
    if (provider) {
      console.info(`[voice] provider=${provider}`);
    }
    return await playAudioBuffer(result);
  }

  throw new Error('Voice API returned a non-audio response.');
}
