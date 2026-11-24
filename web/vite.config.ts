import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Em desenvolvimento, repassa /api para a API (porta 3333).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3333',
    },
  },
})
