/** Шейдеры ракеты: факел, частицы выхлопа и звёзды. @module rocket/rocket.glsl */

/** Факел: открытый конус остриём вниз; волны по длине и затухание к кончику. */
export const flameVertex = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  varying float vT;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    // t: 0 у сопла, 1 на кончике (геометрия сдвинута так, что y ∈ [-1, 0]).
    float t = clamp(-position.y, 0.0, 1.0);
    vec3 p = position;
    float angle = atan(position.z, position.x);
    float wave = sin(t * 14.0 - uTime * 22.0 + angle * 3.0 + uSeed)
               + 0.5 * sin(t * 31.0 - uTime * 37.0 - angle * 2.0);

    p.xz *= 1.0 + 0.1 * wave * t;
    p.x += sin(uTime * 17.0 + uSeed) * 0.03 * t;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    vT = t;
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

export const flameFragment = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uEdge;
  uniform float uIntensity;
  uniform float uTime;
  varying float vT;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    float fresnel = abs(dot(normalize(vNormal), normalize(vView)));
    float body = pow(1.0 - vT, 1.6);
    float flicker = 0.85 + 0.15 * sin(uTime * 40.0 + vT * 9.0);
    vec3 color = mix(uCore, uEdge, smoothstep(0.0, 0.75, vT));
    float alpha = body * pow(fresnel, 0.7) * flicker * uIntensity;

    gl_FragColor = vec4(color * (1.0 + body * 0.8), alpha);
  }
`

/** Частицы выхлопа: размер и цвет по возрасту. */
export const sparkVertex = /* glsl */ `
  attribute float aAge;
  attribute float aSize;
  uniform float uPixelRatio;
  varying float vAge;

  void main() {
    vAge = aAge;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);

    gl_PointSize = aSize * uPixelRatio * (1.0 - aAge * 0.5) * (260.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

export const sparkFragment = /* glsl */ `
  varying float vAge;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;

    float soft = pow(1.0 - d, 1.8);
    vec3 hot = vec3(1.0, 0.82, 0.45);
    vec3 cool = vec3(1.0, 0.28, 0.08);
    vec3 smoke = vec3(0.35, 0.3, 0.3);
    vec3 color = mix(hot, cool, smoothstep(0.0, 0.4, vAge));

    color = mix(color, smoke, smoothstep(0.5, 1.0, vAge));
    gl_FragColor = vec4(color, soft * (1.0 - vAge) * 0.9);
  }
`

/** Звёзды: мерцание и параллакс — слой «ближе» едет быстрее. */
export const starsVertex = /* glsl */ `
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uScroll;
  uniform float uTime;
  uniform float uHeight;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec3 p = position;
    // Ближние звёзды (z ближе к камере) смещаются сильнее.
    float depth = 1.0 - (position.z + 40.0) / 38.0;
    float shift = uScroll * (0.25 + depth * 1.4);

    p.y = mod(p.y - shift + uHeight * 0.5, uHeight) - uHeight * 0.5;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    vTwinkle = 0.65 + 0.35 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 40.0);
    vColor = aColor;
    gl_PointSize = (1.2 + aSeed * 2.4) * uPixelRatio * (40.0 / -mv.z) * 1.6;
    gl_Position = projectionMatrix * mv;
  }
`

export const starsFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;

    gl_FragColor = vec4(vColor, pow(1.0 - d, 1.5) * vTwinkle);
  }
`
