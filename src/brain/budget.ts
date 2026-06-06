import type { Config, Person, ProteinCategory } from './types'

export interface PersonBudget {
  personId: string
  targetG: number
  puddingG: number
  dishesG: number
  protein: ProteinCategory
  meatProteinG: number
  meatGramsPerDay: number
  meatGramsPerMeal: number
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
 * `protein` is the cooked meat this person actually gets (the parent-safe swap is
 * resolved by the caller). Cooked grams are computed for the whole day and floored;
 * the day is split into two EQUAL meals via floor(perDay/2), so two meals never
 * exceed the daily budget (split-independent). If pudding + dishes already meet
 * target, meat is 0 and `wouldExceed` is set (we clamp, we do not reduce dishes).
 */
export function computeBudget(
  cfg: Config,
  person: Person,
  protein: ProteinCategory,
  dishesProteinPerDayG: number,
): PersonBudget {
  const puddingG = puddingProteinG(cfg, person)
  const dishesG = Math.max(0, dishesProteinPerDayG)
  const meatProteinG = Math.max(0, person.targetG - puddingG - dishesG - person.safetyMarginG)
  const wouldExceed = puddingG + dishesG >= person.targetG

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
