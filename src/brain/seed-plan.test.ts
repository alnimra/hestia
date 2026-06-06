import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Dish } from './types'
import { DEFAULT_CONFIG } from './config'
import { puddingProteinG } from './budget'
import { computeDayPlan, type PlanLists } from './plan'

const seedSql = readFileSync(new URL('../../db/seed.sql', import.meta.url), 'utf8')

const unescapeSql = (s: string): string => s.replace(/''/g, "'")

function loadSeedLists(): PlanLists {
  const dishes: (Dish & { sortOrder: number })[] = []
  const rowPattern =
    /\('((?:''|[^'])*)','((?:''|[^'])*)','((?:''|[^'])*)','(main|side|carb|dessert)',([0-9.]+),([01]),'([^']+)',([01]),([01]),([01]),(\d+)\)/g
  for (const m of seedSql.matchAll(rowPattern)) {
    dishes.push({
      id: unescapeSql(m[1]),
      nameEn: unescapeSql(m[2]),
      nameVi: unescapeSql(m[3]),
      type: m[4] as Dish['type'],
      proteinPerServingG: Number(m[5]),
      parentSafe: m[6] === '1',
      serveStyle: m[7] as Dish['serveStyle'],
      needsAssembly: m[8] === '1',
      standalone: m[10] === '1',
      sortOrder: Number(m[11]),
    })
  }

  const byOrder = (a: Dish & { sortOrder: number }, b: Dish & { sortOrder: number }) =>
    a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)
  const parentSafe = dishes.filter((d) => d.parentSafe)

  return {
    juices: ['pennywort'],
    desserts: parentSafe.filter((d) => d.type === 'dessert').sort(byOrder).map((d) => d.id),
    dishes: {
      mains: parentSafe.filter((d) => d.type === 'main').sort(byOrder),
      sides: parentSafe.filter((d) => d.type === 'side').sort(byOrder),
      carbs: parentSafe.filter((d) => d.type === 'carb').sort(byOrder),
    },
  }
}

const day = (n: number): string => {
  const d = new Date(`${DEFAULT_CONFIG.epoch}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

describe('seeded meal protein totals', () => {
  it('keeps the real seeded rotation inside every default active person planned target', () => {
    const lists = loadSeedLists()
    const lowestDishCap = Math.min(
      ...DEFAULT_CONFIG.people.map((p) => p.targetG + p.proteinBufferG - puddingProteinG(DEFAULT_CONFIG, p)),
    )

    expect(lists.dishes.mains.length).toBeGreaterThan(10)
    for (let i = 0; i < 56; i++) {
      const p = computeDayPlan(DEFAULT_CONFIG, day(i), lists)
      expect(p.dishesProteinPerDayG).toBeLessThanOrEqual(lowestDishCap)
      for (const person of p.people) {
        expect(person.totalProteinG).toBeLessThanOrEqual(person.plannedTargetG)
        if (person.plannedTargetG <= person.targetG) expect(person.targetGapG).toBeGreaterThanOrEqual(0)
      }
    }
  })
})
