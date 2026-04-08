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
      text: stripMoodTag(result.text),
      mood: normalizeMood(result.text, result.mood || 'happy'),
      pokemonOfTheDay: result.pokemonOfTheDay || null,
    };
  } catch (error) {
    if (error.status === 429) {
      return { text: 'Eevee needs a tiny rest. Try again in a moment!', mood: 'sleepy' };
    }

    return { text: 'Check the WiFi! Eevee could not reach the chat trail.', mood: 'sad' };
  }
}

