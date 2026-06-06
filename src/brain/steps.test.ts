import { describe, it, expect } from 'vitest'
import type { DayPlan } from './plan'
import type { NameMap } from './steps'
import { stepsForDay, totalSteps } from './steps'

const plan: DayPlan = {
  date: '2026-01-03',
  source: 'auto',
  proteinId: 'pork',
  parentProteinId: 'chicken',
  juiceId: 'pennywort',
  dessertId: 'du_du',
  dishesProteinPerDayG: 40,
  guestCount: 0,
  places: 2,
  meals: [
    { meal: 'lunch', dishIds: ['goi_cuon', 'rau_muong_xao', 'com_trang'] },
    { meal: 'dinner', dishIds: ['ca_thu_kho', 'canh_bi_do', 'com_trang'] },
  ],
  people: [
    { personId: 'milan', name: 'Milan', targetG: 140, protein: 'pork', meatGramsPerMeal: 70, meatGramsPerDay: 140, wouldExceed: false },
    { personId: 'mom', name: 'Mẹ', targetG: 70, protein: 'chicken', meatGramsPerMeal: 0, meatGramsPerDay: 0, wouldExceed: true },
  ],
  roster: [
    { id: 'milan', name: 'Milan', eating: true },
    { id: 'mom', name: 'Mẹ', eating: true },
  ],
}

const names: NameMap = {
  pennywort: { en: 'Pennywort juice', vi: 'Nước rau má' },
  du_du: { en: 'Papaya', vi: 'Đu đủ' },
  goi_cuon: { en: 'Summer rolls', vi: 'Gỏi cuốn' },
  rau_muong_xao: { en: 'Water spinach', vi: 'Rau muống xào' },
  com_trang: { en: 'Rice', vi: 'Cơm trắng' },
  ca_thu_kho: { en: 'Braised mackerel', vi: 'Cá thu kho' },
  canh_bi_do: { en: 'Pumpkin soup', vi: 'Canh bí đỏ' },
  pork: { en: 'Pork', vi: 'Heo' },
  chicken: { en: 'Chicken', vi: 'Gà' },
}

describe('stepsForDay', () => {
  const blocks = stepsForDay(plan, names, 'en')

  it('produces the ordered meal blocks with serve times', () => {
    expect(blocks.map((b) => b.key)).toEqual(['breakfast', 'lunch_prep', 'lunch', 'dinner_prep', 'dinner', 'end', 'night'])
    expect(blocks.find((b) => b.key === 'lunch')!.serveAt).toContain('12:00')
  })

  it('embeds the named juice, dessert and dishes (not raw ids)', () => {
    const text = blocks.flatMap((b) => b.steps.map((s) => s.label + (s.detail ?? ''))).join(' ')
    expect(text).toContain('Pennywort juice')
    expect(text).toContain('Papaya')
    expect(text).toContain('Summer rolls')
  })

  it('the cook step lists each person’s per-meal grams + protein', () => {
    const cook = blocks.find((b) => b.key === 'lunch_prep')!.steps.find((s) => s.key === 'cook_lunch_meat')!
    expect(cook.detail).toContain('Milan: 70g Pork')
    expect(cook.detail).toContain('Mẹ: 0g Chicken')
  })

  it('translates labels and dish names to Vietnamese', () => {
    const vi = stepsForDay(plan, names, 'vi')
    expect(vi.find((b) => b.key === 'breakfast')!.title).toBe('Bữa sáng')
    const text = vi.flatMap((b) => b.steps.map((s) => s.label + (s.detail ?? ''))).join(' ')
    expect(text).toContain('Nước rau má') // juice name (vi)
    expect(text).toContain('Gỏi cuốn') // dish name (vi)
    expect(text).toContain('Heo') // protein (vi) in the weigh detail
  })

  it('keeps stable step keys across languages', () => {
    const en = stepsForDay(plan, names, 'en').flatMap((b) => b.steps.map((s) => s.key))
    const vi = stepsForDay(plan, names, 'vi').flatMap((b) => b.steps.map((s) => s.key))
    expect(en).toEqual(vi)
  })

  it('counts ~15 steps for the day', () => {
    expect(totalSteps(blocks)).toBeGreaterThanOrEqual(14)
  })
})
