# Security

## Implemented In This Pass

- Frontend uses in-memory trainer session storage rather than localStorage for the JWT
- Stable device IDs are generated once and stored locally
- Worker enforces origin checks, bearer auth, device registration, and basic KV-backed rate limiting
- PIN verification supports bcrypt hashes when `TRAINER_PIN_HASH` is configured
- Frontend conversation/weather/speech calls all flow through `/api/*` routes rather than direct third-party requests

## Still Required Before Production

- Replace `DEV_TRAINER_PIN` fallback with a real bcrypt secret only
- Bind a real `EEVEE_KV` namespace in `wrangler.toml`
- Set `ALLOWED_ORIGIN` to the exact Cloudflare Pages origin
- Connect live Gemini, ElevenLabs, and OpenWeather proxy logic
- Review token format and rotate `JWT_SECRET` before deployment
