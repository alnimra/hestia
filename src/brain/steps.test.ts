import { describe, it, expect } from 'vitest'
import type { DayPlan } from './plan'
import type { NameMap, PuddingRecipe } from './steps'
import { stepsForDay, totalSteps } from './steps'

const plan: DayPlan = {
  date: '2026-01-03', source: 'auto', proteinId: 'pork', parentProteinId: 'chicken',
  juiceId: 'pennywort', dessertId: 'du_du', dishesProteinPerDayG: 40, guestCount: 0, places: 2,
  meals: [
    { meal: 'lunch', dishIds: ['goi_cuon', 'rau_muong_xao', 'com_trang'] },
    { meal: 'dinner', dishIds: ['ca_thu_kho', 'canh_bi_do', 'com_trang'] },
  ],
  people: [
    {
      personId: 'milan', name: 'Milan', targetG: 140, protein: 'pork',
      meatGramsPerMeal: 70, meatGramsPerDay: 140, puddingG: 36, dishesG: 40,
      servedMeatProteinG: 36.638, totalProteinG: 112.638, targetGapG: 27.362, wouldExceed: false,
    },
    {
      personId: 'mom', name: 'Mẹ', targetG: 70, protein: 'chicken',
      meatGramsPerMeal: 0, meatGramsPerDay: 0, puddingG: 22, dishesG: 40,
      servedMeatProteinG: 0, totalProteinG: 62, targetGapG: 8, wouldExceed: true,
    },
  ],
  roster: [
    { id: 'milan', name: 'Milan', eating: true },
    { id: 'mom', name: 'Mẹ', eating: true },
  ],
}

const names: NameMap = {
  pennywort: { en: 'Pennywort juice', vi: 'Nước rau má' },
  du_du: { en: 'Papaya', vi: 'Đu đủ' },
  goi_cuon: { en: 'Summer rolls', vi: 'Gỏi cuốn', serveStyle: 'assemble', needsAssembly: true },
  rau_muong_xao: { en: 'Water spinach', vi: 'Rau muống xào', serveStyle: 'reheat' },
  com_trang: { en: 'Rice', vi: 'Cơm trắng', serveStyle: 'cook_fresh' },
  ca_thu_kho: { en: 'Braised mackerel', vi: 'Cá thu kho', serveStyle: 'reheat' },
  canh_bi_do: { en: 'Pumpkin soup', vi: 'Canh bí đỏ', serveStyle: 'reheat' },
  pork: { en: 'Pork', vi: 'Heo' },
  chicken: { en: 'Chicken', vi: 'Gà' },
}

const pudding: PuddingRecipe = {
  ingredients: [{ label: 'Ground macadamia', qty: '3 Tbsp' }, { label: 'NAKPRO pea protein', qty: 'per scoops' }],
  scoops: [{ name: 'Milan', scoops: 1 }, { name: 'Mẹ', scoops: 0.5 }],
}

describe('stepsForDay', () => {
  const blocks = stepsForDay(plan, names, 'en', pudding)
  const find = (bk: string, sk: string) => blocks.find((b) => b.key === bk)!.steps.find((s) => s.key === sk)!

  it('orders the meal blocks; breakfast is now 9:30', () => {
    expect(blocks.map((b) => b.key)).toEqual(['breakfast', 'lunch_prep', 'lunch', 'dinner_prep', 'dinner', 'end', 'night'])
    expect(blocks.find((b) => b.key === 'breakfast')!.time).toContain('9:30')
    expect(blocks.find((b) => b.key === 'breakfast')!.serveAt).toContain('9:30')
  })

  it('attaches the cook step’s weigh table + parent warning', () => {
    const cook = find('lunch_prep', 'cook_lunch_meat')
    expect(cook.weigh).toEqual([
      { name: 'Milan', grams: 70, protein: 'Pork' },
      { name: 'Mẹ', grams: 0, protein: 'Chicken' },
    ])
    expect(cook.warn).toContain('Chicken') // parents swapped off pork
  })

  it('attaches the day’s dishes with serve-styles to the buy step', () => {
    const buy = find('lunch_prep', 'buy_lunch')
    expect(buy.dishes?.map((d) => d.name)).toContain('Summer rolls')
    const rolls = buy.dishes?.find((d) => d.id === 'goi_cuon')
    expect(rolls?.serveStyle).toBe('assemble')
    expect(rolls?.needsAssembly).toBe(true)
  })

  it('attaches the pudding recipe to the make-pudding step', () => {
    const p = find('breakfast', 'make_pudding')
    expect(p.recipe?.ingredients.length).toBeGreaterThan(0)
    expect(p.recipe?.scoops.find((s) => s.name === 'Milan')?.scoops).toBe(1)
  })

  it('puts finished Nutty Pudding in the fridge so breakfast is just ready', () => {
    const chill = find('breakfast', 'chill_pudding')
    expect(chill.label).toBe('Put Nutty Pudding in the fridge')
    expect(chill.detail).toContain('whenever')
    expect(blocks.find((b) => b.key === 'breakfast')!.serveAt).toContain('fridge')
  })

  it('translates to Vietnamese (labels, dish + protein names) with stable keys', () => {
    const vi = stepsForDay(plan, names, 'vi', pudding)
    expect(vi.find((b) => b.key === 'breakfast')!.title).toBe('Bữa sáng')
    expect(vi.find((b) => b.key === 'lunch_prep')!.steps.find((s) => s.key === 'buy_lunch')!.dishes?.map((d) => d.name)).toContain('Gỏi cuốn')
    expect(vi.find((b) => b.key === 'lunch_prep')!.steps.find((s) => s.key === 'cook_lunch_meat')!.weigh?.[0].protein).toBe('Heo')
    const enKeys = blocks.flatMap((b) => b.steps.map((s) => s.key))
    const viKeys = vi.flatMap((b) => b.steps.map((s) => s.key))
    expect(enKeys).toEqual(viKeys)
  })

  it('counts ~15 steps', () => {
    expect(totalSteps(blocks)).toBeGreaterThanOrEqual(14)
  })
})
