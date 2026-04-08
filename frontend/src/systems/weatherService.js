import { apiClient } from './apiClient.js';

const FALLBACK = {
  temp: 14,
  condition: 'cloudy',
  label: 'Cloudy',
  icon: 'cloud',
};

export async function getLocation() {
  if (!navigator.geolocation) {
    return { lat: 51.7, lon: -0.03 };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        }),
      () => resolve({ lat: 51.7, lon: -0.03 }),
      { enableHighAccuracy: false, timeout: 5000 },
    );
  });
}

export async function fetchWeather(handlers = {}) {
  try {
    const { lat, lon } = await getLocation();
    return await apiClient(`/api/weather?lat=${lat}&lon=${lon}`, {}, handlers);
  } catch {
    return FALLBACK;
  }
}

