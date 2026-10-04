# 9. Тесты

```bash
npm test             # все тесты один раз
npm run test:watch   # перезапуск при сохранении
npm run coverage     # с отчётом о покрытии → откройте coverage/index.html
```

Сейчас: **200+ тестов, покрытие ~90%.**

## Инструменты

- **Vitest** — запускает тесты (похож на Jest, но быстрее и дружит с Vite).
- **jsdom** — «ненастоящий браузер» внутри Node: есть `document`, элементы, события, но **нет
  раскладки** (все размеры 0), **нет WebGL** и **нет геометрии SVG**.

## Три вида тестов

### 1. Чистая логика (`*.test.js` рядом с `engine.js`, `flight.js`, `math.js`…)

Функция получает числа → возвращает числа. Самые надёжные и быстрые тесты.

```js
it('пружина сходится к цели', () => {
  let s = { x: 0, v: 0 }
  for (let i = 0; i < 300; i++) s = springStep(s.x, s.v, 100, 1 / 60, springFrom(0.5, 0))
  expect(s.x).toBeCloseTo(100, 1)
})
```

### 2. DOM-модули с настоящим GSAP

Вставляем разметку, запускаем модуль, кликаем, проверяем результат, вызываем `destroy` и
проверяем, что всё убрано.

```js
const el = mount(html)                 // test/helpers.js: вставить HTML + заполнить data-render
const strip = init(el, createCtx())    // контекст как в приложении
el.querySelector('[data-next]').click()
finish()                               // «промотать» анимации до конца
expect(strip.active).toBe(1)
strip.destroy()
```

**Как «промотать» анимации:**

```js
const finish = () => gsap.globalTimeline.getChildren(false, true, true).forEach((a) => a.progress(1))
```

Берём **верхнеуровневые** анимации — и твины, и таймлайны. Если брать только вложенные твины
(`getChildren(true, true, false)`), у таймлайнов (их возвращают Flip и смена слайда) не
сработает `onComplete` — на этом проект однажды споткнулся.

### 3. WebGL-модули с подменённой сценой (`*.gl.test.js`)

WebGL в jsdom нет, поэтому подменяем «есть ли WebGL» и саму сцену фейком — и проверяем
обвязку: жесты, события шины, паузу, уборку.

```js
vi.mock('../../core/env.js', async (orig) => ({ ...(await orig()), supportsWebGL: () => true }))
vi.mock('./ripple.scene.js', () => ({ createRippleRenderer: () => fakeRenderer }))
```

## Окружение тестов (`test/setup.js`)

Что добавлено к jsdom:

- `matchMedia` с управляемыми ответами (`setMedia('(pointer: coarse)', true)`);
- `IntersectionObserver` / `ResizeObserver`, которые можно «дёрнуть» вручную
  (`triggerIntersection(el, true)`);
- `canvas.getContext('2d')` — фейковый контекст, записывающий вызовы в `ctx.calls`;
- удалён `ontouchstart`: иначе GSAP Observer решил бы, что это тач-устройство, и слушал бы
  touch-события вместо pointer.

## Особенности, на которые легко наступить

| Ситуация | Что делать |
| --- | --- |
| Observer собирает движения до кадра (debounce) | После `pointermove` — `await wait(40)` |
| В jsdom размеры 0 | Подставить: `Object.defineProperty(el, 'offsetWidth', { value: 300 })` |
| `src` у `<img>` становится абсолютным URL | Сравнивать через `toMatch(/\/photos\/p01\.jpg$/)` |
| SVG-плагины (DrawSVG, MotionPath, MorphSVG) | В jsdom не работают — такие части проверять в браузере |
| Промис `video.play()` | Подменить: `video.play = vi.fn(() => Promise.resolve())` |

## Что не покрыто тестами и проверяется в браузере

`app.js` (подмена страниц), сами WebGL-сцены (`*.scene.js`), SVG-анимации орбиты и
мини-схемы. Их проверяли вручную: скриншоты, замеры FPS, сценарии кликов через Chrome
DevTools.

Дальше — [10-troubleshooting.md](10-troubleshooting.md).
