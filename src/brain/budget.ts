import type { Config, Person, ProteinCategory } from './types'
import { proteinForPerson } from './rotation'

export interface PersonBudget {
  personId: string
  targetG: number
  /** protein from the Nutty Pudding (NAKPRO scoops + base). */
  puddingG: number
  /** protein the day's Vietnamese dishes contribute to this person (both meals). */
  dishesG: number
  /** which meat this person gets today (parent-safe swap already applied). */
  protein: ProteinCategory
  /** cooked-meat top-up protein for the whole day (clamped >= 0). */
  meatProteinG: number
  /** cooked grams of meat for the WHOLE day, floored (never represents > budget). */
  meatGramsPerDay: number
  /** cooked grams to weigh at EACH of the two meals (equal split, floor(day/2)). */
  meatGramsPerMeal: number
  /** true if pudding + dishes already meet/exceed target (meat is then 0). */
  wouldExceed: boolean
}

export function puddingProteinG(cfg: Config, person: Person): number {
  return cfg.puddingBaseProteinG + person.puddingScoops * cfg.nakproScoopProteinG
}

/**
 * The 3-source protein budget: target = pudding + dishes + meat top-up, sized so
 * the total lands ON target and never over.
 *   meat = max(0, target - pudding - dishes - safetyMargin)
 *
 * Cooked grams are computed for the WHOLE day and floored, so the day never
 * represents more protein than the budget. The day is split into two EQUAL meals
 * via floor(perDay / 2): since 2 * floor(perDay/2) <= perDay, two meals can never
 * exceed the daily budget — and this holds regardless of any split fraction, which
 * removes the "only safe at mealSplit=0.5" footgun (review P0-1).
 *
 * If pudding + dishes already meet target, meat is 0 and `wouldExceed` is set; we
 * clamp the meat to 0, we do NOT reduce the dishes the helper already has.
 * (Note: meat can also legitimately be 0 within the safety margin; `wouldExceed`
 * is strictly the dishes-meet-or-exceed-target case.)
 */
export function computeBudget(
  cfg: Config,
  person: Person,
  dateISO: string,
  dishesProteinPerDayG: number,
): PersonBudget {
  const puddingG = puddingProteinG(cfg, person)
  const dishesG = Math.max(0, dishesProteinPerDayG)
  const meatProteinG = Math.max(0, person.targetG - puddingG - dishesG - person.safetyMarginG)
  const wouldExceed = puddingG + dishesG >= person.targetG

  const protein = proteinForPerson(cfg, person, dateISO)
  const density = cfg.proteins[protein].proteinPer100gCooked
  const meatGramsPerDay = Math.floor((meatProteinG * 100) / density)
  const meatGramsPerMeal = Math.floor(meatGramsPerDay / 2)

  return {
    personId: person.id,
    targetG: person.targetG,
    puddingG,
    dishesG,
    protein,
    meatProteinG,
    meatGramsPerDay,
    meatGramsPerMeal,
    wouldExceed,
  }
}
