import type { DayPlan } from './plan'

// The housekeeper's day as an ordered list of meal blocks, each with tappable
// steps. Pure: derived from the plan + an id->name map. English now; the same
// keys get Vietnamese labels in S8 (#15). Step keys are stable (used in task_log).

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

export function stepsForDay(plan: DayPlan, names: Record<string, string>): StepBlock[] {
  const nm = (id: string | null): string => (id ? (names[id] ?? id) : '—')
  const dishList = (ids: string[]): string => ids.map(nm).join(' · ')
  const weigh = plan.people
    .map((p) => `${p.name}: ${p.meatGramsPerMeal}g ${nm(p.protein)}`)
    .join('  ·  ')
  const lunch = plan.meals.find((m) => m.meal === 'lunch')?.dishIds ?? []
  const dinner = plan.meals.find((m) => m.meal === 'dinner')?.dishIds ?? []

  return [
    {
      key: 'breakfast', time: '🌅 7:30', title: 'Breakfast', serveAt: 'serve by 7:30 AM',
      steps: [
        { key: 'make_pudding', label: 'Make Nutty Pudding', detail: 'Drain last night’s soaked nuts + chia; blend with NAKPRO scoops (Milan 1.0 · Em trai 1.5 · Bố 1.0 · Mẹ 0.5)' },
        { key: 'make_juice', label: `Make today’s juice: ${nm(plan.juiceId)}` },
        { key: 'set_breakfast', label: 'Set the breakfast table' },
        { key: 'serve_breakfast', label: 'Serve breakfast' },
      ],
    },
    {
      key: 'lunch_prep', time: '🍳 by 11:45', title: 'Lunch prep',
      steps: [
        { key: 'buy_lunch', label: 'Cook or buy today’s lunch dishes', detail: dishList(lunch) },
        { key: 'cook_lunch_meat', label: `Cook lunch meat — ${nm(plan.proteinId)} (per person)`, detail: weigh },
      ],
    },
    {
      key: 'lunch', time: '🍽️ 12:00', title: 'Lunch', serveAt: 'serve at 12:00 PM',
      steps: [
        { key: 'plate_lunch', label: 'Plate each person — their dishes + their meat' },
        { key: 'set_lunch', label: 'Set the table (chopsticks, fish sauce, water, glasses)' },
        { key: 'serve_lunch', label: 'Serve lunch' },
        { key: 'dessert_lunch', label: `Dessert / fruit: ${nm(plan.dessertId)}` },
      ],
    },
    {
      key: 'dinner_prep', time: '🍳 by 18:00', title: 'Dinner prep',
      steps: [
        { key: 'buy_dinner', label: 'Cook or buy today’s dinner dishes', detail: dishList(dinner) },
        { key: 'cook_dinner_meat', label: 'Cook dinner meat — same amounts', detail: weigh },
      ],
    },
    {
      key: 'dinner', time: '🌙 18:30', title: 'Dinner', serveAt: 'serve at 6:30 PM',
      steps: [
        { key: 'plate_dinner', label: 'Plate each person' },
        { key: 'set_dinner', label: 'Set the table' },
        { key: 'serve_dinner', label: 'Serve dinner' },
      ],
    },
    {
      key: 'end', time: '🌃 end', title: 'End of day',
      steps: [{ key: 'enter_bill', label: 'Enter the day’s bill (cooked + bought)' }],
    },
    {
      key: 'night', time: '🌰 night', title: 'Before bed — for tomorrow',
      steps: [{ key: 'soak_nuts', label: 'Soak tomorrow’s nuts + chia (cover with water, leave overnight)' }],
    },
  ]
}

export const totalSteps = (blocks: StepBlock[]): number =>
  blocks.reduce((n, b) => n + b.steps.length, 0)
