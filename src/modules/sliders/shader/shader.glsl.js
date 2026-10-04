/**
 * Шейдеры слайдера с переходом.
 *
 * ─── Идея ───────────────────────────────────────────────────────────────────
 * На экране одна плоскость на весь canvas и две текстуры: `uFrom` (старая
 * картинка) и `uTo` (новая). Для каждого пикселя фрагментный шейдер решает,
 * какую из них показать. Граница между ними — не прямая линия, а «рваная»:
 * к расстоянию до края добавлен шум (fbm). Пока граница проезжает кадр
 * (`uProgress` от 0 до 1), около неё картинки искажаются, каналы RGB
 * расходятся и светится цветной кант.
 *
 * ─── Uniform-ы (что приходит из JavaScript) ───────────────────────────────
 * uFrom, uTo         — текстуры старой и новой картинки;
 * uFromSize, uToSize — размеры картинок в px (для кадрирования «как cover»);
 * uRes               — размер canvas в px;
 * uProgress          — 0 → видна старая, 1 → видна новая;
 * uDir               — куда едет граница (единичный вектор, см. logic.js);
 * uTime              — время, чтобы шум немного «жил»;
 * uMouse             — курсор 0…1 (лёгкий параллакс);
 * uAccent            — цвет канта на границе.
 * @module sliders/shader/shader.glsl
 */

/**
 * Вершинный шейдер: плоскость 2×2 сразу в «экранных» координатах
 * (clip space от −1 до 1), камера не нужна. vUv — координаты текстуры 0…1.
 */
export const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const fragment = /* glsl */ `
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform vec2 uFromSize;
  uniform vec2 uToSize;
  uniform vec2 uRes;
  uniform float uProgress;
  uniform vec2 uDir;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec3 uAccent;

  varying vec2 vUv;

  // Кадрирование «как CSS object-fit: cover»: картинка заполняет весь блок,
  // лишнее по одной из сторон обрезается, пропорции не искажаются.
  vec2 cover(vec2 box, vec2 image, vec2 uv) {
    float boxRatio = box.x / box.y;
    float imageRatio = image.x / image.y;
    vec2 scale = boxRatio < imageRatio ? vec2(boxRatio / imageRatio, 1.0) : vec2(1.0, imageRatio / boxRatio);
    return (uv - 0.5) * scale + 0.5;
  }

  // Псевдослучайное число из координаты (классический «хэш» для шейдеров).
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  // Плавный шум: значения hash в углах клетки, сглаженно смешанные.
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  // fbm — сумма шумов разного масштаба: крупные «рваные» края + мелкая детализация.
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 parallax = (uMouse - 0.5) * 0.015;
    float n = fbm(uv * 4.0 + uTime * 0.04);

    // «Поле»: 0 у края, с которого начинается раскрытие, 1 — у противоположного.
    // Граница едет по направлению uDir, значит раскрытие начинается с края,
    // противоположного uDir: для uDir = (−1, 0) это правый край.
    float axis = 0.5 + dot(uv - 0.5, uDir);
    float field = axis * 0.72 + n * 0.28;

    // Положение границы: чуть за пределами кадра при 0 и при 1, чтобы
    // в начале и в конце на экране не оставалось «хвостов».
    float edge = uProgress * 1.3 - 0.15;
    // mask: 1 — уже новая картинка, 0 — ещё старая (мягкий переход шириной 0.16).
    float mask = 1.0 - smoothstep(edge - 0.08, edge + 0.08, field);
    // band: 1 на самой границе, 0 вдали от неё — там будут эффекты.
    float band = 1.0 - abs(mask * 2.0 - 1.0);

    // Искажение: сильнее всего в середине перехода (sin), вдоль направления.
    float push = sin(uProgress * 3.14159) * 0.12;
    vec2 offset = (vec2(n, fract(n * 7.0)) - 0.5) * push - uDir * band * 0.04;

    vec2 fromUv = cover(uRes, uFromSize, uv + offset * mask + parallax);
    vec2 toUv = cover(uRes, uToSize, uv - offset * (1.0 - mask) + parallax);

    // RGB-расслоение на границе: красный и синий каналы берём чуть сдвинутыми.
    vec2 split = uDir * band * 0.012;
    vec3 a = vec3(texture2D(uFrom, fromUv + split).r, texture2D(uFrom, fromUv).g, texture2D(uFrom, fromUv - split).b);
    vec3 b = vec3(texture2D(uTo, toUv + split).r, texture2D(uTo, toUv).g, texture2D(uTo, toUv - split).b);

    vec3 color = mix(a, b, mask) + uAccent * pow(band, 3.0) * 0.6;

    gl_FragColor = vec4(color, 1.0);
    // Перевод цвета в sRGB, как ждёт экран (иначе картинка темнее, чем в <img>).
    #include <colorspace_fragment>
  }
`
