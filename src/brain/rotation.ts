import type { Config, Person, ProteinCategory } from './types'
import { daysSince } from './date'

const isRedMeat = (c: ProteinCategory): boolean => c === 'pork' || c === 'beef'

const wrap = (n: number, len: number): number => ((n % len) + len) % len

/** The meat-side protein for a given Da Lat date (everyone, before parent swap). */
export function mainProteinFor(cfg: Config, dateISO: string): ProteinCategory {
  const d = daysSince(cfg.epoch, dateISO)
  return cfg.mainRotation[wrap(d, cfg.mainRotation.length)]
}

/**
 * 0-based ordinal of `dateISO` among red-meat (pork/beef) days, DERIVED from the
 * live `mainRotation` array (not a hardcoded closed form), so reordering the
 * rotation in config can never silently re-map parents. Only meaningful when the
 * day is itself a red-meat day. O(rotation length), not O(days).
 */
export function redMeatOrdinal(cfg: Config, dateISO: string): number {
  const d = daysSince(cfg.epoch, dateISO)
  const L = cfg.mainRotation.length
  const redPerCycle = cfg.mainRotation.filter(isRedMeat).length
  const fullCycles = Math.floor(d / L)
  const rem = wrap(d, L)
  let partial = 0
  for (let i = 0; i <= rem; i++) if (isRedMeat(cfg.mainRotation[i])) partial++
  return fullCycles * redPerCycle + partial - 1
}

/** What mom & dad get on a pork/beef day. */
export function parentSafeProteinFor(cfg: Config, dateISO: string): ProteinCategory {
  const ord = redMeatOrdinal(cfg, dateISO)
  return cfg.parentSafeRotation[wrap(ord, cfg.parentSafeRotation.length)]
}

/**
 * Resolve which of {main, parentSafe} a person eats. Mom & dad (no pork/no beef)
 * get the parent-safe protein when the main is red meat. The dietary rule is
 * enforced here from `eatsPork`/`eatsBeef`, the single source of truth. Taking
 * `main` as a param lets an owner override the day's protein and still honor diets.
 */
export function personProtein(
  person: Person,
  main: ProteinCategory,
  parentSafe: ProteinCategory,
): ProteinCategory {
  if (main === 'pork' && !person.eatsPork) return parentSafe
  if (main === 'beef' && !person.eatsBeef) return parentSafe
  return main
}

/** The protein this person eats on this date (auto rotation, no override). */
export function proteinForPerson(cfg: Config, person: Person, dateISO: string): ProteinCategory {
  return personProtein(person, mainProteinFor(cfg, dateISO), parentSafeProteinFor(cfg, dateISO))
}
