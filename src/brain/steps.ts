import type { DayPlan } from './plan'

// The housekeeper's day as ordered meal blocks of tappable steps. Pure: derived
// from the plan + an id->{en,vi} name map + a language. Step keys are stable
// (used in task_log); only the labels change with language.

export type Lang = 'en' | 'vi'
export type NameMap = Record<string, { en: string; vi: string }>

export interface Step {
  key: string
  label: string
  detail?: string
}
export interface StepBlock {
  key: string
  time: string
  title: string
  serveAt?: string
  steps: Step[]
}

const T = {
  en: {
    breakfast: 'Breakfast', serveByBreakfast: 'serve by 7:30 AM',
    makePudding: 'Make Nutty Pudding',
    puddingDetail: 'Drain last night’s soaked nuts + chia; blend with NAKPRO scoops (Milan 1.0 · Em trai 1.5 · Bố 1.0 · Mẹ 0.5)',
    makeJuice: 'Make today’s juice', setBreakfast: 'Set the breakfast table', serveBreakfast: 'Serve breakfast',
    lunchPrep: 'Lunch prep', buyLunch: 'Cook or buy today’s lunch dishes', cookLunchMeat: 'Cook lunch meat', perPerson: 'per person',
    lunch: 'Lunch', serveAtLunch: 'serve at 12:00 PM', plate: 'Plate each person — their dishes + their meat',
    setTable: 'Set the table (chopsticks, fish sauce, water, glasses)', serveLunch: 'Serve lunch', dessert: 'Dessert / fruit',
    dinnerPrep: 'Dinner prep', buyDinner: 'Cook or buy today’s dinner dishes', cookDinnerMeat: 'Cook dinner meat — same amounts',
    dinner: 'Dinner', serveAtDinner: 'serve at 6:30 PM', plateDinner: 'Plate each person', setDinner: 'Set the table', serveDinner: 'Serve dinner',
    endOfDay: 'End of day', enterBill: 'Enter the day’s bill (cooked + bought)',
    night: 'Before bed — for tomorrow', soak: 'Soak tomorrow’s nuts + chia (cover with water, leave overnight)',
  },
  vi: {
    breakfast: 'Bữa sáng', serveByBreakfast: 'dọn trước 7:30',
    makePudding: 'Làm Nutty Pudding',
    puddingDetail: 'Để ráo hạt + chia đã ngâm tối qua; xay với NAKPRO (Milan 1.0 · Em trai 1.5 · Bố 1.0 · Mẹ 0.5)',
    makeJuice: 'Làm nước ép hôm nay', setBreakfast: 'Dọn bàn ăn sáng', serveBreakfast: 'Dọn bữa sáng ra bàn',
    lunchPrep: 'Chuẩn bị bữa trưa', buyLunch: 'Nấu hoặc mua món trưa hôm nay', cookLunchMeat: 'Nấu món đạm bữa trưa', perPerson: 'cho từng người',
    lunch: 'Bữa trưa', serveAtLunch: 'dọn lúc 12:00', plate: 'Bày món cho từng người — món ăn + phần đạm',
    setTable: 'Dọn bàn (đũa, nước mắm, nước, ly)', serveLunch: 'Dọn bữa trưa ra bàn', dessert: 'Tráng miệng / trái cây',
    dinnerPrep: 'Chuẩn bị bữa tối', buyDinner: 'Nấu hoặc mua món tối hôm nay', cookDinnerMeat: 'Nấu đạm bữa tối — cùng số lượng',
    dinner: 'Bữa tối', serveAtDinner: 'dọn lúc 18:30', plateDinner: 'Bày món cho từng người', setDinner: 'Dọn bàn', serveDinner: 'Dọn bữa tối ra bàn',
    endOfDay: 'Cuối ngày', enterBill: 'Nhập tiền chợ hôm nay (nấu + mua)',
    night: 'Trước khi ngủ — cho ngày mai', soak: 'Ngâm hạt + chia cho ngày mai (đổ nước ngập, để qua đêm)',
  },
} as const

export function stepsForDay(plan: DayPlan, names: NameMap, lang: Lang = 'en'): StepBlock[] {
  const t = T[lang]
  const nm = (id: string | null): string => (id ? (names[id]?.[lang] ?? names[id]?.en ?? id) : '—')
  const dishList = (ids: string[]): string => ids.map(nm).join(' · ')
  const weigh = plan.people.map((p) => `${p.name}: ${p.meatGramsPerMeal}g ${nm(p.protein)}`).join('  ·  ')
  const lunch = plan.meals.find((m) => m.meal === 'lunch')?.dishIds ?? []
  const dinner = plan.meals.find((m) => m.meal === 'dinner')?.dishIds ?? []

  return [
    {
      key: 'breakfast', time: '🌅 7:30', title: t.breakfast, serveAt: t.serveByBreakfast,
      steps: [
        { key: 'make_pudding', label: t.makePudding, detail: t.puddingDetail },
        { key: 'make_juice', label: `${t.makeJuice}: ${nm(plan.juiceId)}` },
        { key: 'set_breakfast', label: t.setBreakfast },
        { key: 'serve_breakfast', label: t.serveBreakfast },
      ],
    },
    {
      key: 'lunch_prep', time: '🍳 by 11:45', title: t.lunchPrep,
      steps: [
        { key: 'buy_lunch', label: t.buyLunch, detail: dishList(lunch) },
        { key: 'cook_lunch_meat', label: `${t.cookLunchMeat} — ${nm(plan.proteinId)} (${t.perPerson})`, detail: weigh },
      ],
    },
    {
      key: 'lunch', time: '🍽️ 12:00', title: t.lunch, serveAt: t.serveAtLunch,
      steps: [
        { key: 'plate_lunch', label: t.plate },
        { key: 'set_lunch', label: t.setTable },
        { key: 'serve_lunch', label: t.serveLunch },
        { key: 'dessert_lunch', label: `${t.dessert}: ${nm(plan.dessertId)}` },
      ],
    },
    {
      key: 'dinner_prep', time: '🍳 by 18:00', title: t.dinnerPrep,
      steps: [
        { key: 'buy_dinner', label: t.buyDinner, detail: dishList(dinner) },
        { key: 'cook_dinner_meat', label: t.cookDinnerMeat, detail: weigh },
      ],
    },
    {
      key: 'dinner', time: '🌙 18:30', title: t.dinner, serveAt: t.serveAtDinner,
      steps: [
        { key: 'plate_dinner', label: t.plateDinner },
        { key: 'set_dinner', label: t.setDinner },
        { key: 'serve_dinner', label: t.serveDinner },
      ],
    },
    { key: 'end', time: '🌃 end', title: t.endOfDay, steps: [{ key: 'enter_bill', label: t.enterBill }] },
    { key: 'night', time: '🌰 night', title: t.night, steps: [{ key: 'soak_nuts', label: t.soak }] },
  ]
}

export const totalSteps = (blocks: StepBlock[]): number => blocks.reduce((n, b) => n + b.steps.length, 0)
