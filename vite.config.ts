import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The React PWA lives in src/client and builds to dist/client, which the Worker
// serves via the Workers Assets binding (see wrangler.jsonc).
export default defineConfig({
  root: 'src/client',
  publicDir: 'public',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  plugins: [react()],
})
