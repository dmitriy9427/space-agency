/**
 * Three.js-сцена ракеты.
 *
 * ─── Из чего состоит ──────────────────────────────────────────────────────────
 * - Модель ракеты собрана из простых фигур, без 3D-файлов:
 *     корпус — LatheGeometry (тело вращения: профиль-линия, прокрученная
 *              вокруг оси, как на токарном станке — см. hullProfile);
 *     нос, полосы — ещё Lathe и цилиндры; стабилизаторы — ExtrudeGeometry
 *     (плоская фигура с толщиной); иллюминатор — тор + круг;
 *     2 ускорителя — цилиндр + конус, у каждого свой огонь.
 * - Огонь — два вложенных конуса с ShaderMaterial (rocket.glsl.js): форма
 *   «колышется» в вершинном шейдере, цвет и прозрачность — во фрагментном;
 *   AdditiveBlending — цвета складываются как свет.
 * - Свет факела — PointLight у сопла: подсвечивает низ ракеты и площадку.
 * - Искры выхлопа — Points (облако точек) на массивах из particles.js.
 * - Звёзды — Points с шейдером: мерцание и параллакс (ближние быстрее).
 * - Стартовая площадка — диск, башня с фермой, мигающий огонь.
 *
 * ─── Чего сцена НЕ знает ─────────────────────────────────────────────────────
 * Ни про прокрутку, ни про GSAP, ни про HTML. Ей сообщают готовые числа
 * (setFlight, setScroll, setSeparation, boost) — а она каждый кадр
 * обновляет объекты (update) и рисует (render). Поэтому сцену легко
 * перенести: в React Three Fiber, в другой проект, в игру.
 *
 * ─── Как изменить внешний вид ──────────────────────────────────────────────────
 * Цвета — COLORS; форма корпуса — hullProfile(); размеры огня — аргументы
 * createFlame; число звёзд и искр — уровень качества (core/env.js).
 * @module rocket/rocket.scene
 */
import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  Scene,
  Shape,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { createRng } from '../../core/rng.js'
import { clamp, damp, lerp, rad } from '../../core/math.js'
import { releaseRenderer } from '../../core/webgl.js'
import { heading, toWorld } from './flight.js'
import { ParticlePool, spawnBudget } from './particles.js'
import {
  flameFragment,
  flameVertex,
  sparkFragment,
  sparkVertex,
  starsFragment,
  starsVertex,
} from './rocket.glsl.js'

const CAMERA_Z = 10
const FOV = 35
/** Полувысота видимой области на плоскости z = 0. */
const HALF_HEIGHT = Math.tan(rad(FOV / 2)) * CAMERA_Z

const COLORS = {
  hull: 0xf1f3f8,
  accent: 0xff5b2e,
  metal: 0x2a2f3a,
  glass: 0x5ee6ff,
}

/** Профиль корпуса для LatheGeometry: цилиндр + оживальный нос. */
function hullProfile() {
  const points = [new Vector2(0.0, -1.2), new Vector2(0.46, -1.2), new Vector2(0.5, -1.1), new Vector2(0.5, 0.45)]

  for (let i = 1; i <= 16; i++) {
    const t = i / 16

    points.push(new Vector2(0.5 * Math.sqrt(Math.max(1 - t * t, 0)) * (1 - t * 0.1), 0.45 + t * 1.15))
  }
  return points
}

function createFinGeometry() {
  const shape = new Shape()

  shape.moveTo(0, 0)
  shape.lineTo(0.62, -0.55)
  shape.lineTo(0.62, -1.0)
  shape.lineTo(0, -0.55)
  shape.closePath()
  return new ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false })
}

/** Факел из двух вложенных конусов: внешний рыжий, внутренний белёсый. */
function createFlame(radius, length, seed) {
  const group = new Group()
  const make = (r, l, core, edge, intensity) => {
    const geometry = new ConeGeometry(r, l, 28, 10, true)

    geometry.rotateX(Math.PI) // остриё вниз
    geometry.translate(0, -l / 2, 0) // основание у y = 0

    const material = new ShaderMaterial({
      vertexShader: flameVertex,
      fragmentShader: flameFragment,
      uniforms: {
        uTime: { value: 0 },
        uSeed: { value: seed },
        uCore: { value: new Color(core) },
        uEdge: { value: new Color(edge) },
        uIntensity: { value: intensity },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
    })

    // Геометрия задаёт t = -y в [0, 1] только при длине 1 — нормируем масштабом.
    geometry.scale(1, 1 / l, 1)

    const mesh = new Mesh(geometry, material)

    mesh.scale.y = l
    return mesh
  }

  group.add(make(radius, length, 0xffd27a, 0xff4d1a, 1.0))
  group.add(make(radius * 0.5, length * 0.58, 0xffffff, 0x7ad4ff, 1.2))
  return group
}

function createBooster(side) {
  const group = new Group()
  const hull = new MeshStandardMaterial({ color: COLORS.hull, roughness: 0.4, metalness: 0.15 })
  const accent = new MeshStandardMaterial({ color: COLORS.accent, roughness: 0.45, metalness: 0.1 })
  const metal = new MeshStandardMaterial({ color: COLORS.metal, roughness: 0.4, metalness: 0.8 })
  const body = new Mesh(new CylinderGeometry(0.2, 0.2, 1.5, 28), hull)
  const nose = new Mesh(new ConeGeometry(0.2, 0.42, 28), accent)
  const nozzle = new Mesh(new CylinderGeometry(0.1, 0.16, 0.2, 20), metal)
  const band = new Mesh(new CylinderGeometry(0.205, 0.205, 0.12, 28), accent)

  nose.position.y = 0.96
  nozzle.position.y = -0.85
  band.position.y = -0.3
  group.add(body, nose, nozzle, band)

  const flame = createFlame(0.15, 1.2, side * 3)

  flame.position.y = -0.95
  group.add(flame)
  group.userData = { flame, side }
  return group
}

/** Площадка: диск, башня с фермой и мигающие огни. */
function createPad() {
  const group = new Group()
  const metal = new MeshStandardMaterial({ color: 0x20242e, roughness: 0.6, metalness: 0.6 })
  const light = new MeshStandardMaterial({ color: 0xff5b2e, emissive: 0xff5b2e, emissiveIntensity: 2 })
  const disc = new Mesh(new CylinderGeometry(1.6, 1.85, 0.22, 48), metal)

  disc.position.y = -1.72
  group.add(disc)

  const tower = new Group()

  tower.position.set(-1.55, 0, 0)
  ;[-0.18, 0.18].forEach((dx) =>
    [-0.18, 0.18].forEach((dz) => {
      const post = new Mesh(new BoxGeometry(0.06, 3.6, 0.06), metal)

      post.position.set(dx, 0.4, dz)
      tower.add(post)
    }),
  )
  for (let i = 0; i < 9; i++) {
    const bar = new Mesh(new BoxGeometry(0.44, 0.04, 0.04), metal)

    bar.position.set(0, -1.2 + i * 0.4, 0.18)
    tower.add(bar)
  }
  const arm = new Mesh(new BoxGeometry(1.3, 0.1, 0.14), metal)

  arm.position.set(0.7, 0.9, 0)
  tower.add(arm)

  const beacon = new Mesh(new SphereGeometry(0.07, 12, 12), light)

  beacon.position.set(0, 2.25, 0)
  tower.add(beacon)
  group.add(tower)
  group.userData = { beacon }
  return group
}

function createStars(count, quality, height) {
  const rng = createRng(2024)
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const colors = new Float32Array(count * 3)
  const tints = [new Color(0xffffff), new Color(0xbfe9ff), new Color(0xffd9b0)]

  for (let i = 0; i < count; i++) {
    positions[i * 3] = rng.range(-38, 38)
    positions[i * 3 + 1] = rng.range(-height / 2, height / 2)
    positions[i * 3 + 2] = rng.range(-40, -2)
    seeds[i] = rng()

    const tint = tints[rng() < 0.7 ? 0 : rng() < 0.5 ? 1 : 2]

    colors.set([tint.r, tint.g, tint.b], i * 3)
  }

  const geometry = new BufferGeometry()

  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3))

  const material = new ShaderMaterial({
    vertexShader: starsVertex,
    fragmentShader: starsFragment,
    uniforms: {
      uScroll: { value: 0 },
      uTime: { value: 0 },
      uHeight: { value: height },
      uPixelRatio: { value: quality.dpr },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })

  return new Points(geometry, material)
}

export class RocketScene {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ dpr: number, stars: number, particles: number }} quality
   */
  constructor(canvas, quality) {
    this.quality = quality
    this.renderer = new WebGLRenderer({ canvas, antialias: quality.dpr < 2, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(quality.dpr)
    this.renderer.setClearColor(0x000000, 0)

    this.scene = new Scene()
    this.camera = new PerspectiveCamera(FOV, 1, 0.1, 100)
    this.camera.position.z = CAMERA_Z

    this.time = 0
    this.aspect = 1
    this.thrust = 0
    this.targetThrust = 0
    this.separation = 0
    this.shake = 0
    this.scroll = 0
    this.lastScroll = null
    this.starOffset = 0
    this.nozzleDir = new Vector3(0, -1, 0)
    this.pointer = { x: 0, y: 0 }
    this.state = null
    this.spawnCarry = 0

    this.buildLights()
    this.buildRocket()
    this.pad = createPad()
    this.scene.add(this.pad)

    this.starHeight = 50
    this.stars = createStars(quality.stars, quality, this.starHeight)
    this.stars.renderOrder = -1
    this.scene.add(this.stars)

    this.buildSparks()
  }

  buildLights() {
    this.scene.add(new AmbientLight(0x8fa0ff, 0.35))
    this.scene.add(new HemisphereLight(0xbfd4ff, 0x1a1020, 0.7))

    const key = new DirectionalLight(0xffffff, 2.4)

    key.position.set(-4, 5, 6)
    this.scene.add(key)

    const rim = new DirectionalLight(0x5ee6ff, 1.4)

    rim.position.set(5, 1, -4)
    this.scene.add(rim)

    // Свет факела: подсвечивает низ ракеты и площадку.
    this.flameLight = new PointLight(0xff7a3a, 0, 9, 1.6)
    this.scene.add(this.flameLight)
  }

  buildRocket() {
    this.rocket = new Group()
    this.model = new Group() // крутится при наклонах и «дрожит»
    this.rocket.add(this.model)

    const hullMat = new MeshStandardMaterial({ color: COLORS.hull, roughness: 0.32, metalness: 0.12 })
    const accentMat = new MeshStandardMaterial({ color: COLORS.accent, roughness: 0.4, metalness: 0.1 })
    const metalMat = new MeshStandardMaterial({ color: COLORS.metal, roughness: 0.35, metalness: 0.85 })
    const glassMat = new MeshStandardMaterial({
      color: COLORS.glass,
      emissive: COLORS.glass,
      emissiveIntensity: 0.55,
      roughness: 0.05,
      metalness: 0.3,
    })

    const hull = new Mesh(new LatheGeometry(hullProfile(), 56), hullMat)

    this.model.add(hull)

    // Красный нос и поясные полосы поверх корпуса.
    const nose = new Mesh(
      new LatheGeometry(hullProfile().filter((p) => p.y >= 0.9), 56),
      accentMat,
    )

    nose.scale.setScalar(1.002)
    this.model.add(nose)

    ;[-0.55, -0.9].forEach((y) => {
      const band = new Mesh(new CylinderGeometry(0.508, 0.508, 0.1, 56, 1, true), accentMat)

      band.position.y = y
      this.model.add(band)
    })

    // Иллюминатор.
    const ring = new Mesh(new TorusGeometry(0.17, 0.035, 14, 36), metalMat)

    ring.position.set(0, 0.2, 0.49)
    const glass = new Mesh(new CircleGeometry(0.15, 32), glassMat)

    glass.position.set(0, 0.2, 0.515)
    this.model.add(ring, glass)

    // Три стабилизатора.
    const finGeometry = createFinGeometry()

    for (let i = 0; i < 3; i++) {
      const pivot = new Group()
      const fin = new Mesh(finGeometry, accentMat)

      pivot.rotation.y = (i * Math.PI * 2) / 3
      fin.position.set(0.48, -0.55, -0.03)
      pivot.add(fin)
      this.model.add(pivot)
    }

    // Сопло.
    const bell = new Mesh(new CylinderGeometry(0.26, 0.4, 0.4, 36), metalMat)

    bell.position.y = -1.4
    this.model.add(bell)

    // Главный факел.
    this.mainFlame = createFlame(0.34, 2.6, 0)
    this.mainFlame.position.y = -1.6
    this.model.add(this.mainFlame)

    // Ускорители.
    this.boosters = [createBooster(-1), createBooster(1)]
    this.boosters.forEach((booster) => {
      booster.position.set(booster.userData.side * 0.78, -0.35, 0)
      booster.userData.home = booster.position.clone()
      this.model.add(booster)
    })

    this.scene.add(this.rocket)
  }

  buildSparks() {
    this.pool = new ParticlePool(this.quality.particles)

    const geometry = new BufferGeometry()

    geometry.setAttribute('position', new BufferAttribute(this.pool.positions, 3))
    geometry.setAttribute('aAge', new BufferAttribute(this.pool.ages, 1))
    geometry.setAttribute('aSize', new BufferAttribute(this.pool.sizes, 1))

    this.sparks = new Points(
      geometry,
      new ShaderMaterial({
        vertexShader: sparkVertex,
        fragmentShader: sparkFragment,
        uniforms: { uPixelRatio: { value: this.quality.dpr } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    this.sparks.frustumCulled = false
    this.scene.add(this.sparks)
    this.rng = createRng(77)
  }

  resize(width, height) {
    this.aspect = width / Math.max(height, 1)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = this.aspect
    this.camera.updateProjectionMatrix()
  }

  /** Положение ракеты по скроллу: `flight` — результат `sampleFlight`. */
  setFlight(flight) {
    this.state = flight
  }

  /** Наклон за курсором, −1…1 по осям. */
  setPointer(x, y) {
    this.pointer.x = x
    this.pointer.y = y
  }

  /** 0 — ускорители на месте, 1 — отстрелены. */
  setSeparation(value) {
    this.separation = value
  }

  /** Резкий всплеск тяги и дрожь (кнопка запуска). */
  boost(strength = 1) {
    this.shake = Math.max(this.shake, strength)
  }

  /** Позиция прокрутки (px) и тяга, которую хочет сценарий. */
  setScroll(scroll, thrust) {
    this.scroll = scroll
    this.targetThrust = thrust
  }

  update(dt, time) {
    this.time = time
    this.thrust = damp(this.thrust, this.targetThrust + this.shake * 0.6, 6, dt)
    this.shake = damp(this.shake, 0, 1.6, dt)
    const state = this.state
    // Звёзды бегут против движения: нос вверх — вниз, нос вниз — вверх.
    const dir = heading(state.roll)
    const scrolled = this.lastScroll === null ? 0 : this.scroll - this.lastScroll

    this.lastScroll = this.scroll
    this.starOffset += (Math.abs(scrolled) * 0.0035 + dt * (0.2 + this.thrust * 1.6)) * dir

    const world = toWorld(state, this.aspect, HALF_HEIGHT)
    const bob = Math.sin(time * 1.4) * 0.05 * (1 - state.ground * 0.4)
    const rumble = this.thrust * 0.012 + this.shake * 0.06

    this.rocket.position.set(
      world.x + (this.rng() - 0.5) * rumble,
      world.y + bob + (this.rng() - 0.5) * rumble,
      0,
    )
    this.rocket.scale.setScalar(world.scale)
    this.model.rotation.set(
      rad(this.pointer.y * -6),
      rad(state.yaw + this.pointer.x * 10),
      rad(state.roll),
    )

    // Площадка стоит под ракетой, пока ground = 0, и уезжает вниз.
    this.pad.position.set(world.x, world.y - state.ground * 16, -0.4)
    this.pad.scale.setScalar(world.scale)
    this.pad.visible = state.ground < 0.999
    this.pad.userData.beacon.material.emissiveIntensity = 1.2 + Math.sin(time * 5) * 1.1

    this.updateBoosters(dt)
    this.updateFlames(time)
    this.emitSparks(dt, world)

    this.stars.material.uniforms.uScroll.value = this.starOffset
    this.stars.material.uniforms.uTime.value = time
  }

  updateBoosters(dt) {
    const s = this.separation

    this.boosters.forEach((booster) => {
      const { side, home, flame } = booster.userData

      booster.visible = s < 0.999
      booster.position.set(home.x + side * s * 3.2, home.y - s * s * 5.5, home.z + s * 1.5)
      booster.rotation.z = side * -s * 1.1
      flame.visible = s < 0.15
      flame.scale.y = clamp(this.thrust, 0.2, 1.2) * (1 + Math.sin(this.time * 31 + side) * 0.06)
    })
  }

  updateFlames(time) {
    const length = lerp(0.2, 1, clamp(this.thrust, 0, 1.2)) * (1 + Math.sin(time * 33) * 0.05)

    this.mainFlame.scale.set(1, length, 1)
    this.mainFlame.scale.x = 0.7 + clamp(this.thrust, 0, 1) * 0.3

    const apply = (flame) =>
      flame.children.forEach((mesh) => {
        mesh.material.uniforms.uTime.value = time
        mesh.material.uniforms.uIntensity.value = clamp(0.25 + this.thrust, 0, 1.4)
      })

    apply(this.mainFlame)
    this.boosters.forEach((booster) => apply(booster.userData.flame))

    // Свет факела следует за соплом.
    this.model.updateWorldMatrix(true, false)
    this.mainFlame.getWorldPosition(this.flameLight.position)
    this.flameLight.position.addScaledVector(this.nozzleDir.set(0, -1, 0).transformDirection(this.model.matrixWorld), 0.6 * this.rocket.scale.y)
    this.flameLight.position.z += 1
    this.flameLight.intensity = clamp(this.thrust, 0, 1.4) * 14
  }

  emitSparks(dt, world) {
    const budget = spawnBudget(this.thrust, dt, this.spawnCarry, 80 + this.shake * 120)

    this.spawnCarry = budget.carry

    const origin = { x: 0, y: 0, z: 0 }
    const velocity = { x: 0, y: 0, z: 0 }
    const nozzle = this.mainFlame.getWorldPosition(this.flameLight.position.clone())
    // Ось сопла в мире: искры летят из сопла, куда бы ни смотрела ракета.
    const dir = this.nozzleDir.set(0, -1, 0).transformDirection(this.model.matrixWorld)

    for (let i = 0; i < budget.count; i++) {
      const speed = (2.5 + this.rng() * 3.5) * (0.6 + this.thrust * 0.6)

      origin.x = nozzle.x + dir.x * 0.2 * world.scale + (this.rng() - 0.5) * 0.35 * world.scale
      origin.y = nozzle.y + dir.y * 0.2 * world.scale
      origin.z = nozzle.z + (this.rng() - 0.5) * 0.35 * world.scale
      velocity.x = dir.x * speed + (this.rng() - 0.5) * 1.2
      velocity.y = dir.y * speed + (this.rng() - 0.5) * 0.6
      velocity.z = (this.rng() - 0.5) * 1.2
      this.pool.emit(origin, velocity, 0.7 + this.rng() * 0.9, 0.5 + this.rng() * 0.9)
    }

    this.pool.update(dt, 0.6)

    const attributes = this.sparks.geometry.attributes

    attributes.position.needsUpdate = true
    attributes.aAge.needsUpdate = true
    attributes.aSize.needsUpdate = true
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  get drawCalls() {
    return this.renderer.info.render.calls
  }

  dispose() {
    this.scene.traverse((object) => {
      object.geometry?.dispose?.()
      const material = object.material

      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material?.dispose?.()
    })
    releaseRenderer(this.renderer)
  }
}
