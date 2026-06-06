-- Hestia 0002: dish variety.
--  - `standalone`: a complete one-bowl meal (pho, bún, cơm gà) — served alone, no
--    rice/side tacked on. The meal builder skips the side+carb for these.
--  - `sort_order`: curated rotation sequence. Replaces the old `ORDER BY id`
--    (alphabetical), which made carbs[0] = banh_mi -> banh mi at every meal.
ALTER TABLE dishes ADD COLUMN standalone INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dishes ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
