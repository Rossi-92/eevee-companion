import { apiClient } from './apiClient.js';
import { normalizeMood } from './moodEngine.js';

export async function sendMessage({
  message,
  audio,
  context,
  history,
  handlers,
}) {
  const result = await apiClient(
    '/api/chat',
    {
      method: 'POST',
      body: JSON.stringify({
        message,
        audio,
        context,
        history: history.slice(-20),
      }),
    },
    handlers,
  );

  return {
    text: result.text,
    mood: normalizeMood(result.mood || '', result.mood || 'happy'),
    pokemonOfTheDay: result.pokemonOfTheDay || null,
    transcript: result.transcript || '',
  };
}
