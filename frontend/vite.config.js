import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Jab bhi frontend '/api' ko call karega, Vite chupchap usey 5000 par bhej dega
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})