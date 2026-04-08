const ALLOWED_MOODS = new Set([
  'idle',
  'happy',
  'excited',
  'thinking',
  'sad',
  'sleepy',
  'surprised',
  'talking',
]);

export function normalizeMood(text, fallback = 'idle') {
  const match = `${text || ''}`.match(/\[MOOD:([a-z_]+)\]/i);
  const tagged = match?.[1]?.toLowerCase();

  if (tagged && ALLOWED_MOODS.has(tagged)) {
    return tagged;
  }

  const lower = `${text || ''}`.toLowerCase();
  if (lower.includes('zzz') || lower.includes('sleepy')) {
    return 'sleepy';
  }
  if (lower.includes('!') && fallback === 'happy') {
    return 'excited';
  }

  return ALLOWED_MOODS.has(fallback) ? fallback : 'idle';
}

export function stripMoodTag(text = '') {
  return text.replace(/\s*\[MOOD:[^\]]+\]\s*$/i, '').trim();
}

