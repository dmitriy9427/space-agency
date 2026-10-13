import { describe, expect, it } from 'vitest'
import { LAUNCH, WAYPOINTS, WAYPOINTS_PORTRAIT, ascentState, descentState, buildFlightTimeline, coversViewport, heading, mixState, sampleFlight, thrustWithVelocity, toWorld, waypointsFor } from './flight.js'

describe('rocket/flight', () => {
  const timeline = buildFlightTimeline([
    { id: 'manifesto', at: 1000 },
    { id: 'hero', at: -500 },
    { id: 'unknown', at: 300 },
    { id: 'story', at: Number.NaN },
  ])

  it('сортирует точки, отбрасывает неизвестные и прижимает к нулю', () => {
    expect(timeline.map((p) => p.at)).toEqual([0, 1000])
    expect(timeline[0].state).toBe(WAYPOINTS.hero)
  })

  it('разводит совпадающие позиции', () => {
    const t = buildFlightTimeline([
      { id: 'hero', at: 100 },
      { id: 'manifesto', at: 100 },
    ])

    expect(t[1].at).toBeGreaterThan(t[0].at)
  })

  it('до первой и после последней точки — их состояния', () => {
    expect(sampleFlight(timeline, -10)).toEqual(WAYPOINTS.hero)
    expect(sampleFlight(timeline, 5000)).toEqual(WAYPOINTS.manifesto)
    expect(sampleFlight([], 100)).toEqual(WAYPOINTS.hero)
  })

  it('посередине — сглаженная интерполяция', () => {
    const mid = sampleFlight(timeline, 500)

    expect(mid.x).toBeCloseTo((WAYPOINTS.hero.x + WAYPOINTS.manifesto.x) / 2)
    expect(mid.ground).toBeCloseTo(0.5)

    const early = sampleFlight(timeline, 100)

    // smoothstep медленнее линейной интерполяции у краёв.
    expect(early.ground).toBeLessThan(0.1)
  })

  it('mixState смешивает все поля', () => {
    const a = { x: 0, y: 0, scale: 1, roll: 0, yaw: 0, thrust: 0, ground: 0 }
    const b = { x: 1, y: 2, scale: 3, roll: 4, yaw: 5, thrust: 6, ground: 7 }

    // lift в обычных точках нет — считается нулём.
    expect(mixState(a, b, 0.5)).toEqual({ x: 0.5, y: 1, scale: 2, roll: 2, yaw: 2.5, thrust: 3, ground: 3.5, lift: 0 })
    expect(mixState(a, { ...b, lift: 2 }, 0.5).lift).toBe(1)
  })

  it('toWorld: широкий экран и портрет', () => {
    const state = { ...WAYPOINTS.hero, x: 1, y: 1, scale: 1 }
    const wide = toWorld(state, 16 / 9, 3)
    const tall = toWorld(state, 9 / 16, 3)

    expect(wide.x).toBeCloseTo(0.9 * 3 * (16 / 9))
    expect(wide.y).toBeCloseTo(2.4)
    expect(wide.scale).toBe(1)
    expect(tall.scale).toBeLessThan(0.5)
    // В портрете ракета прижата сильнее (x ≤ 0.75 полуширины); высоту не сдвигаем —
    // её задаёт своя таблица точек (WAYPOINTS_PORTRAIT).
    expect(tall.x).toBeCloseTo(0.75 * 3 * (9 / 16))
    expect(tall.y).toBeCloseTo(wide.y)
  })

  it('waypointsFor: портрету — своя таблица с теми же точками', () => {
    expect(waypointsFor(16 / 9)).toBe(WAYPOINTS)
    expect(waypointsFor(9 / 16)).toBe(WAYPOINTS_PORTRAIT)
    expect(Object.keys(WAYPOINTS_PORTRAIT).sort()).toEqual(Object.keys(WAYPOINTS).sort())
  })

  it('прижимает точки к пределу прокрутки (посадка внизу страницы)', () => {
    const t = buildFlightTimeline(
      [
        { id: 'mission', at: 900 },
        { id: 'landing', at: 1400 },
      ],
      WAYPOINTS,
      1000,
    )

    expect(t.map((p) => p.at)).toEqual([900, 1000])
    expect(sampleFlight(t, 1000)).toEqual(WAYPOINTS.landing)
  })

  it('сценарий: взлёт, разворот носом вниз, уход за край, возврат и посадка', () => {
    const order = ['hero', 'manifesto', 'story', 'apogee', 'orbit', 'dive', 'exit', 'return', 'mission', 'landing']
    const w = order.map((id) => WAYPOINTS[id])

    // Взлёт: до апогея нос вверх и высота растёт.
    expect(w.slice(0, 4).every((p) => Math.abs(p.roll) < 10)).toBe(true)
    expect(WAYPOINTS.apogee.y).toBeGreaterThan(WAYPOINTS.hero.y)
    // После апогея — носом вниз и вниз.
    expect(heading(WAYPOINTS.orbit.roll)).toBeLessThan(-0.9)
    expect(WAYPOINTS.dive.y).toBeLessThan(WAYPOINTS.orbit.y)
    // Перед слайдерами — за правым краем, возврат — тоже справа.
    expect(WAYPOINTS.exit.x).toBeGreaterThan(1)
    expect(WAYPOINTS.return.x).toBeGreaterThan(1)
    // Посадка: снова носом вверх, на площадке, двигатель почти выключен.
    expect(heading(WAYPOINTS.landing.roll)).toBeCloseTo(1)
    expect(WAYPOINTS.landing.ground).toBe(0)
    expect(WAYPOINTS.landing.thrust).toBeLessThan(0.1)
  })

  it('heading: куда смотрит нос', () => {
    expect(heading(0)).toBe(1)
    expect(heading(180)).toBeCloseTo(-1)
    expect(heading(90)).toBeCloseTo(0)
    expect(heading(360)).toBeCloseTo(1)
  })

  it('toWorld не прижимает ракету, улетевшую за край', () => {
    const off = toWorld({ ...WAYPOINTS.exit, x: 1.9 }, 16 / 9, 3)

    expect(off.x).toBeCloseTo(1.9 * 3 * (16 / 9))
  })

  it('тяга растёт со скоростью прокрутки и ограничена', () => {
    expect(thrustWithVelocity(0.2, 0)).toBe(0.2)
    expect(thrustWithVelocity(0.2, -2000)).toBeCloseTo(0.7)
    expect(thrustWithVelocity(1, 1e6)).toBe(1.5)
  })

  it('coversViewport учитывает объединение секций', () => {
    expect(coversViewport([], 800)).toBe(false)
    expect(coversViewport([{ top: -100, bottom: 900 }], 800)).toBe(true)
    expect(coversViewport([{ top: 0.5, bottom: 799.5 }], 800)).toBe(true)
    expect(coversViewport([{ top: 100, bottom: 900 }], 800)).toBe(false)
    expect(
      coversViewport(
        [
          { top: 400, bottom: 1400 },
          { top: -600, bottom: 400 },
        ],
        800,
      ),
    ).toBe(true)
    expect(
      coversViewport(
        [
          { top: -600, bottom: 300 },
          { top: 400, bottom: 1400 },
        ],
        800,
      ),
    ).toBe(false)
  })

  describe('запуск по кнопке', () => {
    const pad = WAYPOINTS.landing

    it('взлёт: начинает с места, уходит за верх экрана, площадка остаётся на земле', () => {
      const start = ascentState(pad, 0)

      expect(start.y).toBe(pad.y)
      expect(start.x).toBe(pad.x)
      expect(start.lift).toBe(0)
      expect(start.ground).toBe(0)

      const end = ascentState(pad, 1)

      expect(end.y).toBe(LAUNCH.exitY)
      expect(end.y * 0.8).toBeGreaterThan(1.5) // целиком над экраном
      expect(end.thrust).toBe(LAUNCH.thrust)
      expect(end.ground).toBe(1)
      // Площадка не едет за ракетой: высота над ней = пройденный путь.
      expect(ascentState(pad, 0.5).lift).toBeCloseTo(ascentState(pad, 0.5).y - pad.y)
    })

    it('взлёт: высота только растёт, сначала медленно; первые 15% — строго вверх', () => {
      const ys = Array.from({ length: 21 }, (_, i) => ascentState(pad, i / 20).y)

      for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1])
      // За первую половину времени — меньше четверти пути (тяжёлый старт).
      expect(ys[10] - ys[0]).toBeLessThan((ys[20] - ys[0]) / 4)
      expect(ascentState(pad, 0.1).roll).toBe(pad.roll)
      expect(ascentState(pad, 0.1).x).toBe(pad.x)
      expect(ascentState(pad, 1).roll).toBe(pad.roll + LAUNCH.tilt)
    })

    it('посадка: из-за кадра точно в состояние площадки, тормозя к концу', () => {
      const hero = WAYPOINTS.hero
      const top = descentState(hero, 0)

      expect(top.y).toBe(LAUNCH.exitY)
      expect(top.ground).toBe(1)

      const end = descentState(hero, 1)

      // Совпадает с точкой сценария — передача управления прокрутке без скачка.
      for (const key of ['x', 'y', 'scale', 'roll', 'yaw', 'thrust', 'ground']) expect(end[key]).toBeCloseTo(hero[key])
      expect(end.lift).toBeCloseTo(0)

      const ys = Array.from({ length: 21 }, (_, i) => descentState(hero, i / 20).y)

      for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThanOrEqual(ys[i - 1])
      // Последняя половина времени — меньше 15% пути (мягкое касание).
      expect(ys[10] - ys[20]).toBeLessThan((ys[0] - ys[20]) * 0.15)
      // Площадка на месте раньше, чем ракета до неё дошла.
      expect(descentState(hero, 0.3).ground).toBe(0)
      expect(descentState(hero, 0.3).lift).toBeGreaterThan(0)
    })

    it('за пределами 0…1 время прижимается', () => {
      expect(ascentState(pad, -1)).toEqual(ascentState(pad, 0))
      expect(descentState(pad, 2)).toEqual(descentState(pad, 1))
    })

    it('toWorld переводит lift в мировые единицы', () => {
      expect(toWorld({ ...pad, lift: 1 }, 1.6, 10).lift).toBe(8)
      expect(toWorld(pad, 1.6, 10).lift).toBe(0)
    })
  })
})
