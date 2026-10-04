/**
 * Шейдер «занавеса» для перехода между страницами.
 *
 * Рисуется поверх всей страницы (прозрачный canvas на весь экран). Каждый
 * пиксель решает: закрыт он занавесом или нет. Закрыто всё, что между двумя
 * горизонтальными границами uBottom и uTop (см. curtain.js), но границы не
 * ровные: к высоте пикселя добавлен шум (fbm), поэтому край «рваный», как
 * пламя или туман. На самом краю светится полоса цвета от оранжевого к
 * голубому, а сам занавес — тёмный космос с редкими звёздами.
 * @module page-transition/transition.glsl
 */

export const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const fragment = /* glsl */ `
  uniform float uTop;
  uniform float uBottom;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uBase;

  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    // Шум с учётом пропорций экрана — чтобы «языки» не были растянуты по ширине.
    vec2 p = vec2(vUv.x * uRes.x / uRes.y, vUv.y);
    float n = fbm(p * 3.0 + vec2(0.0, uTime * 0.6));

    // Высота пикселя, «испорченная» шумом: так ровные границы становятся рваными.
    float h = vUv.y + (n - 0.5) * 0.22;

    // inside = 1 между границами (занавес), 0 снаружи; мягкость края 0.012.
    float below = smoothstep(uTop + 0.012, uTop - 0.012, h);
    float above = smoothstep(uBottom - 0.012, uBottom + 0.012, h);
    float inside = below * above;

    // Светящийся кант: узкая полоса около каждой из границ.
    float rimTop = exp(-abs(h - uTop) * 60.0);
    float rimBottom = exp(-abs(h - uBottom) * 60.0) * step(-0.1, uBottom);
    float rim = max(rimTop, rimBottom);
    vec3 rimColor = mix(uColorA, uColorB, vUv.x);

    // Тело занавеса: тёмный космос с лёгкой туманностью и редкими звёздами.
    float stars = step(0.997, hash(floor(p * uRes.y * 0.5)));
    vec3 body = uBase + rimColor * n * 0.08 + stars * 0.6;

    vec3 color = body * inside + rimColor * rim * 1.4;
    float alpha = clamp(inside + rim, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`
