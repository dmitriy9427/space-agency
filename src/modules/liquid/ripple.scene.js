/**
 * WebGL-часть водной глади: две float-текстуры состояния (ping-pong),
 * шаг симуляции и вывод картинки с преломлением.
 * @module liquid/ripple.scene
 */
import {
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector4,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import { releaseRenderer } from '../../core/webgl.js'
import { MAX_DROPS } from './ripple.js'
import { displayFragment, quadVertex, simulateFragment } from './ripple.glsl.js'

/** Разрешение симуляции по меньшей стороне — от уровня качества. */
const SIM_SIZE = { low: 160, medium: 224, high: 288 }

/**
 * @param {HTMLElement} container
 * @param {HTMLImageElement} image
 * @param {{ dpr: number, tier: 'low'|'medium'|'high' }} quality
 * @returns {null | object} null — если float-текстуры недоступны (тогда остаётся просто фото).
 */
export function createRippleRenderer(container, image, quality) {
  const renderer = new WebGLRenderer({ antialias: false, alpha: false })

  if (!renderer.capabilities.isWebGL2 && !renderer.extensions.has('OES_texture_half_float')) {
    releaseRenderer(renderer)
    return null
  }

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const geometry = new PlaneGeometry(2, 2)
  const imageTexture = new Texture(image)

  imageTexture.needsUpdate = true
  imageTexture.colorSpace = SRGBColorSpace
  imageTexture.minFilter = LinearFilter
  imageTexture.generateMipmaps = false

  const makeTarget = (w, h) =>
    new WebGLRenderTarget(w, h, {
      type: HalfFloatType,
      format: RGBAFormat,
      // Линейная выборка сглаживает мелкую рябь при выводе на большой экран.
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
    })

  let targets = [makeTarget(2, 2), makeTarget(2, 2)]
  let current = 0
  let aspect = 1

  const drops = Array.from({ length: MAX_DROPS }, () => new Vector4())
  const simulate = new ShaderMaterial({
    vertexShader: quadVertex,
    fragmentShader: simulateFragment,
    defines: { MAX_DROPS },
    uniforms: {
      uState: { value: null },
      uTexel: { value: new Vector2() },
      uAspect: { value: 1 },
      uDamping: { value: 0.994 },
      uDrops: { value: drops },
      uDropCount: { value: 0 },
    },
  })
  const display = new ShaderMaterial({
    vertexShader: quadVertex,
    fragmentShader: displayFragment,
    uniforms: {
      uState: { value: null },
      uImage: { value: imageTexture },
      uTexel: { value: new Vector2() },
      uRes: { value: new Vector2(1, 1) },
      uImageSize: { value: new Vector2(image.naturalWidth || image.width, image.naturalHeight || image.height) },
      uRefraction: { value: 0.09 },
    },
  })
  const simScene = new Scene()
  const displayScene = new Scene()

  simScene.add(new Mesh(geometry, simulate))
  displayScene.add(new Mesh(geometry, display))
  renderer.setPixelRatio(Math.min(quality.dpr, 1.5))
  renderer.domElement.className = 'liquid__canvas'
  renderer.domElement.setAttribute('aria-hidden', 'true')
  container.prepend(renderer.domElement)

  return {
    resize(width, height) {
      renderer.setSize(width, height, false)
      display.uniforms.uRes.value.set(width, height)
      aspect = width / Math.max(height, 1)

      const base = SIM_SIZE[quality.tier] ?? SIM_SIZE.medium
      const w = Math.round(aspect >= 1 ? base * aspect : base)
      const h = Math.round(aspect >= 1 ? base : base / aspect)

      targets.forEach((target) => target.dispose())
      targets = [makeTarget(w, h), makeTarget(w, h)]
      simulate.uniforms.uTexel.value.set(1 / w, 1 / h)
      simulate.uniforms.uAspect.value = aspect
      display.uniforms.uTexel.value.set(1 / w, 1 / h)
    },
    /**
     * Шаг симуляции; капли применяются в первом шаге.
     * @param {{ x: number, y: number, radius: number, strength: number }[]} newDrops
     * @param {number} [steps]
     */
    step(newDrops, steps = 2) {
      for (let s = 0; s < steps; s++) {
        const list = s === 0 ? newDrops : []

        list.forEach((drop, i) => drops[i].set(drop.x, drop.y, drop.radius, drop.strength))
        simulate.uniforms.uDropCount.value = list.length
        simulate.uniforms.uState.value = targets[current].texture
        renderer.setRenderTarget(targets[1 - current])
        renderer.render(simScene, camera)
        current = 1 - current
      }
      renderer.setRenderTarget(null)
    },
    render() {
      display.uniforms.uState.value = targets[current].texture
      renderer.render(displayScene, camera)
    },
    dispose() {
      targets.forEach((target) => target.dispose())
      imageTexture.dispose()
      geometry.dispose()
      simulate.dispose()
      display.dispose()
      releaseRenderer(renderer)
    },
  }
}
