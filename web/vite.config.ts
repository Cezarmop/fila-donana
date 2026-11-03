import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Em desenvolvimento, repassa /api e o WebSocket para a API (porta 3333).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3333',
      '/socket.io': { target: 'http://localhost:3333', ws: true },
    },
  },
})
