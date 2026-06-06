import type { Config, ProteinCategory } from './types'

const RED_MEAT: ProteinCategory[] = ['pork', 'beef']

/**
 * Fail fast on a bad config. Call once at Worker startup (and in tests). Guards
 * the foot-guns a future owner-editable config could introduce (review P1-1/P1-2):
 *  - empty rotation arrays -> NaN indices -> crashes
 *  - a red-meat entry in parentSafeRotation -> would feed mom/dad pork/beef,
 *    silently defeating the whole no-pork/no-beef rule
 *  - a zero/negative protein density -> divide-by-zero in the budget
 *  - a generic protein entry with no specific cooked cut/source -> bad portions
 */
export function validateConfig(cfg: Config): void {
  if (cfg.mainRotation.length < 1) throw new Error('config: mainRotation must be non-empty')
  if (cfg.parentSafeRotation.length < 1) throw new Error('config: parentSafeRotation must be non-empty')

  for (const p of cfg.parentSafeRotation) {
    if (RED_MEAT.includes(p)) {
      throw new Error(
        `config: parentSafeRotation must not contain red meat (got "${p}") — it would feed mom/dad pork/beef`,
      )
    }
  }

  for (const cat of [...cfg.mainRotation, ...cfg.parentSafeRotation]) {
    const protein = cfg.proteins[cat]
    if (!protein) throw new Error(`config: missing protein definition for "${cat}"`)
    if (!protein.cutEn || !protein.cutVi) {
      throw new Error(`config: protein "${cat}" must name the specific cooked cut`)
    }
    if (!protein.source?.fdcId || !protein.source.description) {
      throw new Error(`config: protein "${cat}" must include a USDA FoodData Central source`)
    }
    if (!(protein.proteinPer100gCooked > 0)) {
      throw new Error(`config: protein "${cat}" must have proteinPer100gCooked > 0`)
    }
  }

  if (cfg.people.length < 1) throw new Error('config: people must be non-empty')
}
