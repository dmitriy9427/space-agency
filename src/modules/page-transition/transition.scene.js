/**
 * WebGL-часть занавеса: прозрачный canvas поверх всего сайта и одна
 * полноэкранная плоскость с шейдером transition.glsl.js.
 *
 * Canvas рисуется ТОЛЬКО во время перехода (около 1.5 секунды); в остальное
 * время он пустой и скрыт (`visibility: hidden`), видеокарта не работает.
 * @module page-transition/transition.scene
 */
import { Color, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer } from 'three'
import { releaseRenderer } from '../../core/webgl.js'
import { curtainEdges } from './curtain.js'
import { fragment, vertex } from './transition.glsl.js'

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ dpr: number }} quality
 */
export function createTransitionRenderer(canvas, quality) {
  // alpha: true — canvas прозрачный там, где занавеса нет (видна страница).
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: false })
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const uniforms = {
    uTop: { value: -1 },
    uBottom: { value: -1 },
    uTime: { value: 0 },
    uRes: { value: new Vector2(1, 1) },
    uColorA: { value: new Color('#ff5b2e') }, // кант слева — оранжевый
    uColorB: { value: new Color('#5ee6ff') }, // справа — голубой
    uBase: { value: new Color('#05060d') }, // тело занавеса — цвет фона сайта
  }
  const geometry = new PlaneGeometry(2, 2)
  const material = new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, transparent: true })

  scene.add(new Mesh(geometry, material))
  renderer.setPixelRatio(Math.min(quality.dpr, 1.5))
  renderer.setClearColor(0x000000, 0)

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    uniforms.uRes.value.set(window.innerWidth, window.innerHeight)
  }

  resize()
  window.addEventListener('resize', resize)

  return {
    /** Нарисовать занавес для прогресса t (0…2) и времени (сек). */
    render(t, time) {
      const { top, bottom } = curtainEdges(t)

      uniforms.uTop.value = top
      uniforms.uBottom.value = bottom
      uniforms.uTime.value = time
      renderer.render(scene, camera)
    },
    /** Очистить canvas (после перехода). */
    clear() {
      renderer.clear()
    },
    dispose() {
      window.removeEventListener('resize', resize)
      geometry.dispose()
      material.dispose()
      releaseRenderer(renderer)
    },
  }
}
