import { describe, expect, it } from 'vitest'
import { LAUNCH, WAYPOINTS, WAYPOINTS_PORTRAIT, angleDelta, noseUpRoll, returnState, returnTarget, buildFlightTimeline, coversViewport, heading, mixState, sampleFlight, thrustWithVelocity, toWorld, waypointsFor } from './flight.js'

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

    expect(mixState(a, b, 0.5)).toEqual({ x: 0.5, y: 1, scale: 2, roll: 2, yaw: 2.5, thrust: 3, ground: 3.5 })
  })

  it('toWorld: широкий экран и портрет', () => {
    const state = { ...WAYPOINTS.hero, x: 1, y: 1, scale: 1 }
    const wide = toWorld(state, 16 / 9, 3)
    const tall = toWorld(state, 9 / 16, 3)

    // Горизонталь не прижимается к краю: x = 1 — ровно край экрана (иначе рывок на уходе за экран).
    expect(wide.x).toBeCloseTo(3 * (16 / 9))
    expect(wide.y).toBeCloseTo(2.4)
    expect(wide.scale).toBe(1)
    expect(tall.scale).toBeLessThan(0.5)
    // В портрете ракета меньше; где ей быть — задаёт своя таблица точек (WAYPOINTS_PORTRAIT).
    expect(tall.x).toBeCloseTo(3 * (9 / 16))
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

  it('сценарий: дуга и разворот, носом вниз, уход вправо, возврат носом влево, посадка', () => {
    const order = ['hero', 'manifesto', 'turn', 'flip', 'story', 'apogee', 'orbit', 'bank', 'dive', 'exit', 'return', 'glide', 'mission', 'final', 'landing']
    const nose = (id) => ({ x: -Math.sin((WAYPOINTS[id].roll * Math.PI) / 180), y: heading(WAYPOINTS[id].roll) })

    expect(Object.keys(WAYPOINTS)).toEqual(order)
    for (const table of [WAYPOINTS, WAYPOINTS_PORTRAIT]) {
      const rolls = order.map((id) => table[id].roll)

      // Крен только растёт: один непрерывный разворот, без «раскручивания» назад.
      for (let i = 1; i < rolls.length; i++) expect(rolls[i]).toBeGreaterThanOrEqual(rolls[i - 1])
    }
    // Старт: чуть взлетела носом вверх, на дуге нос влево, к истории — вниз.
    expect(WAYPOINTS.manifesto.y).toBeGreaterThan(WAYPOINTS.hero.y)
    expect(nose('manifesto').y).toBeGreaterThan(0.9)
    expect(nose('turn').x).toBeLessThan(-0.9)
    expect(nose('story').y).toBeCloseTo(-1)
    expect(nose('apogee').y).toBeCloseTo(-1)
    // «Нарисуй путь»: нос вправо и за правый край.
    expect(nose('dive').x).toBeGreaterThan(0.9)
    expect(nose('exit').x).toBeCloseTo(1)
    expect(WAYPOINTS.exit.x).toBeGreaterThan(1)
    // После архива: справа, носом влево; потом нос вниз и немного вниз.
    expect(WAYPOINTS.return.x).toBeGreaterThan(1)
    expect(nose('return').x).toBeCloseTo(-1)
    expect(nose('glide').x).toBeLessThan(-0.9)
    expect(nose('mission').y).toBeCloseTo(-1)
    expect(nose('final').y).toBeCloseTo(-1)
    expect(WAYPOINTS.final.y).toBeLessThan(WAYPOINTS.mission.y)
    // Посадка: снова носом вверх, на площадке, двигатель почти выключен.
    expect(nose('landing').y).toBeCloseTo(1)
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

  describe('запуск по кнопке: тот же путь обратно, носом вверх', () => {
    it('noseUpRoll: нос вверх, на боковых участках — наклон в обратную сторону', () => {
      expect(noseUpRoll(0)).toBeCloseTo(0) // вверх → вверх
      expect(noseUpRoll(180)).toBeCloseTo(0) // по сценарию вниз → обратно вверх
      expect(noseUpRoll(720)).toBeCloseTo(0)
      // Улетала носом вправо (270°) → возвращается с наклоном влево (плюс).
      expect(noseUpRoll(270)).toBeCloseTo(LAUNCH.lean)
      // Влетала носом влево (90° ≡ 450°) → обратно уходит с наклоном вправо.
      expect(noseUpRoll(450)).toBeCloseTo(-LAUNCH.lean)
      expect(Math.abs(noseUpRoll(225))).toBeLessThan(LAUNCH.lean)
    })

    it('angleDelta — кратчайшая дуга', () => {
      expect(angleDelta(720, 0)).toBe(0)
      expect(angleDelta(350, 10)).toBe(20)
      expect(angleDelta(10, 350)).toBe(-20)
      expect(angleDelta(180, 0)).toBe(-180)
    })

    it('returnState: позиция из сценария, меняются только нос и тяга', () => {
      const scripted = WAYPOINTS.final // нос вниз
      const back = returnState(scripted, 1)

      for (const key of ['x', 'y', 'scale', 'yaw', 'ground']) expect(back[key]).toBe(scripted[key])
      expect(heading(back.roll)).toBeCloseTo(1) // нос вверх
      expect(back.thrust).toBe(LAUNCH.thrust)
      // mix 0 — обычный сценарий, 0.5 — полпути (плавная передача управления).
      expect(returnState(scripted, 0)).toEqual(scripted)
      expect(heading(returnState(scripted, 0.5).roll)).toBeCloseTo(0)
    })

    it('returnTarget: направление по скорости прокрутки, почти стоим — помним прошлое', () => {
      expect(returnTarget(-500, 0)).toBe(1) // едем вверх
      expect(returnTarget(500, 1)).toBe(0) // едем вниз
      expect(returnTarget(-5, 0)).toBe(0) // дрожание колеса — не считается
      expect(returnTarget(5, 1)).toBe(1)
    })

    it('на площадке двигатель не форсируется, даже если «летим обратно»', () => {
      expect(returnState(WAYPOINTS.hero, 1).thrust).toBe(WAYPOINTS.hero.thrust)
      expect(returnState(WAYPOINTS.landing, 1).thrust).toBe(WAYPOINTS.landing.thrust)
    })

    it('на площадках (внизу и наверху) нос уже вверх — включение и отпускание без скачка', () => {
      for (const id of ['landing', 'hero']) {
        const back = returnState(WAYPOINTS[id], 1)

        expect(back.roll).toBeCloseTo(WAYPOINTS[id].roll) // 720° не «раскручивается» в 0°
      }
    })
  })
})
