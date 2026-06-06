import { Hono } from 'hono'

export type Env = {
  DB: D1Database
  KV: KVNamespace
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Env }>()

/**
 * Health check. MUST return JSON, never the SPA index.html. This is the
 * regression guard for the Workers-Assets "SPA fallback swallows /api" footgun
 * (eng review P2-2): if asset routing is misconfigured, this route would return
 * HTML and the test in test/health.test.ts fails.
 */
app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    service: 'hestia',
    stage: 's0.1-scaffold',
    ts: new Date().toISOString(),
  }),
)

// Real /api routes (auth, plan, tasks, receipts, ...) arrive in later stages.
// Until then, unknown API paths return JSON 404 (not the SPA).
app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404))

// Everything else is a client route: hand it to the static assets / SPA fallback.
// (Static files are normally served before the Worker is even invoked; this
// catch-all covers SPA deep links like /today and /dashboard.)
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
