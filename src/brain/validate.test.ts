import { describe, it, expect } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { validateConfig } from './validate'

describe('validateConfig', () => {
  it('accepts the default config', () => {
    expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow()
  })

  it('rejects a red-meat parent-safe rotation (would feed mom/dad pork/beef)', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, parentSafeRotation: ['chicken', 'beef'] })).toThrow(/red meat/)
  })

  it('rejects empty rotation arrays', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, mainRotation: [] })).toThrow()
    expect(() => validateConfig({ ...DEFAULT_CONFIG, parentSafeRotation: [] })).toThrow()
  })

  it('rejects a zero protein density (divide-by-zero guard)', () => {
    const bad = {
      ...DEFAULT_CONFIG,
      proteins: {
        ...DEFAULT_CONFIG.proteins,
        fish: { ...DEFAULT_CONFIG.proteins.fish, proteinPer100gCooked: 0 },
      },
    }
    expect(() => validateConfig(bad)).toThrow()
  })

  it('rejects protein entries without a specific cooked cut', () => {
    const bad = {
      ...DEFAULT_CONFIG,
      proteins: {
        ...DEFAULT_CONFIG.proteins,
        fish: { ...DEFAULT_CONFIG.proteins.fish, cutEn: '' },
      },
    }
    expect(() => validateConfig(bad)).toThrow(/specific cooked cut/)
  })

  it('rejects protein entries without a USDA source id', () => {
    const bad = {
      ...DEFAULT_CONFIG,
      proteins: {
        ...DEFAULT_CONFIG.proteins,
        fish: { ...DEFAULT_CONFIG.proteins.fish, source: { ...DEFAULT_CONFIG.proteins.fish.source, fdcId: 0 } },
      },
    }
    expect(() => validateConfig(bad)).toThrow(/FoodData Central/)
  })
})
