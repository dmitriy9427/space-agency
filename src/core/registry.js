/**
 * Реестр модулей: находит в разметке элементы `data-module="имя"` и запускает
 * для каждого код модуля с этим именем.
 *
 * ─── Зачем так, а не просто вызвать всё в main.js ──────────────────────────
 * - HTML сам говорит, какие эффекты на странице есть. Убрали секцию из
 *   HTML — её код не запустится, ничего не сломается. Добавили на другую
 *   страницу `data-module="ring"` — там появится 3D-кольцо.
 * - Один упавший модуль не роняет остальные: ошибка пишется в консоль,
 *   страница продолжает работать.
 * - Все модули запускаются параллельно: те, что ждут загрузки three.js,
 *   не задерживают остальные.
 *
 * ─── Контракт модуля ─────────────────────────────────────────────────────────
 *   init(element, ctx) → { destroy() }        — обычный
 *   init(element, ctx) → Promise<{ destroy }> — асинхронный (грузит three.js)
 *   init(element, ctx) → undefined            — нечего убирать
 * @module core/registry
 */

/**
 * Запустить модули внутри `root`.
 *
 * @param {Record<string, (el: HTMLElement, ctx: object) => any>} registry Имя модуля → функция init.
 * @param {object} ctx Общий контекст (bus, quality, smoother, …) — получит каждый модуль.
 * @param {ParentNode} [root] Где искать `[data-module]` (по умолчанию весь документ).
 * @param {{ strict?: boolean }} [options] `strict: false` — молча пропускать модули,
 *   которых нет в этом реестре (так запускаются «общие» модули: реестр знает
 *   только курсор и шапку, а модули страницы пропускает).
 * @returns {Promise<{ destroy(): void, mounted: string[], failed: string[] }>}
 */
export async function mountModules(registry, ctx, root = document, { strict = true } = {}) {
  const instances = []
  const mounted = []
  const failed = []

  await Promise.all(
    Array.from(root.querySelectorAll('[data-module]')).map(async (el) => {
      const name = el.dataset.module
      const init = registry[name]

      if (!init) {
        if (strict) {
          console.warn(`registry: нет модуля «${name}»`)
          failed.push(name)
        }
        return
      }

      try {
        const instance = await init(el, ctx)

        mounted.push(name)
        if (instance?.destroy) instances.push(instance)
      } catch (error) {
        // Модуль упал при запуске — сообщаем, но страницу не ломаем.
        console.error(`registry: модуль «${name}» не запустился`, error)
        failed.push(name)
      }
    }),
  )

  return {
    mounted,
    failed,
    /** Убрать все запущенные модули (в обратном порядке). */
    destroy() {
      instances.reverse().forEach((instance) => {
        try {
          instance.destroy()
        } catch (error) {
          console.error('registry: ошибка destroy', error)
        }
      })
    },
  }
}
