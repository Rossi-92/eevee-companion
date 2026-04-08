import { clearSession, getAuthHeaders } from './authManager.js';

export async function apiClient(path, options = {}, handlers = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    clearSession();
    handlers.onUnauthorized?.();
  }

  if (response.status === 429) {
    handlers.onRateLimited?.();
  }

  if (!response.ok) {
    let message = 'Request failed.';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {}

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response;
}
