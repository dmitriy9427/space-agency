/**
 * Шейдеры водной глади.
 *
 * Симуляция (классическая схема «высота + скорость», как в WebGL Water
 * Эвана Уоллеса): каждая точка тянется к среднему соседей, скорость
 * затухает — волны расходятся кругами, отражаются и гаснут.
 * R — высота поверхности, G — её скорость.
 *
 * Отображение: нормаль из градиента высоты преломляет картинку (каналы с
 * разным смещением — дисперсия), сверху — блик «солнца» на гребнях.
 * @module liquid/ripple.glsl
 */

export const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const simulateFragment = /* glsl */ `
  precision highp float;

  uniform sampler2D uState;
  uniform vec2 uTexel;
  uniform float uAspect;
  uniform float uDamping;
  uniform vec4 uDrops[MAX_DROPS];
  uniform int uDropCount;

  varying vec2 vUv;

  const float PI = 3.14159265;

  void main() {
    vec4 info = texture2D(uState, vUv);
    float average = (
      texture2D(uState, vUv - vec2(uTexel.x, 0.0)).r +
      texture2D(uState, vUv + vec2(uTexel.x, 0.0)).r +
      texture2D(uState, vUv - vec2(0.0, uTexel.y)).r +
      texture2D(uState, vUv + vec2(0.0, uTexel.y)).r
    ) * 0.25;

    info.g += (average - info.r) * 2.0;
    info.g *= uDamping;
    info.r += info.g;

    for (int i = 0; i < MAX_DROPS; i++) {
      if (i >= uDropCount) break;
      vec4 drop = uDrops[i];
      // Расстояние с учётом пропорций — круги, а не эллипсы.
      vec2 d = (vUv - drop.xy) * vec2(uAspect, 1.0);
      float k = max(0.0, 1.0 - length(d) / drop.z);

      k = 0.5 - cos(k * PI) * 0.5;
      info.r -= k * drop.w;
    }

    gl_FragColor = info;
  }
`

export const displayFragment = /* glsl */ `
  uniform sampler2D uState;
  uniform sampler2D uImage;
  uniform vec2 uTexel;
  uniform vec2 uRes;
  uniform vec2 uImageSize;
  uniform float uRefraction;

  varying vec2 vUv;

  vec2 cover(vec2 box, vec2 image, vec2 uv) {
    float boxRatio = box.x / box.y;
    float imageRatio = image.x / image.y;
    vec2 scale = boxRatio < imageRatio ? vec2(boxRatio / imageRatio, 1.0) : vec2(1.0, imageRatio / boxRatio);
    return (uv - 0.5) * scale + 0.5;
  }

  void main() {
    float h = texture2D(uState, vUv).r;
    vec2 grad = vec2(
      texture2D(uState, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uState, vUv - vec2(uTexel.x, 0.0)).r,
      texture2D(uState, vUv + vec2(0.0, uTexel.y)).r - texture2D(uState, vUv - vec2(0.0, uTexel.y)).r
    );
    vec3 normal = normalize(vec3(-grad * 24.0, 1.0));
    vec2 offset = normal.xy * uRefraction;
    vec2 uv = cover(uRes, uImageSize, vUv);

    vec3 color = vec3(
      texture2D(uImage, uv + offset * 1.15).r,
      texture2D(uImage, uv + offset).g,
      texture2D(uImage, uv + offset * 0.85).b
    );

    vec3 light = normalize(vec3(-0.4, 0.6, 1.0));
    float spec = pow(max(dot(normal, light), 0.0), 90.0);
    float crest = clamp(-h * 1.5, 0.0, 1.0);

    color += spec * 0.55 + crest * 0.12;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`
