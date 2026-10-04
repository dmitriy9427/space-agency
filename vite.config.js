import { resolve } from 'node:path'
import { defineConfig } from 'vite'

/**
 * Настройки сборки (Vite).
 *
 * Многостраничный сайт: каждая HTML-страница — отдельная «точка входа»
 * (rollupOptions.input). В dev-режиме Vite и так отдаёт любые .html из
 * корня, а для `npm run build` их нужно перечислить, иначе в dist/ попадёт
 * только index.html. Добавили страницу — допишите её сюда.
 */
export default defineConfig({
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        missions: resolve(import.meta.dirname, 'missions.html'),
        destinations: resolve(import.meta.dirname, 'destinations.html'),
      },
      output: {
        // three и gsap — отдельными файлами: three грузится лениво (только
        // когда нужна WebGL-сцена), а оба редко меняются и хорошо кешируются.
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('node_modules/gsap')) return 'gsap'
        },
      },
    },
  },
})
