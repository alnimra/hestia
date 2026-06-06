import { describe, it, expect } from 'vitest'
import type { DayPlan } from './plan'
import { stepsForDay, totalSteps } from './steps'

const plan: DayPlan = {
  date: '2026-01-03',
  proteinId: 'pork',
  parentProteinId: 'chicken',
  juiceId: 'pennywort',
  dessertId: 'du_du',
  dishesProteinPerDayG: 40,
  meals: [
    { meal: 'lunch', dishIds: ['goi_cuon', 'rau_muong_xao', 'com_trang'] },
    { meal: 'dinner', dishIds: ['ca_thu_kho', 'canh_bi_do', 'com_trang'] },
  ],
  people: [
    { personId: 'milan', name: 'Milan', targetG: 140, protein: 'pork', meatGramsPerMeal: 70, meatGramsPerDay: 140, wouldExceed: false },
    { personId: 'mom', name: 'Mẹ', targetG: 70, protein: 'chicken', meatGramsPerMeal: 0, meatGramsPerDay: 0, wouldExceed: true },
  ],
}

const names: Record<string, string> = {
  pennywort: 'Pennywort juice', du_du: 'Papaya', goi_cuon: 'Summer rolls',
  rau_muong_xao: 'Water spinach', com_trang: 'Rice', ca_thu_kho: 'Braised mackerel',
  canh_bi_do: 'Pumpkin soup', pork: 'Pork', chicken: 'Chicken',
}

describe('stepsForDay', () => {
  const blocks = stepsForDay(plan, names)

  it('produces the ordered meal blocks with serve times', () => {
    expect(blocks.map((b) => b.key)).toEqual([
      'breakfast', 'lunch_prep', 'lunch', 'dinner_prep', 'dinner', 'end', 'night',
    ])
    expect(blocks.find((b) => b.key === 'lunch')!.serveAt).toContain('12:00')
  })

  it('embeds the named juice, dessert and dishes (not raw ids)', () => {
    const labels = blocks.flatMap((b) => b.steps.map((s) => s.label + (s.detail ?? '')))
    expect(labels.join(' ')).toContain('Pennywort juice')
    expect(labels.join(' ')).toContain('Papaya')
    expect(labels.join(' ')).toContain('Summer rolls')
  })

  it('the cook step lists each person’s per-meal grams + their protein', () => {
    const cook = blocks.find((b) => b.key === 'lunch_prep')!.steps.find((s) => s.key === 'cook_lunch_meat')!
    expect(cook.detail).toContain('Milan: 70g Pork')
    expect(cook.detail).toContain('Mẹ: 0g Chicken') // parent-safe + never-over clamp shows through
  })

  it('counts ~15 steps for the day', () => {
    expect(totalSteps(blocks)).toBeGreaterThanOrEqual(14)
  })
})
