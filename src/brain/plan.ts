import type { Config, Dish, ProteinCategory } from './types'
import { daysSince } from './date'
import { mainProteinFor, parentSafeProteinFor } from './rotation'
import { computeBudget } from './budget'

const wrap = (n: number, len: number): number => ((n % len) + len) % len

/** Parent-safe dish library, split by role, that the day's dishes are picked from. */
export interface DishLib {
  mains: Dish[]
  sides: Dish[]
  carbs: Dish[]
}

export interface PlanLists {
  juices: string[] // juice ids, ordered (rotation)
  desserts: string[] // dessert dish ids, ordered (rotation)
  dishes: DishLib // parent-safe mains/sides/carbs
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
  wouldExceed: boolean
}

export interface DayPlan {
  date: string
  proteinId: ProteinCategory
  parentProteinId: ProteinCategory
  juiceId: string | null
  dessertId: string | null
  /** sum of the picked dishes' protein for the day (shared; all parent-safe). */
  dishesProteinPerDayG: number
  meals: MealPlan[]
  people: PersonDay[]
}

const pick = <T>(arr: T[], i: number): T | undefined => (arr.length ? arr[wrap(i, arr.length)] : undefined)

/**
 * The full day plan, a pure function of (config, date, the loaded libraries). The
 * meat protein/parent-safe come from the rotation; juice + dessert + the Vietnamese
 * dishes rotate by day index. Because the picked dishes are all parent-safe, the
 * dish protein is shared across everyone — only the cooked-meat side differs by
 * person (and parents get the parent-safe meat). Per-person grams come from the
 * never-over budget.
 */
export function computeDayPlan(cfg: Config, dateISO: string, lists: PlanLists): DayPlan {
  const d = daysSince(cfg.epoch, dateISO)
  const proteinId = mainProteinFor(cfg, dateISO)
  const parentProteinId = parentSafeProteinFor(cfg, dateISO)

  const juiceId = pick(lists.juices, d) ?? null
  const dessertId = pick(lists.desserts, d) ?? null

  const { mains, sides, carbs } = lists.dishes
  const lunchMain = pick(mains, d)
  const dinnerMain = pick(mains, d + 1)
  const lunchSide = pick(sides, d)
  const dinnerSide = pick(sides, d + 1)
  const carb = pick(carbs, 0) // rice every day

  const lunchDishes = [lunchMain, lunchSide, carb].filter((x): x is Dish => !!x)
  const dinnerDishes = [dinnerMain, dinnerSide, carb].filter((x): x is Dish => !!x)

  const dishesProteinPerDayG =
    [...lunchDishes, ...dinnerDishes].reduce((sum, dish) => sum + dish.proteinPerServingG, 0)

  const meals: MealPlan[] = [
    { meal: 'lunch', dishIds: lunchDishes.map((x) => x.id) },
    { meal: 'dinner', dishIds: dinnerDishes.map((x) => x.id) },
  ]

  const people: PersonDay[] = cfg.people.map((person) => {
    const b = computeBudget(cfg, person, dateISO, dishesProteinPerDayG)
    return {
      personId: person.id,
      name: person.name,
      targetG: person.targetG,
      protein: b.protein,
      meatGramsPerMeal: b.meatGramsPerMeal,
      meatGramsPerDay: b.meatGramsPerDay,
      wouldExceed: b.wouldExceed,
    }
  })

  return { date: dateISO, proteinId, parentProteinId, juiceId, dessertId, dishesProteinPerDayG, meals, people }
}
