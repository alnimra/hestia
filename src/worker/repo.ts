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
