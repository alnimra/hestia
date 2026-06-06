import type { Env } from './env'
import type { Dish } from '../brain/types'
import { DEFAULT_CONFIG } from '../brain/config'
import { computeDayPlan, type DayPlan, type DishLib, type PlanLists } from '../brain/plan'

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
  const desserts = await db
    .prepare("SELECT id FROM dishes WHERE type = 'dessert' ORDER BY id")
    .all<{ id: string }>()
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

/**
 * The day's plan. Computed fresh from the brain over the loaded libraries (auto
 * rows are a cache, never a second source of truth — review P2-4). The header is
 * upserted so an owner override can pin it later; we only overwrite `source='auto'`
 * rows, never an override.
 */
export async function getOrCreatePlan(env: Env, dateISO: string): Promise<DayPlan> {
  const lists = await loadLists(env.DB)
  const plan = computeDayPlan(DEFAULT_CONFIG, dateISO, lists)

  await env.DB.prepare(
    `INSERT INTO daily_plans (date, protein_id, parent_protein_id, juice_id, dessert_id, source)
     VALUES (?1, ?2, ?3, ?4, ?5, 'auto')
     ON CONFLICT(date) DO UPDATE SET
       protein_id = excluded.protein_id,
       parent_protein_id = excluded.parent_protein_id,
       juice_id = excluded.juice_id,
       dessert_id = excluded.dessert_id
     WHERE daily_plans.source = 'auto'`,
  )
    .bind(dateISO, plan.proteinId, plan.parentProteinId, plan.juiceId, plan.dessertId)
    .run()

  return plan
}

/** id -> English name for every dish, juice, and protein (for helper labels). */
export async function loadNames(db: D1Database): Promise<Record<string, string>> {
  const dishes = await db.prepare('SELECT id, name_en FROM dishes').all<{ id: string; name_en: string }>()
  const juices = await db.prepare('SELECT id, name_en FROM juices').all<{ id: string; name_en: string }>()
  const names: Record<string, string> = {}
  for (const r of dishes.results) names[r.id] = r.name_en
  for (const r of juices.results) names[r.id] = r.name_en
  for (const cat of Object.keys(DEFAULT_CONFIG.proteins) as (keyof typeof DEFAULT_CONFIG.proteins)[]) {
    names[cat] = DEFAULT_CONFIG.proteins[cat].nameEn
  }
  return names
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

/**
 * Record a check-off. Idempotent on client_event_id (the outbox can flush twice);
 * completed_at is the authoritative SERVER timestamp. Returns the (possibly
 * pre-existing) timestamp so a double-flush is a no-op.
 */
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
