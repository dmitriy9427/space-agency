# 6. Перенос в другой проект и на другой стек

Любой эффект проекта переносится одинаково, потому что все модули устроены по одному контракту:

```js
const instance = init(element, ctx) // запустить на элементе
instance.destroy()                  // полностью убрать
```

## Общий алгоритм (подходит для любого стека)

1. **Скопируйте папку модуля** (`src/modules/<имя>/`) и то, что она импортирует из `src/core/`
   (в README модуля, раздел «Перенос», перечислено, что именно).
2. **Установите зависимости**: `npm i gsap` (и `three`, если это WebGL-модуль).
3. **Создайте `core/gsap.js`** (или скопируйте наш) — регистрация нужных плагинов. Модули
   импортируют GSAP оттуда.
4. **Перенесите разметку** (в README модуля есть пример) и **стили** (классы модуля из
   `src/styles/*.css` — поищите по имени, например `.vstrip`).
5. **Соберите `ctx`** — объект с тем, что нужно модулю. Минимально:
   ```js
   import { createBus } from './core/bus.js'
   import { getQuality, prefersReducedMotion } from './core/env.js'

   const ctx = {
     bus: createBus(),
     quality: getQuality(),
     reduced: prefersReducedMotion(),
     smoother: null,                    // если нет ScrollSmoother
     getScroll: () => window.scrollY,
   }
   ```
6. **Вызовите `init` после того, как элемент появился в DOM, и `destroy` — когда он
   исчезает.** Это единственное, что отличается между стеками (см. ниже).

### Чистая логика переносится без изменений

Файлы без DOM (`engine.js`, `flight.js`, `layout.js`, `state.js`, `math.js`, `rope.js`,
`ripple.js`, `curtain.js`…) — это обычные функции. Они работают в любом фреймворке, в Node, в
React Native, в игровом движке. Если вам нужна только «физика» (пружина ленты, траектория
ракеты, хвост курсора) — берите только их и рисуйте как угодно.

---

## Обычный HTML / многостраничный сайт / Astro / CMS (WordPress, Битрикс)

Проще всего: скопируйте подход проекта целиком — `registry` + `data-module`.

```html
<div data-module="ring">…</div>
<script type="module">
  import { mountModules } from './core/registry.js'
  import * as ring from './modules/sliders/ring/index.js'

  mountModules({ ring: ring.init }, ctx)
</script>
```

**Без сборщика (Vite/webpack)** модули работают как есть, если подключать их как ES-модули
(`<script type="module">`) и импортировать GSAP с CDN:

```js
import { gsap } from 'https://cdn.jsdelivr.net/npm/gsap@3.15/+esm'
```

Шейдеры у нас — обычные строки в `.js`-файлах (`*.glsl.js`), поэтому специальный загрузчик
GLSL не нужен.

**Astro:** разметку — в компонент `.astro`, запуск — в `<script>` компонента (Astro сам
соберёт его как модуль). При переходах Astro View Transitions вызывайте `destroy()` на
событии `astro:before-swap` и `init` на `astro:page-load`.

---

## React

### Через `useEffect` (без доп. пакетов)

```jsx
import { useEffect, useRef } from 'react'
import { init } from './modules/sliders/ring/index.js'
import { useAppCtx } from './AppCtx' // ваш контекст с bus, quality, reduced…

export function Ring({ photos }) {
  const ref = useRef(null)
  const ctx = useAppCtx()

  useEffect(() => {
    const instance = init(ref.current, ctx)
    return () => instance.destroy() // React вызовет при размонтировании
  }, []) // [] — один раз после монтирования

  return (
    <div ref={ref}>
      <div data-ring-stage tabIndex={0}>
        <div data-ring-spinner>
          {photos.map((p) => (
            <article key={p.id} className="ring__card" data-ring-card>
              <img src={p.src} alt={p.title} />
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
```

Шаблоны из `src/content/render.js` почти дословно переписываются в JSX, как в примере.

**Асинхронные модули** (WebGL: `liquid`, `shader`, `infinite3d`, `rocket`) возвращают промис:

```jsx
useEffect(() => {
  let instance
  let cancelled = false

  init(ref.current, ctx).then((result) => {
    if (cancelled) result.destroy() // компонент уже размонтировали, пока грузилось
    else instance = result
  })
  return () => {
    cancelled = true
    instance?.destroy()
  }
}, [])
```

**StrictMode:** в разработке React монтирует компонент дважды (смонтировал → размонтировал →
смонтировал). Если `destroy()` убирает всё — проблем не будет. Если после двойного монтирования
что-то задвоилось — значит, где-то в модуле не хватает уборки.

### Через `@gsap/react` (`useGSAP`)

Для своих простых анимаций удобнее официальный хук: он сам делает `gsap.context` и `revert`.

```jsx
import { useGSAP } from '@gsap/react'

useGSAP(() => {
  gsap.from('.title', { y: 50, opacity: 0 })
}, { scope: containerRef }) // селекторы ищутся только внутри containerRef
```

### WebGL в React

Можно оставить наши `*.scene.js` как есть (они создают свой `WebGLRenderer`), а можно
переписать сцену на **React Three Fiber** — логика (`flight.js`, `particles.js`) и шейдеры
(`*.glsl.js`) перейдут без изменений.

---

## Next.js (App Router)

1. Компоненты с анимациями — клиентские: первая строка файла `'use client'`.
2. Код, который трогает `window`/`document`, — только внутри `useEffect` (на сервере их нет).
3. Тяжёлые WebGL-компоненты подключайте динамически без SSR:
   ```jsx
   const Liquid = dynamic(() => import('./Liquid'), { ssr: false })
   ```
4. **Переходы между страницами с занавесом.** Наш `page-transition` не зависит от роутера:
   ```jsx
   const router = useRouter()
   const go = (href) => transition.play(() => new Promise((resolve) => {
     router.push(href)
     // дождаться, пока новая страница смонтируется: например, layout вызывает resolve
     // из useEffect при смене pathname (usePathname)
     pendingResolve.current = resolve
   }))
   ```
5. **ScrollSmoother** создавайте один раз в корневом layout (клиентский компонент) и убивайте
   при размонтировании (`smoother.kill()`). После смены страницы — `ScrollTrigger.refresh()`.

---

## Vue 3 / Nuxt

```vue
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { init } from './modules/sliders/stack/index.js'

const root = ref(null)
let instance

onMounted(() => { instance = init(root.value, ctx) })
onBeforeUnmount(() => instance?.destroy())
</script>

<template>
  <div ref="root" class="stack" tabindex="0">…</div>
</template>
```

В Nuxt компоненты с WebGL оборачивайте в `<ClientOnly>`. Переход-занавес — в
`router.beforeEach` (закрыть) и `router.afterEach` + `nextTick` (открыть).

---

## Svelte / SvelteKit

```svelte
<script>
  import { onMount } from 'svelte'
  import { init } from './modules/gallery/index.js'
  let el
  onMount(() => {
    const instance = init(el, ctx)
    return () => instance.destroy() // функция из onMount = уборка
  })
</script>
<section bind:this={el}>…</section>
```

---

## Частые ошибки при переносе

| Симптом | Причина | Решение |
| --- | --- | --- |
| Анимация не работает, ошибок нет | Плагин не зарегистрирован | Импортируйте GSAP из своего `core/gsap.js`, где есть `registerPlugin` |
| `position: fixed` внутри страницы «уезжает» | Элемент внутри ScrollSmoother (у родителя transform) | Вынести элемент из `#smooth-content` |
| После перехода ScrollTrigger срабатывает не там | Не пересчитаны позиции | `ScrollTrigger.refresh()` после монтирования страницы |
| WebGL: «texture… cross-origin» | Картинка с чужого домена | Положить картинку к себе или включить CORS на сервере картинок |
| Через несколько переходов WebGL перестаёт работать | Не освобождаются контексты | Вызывать `destroy()` модулей; внутри — `releaseRenderer` |
| В React всё задвоилось | StrictMode + неполная уборка | Проверить, что `destroy()` снимает всё (`createDisposer`) |

Дальше — [07-customization.md](07-customization.md).
