import { Hono } from 'hono'
import type { Env } from './env'
import { hcmcDateString } from '../brain/date'
import { getOrCreatePlan } from './repo'

const app = new Hono<{ Bindings: Env }>()

/**
 * Health check. MUST return JSON, never the SPA index.html (guards the
 * Workers-Assets "SPA fallback swallows /api" footgun; see test/health.test.ts).
 */
app.get('/api/health', (c) =>
  c.json({ status: 'ok', service: 'hestia', stage: 's5.1-plan', ts: new Date().toISOString() }),
)

/**
 * Today's plan (or ?date=YYYY-MM-DD). "Today" is the Asia/Ho_Chi_Minh civil date,
 * never the UTC/server date. Public read for now; write endpoints get auth in S1.
 */
app.get('/api/today', async (c) => {
  const date = c.req.query('date') ?? hcmcDateString(new Date())
  const plan = await getOrCreatePlan(c.env, date)
  return c.json(plan)
})

// Real /api routes arrive in later stages; unknown ones return JSON 404, not HTML.
app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404))

// Everything else is a client route -> static assets / SPA fallback.
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export { app } // for tests

export default {
  fetch(req: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    return app.fetch(req, env, ctx)
  },
  // Cron 0 17 * * * UTC = 00:00 Asia/Ho_Chi_Minh: pre-warm the day's plan. Calls
  // the SAME getOrCreatePlan as the lazy read path (one function, two callers).
  async scheduled(_event: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    await getOrCreatePlan(env, hcmcDateString(new Date()))
  },
}
