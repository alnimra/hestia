import { describe, it, expect } from 'vitest'
import type { Dish } from './types'
import { DEFAULT_CONFIG } from './config'
import { computeDayPlan, type PlanLists } from './plan'

const day = (n: number) => `2026-01-${String(1 + n).padStart(2, '0')}`

const mkDish = (id: string, type: Dish['type'], protein: number, standalone = false): Dish => ({
  id,
  nameEn: id,
  nameVi: id,
  type,
  proteinPerServingG: protein,
  parentSafe: true,
  serveStyle: 'reheat',
  needsAssembly: false,
  standalone,
})

const lists: PlanLists = {
  juices: ['pennywort', 'brahmi', 'soy_milk', 'orange'],
  desserts: ['du_du', 'che_dau_xanh', 'banh_flan'],
  dishes: {
    mains: [
      mkDish('pho', 'main', 25, true), // one-bowl, served alone
      mkDish('fish', 'main', 22),
      mkDish('chk', 'main', 24),
      mkDish('squid', 'main', 18),
    ],
    sides: [mkDish('greens', 'side', 3), mkDish('soup', 'side', 4)],
    carbs: [mkDish('rice', 'carb', 4), mkDish('noodle', 'carb', 6), mkDish('banh_mi', 'carb', 8)],
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

  it('serves one-bowl mains alone; protein-sets get a side + carb', () => {
    const p = computeDayPlan(DEFAULT_CONFIG, day(0), lists) // lunch main idx 0 = pho (standalone)
    expect(p.meals).toHaveLength(2)
    const lunch = p.meals.find((m) => m.meal === 'lunch')!
    const dinner = p.meals.find((m) => m.meal === 'dinner')!
    expect(lunch.dishIds).toEqual(['pho']) // complete bowl, no rice tacked on
    expect(dinner.dishIds.length).toBe(3) // rice-set: main + side + carb
    expect(dinner.dishIds.some((id) => ['rice', 'noodle', 'banh_mi'].includes(id))).toBe(true)
  })

  it('rotates the carb across days (no more banh mi every meal)', () => {
    const carbs = new Set<string>()
    for (let i = 0; i < 6; i++) {
      const p = computeDayPlan(DEFAULT_CONFIG, day(i), lists)
      for (const m of p.meals) for (const id of m.dishIds) if (['rice', 'noodle', 'banh_mi'].includes(id)) carbs.add(id)
    }
    expect(carbs.size).toBeGreaterThan(1)
  })

  it('never serves the same main at lunch and dinner', () => {
    for (let i = 0; i < 8; i++) {
      const p = computeDayPlan(DEFAULT_CONFIG, day(i), lists)
      expect(p.meals[0].dishIds[0]).not.toBe(p.meals[1].dishIds[0])
    }
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
