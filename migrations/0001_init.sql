-- Hestia D1 schema (S0.2). Schema only — irreversible, applied once by
-- `wrangler d1 migrations apply`. Seed data is separate (db/seed.sql, re-runnable).
-- People / proteins / rotation orders live in code (src/brain/config.ts) for v0.

-- Editable content libraries (helper UI displays these; owner can tune later).
CREATE TABLE IF NOT EXISTS dishes (
  id                    TEXT PRIMARY KEY,
  name_en               TEXT NOT NULL,
  name_vi               TEXT NOT NULL,
  type                  TEXT NOT NULL,                 -- main | side | carb | dessert
  protein_per_serving_g REAL NOT NULL DEFAULT 0,
  parent_safe           INTEGER NOT NULL DEFAULT 1,    -- 0/1: safe for no-pork/no-beef
  serve_style           TEXT NOT NULL,                 -- assemble|reheat|plate_garnish|cook_fresh|serve_chilled
  needs_assembly        INTEGER NOT NULL DEFAULT 0,
  cookable              INTEGER NOT NULL DEFAULT 1,     -- can be home-cooked vs buy-only
  image_url             TEXT
);

CREATE TABLE IF NOT EXISTS juices (
  id       TEXT PRIMARY KEY,
  name_en  TEXT NOT NULL,
  name_vi  TEXT NOT NULL,
  recipe_en TEXT,
  recipe_vi TEXT
);

CREATE TABLE IF NOT EXISTS recipes (
  key         TEXT PRIMARY KEY,
  name_en     TEXT NOT NULL,
  name_vi     TEXT NOT NULL,
  ingredients TEXT,          -- JSON
  steps_en    TEXT,
  steps_vi    TEXT,
  image_url   TEXT
);

-- Per-day operational state.
CREATE TABLE IF NOT EXISTS daily_plans (
  date              TEXT PRIMARY KEY,                  -- YYYY-MM-DD (Asia/Ho_Chi_Minh)
  protein_id        TEXT,
  parent_protein_id TEXT,
  juice_id          TEXT,
  dessert_id        TEXT,
  source            TEXT NOT NULL DEFAULT 'auto',      -- auto | override
  guest_count       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plan_dishes (
  date        TEXT NOT NULL,
  meal        TEXT NOT NULL,                           -- breakfast | lunch | dinner
  dish_id     TEXT NOT NULL,
  for_parents INTEGER NOT NULL DEFAULT 0,
  source      TEXT NOT NULL DEFAULT 'buy',             -- cook | buy
  PRIMARY KEY (date, meal, dish_id, for_parents)
);

CREATE TABLE IF NOT EXISTS plan_attendance (
  date      TEXT NOT NULL,
  person_id TEXT NOT NULL,
  eating    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (date, person_id)
);

-- Helper check-offs. client_event_id makes the offline-outbox flush idempotent
-- (INSERT ... ON CONFLICT DO NOTHING); completed_at is the SERVER timestamp.
CREATE TABLE IF NOT EXISTS task_log (
  date            TEXT NOT NULL,
  step_key        TEXT NOT NULL,
  client_event_id TEXT NOT NULL UNIQUE,
  completed_at    TEXT NOT NULL,
  note            TEXT,
  PRIMARY KEY (date, step_key)
);

CREATE TABLE IF NOT EXISTS receipts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT NOT NULL,
  amount_vnd INTEGER NOT NULL,
  photo_url  TEXT,
  note       TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS person_dish_excludes (
  person_id TEXT NOT NULL,
  dish_id   TEXT NOT NULL,
  PRIMARY KEY (person_id, dish_id)
);

CREATE INDEX IF NOT EXISTS idx_task_log_date ON task_log (date);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts (date);
CREATE INDEX IF NOT EXISTS idx_plan_dishes_date ON plan_dishes (date);
