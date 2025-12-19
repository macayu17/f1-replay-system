import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { execSync } from 'node:child_process'

const safeGitSha = () => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'unknown'
  }
}

const BUILD_INFO = {
  sha: process.env.GITHUB_SHA ? String(process.env.GITHUB_SHA).slice(0, 7) : safeGitSha(),
  time: new Date().toISOString(),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_INFO__: JSON.stringify(BUILD_INFO),
  },
})
