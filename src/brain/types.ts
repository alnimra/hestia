// Hestia brain — shared types. The brain is pure TypeScript: every output is a
// function of (config, date, and the day's chosen dishes). No I/O, no clock reads
// except an explicitly-passed instant. This is what makes it fully unit-testable.

export type ProteinCategory = 'chicken' | 'fish' | 'pork' | 'beef'

export interface Protein {
  id: ProteinCategory
  nameEn: string
  nameVi: string
  /** specific cooked meat/cut used for weighing and protein math. */
  cutEn: string
  cutVi: string
  /** grams of protein per 100g COOKED. */
  proteinPer100gCooked: number
  source: {
    name: 'USDA FoodData Central'
    fdcId: number
    description: string
  }
}

export interface Person {
  id: string
  name: string
  /** daily protein target in grams. */
  targetG: number
  eatsPork: boolean
  eatsBeef: boolean
  /** NAKPRO pea-protein scoops in the morning pudding (the breakfast lever). */
  puddingScoops: number
  /** planned grams above/below the nominal target. Positive = prefer over. */
  proteinBufferG: number
}

export interface Config {
  /** Immutable epoch (YYYY-MM-DD). Changing it reshuffles all future auto days. */
  epoch: string
  /** Meat rotation, advanced one step per day. Owner-reorderable. */
  mainRotation: ProteinCategory[]
  /** What mom & dad get on a pork/beef day. Indexed off the red-meat-day count. */
  parentSafeRotation: ProteinCategory[]
  proteins: Record<ProteinCategory, Protein>
  people: Person[]
  /** base protein from the pudding's nuts/seeds/chia (before NAKPRO scoops). */
  puddingBaseProteinG: number
  /** protein per NAKPRO scoop (~28g for the unflavoured 36g scoop). */
  nakproScoopProteinG: number
}

export type DishType = 'main' | 'side' | 'carb' | 'dessert'
export type ServeStyle = 'assemble' | 'reheat' | 'plate_garnish' | 'cook_fresh' | 'serve_chilled'

/** A Vietnamese dish / dessert from the seeded library (D1 `dishes` table). */
export interface Dish {
  id: string
  nameEn: string
  nameVi: string
  type: DishType
  proteinPerServingG: number
  parentSafe: boolean
  serveStyle: ServeStyle
  needsAssembly: boolean
  /** A complete one-bowl meal (pho, bún, cơm gà) — served alone, no rice/side tacked on. */
  standalone: boolean
}
