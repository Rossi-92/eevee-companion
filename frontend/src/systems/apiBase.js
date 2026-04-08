const PROD_WORKER_URL = 'https://eevee-worker.rossrees92.workers.dev';

export function getApiBase() {
  const configured = import.meta.env.VITE_API_BASE?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (import.meta.env.DEV) {
    return '';
  }

  return PROD_WORKER_URL;
}

export function withApiBase(path) {
  if (!path.startsWith('/')) {
    return path;
  }

  const base = getApiBase();
  return base ? `${base}${path}` : path;
}

