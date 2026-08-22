import { defineConfig } from 'vite'
import react from '@react-three/fiber' // if needed, or default react plugin
import reactPlugin from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [reactPlugin(), tailwindcss()],
})