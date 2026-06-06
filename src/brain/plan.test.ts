import { describe, it, expect } from 'vitest'
import type { Dish } from './types'
import { DEFAULT_CONFIG } from './config'
import { computeDayPlan, type PlanLists } from './plan'

const day = (n: number) => `2026-01-${String(1 + n).padStart(2, '0')}`

const mkDish = (id: string, type: Dish['type'], protein: number): Dish => ({
  id,
  nameEn: id,
  nameVi: id,
  type,
  proteinPerServingG: protein,
  parentSafe: true,
  serveStyle: 'reheat',
  needsAssembly: false,
})

const lists: PlanLists = {
  juices: ['pennywort', 'brahmi', 'soy_milk', 'orange'],
  desserts: ['du_du', 'che_dau_xanh', 'banh_flan'],
  dishes: {
    mains: [mkDish('m1', 'main', 20), mkDish('m2', 'main', 14), mkDish('m3', 'main', 18)],
    sides: [mkDish('s1', 'side', 3), mkDish('s2', 'side', 2)],
    carbs: [mkDish('rice', 'carb', 4)],
  },
}

describe('computeDayPlan', () => {
  it('is deterministic and matches the rotation for the protein/parent-safe meat', () => {
    const p = computeDayPlan(DEFAULT_CONFIG, day(2), lists) // day 2 = pork
    expect(p.proteinId).toBe('pork')
    expect(p.parentProteinId).toBe('chicken') // pork day -> parents chicken (default phase-lock)
    expect(computeDayPlan(DEFAULT_CONFIG, day(2), lists)).toEqual(p) // pure / stable
  })

  it('parents differ from the main ONLY on pork/beef days (no spurious swap)', () => {
    // chicken day: parents eat chicken, NOT the swap-rotation value -> field == main
    const chicken = computeDayPlan(DEFAULT_CONFIG, day(0), lists)
    expect(chicken.proteinId).toBe('chicken')
    expect(chicken.parentProteinId).toBe('chicken')
    expect(chicken.people.find((x) => x.personId === 'mom')!.protein).toBe('chicken')
    // fish day: same — parents eat fish
    const fish = computeDayPlan(DEFAULT_CONFIG, day(1), lists)
    expect(fish.proteinId).toBe('fish')
    expect(fish.parentProteinId).toBe('fish')
    // beef day: parents swap off red meat
    const beef = computeDayPlan(DEFAULT_CONFIG, day(3), lists)
    expect(beef.proteinId).toBe('beef')
    expect(beef.parentProteinId).not.toBe('beef')
    expect(beef.people.find((x) => x.personId === 'mom')!.protein).toBe(beef.parentProteinId)
  })

  it('rotates juice and dessert by day index', () => {
    expect(computeDayPlan(DEFAULT_CONFIG, day(0), lists).juiceId).toBe('pennywort')
    expect(computeDayPlan(DEFAULT_CONFIG, day(1), lists).juiceId).toBe('brahmi')
    expect(computeDayPlan(DEFAULT_CONFIG, day(4), lists).juiceId).toBe('pennywort') // wraps (len 4)
    expect(computeDayPlan(DEFAULT_CONFIG, day(0), lists).dessertId).toBe('du_du')
  })

  it('builds two meals (rice every day) and sums the dish protein', () => {
    const p = computeDayPlan(DEFAULT_CONFIG, day(0), lists)
    expect(p.meals).toHaveLength(2)
    for (const m of p.meals) expect(m.dishIds).toContain('rice')
    // lunch [m1=20, s1=3, rice=4] + dinner [m2=14, s2=2, rice=4] = 47
    expect(p.dishesProteinPerDayG).toBe(47)
  })

  it('gives every person a never-over meat portion; parents get the parent-safe meat', () => {
    const p = computeDayPlan(DEFAULT_CONFIG, day(2), lists) // pork day
    expect(p.people).toHaveLength(4)
    const mom = p.people.find((x) => x.personId === 'mom')!
    const milan = p.people.find((x) => x.personId === 'milan')!
    expect(milan.protein).toBe('pork')
    expect(mom.protein).toBe('chicken') // parent-safe, never pork
    for (const person of p.people) {
      expect(person.meatGramsPerMeal).toBeGreaterThanOrEqual(0)
      expect(2 * person.meatGramsPerMeal).toBeLessThanOrEqual(person.meatGramsPerDay)
    }
  })
})
