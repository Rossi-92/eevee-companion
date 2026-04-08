const MAX_RECORDING_MS = 9000;
const MIN_RECORDING_MS = 600;
const SILENCE_WINDOW_MS = 1200;
const SPEECH_THRESHOLD = 0.012;

export function isVoiceInputSupported() {
  return Boolean(
    navigator.mediaDevices?.getUserMedia &&
    (window.AudioContext || window.webkitAudioContext),
  );
}

async function createMicrophoneStream() {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

function mergeBuffers(chunks, totalLength) {
  const merged = new Float32Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });
  return merged;
}

function floatTo16BitPCM(view, offset, samples) {
  for (let i = 0; i < samples.length; i += 1, offset += 2) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

export async function startListening() {
  if (!isVoiceInputSupported()) {
    throw new Error('Voice capture is not supported in this browser.');
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const stream = await createMicrophoneStream();
  const audioCtx = new AudioContextCtor();
  const sampleRate = audioCtx.sampleRate;
  const source = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalLength = 0;
    let speechDetected = false;
    let stopped = false;
    const startedAt = Date.now();
    let lastSpeechAt = startedAt;

    const cleanup = async () => {
      if (stopped) {
        return;
      }
      stopped = true;
      window.clearInterval(watchdogId);
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      try {
        await audioCtx.close();
      } catch {}
    };

    const finish = async () => {
      const durationMs = Date.now() - startedAt;
      await cleanup();

      if (!speechDetected || durationMs < MIN_RECORDING_MS || totalLength === 0) {
        resolve(null);
        return;
      }

      const samples = mergeBuffers(chunks, totalLength);
      const wav = encodeWav(samples, sampleRate);
      resolve({
        mimeType: 'audio/wav',
        data: arrayBufferToBase64(wav),
        durationMs,
      });
    };

    processor.onaudioprocess = (event) => {
      if (stopped) {
        return;
      }

      const input = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      chunks.push(copy);
      totalLength += copy.length;

      let sumSquares = 0;
      for (let i = 0; i < input.length; i += 1) {
        sumSquares += input[i] * input[i];
      }
      const rms = Math.sqrt(sumSquares / input.length);
      if (rms >= SPEECH_THRESHOLD) {
        speechDetected = true;
        lastSpeechAt = Date.now();
      }
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);

    const watchdogId = window.setInterval(() => {
      if (stopped) {
        return;
      }

      const now = Date.now();
      if (now - startedAt >= MAX_RECORDING_MS) {
        void finish();
        return;
      }

      if (speechDetected && now - lastSpeechAt >= SILENCE_WINDOW_MS) {
        void finish();
      }
    }, 150);

    window.setTimeout(() => {
      if (!speechDetected && !stopped) {
        void finish();
      }
    }, MAX_RECORDING_MS);

    processor.addEventListener?.('error', async () => {
      await cleanup();
      reject(new Error('Microphone capture failed.'));
    });
  });
}

export function startContinuousListening() {
  return () => {};
}
