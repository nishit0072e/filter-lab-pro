import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // REPLACE 'filter-lab-pro' with your actual repository name
  // Example: If your repo is 'my-dsp-app', change this to '/my-dsp-app/'
  base: '/filter-lab-pro/',
})
