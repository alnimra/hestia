import { defineConfig } from 'vitest/config'

// S0.1 tests run the Hono app in plain Node (the /api/health route touches no
// bindings). Stages that hit D1/KV will move to @cloudflare/vitest-pool-workers.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
