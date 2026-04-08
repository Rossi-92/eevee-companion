const DEVICE_KEY = '_ev_did';

let session = null;

function createDeviceId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `device-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function getDeviceId() {
  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }

  const created = createDeviceId();
  window.localStorage.setItem(DEVICE_KEY, created);
  return created;
}

export function setSession(token, expiresIn) {
  session = {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export function clearSession() {
  session = null;
}

export function getSession() {
  if (!session) {
    return null;
  }

  if (Date.now() >= session.expiresAt) {
    clearSession();
    return null;
  }

  return session;
}

export async function verifyPin(pin) {
  const deviceId = getDeviceId();
  const response = await fetch('/api/auth/verify-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, deviceId }),
  });

  if (response.status === 403) {
    const registerResponse = await fetch('/api/auth/register-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, deviceId }),
    });

    if (!registerResponse.ok) {
      throw await parseError(registerResponse);
    }

    const registered = await registerResponse.json();
    setSession(registered.token, registered.expiresIn);
    return registered;
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  const payload = await response.json();
  setSession(payload.token, payload.expiresIn);
  return payload;
}

export function getAuthHeaders() {
  const current = getSession();
  return current
    ? {
        Authorization: `Bearer ${current.token}`,
      }
    : {};
}

async function parseError(response) {
  let message = 'Trainer verification failed.';

  try {
    const data = await response.json();
    message = data.error || message;
  } catch {}

  const error = new Error(message);
  error.status = response.status;
  return error;
}
