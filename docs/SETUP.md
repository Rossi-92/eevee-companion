# Setup

## Current Bootstrap State

The repository now contains:

- A React/Vite frontend with a live shell, Three.js scene fallback, chat flow, evolution flow, sleep mode, weather polling, Pokémon-of-the-day badge, and browser speech fallbacks
- A Cloudflare Worker scaffold with auth, chat, speech, weather, logging, JWT, and rate-limit plumbing

Before this can run against live services, you still need:

1. Cloudflare Pages project
2. Cloudflare Worker KV namespace
3. Worker secrets for the PIN, JWT secret, Gemini, ElevenLabs, and OpenWeather
4. 3D/audio/background assets
5. Final tablet testing on the Samsung Galaxy Tab A9+

## Local Development

1. Run `npm install` inside `frontend/`
2. Run `npm install` inside `worker/`
3. Start the frontend with `npm run dev`
4. Copy `worker/.dev.vars.example` to `worker/.dev.vars` and fill in what you have
5. Start the worker with `npm run dev`

## Dev Defaults

- The worker accepts `DEV_TRAINER_PIN=1234` if no bcrypt hash has been configured.
- The first successful PIN entry will register the local device if no device is stored in KV yet.
- Chat, speak, and weather use graceful fallback behaviour until live API secrets are connected.
- If no GLB files are present, the scene renders a procedural Eevee-like fallback rig so the rest of the app remains usable.
