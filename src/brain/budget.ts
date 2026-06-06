import type { Config, Person, ProteinCategory } from './types'

export interface PersonBudget {
  personId: string
  targetG: number
  plannedTargetG: number
  puddingG: number
  dishesG: number
  protein: ProteinCategory
  meatProteinG: number
  meatGramsPerDay: number
  meatGramsPerMeal: number
  servedMeatProteinG: number
  totalProteinG: number
  targetGapG: number
  wouldExceed: boolean
}

export function puddingProteinG(cfg: Config, person: Person): number {
  return cfg.puddingBaseProteinG + person.puddingScoops * cfg.nakproScoopProteinG
}

/**
 * The 3-source protein budget: planned target = nominal target + per-person
 * buffer. Sons can aim over because dish estimates may undercount; parents can
 * keep a conservative under-target buffer.
 *   meat = max(0, plannedTarget - pudding - dishes)
 *
 * `protein` is the cooked cut this person actually gets (the parent-safe swap is
 * resolved by the caller). Cooked grams are computed for the whole day and floored;
 * the served day is two EQUAL meals via floor(perDay/2), so the served meat can
 * never exceed the daily budget. If pudding + dishes already meet the planned
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
  const plannedTargetG = person.targetG + person.proteinBufferG
  const meatProteinG = Math.max(0, plannedTargetG - puddingG - dishesG)
  const wouldExceed = puddingG + dishesG >= plannedTargetG

  const density = cfg.proteins[protein].proteinPer100gCooked
  const meatGramsPerDay = Math.floor((meatProteinG * 100) / density)
  const meatGramsPerMeal = Math.floor(meatGramsPerDay / 2)
  const servedMeatProteinG = (meatGramsPerMeal * 2 * density) / 100
  const totalProteinG = puddingG + dishesG + servedMeatProteinG
  const targetGapG = person.targetG - totalProteinG

  return {
    personId: person.id,
    targetG: person.targetG,
    plannedTargetG,
    puddingG,
    dishesG,
    protein,
    meatProteinG,
    meatGramsPerDay,
    meatGramsPerMeal,
    servedMeatProteinG,
    totalProteinG,
    targetGapG,
    wouldExceed,
  }
}
