import type { Env } from './env'
import type { Dish, ProteinCategory } from '../brain/types'
import type { NameMap, ServeStyle, PuddingRecipe } from '../brain/steps'
import { DEFAULT_CONFIG } from '../brain/config'
import { computeDayPlan, type DayPlan, type DishLib, type PlanLists, type PlanOptions } from '../brain/plan'

type DishRow = {
  id: string
  name_en: string
  name_vi: string
  type: Dish['type']
  protein_per_serving_g: number
  parent_safe: number
  serve_style: Dish['serveStyle']
  needs_assembly: number
}
type DailyPlanRow = {
  date: string
  protein_id: string | null
  parent_protein_id: string | null
  juice_id: string | null
  dessert_id: string | null
  source: string
  guest_count: number
}

const toDish = (r: DishRow): Dish => ({
  id: r.id,
  nameEn: r.name_en,
  nameVi: r.name_vi,
  type: r.type,
  proteinPerServingG: r.protein_per_serving_g,
  parentSafe: !!r.parent_safe,
  serveStyle: r.serve_style,
  needsAssembly: !!r.needs_assembly,
})

async function loadLists(db: D1Database): Promise<PlanLists> {
  const juices = await db.prepare('SELECT id FROM juices ORDER BY id').all<{ id: string }>()
  const desserts = await db.prepare("SELECT id FROM dishes WHERE type = 'dessert' ORDER BY id").all<{ id: string }>()
  const dishRows = await db
    .prepare("SELECT * FROM dishes WHERE parent_safe = 1 AND type IN ('main','side','carb') ORDER BY id")
    .all<DishRow>()
  const dishes: DishLib = {
    mains: dishRows.results.filter((r) => r.type === 'main').map(toDish),
    sides: dishRows.results.filter((r) => r.type === 'side').map(toDish),
    carbs: dishRows.results.filter((r) => r.type === 'carb').map(toDish),
  }
  return { juices: juices.results.map((r) => r.id), desserts: desserts.results.map((r) => r.id), dishes }
}

async function loadOpts(db: D1Database, dateISO: string): Promise<{ opts: PlanOptions; header: DailyPlanRow | null }> {
  const header = await db.prepare('SELECT * FROM daily_plans WHERE date = ?1').bind(dateISO).first<DailyPlanRow>()
  const attRows = await db
    .prepare('SELECT person_id, eating FROM plan_attendance WHERE date = ?1')
    .bind(dateISO)
    .all<{ person_id: string; eating: number }>()
  const attendance: Record<string, boolean> = {}
  for (const r of attRows.results) attendance[r.person_id] = !!r.eating
  const opts: PlanOptions = { attendance, guestCount: header?.guest_count ?? 0 }
  if (header?.source === 'override') {
    opts.override = {
      proteinId: (header.protein_id as ProteinCategory) ?? undefined,
      parentProteinId: (header.parent_protein_id as ProteinCategory) ?? undefined,
      juiceId: header.juice_id,
      dessertId: header.dessert_id,
    }
  }
  return { opts, header }
}

/**
 * The day's plan, reflecting any owner override + attendance. Auto rows are a cache
 * (re-derived from the brain on read); an `override` row is pinned and respected.
 */
export async function getOrCreatePlan(env: Env, dateISO: string): Promise<DayPlan> {
  const lists = await loadLists(env.DB)
  const { opts } = await loadOpts(env.DB, dateISO)
  const plan = computeDayPlan(DEFAULT_CONFIG, dateISO, lists, opts)

  // cache the auto header; never clobber an override.
  await env.DB.prepare(
    `INSERT INTO daily_plans (date, protein_id, parent_protein_id, juice_id, dessert_id, source)
     VALUES (?1, ?2, ?3, ?4, ?5, 'auto')
     ON CONFLICT(date) DO UPDATE SET
       protein_id = excluded.protein_id, parent_protein_id = excluded.parent_protein_id,
       juice_id = excluded.juice_id, dessert_id = excluded.dessert_id
     WHERE daily_plans.source = 'auto'`,
  )
    .bind(dateISO, plan.proteinId, plan.parentProteinId, plan.juiceId, plan.dessertId)
    .run()

  return plan
}

export interface OverridePatch {
  proteinId?: ProteinCategory
  juiceId?: string | null
  dessertId?: string | null
  guestCount?: number
}

/** Pin an override for the date (merging the patch over the current plan), then return it. */
export async function setOverride(env: Env, dateISO: string, patch: OverridePatch): Promise<DayPlan> {
  const current = await getOrCreatePlan(env, dateISO)
  const proteinId = patch.proteinId ?? current.proteinId
  const juiceId = patch.juiceId !== undefined ? patch.juiceId : current.juiceId
  const dessertId = patch.dessertId !== undefined ? patch.dessertId : current.dessertId
  const guestCount = patch.guestCount ?? current.guestCount
  await env.DB.prepare(
    `INSERT INTO daily_plans (date, protein_id, parent_protein_id, juice_id, dessert_id, source, guest_count)
     VALUES (?1, ?2, ?3, ?4, ?5, 'override', ?6)
     ON CONFLICT(date) DO UPDATE SET
       protein_id = excluded.protein_id, parent_protein_id = excluded.parent_protein_id,
       juice_id = excluded.juice_id, dessert_id = excluded.dessert_id,
       source = 'override', guest_count = excluded.guest_count`,
  )
    .bind(dateISO, proteinId, current.parentProteinId, juiceId, dessertId, guestCount)
    .run()
  return getOrCreatePlan(env, dateISO)
}

export async function setAttendance(env: Env, dateISO: string, personId: string, eating: boolean): Promise<DayPlan> {
  await env.DB.prepare(
    `INSERT INTO plan_attendance (date, person_id, eating) VALUES (?1, ?2, ?3)
     ON CONFLICT(date, person_id) DO UPDATE SET eating = excluded.eating`,
  )
    .bind(dateISO, personId, eating ? 1 : 0)
    .run()
  return getOrCreatePlan(env, dateISO)
}

/** Reset the day to autopilot (drop the override + attendance). */
export async function resetDay(env: Env, dateISO: string): Promise<DayPlan> {
  await env.DB.prepare('DELETE FROM daily_plans WHERE date = ?1').bind(dateISO).run()
  await env.DB.prepare('DELETE FROM plan_attendance WHERE date = ?1').bind(dateISO).run()
  return getOrCreatePlan(env, dateISO)
}

export async function addReceipt(env: Env, dateISO: string, amountVnd: number, note: string | null): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO receipts (date, amount_vnd, note, created_at) VALUES (?1, ?2, ?3, ?4)',
  )
    .bind(dateISO, Math.round(amountVnd), note, new Date().toISOString())
    .run()
}

export async function listReceipts(
  db: D1Database,
  dateISO: string,
): Promise<{ total: number; items: { amountVnd: number; note: string | null; at: string }[] }> {
  const rows = await db
    .prepare('SELECT amount_vnd, note, created_at FROM receipts WHERE date = ?1 ORDER BY created_at')
    .bind(dateISO)
    .all<{ amount_vnd: number; note: string | null; created_at: string }>()
  const items = rows.results.map((r) => ({ amountVnd: r.amount_vnd, note: r.note, at: r.created_at }))
  return { total: items.reduce((s, x) => s + x.amountVnd, 0), items }
}

export async function loadNames(db: D1Database): Promise<NameMap> {
  const dishes = await db
    .prepare('SELECT id, name_en, name_vi, serve_style, needs_assembly FROM dishes')
    .all<{ id: string; name_en: string; name_vi: string; serve_style: ServeStyle; needs_assembly: number }>()
  const juices = await db.prepare('SELECT id, name_en, name_vi FROM juices').all<{ id: string; name_en: string; name_vi: string }>()
  const names: NameMap = {}
  for (const r of dishes.results) {
    names[r.id] = { en: r.name_en, vi: r.name_vi, serveStyle: r.serve_style, needsAssembly: !!r.needs_assembly }
  }
  for (const r of juices.results) names[r.id] = { en: r.name_en, vi: r.name_vi }
  for (const cat of Object.keys(DEFAULT_CONFIG.proteins) as (keyof typeof DEFAULT_CONFIG.proteins)[]) {
    names[cat] = { en: DEFAULT_CONFIG.proteins[cat].nameEn, vi: DEFAULT_CONFIG.proteins[cat].nameVi }
  }
  return names
}

/** The Nutty Pudding recipe (ingredients) + per-person NAKPRO scoops, for the helper card. */
export async function loadPudding(db: D1Database): Promise<PuddingRecipe> {
  const row = await db.prepare("SELECT ingredients FROM recipes WHERE key = 'nutty_pudding'").first<{ ingredients: string }>()
  let ingredients: { label: string; qty: string }[] = []
  try {
    const parsed = JSON.parse(row?.ingredients || '[]') as { en: string; qty: string }[]
    ingredients = parsed.map((i) => ({ label: i.en, qty: i.qty }))
  } catch {
    /* keep empty */
  }
  const scoops = DEFAULT_CONFIG.people.map((p) => ({ name: p.name, scoops: p.puddingScoops }))
  return { ingredients, scoops }
}

export async function getCompletedSteps(
  db: D1Database,
  dateISO: string,
): Promise<{ stepKey: string; completedAt: string }[]> {
  const rows = await db
    .prepare('SELECT step_key, completed_at FROM task_log WHERE date = ?1 ORDER BY completed_at')
    .bind(dateISO)
    .all<{ step_key: string; completed_at: string }>()
  return rows.results.map((r) => ({ stepKey: r.step_key, completedAt: r.completed_at }))
}

export async function recordStep(
  db: D1Database,
  dateISO: string,
  stepKey: string,
  clientEventId: string,
): Promise<string> {
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO task_log (date, step_key, client_event_id, completed_at)
       VALUES (?1, ?2, ?3, ?4) ON CONFLICT DO NOTHING`,
    )
    .bind(dateISO, stepKey, clientEventId, now)
    .run()
  const row = await db
    .prepare('SELECT completed_at FROM task_log WHERE date = ?1 AND step_key = ?2')
    .bind(dateISO, stepKey)
    .first<{ completed_at: string }>()
  return row?.completed_at ?? now
}

export async function undoStep(db: D1Database, dateISO: string, stepKey: string): Promise<void> {
  await db.prepare('DELETE FROM task_log WHERE date = ?1 AND step_key = ?2').bind(dateISO, stepKey).run()
}
