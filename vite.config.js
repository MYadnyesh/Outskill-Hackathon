import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Local, account-free alternative to `vercel dev`: run
    // `node scripts/dev-server.js` (or `npm run dev:local`) alongside this
    // and /api/analyze reaches the real backend. If that server isn't
    // running, requests just fail and src/api/client.js falls back to mock
    // data as usual — same behavior as plain `npm run dev` today.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
