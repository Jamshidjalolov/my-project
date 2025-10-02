import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // build xatolik bo‘lsa ham davom etadi
  esbuild: {
    logLevel: 'silent',
  }
})
