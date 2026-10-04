import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    include: ['src/**/*.test.js', 'test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      // GL-сцены и сборка страницы проверяются в браузере, не в jsdom.
      exclude: ['src/**/*.test.js', 'src/main.js', 'src/**/*.scene.js', 'src/**/*.glsl.js'],
    },
  },
})
