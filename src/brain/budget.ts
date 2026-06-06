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
  /** cooked grams of meat to weigh PER MEAL, rounded DOWN so we never tip over. */
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
 * Grams-protein -> cooked-grams is floored so rounding can only land under, never
 * over. If pudding + dishes already meet target, meat is 0 and `wouldExceed` flags
 * it (we clamp the meat to 0; we do NOT reduce the dishes the helper already has).
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
  const meatProteinPerMeal = meatProteinG * cfg.mealSplit
  const meatGramsPerMeal = Math.floor((meatProteinPerMeal * 100) / density)

  return {
    personId: person.id,
    targetG: person.targetG,
    puddingG,
    dishesG,
    protein,
    meatProteinG,
    meatGramsPerMeal,
    wouldExceed,
  }
}
