import type { DayPlan } from './plan'

// The housekeeper's day as ordered meal blocks of tappable steps. Each step can
// carry STRUCTURED detail (a weigh table, the day's dishes + how to serve each, the
// pudding recipe, a dietary warning) that the UI expands on tap. Pure: derived from
// the plan + the loaded names/serve-styles + an optional pudding recipe + language.

export type Lang = 'en' | 'vi'
export type ServeStyle = 'assemble' | 'reheat' | 'plate_garnish' | 'cook_fresh' | 'serve_chilled'
export type NameMap = Record<string, { en: string; vi: string; serveStyle?: ServeStyle; needsAssembly?: boolean }>

export interface WeighRow { name: string; grams: number; protein: string }
export interface DishItem { id: string; name: string; serveStyle?: ServeStyle; needsAssembly?: boolean }
export interface PuddingRecipe {
  ingredients: { label: string; qty: string }[]
  scoops: { name: string; scoops: number }[]
}

export interface Step {
  key: string
  label: string
  detail?: string
  weigh?: WeighRow[]
  warn?: string
  dishes?: DishItem[]
  recipe?: PuddingRecipe
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
    breakfast: 'Breakfast', serveByBreakfast: 'ready in fridge by 9:30 AM',
    makePudding: 'Make Nutty Pudding', puddingHint: 'Tap for the recipe + scoops',
    chillPudding: 'Put Nutty Pudding in the fridge', chillPuddingHint: 'People can eat it whenever after it is ready.',
    makeJuice: 'Make today’s juice', setBreakfast: 'Set the breakfast table', serveBreakfast: 'Leave breakfast ready',
    lunchPrep: 'Lunch prep', buyLunch: 'Cook or buy today’s lunch dishes', cookLunchMeat: 'Cook lunch meat, then weigh cooked portions', perPerson: 'cooked g per person',
    lunch: 'Lunch', serveAtLunch: 'serve at 12:00 PM', plate: 'Plate each person — dishes + their meat',
    setTable: 'Set the table (chopsticks, fish sauce, water, glasses)', serveLunch: 'Serve lunch', dessert: 'Dessert / fruit',
    dinnerPrep: 'Dinner prep', buyDinner: 'Cook or buy today’s dinner dishes', cookDinnerMeat: 'Cook dinner meat, then weigh cooked portions — same amounts',
    dinner: 'Dinner', serveAtDinner: 'serve at 6:30 PM', plateDinner: 'Plate each person', setDinner: 'Set the table', serveDinner: 'Serve dinner',
    endOfDay: 'End of day', enterBill: 'Enter the day’s bill (cooked + bought)',
    night: 'Before bed — for tomorrow', soak: 'Soak tomorrow’s nuts + chia (cover with water, leave overnight)',
    noPork: 'Bố & Mẹ do NOT eat pork/beef — cook',
    ingredients: 'Ingredients (per person)', scoops: 'NAKPRO scoops (per person)',
  },
  vi: {
    breakfast: 'Bữa sáng', serveByBreakfast: 'để sẵn trong tủ lạnh trước 9:30',
    makePudding: 'Làm Nutty Pudding', puddingHint: 'Bấm để xem công thức + số muỗng',
    chillPudding: 'Cất Nutty Pudding vào tủ lạnh', chillPuddingHint: 'Mọi người có thể ăn bất cứ lúc nào sau khi làm xong.',
    makeJuice: 'Làm nước ép hôm nay', setBreakfast: 'Dọn bàn ăn sáng', serveBreakfast: 'Để bữa sáng sẵn sàng',
    lunchPrep: 'Chuẩn bị bữa trưa', buyLunch: 'Nấu hoặc mua món trưa hôm nay', cookLunchMeat: 'Nấu đạm bữa trưa, rồi cân phần đã chín', perPerson: 'gram chín cho từng người',
    lunch: 'Bữa trưa', serveAtLunch: 'dọn lúc 12:00', plate: 'Bày món cho từng người — món ăn + phần đạm',
    setTable: 'Dọn bàn (đũa, nước mắm, nước, ly)', serveLunch: 'Dọn bữa trưa ra bàn', dessert: 'Tráng miệng / trái cây',
    dinnerPrep: 'Chuẩn bị bữa tối', buyDinner: 'Nấu hoặc mua món tối hôm nay', cookDinnerMeat: 'Nấu đạm bữa tối, rồi cân phần đã chín — cùng số lượng',
    dinner: 'Bữa tối', serveAtDinner: 'dọn lúc 18:30', plateDinner: 'Bày món cho từng người', setDinner: 'Dọn bàn', serveDinner: 'Dọn bữa tối ra bàn',
    endOfDay: 'Cuối ngày', enterBill: 'Nhập tiền chợ hôm nay (nấu + mua)',
    night: 'Trước khi ngủ — cho ngày mai', soak: 'Ngâm hạt + chia cho ngày mai (đổ nước ngập, để qua đêm)',
    noPork: 'Bố & Mẹ KHÔNG ăn heo/bò — nấu',
    ingredients: 'Nguyên liệu (mỗi người)', scoops: 'Số muỗng NAKPRO (mỗi người)',
  },
} as const

export function stepsForDay(plan: DayPlan, names: NameMap, lang: Lang = 'en', pudding?: PuddingRecipe): StepBlock[] {
  const t = T[lang]
  const nm = (id: string | null): string => (id ? (names[id]?.[lang] ?? names[id]?.en ?? id) : '—')
  const dishItems = (ids: string[]): DishItem[] =>
    ids.map((id) => ({ id, name: nm(id), serveStyle: names[id]?.serveStyle, needsAssembly: names[id]?.needsAssembly }))

  const weigh: WeighRow[] = plan.people.map((p) => ({ name: p.name, grams: p.meatGramsPerMeal, protein: nm(p.protein) }))
  const parents = plan.people.filter((p) => p.protein !== plan.proteinId)
  const warn = parents.length ? `${t.noPork} ${nm(parents[0].protein)}` : undefined
  const lunch = plan.meals.find((m) => m.meal === 'lunch')?.dishIds ?? []
  const dinner = plan.meals.find((m) => m.meal === 'dinner')?.dishIds ?? []

  return [
    {
      key: 'breakfast', time: '🌅 9:30', title: t.breakfast, serveAt: t.serveByBreakfast,
      steps: [
        { key: 'make_pudding', label: t.makePudding, detail: t.puddingHint, recipe: pudding },
        { key: 'chill_pudding', label: t.chillPudding, detail: t.chillPuddingHint },
        { key: 'make_juice', label: `${t.makeJuice}: ${nm(plan.juiceId)}` },
        { key: 'set_breakfast', label: t.setBreakfast },
        { key: 'serve_breakfast', label: t.serveBreakfast },
      ],
    },
    {
      key: 'lunch_prep', time: '🍳 by 11:45', title: t.lunchPrep,
      steps: [
        { key: 'buy_lunch', label: t.buyLunch, dishes: dishItems(lunch) },
        { key: 'cook_lunch_meat', label: `${t.cookLunchMeat} — ${nm(plan.proteinId)} (${t.perPerson})`, weigh, warn },
      ],
    },
    {
      key: 'lunch', time: '🍽️ 12:00', title: t.lunch, serveAt: t.serveAtLunch,
      steps: [
        { key: 'plate_lunch', label: t.plate, dishes: dishItems(lunch) },
        { key: 'set_lunch', label: t.setTable },
        { key: 'serve_lunch', label: t.serveLunch },
        { key: 'dessert_lunch', label: `${t.dessert}: ${nm(plan.dessertId)}` },
      ],
    },
    {
      key: 'dinner_prep', time: '🍳 by 18:00', title: t.dinnerPrep,
      steps: [
        { key: 'buy_dinner', label: t.buyDinner, dishes: dishItems(dinner) },
        { key: 'cook_dinner_meat', label: t.cookDinnerMeat, weigh, warn },
      ],
    },
    {
      key: 'dinner', time: '🌙 18:30', title: t.dinner, serveAt: t.serveAtDinner,
      steps: [
        { key: 'plate_dinner', label: t.plateDinner, dishes: dishItems(dinner) },
        { key: 'set_dinner', label: t.setDinner },
        { key: 'serve_dinner', label: t.serveDinner },
      ],
    },
    { key: 'end', time: '🌃 end', title: t.endOfDay, steps: [{ key: 'enter_bill', label: t.enterBill }] },
    { key: 'night', time: '🌰 night', title: t.night, steps: [{ key: 'soak_nuts', label: t.soak }] },
  ]
}

export const totalSteps = (blocks: StepBlock[]): number => blocks.reduce((n, b) => n + b.steps.length, 0)
