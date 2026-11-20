/* global process */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import istanbul from 'vite-plugin-istanbul'

const plugins = [react()]

if (process.env.VITE_COVERAGE === '1') {
  plugins.push(istanbul({
    include: ['src/**/*.js', 'src/**/*.jsx'],
    exclude: ['node_modules/**'],
    extension: ['.js', '.jsx'],
    requireEnv: false,
  }))
}

export default defineConfig({
  plugins,
})
