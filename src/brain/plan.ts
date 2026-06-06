import type { Config, Dish, ProteinCategory } from './types'
import { daysSince } from './date'
import { mainProteinFor, parentSafeProteinFor, personProtein } from './rotation'
import { computeBudget, puddingProteinG } from './budget'

const wrap = (n: number, len: number): number => ((n % len) + len) % len

export interface DishLib {
  mains: Dish[]
  sides: Dish[]
  carbs: Dish[]
}

export interface PlanLists {
  juices: string[]
  desserts: string[]
  dishes: DishLib
}

/** Owner override for a specific date (any field omitted = use the auto value). */
export interface PlanOverride {
  proteinId?: ProteinCategory
  parentProteinId?: ProteinCategory
  juiceId?: string | null
  dessertId?: string | null
}

export interface PlanOptions {
  /** personId -> eating today (default: everyone eats). */
  attendance?: Record<string, boolean>
  /** extra generic platefuls (no protein math). */
  guestCount?: number
  override?: PlanOverride
}

export interface MealPlan {
  meal: 'lunch' | 'dinner'
  dishIds: string[]
}

export interface PersonDay {
  personId: string
  name: string
  targetG: number
  protein: ProteinCategory
  meatGramsPerMeal: number
  meatGramsPerDay: number
  puddingG: number
  dishesG: number
  servedMeatProteinG: number
  totalProteinG: number
  targetGapG: number
  wouldExceed: boolean
}

export interface DayPlan {
  date: string
  source: 'auto' | 'override'
  proteinId: ProteinCategory
  parentProteinId: ProteinCategory
  juiceId: string | null
  dessertId: string | null
  dishesProteinPerDayG: number
  guestCount: number
  /** total places to set (people eating + guests). */
  places: number
  meals: MealPlan[]
  /** people eating today, with their cooked-meat portions. */
  people: PersonDay[]
  /** the full family + their eating flag (for the owner's attendance toggles). */
  roster: { id: string; name: string; eating: boolean }[]
}

const pick = <T>(arr: T[], i: number): T | undefined => (arr.length ? arr[wrap(i, arr.length)] : undefined)

export function computeDayPlan(
  cfg: Config,
  dateISO: string,
  lists: PlanLists,
  opts: PlanOptions = {},
): DayPlan {
  const d = daysSince(cfg.epoch, dateISO)
  const ov = opts.override ?? {}

  const proteinId = ov.proteinId ?? mainProteinFor(cfg, dateISO)
  // The safe protein parents get *when the main is red meat* (the chicken/fish swap rotation).
  const parentSwap = ov.parentProteinId ?? parentSafeProteinFor(cfg, dateISO)
  // What parents actually eat: the main, UNLESS it is pork/beef -> the swap. On
  // chicken/fish days parents eat exactly what everyone else does (no spurious diff).
  const isRedMain = proteinId === 'pork' || proteinId === 'beef'
  const parentProteinId = isRedMain ? parentSwap : proteinId
  const juiceId = ov.juiceId !== undefined ? ov.juiceId : (pick(lists.juices, d) ?? null)
  const dessertId = ov.dessertId !== undefined ? ov.dessertId : (pick(lists.desserts, d) ?? null)
  const attendance = opts.attendance ?? {}
  const eating = cfg.people.filter((p) => attendance[p.id] !== false)
  const dishProteinCapG = eating.length
    ? Math.min(...eating.map((person) => Math.max(0, person.targetG - puddingProteinG(cfg, person))))
    : Infinity

  const { mains, sides, carbs } = lists.dishes
  // A meal is either a complete one-bowl dish (pho, bún — served alone) or a
  // protein main + veg side + carb. Sides AND carbs rotate with the day; the old
  // code pinned the carb to index 0, which (with ORDER BY id) meant banh mi every
  // single meal. Lunch and dinner start ~half the menu apart, then deterministically
  // shift to the nearest lower-protein pair if the default pair would push the
  // lowest active eater over target before any meat top-up.
  const buildMeal = (i: number): Dish[] => {
    const main = pick(mains, i)
    if (!main) return []
    if (main.standalone) return [main]
    return [main, pick(sides, i), pick(carbs, i)].filter((x): x is Dish => !!x)
  }
  const dishProtein = (dishes: Dish[]): number => dishes.reduce((sum, dish) => sum + dish.proteinPerServingG, 0)
  const offset = mains.length >= 4 ? (Math.floor(mains.length / 2) | 1) : 1
  const chooseMeals = (): [Dish[], Dish[]] => {
    if (mains.length <= 1) return [buildMeal(d), buildMeal(d + offset)]

    let best: { lunch: Dish[]; dinner: Dish[]; score: number } | null = null
    for (let lunchShift = 0; lunchShift < mains.length; lunchShift++) {
      const lunch = buildMeal(d + lunchShift)
      for (let dinnerShift = 0; dinnerShift < mains.length; dinnerShift++) {
        const dinner = buildMeal(d + offset + dinnerShift)
        if (lunch[0]?.id && lunch[0].id === dinner[0]?.id) continue

        const total = dishProtein(lunch) + dishProtein(dinner)
        const overBy = Number.isFinite(dishProteinCapG) ? Math.max(0, total - dishProteinCapG) : 0
        const score = overBy * 1_000_000 + lunchShift * 1_000 + dinnerShift * 10 - total / 1_000
        if (!best || score < best.score) best = { lunch, dinner, score }
      }
    }
    return best ? [best.lunch, best.dinner] : [buildMeal(d), buildMeal(d + offset)]
  }
  const [lunchDishes, dinnerDishes] = chooseMeals()
  const dishesProteinPerDayG = dishProtein(lunchDishes) + dishProtein(dinnerDishes)

  const meals: MealPlan[] = [
    { meal: 'lunch', dishIds: lunchDishes.map((x) => x.id) },
    { meal: 'dinner', dishIds: dinnerDishes.map((x) => x.id) },
  ]

  const people: PersonDay[] = eating.map((person) => {
    const protein = personProtein(person, proteinId, parentProteinId)
    const b = computeBudget(cfg, person, protein, dishesProteinPerDayG)
    return {
      personId: person.id,
      name: person.name,
      targetG: person.targetG,
      protein,
      meatGramsPerMeal: b.meatGramsPerMeal,
      meatGramsPerDay: b.meatGramsPerDay,
      puddingG: b.puddingG,
      dishesG: b.dishesG,
      servedMeatProteinG: b.servedMeatProteinG,
      totalProteinG: b.totalProteinG,
      targetGapG: b.targetGapG,
      wouldExceed: b.wouldExceed,
    }
  })

  const guestCount = Math.max(0, opts.guestCount ?? 0)
  const roster = cfg.people.map((p) => ({ id: p.id, name: p.name, eating: attendance[p.id] !== false }))

  return {
    date: dateISO,
    source: opts.override ? 'override' : 'auto',
    proteinId,
    parentProteinId,
    juiceId,
    dessertId,
    dishesProteinPerDayG,
    guestCount,
    places: eating.length + guestCount,
    meals,
    people,
    roster,
  }
}
