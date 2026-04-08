function getRecognitionClass() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

let activeRecognition = null;

export function isVoiceInputSupported() {
  return Boolean(getRecognitionClass());
}

async function ensureMicrophoneReady() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((track) => track.stop());
}

function stopActiveRecognition() {
  if (!activeRecognition) {
    return;
  }

  try {
    activeRecognition.onresult = null;
    activeRecognition.onerror = null;
    activeRecognition.onend = null;
    activeRecognition.stop();
  } catch {}

  activeRecognition = null;
}

export async function startListening() {
  const Recognition = getRecognitionClass();
  if (!Recognition) {
    return Promise.resolve('');
  }

  try {
    await ensureMicrophoneReady();
  } catch (error) {
    console.warn(`[voice-input] microphone permission failed: ${error?.message || error}`);
    throw error;
  }

  stopActiveRecognition();

  return new Promise((resolve, reject) => {
    const recognition = new Recognition();
    activeRecognition = recognition;
    recognition.lang = 'en-GB';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Timeout if browser never fires result or error (e.g. user dismisses mic prompt)
    const timeout = setTimeout(() => {
      try { recognition.stop(); } catch {}
      reject('timeout');
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      if (activeRecognition === recognition) {
        activeRecognition = null;
      }
    }

    recognition.onresult = (event) => {
      cleanup();
      resolve(event.results[0][0].transcript);
      recognition.stop();
    };
    recognition.onnomatch = () => {
      cleanup();
      resolve('');
      recognition.stop();
    };
    recognition.onerror = (event) => {
      cleanup();
      reject(event.error || 'voice-input-failed');
    };
    recognition.onend = () => {
      cleanup();
    };

    console.info('[voice-input] starting recognition session');
    recognition.start();
  });
}

export function startContinuousListening(onWakeWord) {
  const Recognition = getRecognitionClass();
  if (!Recognition) {
    return () => {};
  }

  let active = true;
  const recognition = new Recognition();
  recognition.lang = 'en-GB';
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
    if (/(^|\b)(hi eevee|hey eevee|eevee)(\b|$)/i.test(transcript)) {
      onWakeWord(transcript);
    }
  };

  recognition.onerror = (event) => {
    if (!active) return;
    // Permission denied — stop permanently rather than looping
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      active = false;
    }
    // onend fires after onerror and handles the restart
  };

  // Chrome fires onend after silence periods — restart to keep listening
  recognition.onend = () => {
    if (!active) return;
    try { recognition.start(); } catch {}
  };

  try { recognition.start(); } catch {}

  return () => {
    active = false;
    try { recognition.stop(); } catch {}
  };
}
