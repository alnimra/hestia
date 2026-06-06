# Hestia

A bilingual (English owner / Vietnamese housekeeper) household **meal-routine PWA**, running
fully Cloudflare-native. The housekeeper runs a timed daily checklist; the owner watches live
and every person's protein lands on target, never over.

Goal + plan: **https://github.com/alnimra/hestia/issues/1**

## Stack

- **One Cloudflare Worker** (Hono) serves the JSON API (`/api/*`) and the Vite/React PWA
  (Workers Assets, SPA mode).
- **D1** (SQLite) for data, **KV** for the helper-PIN throttle.
- **Cloudflare Access** gates the owner dashboard (`m@ray.vin`); the helper uses a 4-digit
  PIN → signed cookie.
- Live at **hestia.afima.io**. ~$0/mo on free tiers.

## Layout

```
src/worker/index.ts   Hono Worker: /api/* + SPA asset fallback (/api/health here)
src/client/           Vite + React PWA (placeholder shell in S0.1)
test/                 Vitest (health smoke test)
wrangler.jsonc        Worker + assets + D1 + KV bindings
```

## Develop

```bash
npm install
npm run build      # vite build → dist/client
npm test           # vitest: /api/health returns JSON
npm run dev        # wrangler dev (local Worker + assets + D1)
```

## Deploy (needs owner Cloudflare auth)

```bash
wrangler login
wrangler d1 create hestia                 # paste database_id into wrangler.jsonc
wrangler kv namespace create hestia-kv    # paste id into wrangler.jsonc
npm run deploy                            # vite build && wrangler deploy
```

Custom domain `hestia.afima.io` + Cloudflare Access are wired in S9.1. CI (test-gated
deploy + preview env) is S0.3.

## Status

Built stage by stage from the goal ledger (issue #1). S0.1 = this scaffold.
