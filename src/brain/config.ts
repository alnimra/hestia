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
    chicken: {
      id: 'chicken',
      nameEn: 'Chicken breast',
      nameVi: 'Ức gà',
      cutEn: 'Chicken breast, meat only, cooked',
      cutVi: 'Ức gà, chỉ thịt, đã nấu chín',
      proteinPer100gCooked: 31.02,
      source: {
        name: 'USDA FoodData Central',
        fdcId: 171477,
        description: 'Chicken, broilers or fryers, breast, meat only, cooked, roasted',
      },
    },
    fish: {
      id: 'fish',
      nameEn: 'Tilapia fillet',
      nameVi: 'Phi lê cá rô phi',
      cutEn: 'Tilapia fillet, cooked',
      cutVi: 'Phi lê cá rô phi đã nấu chín',
      proteinPer100gCooked: 26.15,
      source: {
        name: 'USDA FoodData Central',
        fdcId: 175177,
        description: 'Fish, tilapia, cooked, dry heat',
      },
    },
    pork: {
      id: 'pork',
      nameEn: 'Pork tenderloin',
      nameVi: 'Thăn heo',
      cutEn: 'Pork tenderloin, lean only, cooked',
      cutVi: 'Thăn heo nạc đã nấu chín',
      proteinPer100gCooked: 26.17,
      source: {
        name: 'USDA FoodData Central',
        fdcId: 168250,
        description: 'Pork, fresh, loin, tenderloin, separable lean only, cooked, roasted',
      },
    },
    beef: {
      id: 'beef',
      nameEn: 'Beef top round steak',
      nameVi: 'Bò đùi trên',
      cutEn: 'Beef top round steak, lean only, cooked',
      cutVi: 'Bò đùi trên nạc đã nấu chín',
      proteinPer100gCooked: 31.82,
      source: {
        name: 'USDA FoodData Central',
        fdcId: 171815,
        description: 'Beef, round, top round, steak, separable lean only, trimmed to 1/8" fat, all grades, cooked, broiled',
      },
    },
  },

  people: [
    { id: 'milan', name: 'Milan', targetG: 140, eatsPork: true, eatsBeef: true, puddingScoops: 1.0, safetyMarginG: 5 },
    { id: 'brother', name: 'Em trai', targetG: 150, eatsPork: true, eatsBeef: true, puddingScoops: 1.5, safetyMarginG: 5 },
    { id: 'dad', name: 'Bố', targetG: 110, eatsPork: false, eatsBeef: false, puddingScoops: 1.0, safetyMarginG: 5 },
    { id: 'mom', name: 'Mẹ', targetG: 70, eatsPork: false, eatsBeef: false, puddingScoops: 0.5, safetyMarginG: 5 },
  ],

  puddingBaseProteinG: 8,
  nakproScoopProteinG: 28, // NAKPRO Pea Protein Isolate, 28g / 36g scoop (unflavoured)
}
