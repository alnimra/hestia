import { Hono } from 'hono'
import type { Env } from './env'
import type { ProteinCategory } from '../brain/types'
import { hcmcDateString } from '../brain/date'
import {
  getOrCreatePlan, loadNames, getCompletedSteps, recordStep, undoStep,
  setOverride, setAttendance, resetDay, addReceipt, listReceipts,
} from './repo'

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
  const [plan, names] = await Promise.all([getOrCreatePlan(c.env, date), loadNames(c.env.DB)])
  return c.json({ ...plan, names })
})

// Helper check-offs — open (no auth, per owner decision). Server-stamped + idempotent.
app.get('/api/tasks', async (c) => {
  const date = c.req.query('date') ?? hcmcDateString(new Date())
  return c.json({ date, completed: await getCompletedSteps(c.env.DB, date) })
})

app.post('/api/tasks', async (c) => {
  const body = await c.req.json<{ date?: string; stepKey?: string; clientEventId?: string }>()
  const date = body.date ?? hcmcDateString(new Date())
  if (!body.stepKey || !body.clientEventId) {
    return c.json({ error: 'stepKey and clientEventId required' }, 400)
  }
  const completedAt = await recordStep(c.env.DB, date, body.stepKey, body.clientEventId)
  return c.json({ stepKey: body.stepKey, completedAt })
})

app.post('/api/tasks/undo', async (c) => {
  const body = await c.req.json<{ date?: string; stepKey?: string }>()
  const date = body.date ?? hcmcDateString(new Date())
  if (!body.stepKey) return c.json({ error: 'stepKey required' }, 400)
  await undoStep(c.env.DB, date, body.stepKey)
  return c.json({ ok: true })
})

// Owner dashboard — plan + names + completed steps + bill, in one call.
app.get('/api/state', async (c) => {
  const date = c.req.query('date') ?? hcmcDateString(new Date())
  const [plan, names, completed, bill] = await Promise.all([
    getOrCreatePlan(c.env, date),
    loadNames(c.env.DB),
    getCompletedSteps(c.env.DB, date),
    listReceipts(c.env.DB, date),
  ])
  return c.json({ ...plan, names, completed, bill })
})

// Owner override / attendance / reset (Access-gated in prod via Cloudflare Access).
app.post('/api/plan/override', async (c) => {
  const b = await c.req.json<{ date?: string; proteinId?: ProteinCategory; juiceId?: string | null; dessertId?: string | null; guestCount?: number }>()
  const date = b.date ?? hcmcDateString(new Date())
  const plan = await setOverride(c.env, date, { proteinId: b.proteinId, juiceId: b.juiceId, dessertId: b.dessertId, guestCount: b.guestCount })
  return c.json({ ...plan, names: await loadNames(c.env.DB) })
})

app.post('/api/attendance', async (c) => {
  const b = await c.req.json<{ date?: string; personId?: string; eating?: boolean }>()
  const date = b.date ?? hcmcDateString(new Date())
  if (!b.personId) return c.json({ error: 'personId required' }, 400)
  const plan = await setAttendance(c.env, date, b.personId, b.eating !== false)
  return c.json({ ...plan, names: await loadNames(c.env.DB) })
})

app.post('/api/plan/reset', async (c) => {
  const b = await c.req.json<{ date?: string }>()
  const date = b.date ?? hcmcDateString(new Date())
  const plan = await resetDay(c.env, date)
  return c.json({ ...plan, names: await loadNames(c.env.DB) })
})

app.post('/api/receipts', async (c) => {
  const b = await c.req.json<{ date?: string; amountVnd?: number; note?: string }>()
  const date = b.date ?? hcmcDateString(new Date())
  if (typeof b.amountVnd !== 'number') return c.json({ error: 'amountVnd required' }, 400)
  await addReceipt(c.env, date, b.amountVnd, b.note ?? null)
  return c.json({ ok: true })
})

// Unknown /api routes return JSON 404, not the SPA.
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
