# 3. История миссии

[src/modules/story/index.js](../../src/modules/story/index.js), [steps.js](../../src/modules/story/steps.js)

## Где на экране

Главная, середина: секция «прилипает» к экрану. Вы крутите колесо, страница стоит, а сцены сменяют
друг друга: «Зажигание» → «Max-Q» → «Разделение» → «Орбита». Справа бегут приборы (T+04:30,
высота, скорость), внизу — точки-индикаторы, небо темнеет от заката к космосу, а на «Разделении»
ракета на фоне отстреливает ускорители.

## Разметка

```html
<section data-module="story">
  <div data-story-pin>
    <ol>
      <li data-scene><h3 data-scene-part>Зажигание</h3><p data-scene-part>…</p></li>
      <li data-scene>…Max-Q…</li>
      …
    </ol>
    <span data-story-clock></span> <span data-story-alt></span> <span data-story-speed></span>
    <i data-story-bar></i>
    <button data-story-dot></button> …
  </div>
</section>
```

Добавить сцену — ещё один `<li data-scene>`: длина прокрутки и таймлайн подстроятся сами.

## Код по частям

### Один таймлайн, закреплённый на прокрутке

```js
const tl = gsap.timeline({
  defaults: { ease: 'power2.inOut' },
  scrollTrigger: {
    trigger: el,
    pin,
    start: 'top top',
    end: () => `+=${scenes.length * window.innerHeight}`,
    scrub: ctx.reduced ? true : 0.8,
    onUpdate: (self) => update(self.progress),
  },
})
```

- **`pin`** — блок закрепляется на экране, пока идёт анимация. ScrollTrigger сам добавляет место
  в странице, чтобы было что прокручивать.
- **`end: +=сцены × высота окна`** — по экрану прокрутки на сцену. Функция, а не число — при
  ресайзе пересчитается.
- **`scrub: 0.8`** — таймлайн догоняет прокрутку за 0,8 с: мягче, чем «намертво». При «уменьшить
  движение» — `true` (без инерции).
- **`onUpdate`** — прогресс 0…1 на каждое изменение; по нему считаются приборы и номер сцены.

### Сцены на отрезках таймлайна

```js
scenes.forEach((scene, i) => {
  const parts = scene.querySelectorAll('[data-scene-part]')
  if (i > 0) {
    tl.fromTo(scene, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, i)
    tl.from(parts, { yPercent: 60, autoAlpha: 0, stagger: 0.06, duration: 0.5 }, i)
  }
  if (i < scenes.length - 1) {
    tl.to(parts, { yPercent: -60, autoAlpha: 0, stagger: 0.04, duration: 0.45 }, i + 0.6)
    tl.to(scene, { autoAlpha: 0, duration: 0.3 }, i + 0.8)
  }
})
```

Удобная договорённость: **сцена `i` живёт на отрезке `[i, i+1]` таймлайна**. Позиции — простые
числа:

```
0         0.6  0.8  1         1.6  1.8  2   …
|сцена 0 видна    |уходит
                    |сцена 1 появляется  |уходит
                                          |сцена 2 …
```

- Первая сцена видна с самого начала (без появления), последняя не уходит.
- Части сцены (заголовок, текст) появляются снизу по очереди и уходят вверх — «пролистываются».

### Небо — CSS-переменной

```js
tl.fromTo(document.documentElement, { '--sky-mix': 0 }, { '--sky-mix': 1, duration: scenes.length, ease: 'none' }, 0)
```

GSAP анимирует CSS-переменные как обычные свойства. JS двигает одно число на `<html>`, а CSS неба
(`.sky::before`) делает закат прозрачнее по нему. Никакой перерисовки из JS — только переменная.

### Приборы — чистой функцией

```js
export function stepFromProgress(progress, count) {
  if (count <= 0) return 0
  return clamp(Math.floor(clamp(progress, 0, 1) * count), 0, count - 1)
}

export function telemetry(progress) {
  const p = clamp(progress, 0, 1)
  const seconds = Math.round(p * MISSION_SECONDS)
  return {
    clock: `T+${mm}:${ss}`,
    altitude: Math.round(408 * Math.pow(p, 1.6)),
    speed: (7.66 * Math.pow(p, 0.8)).toFixed(2),
  }
}
```

- На 60% прокрутки при 4 сценах — `floor(0.6 × 4) = 2`, третья сцена.
- Высота растёт по степени 1,6 — медленно в начале, быстро потом (как у настоящей ракеты); 408 км
  и 7,66 км/с — параметры МКС.
- Функции без DOM — проверяются тестом (`steps.test.js`) на числах.

### Шина: история не знает про ракету

```js
const setScene = (index) => {
  if (index === current) return
  current = index
  dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index))
  scenes.forEach((scene, i) => scene.setAttribute('aria-hidden', String(i !== index)))
  ctx.bus.emit('story:scene', index)
}
```

- Только при **смене** сцены — `onUpdate` вызывается на каждый пиксель прокрутки, а событие
  нужно один раз.
- `aria-hidden` у невидимых сцен — скринридер читает только текущую.
- **`ctx.bus.emit('story:scene', index)`** — «новость» для всех. Ракета подписана на неё и
  отстреливает ускорители на сцене «Разделение». История о ракете не знает: уберёте ракету —
  история работает.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| `end: '+=3000'` числом | при другой высоте окна сцены идут то слишком быстро, то медленно |
| эмитить событие в каждом `onUpdate` | ракета получает сотни одинаковых событий |
| без `aria-hidden` у сцен | скринридер читает все четыре сцены подряд |
| история импортирует ракету | без ракеты (на мобиле, без WebGL) история падает |

## Проверьте себя

1. Сколько экранов прокрутки займёт история из 5 сцен?
2. Какую сцену покажет `stepFromProgress(1, 4)` и почему не «пятую»?

<details>
<summary>Ответы</summary>

1. Пять высот окна (`+= 5 × innerHeight`).
2. `3` — последнюю: `floor(1 × 4) = 4` ограничивается `count − 1`.
</details>
