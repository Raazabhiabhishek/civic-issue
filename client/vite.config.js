import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const activePortFile = path.resolve(__dirname, '../.active-port')

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        router: () => {
          const runtimePort = process.env.VITE_API_PORT || (fs.existsSync(activePortFile) ? fs.readFileSync(activePortFile, 'utf8').trim() : '') || '5001'
          return `http://127.0.0.1:${runtimePort}`
        },
      }
    }
  }
})
