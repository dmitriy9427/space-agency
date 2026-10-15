# 5. Полёт ракеты

[src/modules/rocket/flight.js](../../src/modules/rocket/flight.js) — чистая логика траектории.
Сцена three.js — `rocket.scene.js`, подключение — `index.js`, обзор — [README модуля](../../src/modules/rocket/README.md).

## Где на экране

3D-ракета на фоне всей главной: стоит на площадке, при прокрутке взлетает, по дуге уходит влево,
разворачивается, летит носом вниз вдоль истории, уходит за правый край, возвращается перед
подвалом и садится. Крутите назад — летит назад.

## Главная идея: положение — функция прокрутки

Ракета не «летит сама». В каждом кадре её состояние **вычисляется из текущей прокрутки**:

```
прокрутка (px) → между какими путевыми точками мы → доля пути между ними → состояние ракеты
```

Поэтому полёт обратим (назад — то же самое в обратную сторону), не зависит от FPS и проверяется
тестами на числах.

## Путевые точки

```js
export const WAYPOINTS = {
  hero:      { x: 0.46, y: -0.05, scale: 0.85, roll: 0,   yaw: 24, thrust: 0.14, ground: 0 },
  manifesto: { x: 0.56, y: 0.2,  scale: 0.8,  roll: 4,   yaw: 22, thrust: 0.9,  ground: 1 },
  turn:      { x: 0.64, y: 0.46, scale: 0.7,  roll: 75,  … },
  flip:      { x: 0.56, y: 0.44, scale: 0.72, roll: 140, … },
  …
  exit:      { x: 1.9,  y: -0.34, scale: 0.6, roll: 270, … },
}
```

| Поле | Смысл |
| --- | --- |
| `x`, `y` | положение в **долях экрана** от центра (1 — край), а не в пикселях |
| `scale` | размер |
| `roll` | крен: 0 — нос вверх, 90 — влево, 180 — вниз, 270 — вправо |
| `thrust` | сила факела |
| `ground` | 0 — площадка видна, 1 — нет |

Доли экрана, а не пиксели, — таблица работает на любом мониторе. `x: 1.9` — за правым краем.
Для портретных экранов — отдельная таблица `WAYPOINTS_PORTRAIT`.

В разметке точки — это секции или невидимые маркеры: `<section data-flight="story">`,
`<i class="flight-marker" data-flight="turn">`.

## Код по частям

### Таблица «пиксель прокрутки → состояние»

```js
export function buildFlightTimeline(markers, waypoints = WAYPOINTS, maxScroll = Infinity) {
  const known = markers
    .filter((marker) => waypoints[marker.id] && Number.isFinite(marker.at))
    .map((marker) => ({ id: marker.id, at: clamp(marker.at, 0, maxScroll) }))
    .sort((a, b) => a.at - b.at)

  return known.map((marker, index) => {
    const prev = index > 0 ? known[index - 1].at : -Infinity
    const at = marker.at <= prev ? prev + 1 : marker.at
    marker.at = at
    return { at, state: waypoints[marker.id] }
  })
}
```

`markers` — где на странице (в пикселях прокрутки) начинается каждая точка; их измеряет
ScrollTrigger (`start` каждого триггера) после каждого `refresh`.

- `clamp(…, 0, maxScroll)` — секция у самого верха даёт отрицательную позицию, у самого низа —
  больше предела прокрутки; туда прокрутка не доходит. Прижимаем.
- Сортировка — порядок на странице.
- **Две точки на одной позиции** дали бы деление на ноль при интерполяции — сдвигаем вторую на 1 px.

### Состояние для текущей прокрутки

```js
export function sampleFlight(timeline, scroll) {
  if (!timeline.length) return { ...WAYPOINTS.hero }
  if (scroll <= timeline[0].at) return { ...timeline[0].state }
  const last = timeline[timeline.length - 1]
  if (scroll >= last.at) return { ...last.state }

  const next = timeline.findIndex((point) => point.at > scroll)
  const from = timeline[next - 1]
  const to = timeline[next]
  const t = smoothstep(0, 1, invLerp(from.at, to.at, scroll))
  return mixState(from.state, to.state, t)
}
```

1. До первой точки и после последней — их состояния.
2. Иначе находим **соседей**: точку до и точку после текущей прокрутки.
3. `invLerp` — какая доля пути между ними пройдена: 0…1.
4. `smoothstep` — сглаживание: у точек ракета замедляется, между ними — быстрее. Без него на каждой
   точке был бы «излом» движения.
5. `mixState` — смешать все поля: `x = from.x + (to.x − from.x) · t` и так далее.

`{ ...state }` — копия: вызывающий код может менять результат, не портя таблицу.

### Перевод в мир three.js

```js
export function toWorld(state, aspect, halfHeight) {
  const halfWidth = halfHeight * aspect
  const portrait = isPortrait(aspect)
  const fit = clamp(aspect / 1.2, portrait ? 0.34 : 0.42, 1)
  const x = state.x
  return { x: x * halfWidth, y: state.y * 0.8 * halfHeight, scale: state.scale * fit }
}
```

Доли экрана → координаты сцены: умножаем на половину видимой ширины и высоты. На узких экранах
ракета меньше (`fit`).

Комментарий в коде хранит урок: раньше `x` до 1 прижимался к 0,9, а после 1 — нет; на уходе за
экран ракета перескакивала с 0,9 на 1,0 — заметный рывок. Теперь горизонталь не прижимается вовсе.

### Тяга от скорости прокрутки

```js
export function thrustWithVelocity(base, velocity) { … }
```

Крутите быстро — факел ярче. Бонус от скорости добавляется к тяге точки.

## Что будет, если…

| Сделать | Что сломается |
| --- | --- |
| пиксели вместо долей экрана в таблице | на другом мониторе ракета пролетает сквозь текст |
| линейная интерполяция без `smoothstep` | на каждой путевой точке — излом движения |
| без сдвига совпадающих точек | `NaN` в координатах — ракета исчезает |
| двигать ракету таймером, а не по прокрутке | прокрутка назад не возвращает её; полёт зависит от FPS |

## Проверьте себя

1. Точки `A` на 1000 px и `B` на 2000 px. Прокрутка 1500. Чему равно `t` до и после `smoothstep`?
2. Как добавить новый манёвр между «Орбитой» и выходом?

<details>
<summary>Ответы</summary>

1. `invLerp = 0.5`, `smoothstep(0.5) = 0.5` — в середине они совпадают; отличаются у краёв (там
   `smoothstep` медленнее).
2. Дописать точку в `WAYPOINTS` (и в портретную таблицу) и поставить маркер
   `<i class="flight-marker" data-flight="имя">` в нужном месте разметки.
</details>
