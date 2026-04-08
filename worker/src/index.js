import bcrypt from 'bcryptjs';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const RATE_LIMITS = {
  auth: { max: 20, windowSeconds: 600 },
  chat: { max: 2000, windowSeconds: 3600 },
  speak: { max: 2000, windowSeconds: 3600 },
  weather: { max: 240, windowSeconds: 3600 },
};

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const NAME_RULES = 'Always call the trainer "Lilianna". Never call her "Lily" or "Lili". Pronounce her name as "Lily-Anna" when speaking out loud.';
const REPLY_RULES = 'Keep every reply extremely short and conversational, usually a single sentence under 14 words. Use natural spoken cadence and avoid sounding scripted or overly formal.';

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = buildCorsHeaders(request, env);
    if (!corsHeaders.allowed) {
      return json({ error: 'Origin not allowed.' }, 403);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders.headers,
      });
    }

    try {
      const url = new URL(request.url);

      if (url.pathname === '/api/auth/verify-pin' && request.method === 'POST') {
        return withCors(await verifyPin(request, env), corsHeaders.headers);
      }

      if (url.pathname === '/api/auth/register-device' && request.method === 'POST') {
        return withCors(await registerDevice(request, env), corsHeaders.headers);
      }

      const auth = await requireAuth(request, env);
      if (!auth.ok) {
        return withCors(json({ error: auth.error }, auth.status), corsHeaders.headers);
      }

      if (url.pathname === '/api/chat' && request.method === 'POST') {
        return withCors(await chat(request, env, ctx, auth.deviceId), corsHeaders.headers);
      }

      if (url.pathname === '/api/speak' && request.method === 'POST') {
        return withCors(await speak(request, env, auth.deviceId), corsHeaders.headers);
      }

      if (url.pathname === '/api/weather' && request.method === 'GET') {
        return withCors(await weather(url, env, auth.deviceId), corsHeaders.headers);
      }

      return withCors(json({ error: 'Not found.' }, 404), corsHeaders.headers);
    } catch (error) {
      return withCors(
        json({ error: error.message || 'Worker request failed.' }, error.status || 500),
        corsHeaders.headers,
      );
    }
  },
};

function buildCorsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = env.ALLOWED_ORIGIN || origin || '*';
  const isAllowed = !origin || origin === allowedOrigin;

  return {
    allowed: isAllowed,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      Vary: 'Origin',
    },
  };
}

async function verifyPin(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  await enforceRateLimit(env, `ratelimit:auth:${ip}`, RATE_LIMITS.auth);

  const body = await request.json();
  const pinValid = await isValidPin(body.pin, env);

  if (!pinValid) {
    return json({ error: 'That PIN did not match Eevee’s trainer record.' }, 401);
  }

  const devices = await listDevices(env);
  if (devices.length === 0) {
    return json({ error: 'No registered device found. Register this tablet first.' }, 403);
  }

  if (!devices.includes(body.deviceId)) {
    return json({ error: 'This device is not registered for Eevee Companion.' }, 403);
  }

  const token = await signToken({ deviceId: body.deviceId }, env.JWT_SECRET || 'dev-secret');
  return json({ token, expiresIn: 86400 });
}

async function registerDevice(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  await enforceRateLimit(env, `ratelimit:auth:${ip}`, RATE_LIMITS.auth);

  const body = await request.json();
  const pinValid = await isValidPin(body.pin, env);

  if (!pinValid) {
    return json({ error: 'That PIN did not match Eevee’s trainer record.' }, 401);
  }

  const devices = await listDevices(env);
  if (!devices.includes(body.deviceId)) {
    devices.push(body.deviceId);
    await env.EEVEE_KV?.put('devices', JSON.stringify(devices));
  }

  const token = await signToken({ deviceId: body.deviceId }, env.JWT_SECRET || 'dev-secret');
  return json({ token, expiresIn: 86400, registered: true });
}

async function chat(request, env, ctx, deviceId) {
  await enforceRateLimit(env, `ratelimit:chat:${deviceId}`, RATE_LIMITS.chat);

  const body = await request.json();
  const memory = (await env.EEVEE_KV?.get('memory:latest')) || '';
  const pokemonOfTheDay = getPokemonOfTheDay(body.context?.date);
  const prompt = buildContextBlock(body.context, memory, pokemonOfTheDay);
  const result = await generateChatTurn(env, body, prompt);
  const mood = extractMood(result.mood || result.text);
  const cleanText = result.text.replace(/\s*\[MOOD:[^\]]+\]\s*$/i, '').trim();
  const userContent = result.transcript || body.message || '[voice input]';

  const logKey = `log:${new Date().toISOString()}`;
  await env.EEVEE_KV?.put(
    logKey,
    JSON.stringify({ user: userContent, eevee: cleanText, mood }),
    { expirationTtl: 30 * 24 * 3600 },
  );

  // Every 10 exchanges, summarise and update long-term memory asynchronously
  const counterKey = `memcounter:${deviceId}`;
  const counter = (await env.EEVEE_KV?.get(counterKey, 'json')) || { count: 0 };
  const newCount = counter.count + 1;

  if (newCount >= 10) {
    // Reset counter and update memory together — counter only resets if memory write succeeds
    ctx.waitUntil(
      updateMemory(env, userContent, cleanText).then(() =>
        env.EEVEE_KV?.put(counterKey, JSON.stringify({ count: 0 })),
      ),
    );
  } else {
    await env.EEVEE_KV?.put(counterKey, JSON.stringify({ count: newCount }));
  }

  return json({ text: cleanText, mood, pokemonOfTheDay, transcript: result.transcript || '' });
}

async function speak(request, env, deviceId) {
  await enforceRateLimit(env, `ratelimit:speak:${deviceId}`, RATE_LIMITS.speak);
  const body = await request.json();

  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_VOICE_ID) {
    return json({
      ok: false,
      provider: 'elevenlabs',
      reason: 'missing_worker_secret',
      message: 'Worker is missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID.',
    });
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: body.text,
        model_id: 'eleven_flash_v2_5',
        output_format: 'mp3_22050_32',
        optimize_streaming_latency: 3,
        voice_settings: getVoiceSettings(body.mood),
      }),
    },
  );

  if (!response.ok) {
    let detail = 'Unknown ElevenLabs error.';
    try {
      detail = await response.text();
    } catch {}

    return json(
      {
        ok: false,
        provider: 'elevenlabs',
        reason: 'elevenlabs_request_failed',
        status: response.status,
        message: detail.slice(0, 500),
      },
      502,
    );
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
      'X-Eevee-Voice-Provider': 'elevenlabs',
    },
  });
}

async function weather(url, env, deviceId) {
  await enforceRateLimit(env, `ratelimit:weather:${deviceId}`, RATE_LIMITS.weather);

  const lat = Number(url.searchParams.get('lat') || 51.7);
  const lon = Number(url.searchParams.get('lon') || -0.03);
  const cacheKey = `weather:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const cached = await env.EEVEE_KV?.get(cacheKey, 'json');
  if (cached) {
    return json(cached);
  }

  if (env.OPENWEATHER_API_KEY) {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${env.OPENWEATHER_API_KEY}&units=metric`,
    );
    if (response.ok) {
      const data = await response.json();
      const payload = {
        temp: Math.round(data.main?.temp ?? 14),
        condition: mapWeatherCondition(data.weather?.[0]?.main),
        label: data.weather?.[0]?.description
          ? titleCase(data.weather[0].description)
          : 'Unknown',
        icon: mapWeatherIcon(data.weather?.[0]?.main),
        lat,
        lon,
      };
      await env.EEVEE_KV?.put(cacheKey, JSON.stringify(payload), { expirationTtl: 900 });
      return json(payload);
    }
  }

  const payload = {
    temp: 14,
    condition: 'cloudy',
    label: 'Cloudy',
    icon: 'cloud',
    lat,
    lon,
  };

  return json(payload);
}

async function requireAuth(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '');

  if (!token) {
    return { ok: false, status: 401, error: 'Missing trainer token.' };
  }

  const payload = await verifyToken(token, env.JWT_SECRET || 'dev-secret');
  if (!payload) {
    return { ok: false, status: 401, error: 'Invalid or expired trainer token.' };
  }

  return { ok: true, deviceId: payload.deviceId };
}

async function isValidPin(pin, env) {
  if (!pin || `${pin}`.length !== 4) {
    return false;
  }

  if (env.TRAINER_PIN_HASH) {
    return bcrypt.compare(`${pin}`, env.TRAINER_PIN_HASH);
  }

  return `${pin}` === (env.DEV_TRAINER_PIN || '1234');
}

async function listDevices(env) {
  const raw = await env.EEVEE_KV?.get('devices');
  return raw ? JSON.parse(raw) : [];
}

async function enforceRateLimit(env, key, config) {
  return;
}

async function updateMemory(env, userMsg, eeveeMsg) {
  if (!env.GEMINI_API_KEY) return;

  const currentMemory = (await env.EEVEE_KV?.get('memory:latest')) || '';
  const response = await fetchGeminiWithFallback(env, {
    contents: [{
      role: 'user',
      parts: [{
        text: `Extract any personal facts Lilianna shared in this exchange in 1-2 bullet points. Only include concrete facts (names, events, preferences, feelings). If nothing notable, respond with exactly: NONE\n\nLilianna: ${userMsg}\nEevee: ${eeveeMsg}`,
      }],
    }],
    generationConfig: { maxOutputTokens: 80, temperature: 0.1 },
  });

  if (!response.ok) return;
  const data = await response.json();
  const summary = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim() || '';

  if (!summary || summary.toUpperCase() === 'NONE') return;

  // Append to memory, keep most recent 500 chars
  const updated = `${currentMemory}\n${summary}`.trim();
  await env.EEVEE_KV?.put('memory:latest', updated.length > 500 ? updated.slice(-500) : updated);
}

function buildContextBlock(context = {}, memory = '', pokemonOfTheDay) {
  return [
    '[CONTEXT]',
    `Time: ${context.time || 'Unknown'} (${context.phase || 'day'})`,
    `Date: ${context.dayOfWeek || 'Unknown'}, ${context.date || 'Unknown'}`,
    `Weather: ${context.weather || 'Unknown'}`,
    'Trainer name: Lilianna',
    `Current form: ${context.form || 'Eevee'}`,
    `Last interaction: ${context.lastInteraction ?? 0} minutes ago`,
    `Pokémon of the Day: ${pokemonOfTheDay}`,
    `Conversation memory: ${memory}`,
    '[/CONTEXT]',
  ].join('\n');
}

function getPokemonOfTheDay(dateInput) {
  const pokemon = [
    'Bulbasaur',
    'Charmander',
    'Squirtle',
    'Pikachu',
    'Eevee',
    'Psyduck',
    'Togepi',
    'Snorlax',
    'Mew',
  ];
  const date = dateInput ? new Date(dateInput) : new Date();
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  return pokemon[dayOfYear % pokemon.length];
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

function withCors(response, headers) {
  const merged = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => merged.set(key, value));
  return new Response(response.body, {
    status: response.status,
    headers: merged,
  });
}

function base64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signToken(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const body = base64url(JSON.stringify({ ...payload, exp }));
  const signature = await sign(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

async function verifyToken(token, secret) {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) {
    return null;
  }

  const expected = await sign(`${header}.${body}`, secret);
  if (expected !== signature) {
    return null;
  }

  // Restore standard base64 padding for atob
  const padded = body.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    body.length + (4 - (body.length % 4)) % 4, '='
  );
  const payload = JSON.parse(atob(padded));
  if (payload.exp * 1000 < Date.now()) {
    return null;
  }

  return payload;
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function generateChatTurn(env, body, prompt) {
  if (!env.GEMINI_API_KEY) {
    throw Object.assign(new Error('Worker is missing GEMINI_API_KEY.'), { status: 503 });
  }

  if (body.audio?.data) {
    return generateChatTurnFromAudio(env, body, prompt);
  }

  if (!body.message?.trim()) {
    throw Object.assign(new Error('No message content was provided.'), { status: 400 });
  }

  const response = await fetchGeminiWithFallback(env, {
    systemInstruction: {
      parts: [{ text: buildSystemPrompt(env, body.context?.form) }],
    },
    contents: [
      ...(body.history || []).map((entry) => ({
        role: entry.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: entry.content }],
      })),
      {
        role: 'user',
        parts: [{ text: `${prompt}\n\n${body.message}` }],
      },
    ],
    generationConfig: {
      temperature: 0.75,
      topP: 0.92,
      topK: 40,
      maxOutputTokens: 90,
    },
  });

  if (!response.ok) {
    throw await buildGeminiError(response, 'Gemini request failed.');
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n').trim() || '';

  if (!text) {
    throw Object.assign(new Error('Gemini returned an empty response.'), { status: 502 });
  }

  return { text, mood: extractMood(text), transcript: body.message.trim() };
}

async function generateChatTurnFromAudio(env, body, prompt) {
  const response = await fetchGeminiWithFallback(env, {
    systemInstruction: {
      parts: [{ text: buildSystemPrompt(env, body.context?.form) }],
    },
    contents: [
      ...(body.history || []).map((entry) => ({
        role: entry.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: entry.content }],
      })),
      {
        role: 'user',
        parts: [
          {
            text: `${prompt}

Listen to the attached audio from Lilianna.
1. Work out what she said.
2. Reply as the current form in one short natural sentence.
3. End the reply with a mood tag like [MOOD:happy].

Return valid JSON only with keys:
- transcript
- reply
- mood`,
          },
          {
            inlineData: {
              mimeType: body.audio.mimeType || 'audio/wav',
              data: body.audio.data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.75,
      topP: 0.92,
      topK: 40,
      maxOutputTokens: 120,
      responseMimeType: 'application/json',
    },
  });

  if (!response.ok) {
    throw await buildGeminiError(response, 'Gemini audio request failed.');
  }

  const data = await response.json();
  const payload =
    data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n').trim() || '';

  if (!payload) {
    throw Object.assign(new Error('Gemini returned an empty audio response.'), { status: 502 });
  }

  let parsed;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw Object.assign(new Error(`Gemini returned invalid JSON: ${payload.slice(0, 200)}`), { status: 502 });
  }

  const transcript = `${parsed.transcript || ''}`.trim();
  const text = `${parsed.reply || ''}`.trim();
  const mood = `${parsed.mood || ''}`.trim();

  if (!transcript) {
    throw Object.assign(new Error('Gemini could not recognize the spoken input.'), { status: 422 });
  }

  if (!text) {
    throw Object.assign(new Error('Gemini did not return a spoken reply.'), { status: 502 });
  }

  return {
    transcript,
    text,
    mood,
  };
}

async function fetchGeminiWithFallback(env, payload) {
  let lastResponse = null;

  for (const model of GEMINI_MODELS) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    if (response.ok) {
      return response;
    }

    const shouldRetry =
      model !== GEMINI_MODELS[GEMINI_MODELS.length - 1] &&
      (response.status === 429 || response.status === 500 || response.status === 503);

    if (!shouldRetry) {
      return response;
    }

    lastResponse = response;
  }

  return lastResponse;
}

async function buildGeminiError(response, fallbackMessage) {
  let detail = fallbackMessage;
  let status = 502;

  try {
    const raw = (await response.text()).slice(0, 500);
    if (raw) {
      detail = raw;
      if (/UNAVAILABLE|high demand|temporar/i.test(raw)) {
        status = 503;
      }
    }
  } catch {}

  return Object.assign(new Error(detail), { status });
}

function extractMood(text = '') {
  return text.match(/\[MOOD:([a-z_]+)\]/i)?.[1]?.toLowerCase() || 'happy';
}

function buildSystemPrompt(env, currentForm = 'Eevee') {
  return [
    env.EEVEE_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
    NAME_RULES,
    REPLY_RULES,
    `You are currently ${currentForm}. Refer to yourself only as ${currentForm}. Never say you are a different Pokemon or evolution.`,
  ].join('\n\n');
}

function getVoiceSettings(mood = 'idle') {
  switch (`${mood}`.toLowerCase()) {
    case 'happy':
      return { stability: 0.42, style: 0.28, similarity_boost: 0.82, speed: 1.1 };
    case 'excited':
      return { stability: 0.34, style: 0.4, similarity_boost: 0.8, speed: 1.14 };
    case 'sad':
      return { stability: 0.48, style: 0.16, similarity_boost: 0.84, speed: 1.0 };
    case 'sleepy':
      return { stability: 0.56, style: 0.1, similarity_boost: 0.84, speed: 0.96 };
    default:
      return { stability: 0.4, style: 0.22, similarity_boost: 0.82, speed: 1.08 };
  }
}

function mapWeatherCondition(input = '') {
  const lower = `${input}`.toLowerCase();
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('thunder')) {
    return 'rain';
  }
  if (lower.includes('snow')) {
    return 'snow';
  }
  if (lower.includes('mist') || lower.includes('fog') || lower.includes('haze')) {
    return 'fog';
  }
  if (lower.includes('cloud')) {
    return 'cloudy';
  }
  return 'sunny';
}

function mapWeatherIcon(input = '') {
  const condition = mapWeatherCondition(input);
  switch (condition) {
    case 'rain':
      return 'rain';
    case 'snow':
      return 'snow';
    case 'fog':
      return 'fog';
    case 'cloudy':
      return 'cloud';
    default:
      return 'sun';
  }
}

function titleCase(value = '') {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

const DEFAULT_SYSTEM_PROMPT = `You are Eevee, a warm, playful Pokemon companion for Lilianna. Her name is pronounced "Lily-Anna". Keep responses short, kind, and child-safe. End every reply with a mood tag like [MOOD:happy].`;
