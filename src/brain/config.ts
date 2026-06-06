import type { Config } from './types'

// Reference data the brain needs. For v0 this lives in code (rarely changes, keeps
// the brain pure + trivially testable). The D1 database holds operational state
// and the editable content libraries (dishes/desserts/juices/recipes). v1 can move
// scoops / safety margin / rotation order into D1 to make them owner-editable.
export const DEFAULT_CONFIG: Config = {
  // Immutable. Do not change once the family has lived a rotation.
  epoch: '2026-01-01',

  mainRotation: ['chicken', 'fish', 'pork', 'beef'],
  parentSafeRotation: ['chicken', 'fish'],

  proteins: {
    chicken: { id: 'chicken', nameEn: 'Chicken', nameVi: 'Gà', proteinPer100gCooked: 31 },
    fish: { id: 'fish', nameEn: 'Fish', nameVi: 'Cá', proteinPer100gCooked: 22 },
    pork: { id: 'pork', nameEn: 'Pork', nameVi: 'Heo', proteinPer100gCooked: 27 },
    beef: { id: 'beef', nameEn: 'Beef', nameVi: 'Bò', proteinPer100gCooked: 26 },
  },

  people: [
    { id: 'milan', name: 'Milan', targetG: 140, eatsPork: true, eatsBeef: true, puddingScoops: 1.0, safetyMarginG: 5 },
    { id: 'brother', name: 'Em trai', targetG: 150, eatsPork: true, eatsBeef: true, puddingScoops: 1.5, safetyMarginG: 5 },
    { id: 'dad', name: 'Bố', targetG: 110, eatsPork: false, eatsBeef: false, puddingScoops: 1.0, safetyMarginG: 5 },
    { id: 'mom', name: 'Mẹ', targetG: 70, eatsPork: false, eatsBeef: false, puddingScoops: 0.5, safetyMarginG: 5 },
  ],

  puddingBaseProteinG: 8,
  nakproScoopProteinG: 28, // NAKPRO Pea Protein Isolate, ~28g / 36g scoop (unflavoured)
}
