import { describe, it, expect } from 'vitest'
import type { Person } from './types'
import { DEFAULT_CONFIG } from './config'
import { computeBudget, puddingProteinG } from './budget'

const day = (n: number) => `2026-01-${String(1 + n).padStart(2, '0')}`
const PORK_DAY = day(2)

const milan = DEFAULT_CONFIG.people.find((p) => p.id === 'milan')!
const mom = DEFAULT_CONFIG.people.find((p) => p.id === 'mom')!

describe('puddingProteinG (NAKPRO scoops)', () => {
  it('is base + scoops * per-scoop', () => {
    // base 8 + 1.0 * 28
    expect(puddingProteinG(DEFAULT_CONFIG, milan)).toBe(36)
    // base 8 + 0.5 * 28
    expect(puddingProteinG(DEFAULT_CONFIG, mom)).toBe(22)
  })
})

describe('3-source budget never goes over', () => {
  it('the meat top-up never pushes anyone over target; over-target dishes are flagged, not reduced', () => {
    for (const person of DEFAULT_CONFIG.people) {
      for (const dishes of [0, 5, 12, 20, 50, 200]) {
        const b = computeBudget(DEFAULT_CONFIG, person, PORK_DAY, dishes)
        expect(b.meatProteinG).toBeGreaterThanOrEqual(0)
        if (b.wouldExceed) {
          // dishes alone already meet/exceed target -> add NO meat (and flag it).
          // We never reduce the dishes the helper already has.
          expect(b.meatProteinG).toBe(0)
        } else {
          expect(b.puddingG + b.dishesG + b.meatProteinG).toBeLessThanOrEqual(person.targetG + 0.0001)
        }
      }
    }
  })

  it('floored cooked grams never represent more protein than the per-meal allowance', () => {
    const b = computeBudget(DEFAULT_CONFIG, milan, PORK_DAY, 28)
    const density = DEFAULT_CONFIG.proteins[b.protein].proteinPer100gCooked
    const proteinFromGrams = (b.meatGramsPerMeal * density) / 100
    const allowedPerMeal = b.meatProteinG * DEFAULT_CONFIG.mealSplit
    expect(proteinFromGrams).toBeLessThanOrEqual(allowedPerMeal + 0.0001)
  })

  it('when dishes already cover the target, meat is 0 and wouldExceed is flagged', () => {
    const b = computeBudget(DEFAULT_CONFIG, mom, PORK_DAY, 100) // mom target 70
    expect(b.meatProteinG).toBe(0)
    expect(b.meatGramsPerMeal).toBe(0)
    expect(b.wouldExceed).toBe(true)
  })
})

describe('parent-safe meat in the budget', () => {
  it('mom gets a parent-safe protein on red-meat days, never pork/beef', () => {
    // Default phase-lock: pork day -> chicken, beef day -> fish for the parents.
    const onPork = computeBudget(DEFAULT_CONFIG, mom, day(2), 12)
    expect(onPork.protein).toBe('chicken')
    expect(onPork.protein).not.toBe('pork')
    // mom target 70, pudding 22, dishes 12, safety 5 -> meat 31 -> per meal 15.5
    // -> chicken 31g/100g -> floor(15.5*100/31)=floor(50)=50g
    expect(onPork.meatProteinG).toBe(31)
    expect(onPork.meatGramsPerMeal).toBe(50)

    const onBeef = computeBudget(DEFAULT_CONFIG, mom, day(3), 12)
    expect(onBeef.protein).toBe('fish')
  })

  it('a person eating today vs a high-protein day are both clamped, never over', () => {
    const guest: Person = { id: 'guest', name: 'Guest', targetG: 90, eatsPork: true, eatsBeef: true, puddingScoops: 0, safetyMarginG: 0 }
    const b = computeBudget(DEFAULT_CONFIG, guest, PORK_DAY, 0)
    // pudding = 8, dishes 0, safety 0 -> meat 82
    expect(b.puddingG).toBe(8)
    expect(b.meatProteinG).toBe(82)
    expect(b.protein).toBe('pork')
  })
})
