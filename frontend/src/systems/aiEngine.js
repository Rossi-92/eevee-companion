import { apiClient } from './apiClient.js';
import { normalizeMood, stripMoodTag } from './moodEngine.js';

export async function sendMessage({
  message,
  context,
  history,
  handlers,
}) {
  try {
    const result = await apiClient(
      '/api/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          context,
          history: history.slice(-20),
        }),
      },
      handlers,
    );

    return {
      text: result.text,
      // Worker already strips the MOOD tag before responding and returns it
      // as a separate field — pass the bare mood string as both args so
      // normalizeMood validates it against ALLOWED_MOODS and uses the fallback.
      mood: normalizeMood(result.mood || '', result.mood || 'happy'),
      pokemonOfTheDay: result.pokemonOfTheDay || null,
    };
  } catch (error) {
    if (error.status === 429) {
      return { text: 'Eevee needs a tiny rest. Try again in a moment!', mood: 'sleepy' };
    }

    return { text: 'Check the WiFi! Eevee could not reach the chat trail.', mood: 'sad' };
  }
}

