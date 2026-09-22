import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the build also works from a GitHub Pages sub-path.
  base: './',
  plugins: [react(), tailwindcss()],
})
