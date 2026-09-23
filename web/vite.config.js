import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Port 5173 matches auth.site_url in supabase/config.toml
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
})
