import { describe, it, expect } from 'vitest'
import type { Config } from './types'
import { DEFAULT_CONFIG } from './config'
import { mainProteinFor, parentSafeProteinFor, proteinForPerson, redMeatOrdinal } from './rotation'

// epoch 2026-01-01 = day 0; small day-index -> date string helper.
const day = (n: number) => `2026-01-${String(1 + n).padStart(2, '0')}`

const dad = DEFAULT_CONFIG.people.find((p) => p.id === 'dad')!
const milan = DEFAULT_CONFIG.people.find((p) => p.id === 'milan')!

describe('mainProteinFor', () => {
  it('cycles chicken -> fish -> pork -> beef deterministically', () => {
    expect(mainProteinFor(DEFAULT_CONFIG, day(0))).toBe('chicken')
    expect(mainProteinFor(DEFAULT_CONFIG, day(1))).toBe('fish')
    expect(mainProteinFor(DEFAULT_CONFIG, day(2))).toBe('pork')
    expect(mainProteinFor(DEFAULT_CONFIG, day(3))).toBe('beef')
    expect(mainProteinFor(DEFAULT_CONFIG, day(4))).toBe('chicken')
  })
})

describe('parent-safe swap (no pork/beef for mom & dad)', () => {
  it('sons get the main protein; parents get the parent-safe protein on red-meat days', () => {
    // day 2 = pork
    expect(proteinForPerson(DEFAULT_CONFIG, milan, day(2))).toBe('pork')
    expect(proteinForPerson(DEFAULT_CONFIG, dad, day(2))).not.toBe('pork')
    expect(proteinForPerson(DEFAULT_CONFIG, dad, day(2))).not.toBe('beef')
    // day 3 = beef
    expect(proteinForPerson(DEFAULT_CONFIG, milan, day(3))).toBe('beef')
    expect(proteinForPerson(DEFAULT_CONFIG, dad, day(3))).not.toBe('beef')
    // chicken/fish days: everyone shares
    expect(proteinForPerson(DEFAULT_CONFIG, dad, day(0))).toBe('chicken')
    expect(proteinForPerson(DEFAULT_CONFIG, dad, day(1))).toBe('fish')
  })

  it('documents the default phase-lock: parents get chicken on EVERY pork day, fish on EVERY beef day', () => {
    // With parentSafeRotation length 2 and 2 red-meat days per cycle, this is
    // deterministic. Asserting it so a future config change that re-locks (or
    // accidentally unlocks) parents is caught. Pork days: 2, 6, 10. Beef: 3, 7, 11.
    for (const d of [2, 6, 10]) expect(parentSafeProteinFor(DEFAULT_CONFIG, day(d))).toBe('chicken')
    for (const d of [3, 7, 11]) expect(parentSafeProteinFor(DEFAULT_CONFIG, day(d))).toBe('fish')
  })
})

describe('redMeatOrdinal is derived from the live rotation array', () => {
  it('reordering mainRotation re-maps the parent-safe protein (not hardcoded)', () => {
    // Put beef first: day 0 is now a red-meat day -> ordinal 0 -> parentSafe[0]=chicken.
    const reordered: Config = { ...DEFAULT_CONFIG, mainRotation: ['beef', 'pork', 'chicken', 'fish'] }
    expect(mainProteinFor(reordered, day(0))).toBe('beef')
    expect(parentSafeProteinFor(reordered, day(0))).toBe('chicken')
    expect(mainProteinFor(reordered, day(1))).toBe('pork')
    expect(parentSafeProteinFor(reordered, day(1))).toBe('fish')
  })

  it('a coprime parent rotation breaks the phase-lock (gives variety)', () => {
    // 3 parent options vs 2 red-meat days per cycle -> pork is not always chicken.
    const varied: Config = { ...DEFAULT_CONFIG, parentSafeRotation: ['chicken', 'fish', 'chicken'] }
    // red-meat ordinals 0,1,2,3,4,5 -> index %3 -> 0,1,2,0,1,2
    const porkAndBeefDays = [2, 3, 6, 7, 10, 11]
    const got = porkAndBeefDays.map((d) => parentSafeProteinFor(varied, day(d)))
    // Not all the same across the six red-meat days.
    expect(new Set(got).size).toBeGreaterThan(1)
  })
})

describe('redMeatOrdinal oracle + asymmetric eaters', () => {
  it('matches an independent brute-force red-meat count over a range', () => {
    const isRed = (c: string) => c === 'pork' || c === 'beef'
    let naive = -1
    for (let d = 0; d <= 27; d++) {
      const main = DEFAULT_CONFIG.mainRotation[d % DEFAULT_CONFIG.mainRotation.length]
      if (isRed(main)) {
        naive++
        expect(redMeatOrdinal(DEFAULT_CONFIG, day(d))).toBe(naive)
      }
    }
  })

  it('an asymmetric eater (pork yes, beef no) is swapped only on beef days', () => {
    const p = { id: 'x', name: 'X', targetG: 100, eatsPork: true, eatsBeef: false, puddingScoops: 0, safetyMarginG: 0 }
    expect(proteinForPerson(DEFAULT_CONFIG, p, day(2))).toBe('pork') // pork day: he eats pork
    expect(proteinForPerson(DEFAULT_CONFIG, p, day(3))).not.toBe('beef') // beef day: swapped off beef
  })
})
