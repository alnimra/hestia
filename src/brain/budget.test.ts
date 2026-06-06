import { describe, it, expect } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { computeBudget, puddingProteinG } from './budget'

const milan = DEFAULT_CONFIG.people.find((p) => p.id === 'milan')!
const mom = DEFAULT_CONFIG.people.find((p) => p.id === 'mom')!

describe('puddingProteinG (NAKPRO scoops)', () => {
  it('is base + scoops * per-scoop', () => {
    expect(puddingProteinG(DEFAULT_CONFIG, milan)).toBe(36) // 8 + 1.0*28
    expect(puddingProteinG(DEFAULT_CONFIG, mom)).toBe(22) // 8 + 0.5*28
  })
})

describe('3-source budget never goes over', () => {
  it('the meat top-up never pushes over target; over-target dishes are flagged, not reduced', () => {
    for (const person of DEFAULT_CONFIG.people) {
      for (const dishes of [0, 5, 12, 20, 50, 200]) {
        const b = computeBudget(DEFAULT_CONFIG, person, 'pork', dishes)
        expect(b.meatProteinG).toBeGreaterThanOrEqual(0)
        if (b.wouldExceed) expect(b.meatProteinG).toBe(0)
        else expect(b.puddingG + b.dishesG + b.meatProteinG).toBeLessThanOrEqual(person.targetG + 0.0001)
      }
    }
  })

  it('cooked grams (whole day and the two equal meals) never represent more than the budget', () => {
    for (const person of DEFAULT_CONFIG.people) {
      for (const dishes of [0, 10, 28, 60]) {
        const b = computeBudget(DEFAULT_CONFIG, person, 'chicken', dishes)
        const density = DEFAULT_CONFIG.proteins.chicken.proteinPer100gCooked
        expect((b.meatGramsPerDay * density) / 100).toBeLessThanOrEqual(b.meatProteinG + 0.0001)
        expect(2 * b.meatGramsPerMeal).toBeLessThanOrEqual(b.meatGramsPerDay)
      }
    }
  })

  it('when dishes already cover the target, meat is 0 and wouldExceed is set', () => {
    const b = computeBudget(DEFAULT_CONFIG, mom, 'chicken', 100) // mom target 70
    expect(b.meatProteinG).toBe(0)
    expect(b.meatGramsPerMeal).toBe(0)
    expect(b.wouldExceed).toBe(true)
  })

  it('sizes the meat from the given protein density', () => {
    // mom target 70, pudding 22, dishes 12, safety 5 -> meat 31 -> chicken 31g/100g
    // -> perDay floor(31*100/31)=100 -> perMeal 50
    const b = computeBudget(DEFAULT_CONFIG, mom, 'chicken', 12)
    expect(b.protein).toBe('chicken')
    expect(b.meatProteinG).toBe(31)
    expect(b.meatGramsPerMeal).toBe(50)
  })
})
