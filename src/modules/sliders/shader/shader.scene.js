/**
 * WebGL-часть шейдерного слайдера (three.js).
 *
 * ─── Что здесь ──────────────────────────────────────────────────────────────
 * Самая простая возможная сцена: одна плоскость на весь canvas и материал с
 * нашим шейдером (shader.glsl.js). Камера ортогональная и ни на что не
 * влияет — вершинный шейдер сам ставит плоскость на весь экран.
 *
 * Весь «эффект» живёт во фрагментном шейдере; этот файл только:
 *   - создаёт рендерер и текстуры из загруженных картинок;
 *   - передаёт в шейдер uniform-ы (какие картинки, прогресс, направление…);
 *   - рисует кадр, когда попросят (`render`).
 *
 * ─── Как перенести ─────────────────────────────────────────────────────────
 * Файл не знает про DOM-разметку слайдера: дайте ему контейнер и массив
 * загруженных <img> — и управляйте через setPair / setProgress / render.
 * Работает в любом фреймворке; в React можно обернуть в useEffect.
 * @module sliders/shader/shader.scene
 */
import { Color, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry, SRGBColorSpace, Scene, ShaderMaterial, Texture, Vector2, WebGLRenderer } from 'three'
import { releaseRenderer } from '../../../core/webgl.js'
import { fragment, vertex } from './shader.glsl.js'

/** Натуральный размер картинки (у <img> — naturalWidth, у canvas — width). */
const sizeOf = (image) => ({ w: image.naturalWidth || image.width, h: image.naturalHeight || image.height })

/**
 * @param {HTMLElement} container Куда вставить canvas.
 * @param {HTMLImageElement[]} images Загруженные фото (с того же домена — иначе WebGL откажет, см. docs/02-concepts.md, 2.10).
 * @param {{ dpr: number }} quality Уровень качества (плотность пикселей).
 */
export function createShaderRenderer(container, images, quality) {
  // antialias не нужен: у нас одна плоскость на весь экран, сглаживать нечего.
  const renderer = new WebGLRenderer({ antialias: false, alpha: false })
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  // Текстура из каждой картинки. Создаём сразу все (их 6) — переключение
  // слайдов тогда мгновенное, без загрузки.
  const textures = images.map((image) => {
    const texture = new Texture(image)

    texture.needsUpdate = true // «загрузить пиксели в видеокарту»
    texture.colorSpace = SRGBColorSpace // фото хранятся в sRGB — говорим об этом three
    texture.minFilter = LinearFilter // без mip-карт: картинка показывается примерно 1:1
    texture.generateMipmaps = false
    return texture
  })

  const first = sizeOf(images[0])
  const uniforms = {
    uFrom: { value: textures[0] },
    uTo: { value: textures[0] },
    uFromSize: { value: new Vector2(first.w, first.h) },
    uToSize: { value: new Vector2(first.w, first.h) },
    uRes: { value: new Vector2(1, 1) },
    uProgress: { value: 0 },
    uDir: { value: new Vector2(-1, 0) },
    uTime: { value: 0 },
    uMouse: { value: new Vector2(0.5, 0.5) },
    uAccent: { value: new Color(0xff5b2e) },
  }
  const geometry = new PlaneGeometry(2, 2)
  const material = new ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms })

  // На весь экран — не больше 1.5 px на CSS-пиксель: разница с 2 незаметна,
  // а пикселей (и работы шейдера) почти вдвое меньше.
  renderer.setPixelRatio(Math.min(quality.dpr, 1.5))
  renderer.domElement.className = 'shader-slider__canvas'
  renderer.domElement.setAttribute('aria-hidden', 'true')
  container.appendChild(renderer.domElement)
  scene.add(new Mesh(geometry, material))

  return {
    /** Какие картинки смешиваем: из слайда `from` в слайд `to`. */
    setPair(from, to) {
      uniforms.uFrom.value = textures[from]
      uniforms.uTo.value = textures[to]
      uniforms.uFromSize.value.set(sizeOf(images[from]).w, sizeOf(images[from]).h)
      uniforms.uToSize.value.set(sizeOf(images[to]).w, sizeOf(images[to]).h)
    },
    /**
     * Прогресс перехода и направление движения границы.
     * @param {number} progress 0…1
     * @param {[number, number]} dir Единичный вектор, см. DIRECTIONS в logic.js.
     */
    setProgress(progress, dir) {
      uniforms.uProgress.value = progress
      uniforms.uDir.value.set(dir[0], dir[1])
    },
    /** Курсор в долях 0…1 (Y вверх) — для лёгкого параллакса. */
    setMouse(x, y) {
      uniforms.uMouse.value.set(x, y)
    },
    /** Цвет светящегося канта на границе. */
    setAccent(hex) {
      uniforms.uAccent.value.set(hex)
    },
    /** Размер canvas в CSS-пикселях (вызывать при каждом ресайзе контейнера). */
    resize(width, height) {
      // false — не трогать CSS-размер canvas: его задают стили (100% контейнера).
      renderer.setSize(width, height, false)
      uniforms.uRes.value.set(width, height)
    },
    /** Нарисовать кадр. `time` — секунды (шум на границе слегка движется). */
    render(time) {
      uniforms.uTime.value = time
      renderer.render(scene, camera)
    },
    /** Освободить видеопамять и WebGL-контекст (их у браузера ограниченное число). */
    dispose() {
      textures.forEach((texture) => texture.dispose())
      geometry.dispose()
      material.dispose()
      releaseRenderer(renderer)
    },
  }
}
