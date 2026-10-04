/**
 * Окружение: что умеет устройство и чего хочет пользователь.
 *
 * Здесь собраны все вопросы «к браузеру», чтобы модули не задавали их
 * каждый по-своему:
 *   prefersReducedMotion() — просит ли пользователь меньше анимаций;
 *   isCoarsePointer()      — палец вместо мыши (телефон/планшет);
 *   supportsWebGL()        — можно ли рисовать на видеокарте;
 *   getQuality()           — насколько тяжёлые эффекты устройство потянет.
 * @module core/env
 */

/** Безопасная проверка медиазапроса (в тестах и на сервере window может не быть). */
const mq = (query) =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false

/**
 * Пользователь включил в системе «уменьшить движение».
 * Проверить у себя: DevTools → ⋮ → More tools → Rendering →
 * «Emulate CSS media feature prefers-reduced-motion».
 */
export const prefersReducedMotion = () => mq('(prefers-reduced-motion: reduce)')

/**
 * Основное устройство ввода — палец (нет точного курсора и наведения).
 * МОБИЛКА: по этой проверке сейчас выключаются курсор и плавный скролл;
 * при доработке мобильной версии — главный «переключатель» поведения.
 */
export const isCoarsePointer = () => mq('(pointer: coarse)')

let webglSupport = null

/**
 * Доступен ли WebGL (рисование на видеокарте).
 *
 * Проверка создаёт временный WebGL-контекст. У браузера их ограниченное
 * число (в Chrome около 16), поэтому: проверяем один раз за страницу
 * (результат кешируется) и сразу отдаём контекст обратно (loseContext).
 */
export function supportsWebGL() {
  if (webglSupport !== null) return webglSupport

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    webglSupport = !!gl
  } catch {
    webglSupport = false
  }

  return webglSupport
}

/** Сбросить кеш поддержки WebGL (нужно только тестам). */
export function resetWebGLCache() {
  webglSupport = null
}

/**
 * Настройки для каждого уровня качества.
 *   dprMax    — максимальная плотность пикселей canvas (на Retina экран 2–3,
 *               но рисовать 3× пикселей ради незаметной разницы — дорого);
 *   stars     — сколько звёзд в фоне ракеты;
 *   particles — сколько искр выхлопа одновременно.
 * Хотите проверить, как сайт выглядит на слабом устройстве, — временно
 * верните из getQuality() уровень 'low'.
 */
export const QUALITY_TABLE = {
  high: { dprMax: 2, stars: 2400, particles: 220 },
  medium: { dprMax: 1.5, stars: 1400, particles: 140 },
  low: { dprMax: 1, stars: 700, particles: 70 },
}

/**
 * Уровень качества — одна «ручка» для всех тяжёлых эффектов страницы.
 *
 * Считаем очки по характеристикам устройства (ядра процессора, память,
 * ширина экрана), вычитаем за тач-экран и reduced motion, и по сумме
 * выбираем 'high' / 'medium' / 'low'. Это грубая, но рабочая эвристика:
 * точно узнать мощность видеокарты из браузера нельзя.
 *
 * @param {{ cores?: number, memory?: number, width?: number, coarse?: boolean, dpr?: number, reduced?: boolean }} [input]
 *   Подставные значения для тестов; по умолчанию читаются из navigator/window.
 * @returns {{ tier: 'low'|'medium'|'high', dpr: number, stars: number, particles: number }}
 */
export function getQuality(input = {}) {
  const nav = typeof navigator !== 'undefined' ? navigator : {}
  const cores = input.cores ?? nav.hardwareConcurrency ?? 4 // логические ядра процессора
  const memory = input.memory ?? nav.deviceMemory ?? 4 // ГБ памяти (есть только в Chrome)
  const width = input.width ?? (typeof window !== 'undefined' ? window.innerWidth : 1280)
  const coarse = input.coarse ?? isCoarsePointer()
  const rawDpr = input.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
  const reduced = input.reduced ?? prefersReducedMotion()

  let score = 0

  if (cores >= 8) score += 2
  else if (cores >= 4) score += 1
  if (memory >= 8) score += 2
  else if (memory >= 4) score += 1
  if (width >= 1024) score += 1
  if (coarse) score -= 1 // МОБИЛКА: телефоны по умолчанию получают уровень пониже
  if (reduced) score -= 2

  const tier = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low'
  const table = QUALITY_TABLE[tier]

  return {
    tier,
    dpr: Math.min(Math.max(rawDpr, 1), table.dprMax),
    stars: table.stars,
    particles: table.particles,
  }
}
