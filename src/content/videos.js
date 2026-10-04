/**
 * Ролики NASA для аккордеона. Файлы не хранятся в проекте: `src` указывает
 * на лёгкую `~mobile.mp4`-версию в медиатеке NASA, браузер грузит её только
 * при первом наведении (`preload="none"`), постер — локальное фото.
 * @module content/videos
 */

const asset = (id) => `https://images-assets.nasa.gov/video/${encodeURIComponent(id)}/${encodeURIComponent(id)}~mobile.mp4`

/**
 * @typedef {object} Video
 * @property {string} title
 * @property {string} text
 * @property {string} meta
 * @property {string} src
 * @property {string} poster id фото из PHOTOS.
 * @property {number} start С какой секунды играть (пропустить заставку).
 * @property {number} [end] На какой секунде вернуться к `start`: крутим только
 *   красивый отрезок (дальше бывают титры или ведущий). Без `end` — весь ролик.
 */

/** @type {Video[]} */
export const VIDEOS = [
  {
    title: 'Земля с МКС',
    text: 'Облака, океаны и терминатор в реальном времени — камера станции, без музыки и титров.',
    meta: 'Международная космическая станция',
    src: asset('NHQ_2020_1221_Earth Views'),
    poster: 'p26',
    start: 120,
  },
  {
    title: 'Пролёт над Луной',
    text: 'Уступ Ли-Линкольн у места посадки «Аполлона-17» по данным орбитального зонда LRO.',
    meta: 'Lunar Reconnaissance Orbiter',
    src: asset('GSFC_20190513_m4714_Lee_Lincoln_Scarp_Moon_Flyover'),
    poster: 'p15',
    start: 0,
  },
  {
    title: 'Hubble над Землёй',
    text: 'Камера отдаляется от телескопа, пока Земля не превращается в маленький голубой шар.',
    meta: 'Hubble Space Telescope',
    src: asset('GSFC_20080520_HST_m10217_Zoom_Out'),
    poster: 'p08',
    start: 0,
    end: 15,
  },
  {
    title: 'Полное затмение',
    text: 'Таймлапс затмения 8 апреля 2024 года: корона Солнца вокруг чёрного диска Луны.',
    meta: 'Мазатлан, Мексика · 2024',
    src: asset('TIME WARP TOTAL SOLAR ECLIPSE TIMELAPSE_HD'),
    poster: 'p32',
    start: 14,
    end: 75,
  },
  {
    title: 'Чёрная дыра',
    text: 'Аккреционный диск, искривлённый гравитацией: свет огибает чёрную дыру со всех сторон.',
    meta: 'Анимация · NuSTAR',
    src: asset('JPL-20250409-NUSTARf-0001-Hunting_Hidden_Black_Holes_2160cc'),
    poster: 'p23',
    start: 0.3,
    end: 7.4,
  },
  {
    title: 'Восход Земли',
    text: 'Земля поднимается над лунным горизонтом — вид с камеры корабля Orion в миссии Artemis I.',
    meta: 'Orion · Artemis I · 2022',
    src: asset('ART-SAW4_2022_325_1305_SHARED_art001m1203251305'),
    poster: 'p15',
    start: 0,
  },
  {
    title: 'Год Солнца',
    text: 'Таймлапс обсерватории SDO: вспышки, протуберанцы и вращение Солнца за несколько минут.',
    meta: 'Solar Dynamics Observatory',
    src: asset('GSFC_20160212_SDO_m12144_Year6'),
    poster: 'p32',
    start: 30,
  },
  {
    title: 'Запуск Artemis I',
    text: 'Самая мощная ракета NASA уходит к Луне. Съёмка с пресс-площадки космического центра Кеннеди.',
    meta: 'SLS · ноябрь 2022',
    src: asset('Artemis I Launch 2022 CU tracking from Press Site_compressed'),
    poster: 'p30',
    start: 0,
  },
]
