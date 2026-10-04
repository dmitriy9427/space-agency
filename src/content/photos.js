/**
 * Фотографии NASA, которые использует страница (лежат в `public/photos`).
 * Источник — медиатека images.nasa.gov; авторство — в поле `credit` и в
 * CREDITS.md. Подписи — на русском.
 * @module content/photos
 */

/**
 * @typedef {object} Photo
 * @property {string} id
 * @property {string} src Путь от корня сайта.
 * @property {number} w Ширина файла, px.
 * @property {number} h Высота файла, px.
 * @property {string} title Название.
 * @property {string} kind Что на снимке (планета, туманность…).
 * @property {string} meta Аппарат / миссия / год.
 * @property {string} credit Автор и лицензия.
 * @property {string} nasaId Идентификатор в images.nasa.gov.
 */

/** @type {Photo[]} */
export const PHOTOS = [
  { id: 'p01', src: '/photos/p01.jpg', w: 1483, h: 1920, title: "Юнона над Юпитером", kind: 'Юпитер', meta: "Иллюстрация · Juno", credit: "NASA/JPL-Caltech", nasaId: "PIA21771" },
  { id: 'p02', src: '/photos/p02.jpg', w: 1920, h: 1080, title: "Серп Юпитера", kind: 'Юпитер', meta: "Juno · 2022", credit: "NASA/JPL-Caltech/SwRI/MSSS, обработка Kevin M. Gill (CC BY)", nasaId: "PIA25013" },
  { id: 'p03', src: '/photos/p03.jpg', w: 1024, h: 1024, title: "Грозы Юпитера", kind: 'Юпитер', meta: "Juno · 2022", credit: "NASA/JPL-Caltech/SwRI/MSSS, обработка Kevin M. Gill (CC BY)", nasaId: "PIA25020" },
  { id: 'p04', src: '/photos/p04.jpg', w: 986, h: 974, title: "Кольца Сатурна", kind: 'Сатурн', meta: "Cassini", credit: "NASA/JPL/Space Science Institute", nasaId: "PIA11657" },
  { id: 'p05', src: '/photos/p05.jpg', w: 1280, h: 1197, title: "Сатурн и Титан", kind: 'Сатурн', meta: "Cassini · 2011", credit: "NASA/JPL-Caltech/Space Science Institute", nasaId: "PIA14922" },
  { id: 'p06', src: '/photos/p06.jpg', w: 652, h: 1239, title: "Полярный вихрь", kind: 'Сатурн', meta: "Cassini · 2012", credit: "NASA/JPL-Caltech/Space Science Institute", nasaId: "PIA14925" },
  { id: 'p07', src: '/photos/p07.jpg', w: 982, h: 889, title: "Сатурн после равноденствия", kind: 'Сатурн', meta: "Cassini · 2009", credit: "NASA/JPL/Space Science Institute", nasaId: "PIA11613" },
  { id: 'p08', src: '/photos/p08.jpg', w: 1920, h: 1920, title: "Голубой шар", kind: 'Земля', meta: "Suomi NPP", credit: "NASA/GSFC", nasaId: "GSFC_20171208_Archive_e001386" },
  { id: 'p09', src: '/photos/p09.jpg', w: 1919, h: 1919, title: "Восточное полушарие", kind: 'Земля', meta: "Blue Marble", credit: "NASA/GSFC", nasaId: "GSFC_20171208_Archive_e002130" },
  { id: 'p11', src: '/photos/p11.jpg', w: 800, h: 800, title: "Весна на Марсе", kind: 'Марс', meta: "Hubble", credit: "NASA/JPL/STScI", nasaId: "PIA01253" },
  { id: 'p12', src: '/photos/p12.jpg', w: 1000, h: 1000, title: "Нептун", kind: 'Нептун', meta: "Voyager 2 · 1989", credit: "NASA/JPL", nasaId: "PIA02210" },
  { id: 'p13', src: '/photos/p13.jpg', w: 1280, h: 1280, title: "Уран", kind: 'Уран', meta: "Voyager 2 · 1986", credit: "NASA/JPL-Caltech", nasaId: "PIA18182" },
  { id: 'p15', src: '/photos/p15.jpg', w: 1920, h: 1280, title: "Закат Земли над Луной", kind: 'Луна', meta: "Artemis II", credit: "NASA", nasaId: "art002e021278" },
  { id: 'p16', src: '/photos/p16.jpg', w: 1920, h: 1111, title: "Космические скалы Киля", kind: 'Туманность', meta: "James Webb · 2022", credit: "NASA, ESA, CSA, STScI", nasaId: "carina_nebula" },
  { id: 'p17', src: '/photos/p17.jpg', w: 1920, h: 1799, title: "Столпы творения", kind: 'Туманность', meta: "Hubble", credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)", nasaId: "GSFC_20171208_Archive_e000842" },
  { id: 'p18', src: '/photos/p18.jpg', w: 1920, h: 1427, title: "Огненные башни", kind: 'Туманность', meta: "Spitzer + Hubble", credit: "NASA/JPL-Caltech/Harvard-Smithsonian CfA/ESA/STScI", nasaId: "PIA03096" },
  { id: 'p19', src: '/photos/p19.jpg', w: 1920, h: 1767, title: "Туманность Киля", kind: 'Туманность', meta: "Hubble", credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)", nasaId: "GSFC_20171208_Archive_e002074" },
  { id: 'p20', src: '/photos/p20.jpg', w: 1920, h: 1823, title: "Туманность Пузырь", kind: 'Туманность', meta: "Hubble", credit: "NASA, ESA, Hubble Heritage Team (STScI/AURA)", nasaId: "GSFC_20171208_Archive_e000383" },
  { id: 'p21', src: '/photos/p21.jpg', w: 1280, h: 1238, title: "Спиральная галактика", kind: 'Галактика', meta: "Hubble", credit: "NASA, ESA, Hubble", nasaId: "GSFC_20171208_Archive_e000687" },
  { id: 'p22', src: '/photos/p22.jpg', w: 1280, h: 1051, title: "Галактика-вертушка", kind: 'Галактика', meta: "Hubble", credit: "NASA, ESA, Hubble", nasaId: "GSFC_20171208_Archive_e000877" },
  { id: 'p23', src: '/photos/p23.jpg', w: 1280, h: 643, title: "Галактика с ребра", kind: 'Галактика', meta: "Hubble", credit: "NASA, ESA, Hubble", nasaId: "GSFC_20171208_Archive_e001172" },
  { id: 'p24', src: '/photos/p24.jpg', w: 1920, h: 1624, title: "Орион в инфракрасном", kind: 'Туманность', meta: "Herschel + Spitzer", credit: "ESA/NASA/JPL-Caltech", nasaId: "PIA25434" },
  { id: 'p25', src: '/photos/p25.jpg', w: 1866, h: 1920, title: "Радуга Ориона", kind: 'Туманность', meta: "Spitzer + Herschel", credit: "NASA/ESA/JPL-Caltech/IRAM", nasaId: "PIA13959" },
  { id: 'p26', src: '/photos/p26.jpg', w: 1920, h: 1275, title: "МКС над Землёй", kind: 'Орбита', meta: "Экспедиция 28", credit: "NASA/JSC", nasaId: "iss028e016135" },
  { id: 'p27', src: '/photos/p27.jpg', w: 1920, h: 1277, title: "Ночная Земля", kind: 'Орбита', meta: "Экспедиция 39 · фото Rick Mastracchio", credit: "NASA/JSC", nasaId: "iss039e009160" },
  { id: 'p28', src: '/photos/p28.jpg', w: 1920, h: 1277, title: "Полярное сияние", kind: 'Орбита', meta: "Экспедиция 30", credit: "NASA/JSC", nasaId: "iss030e119777" },
  { id: 'p29', src: '/photos/p29.jpg', w: 1393, h: 1920, title: "«Индевор» на старте", kind: 'Запуск', meta: "STS-130 · 2010", credit: "NASA/Bill Ingalls", nasaId: "201002060005HQ" },
  { id: 'p30', src: '/photos/p30.jpg', w: 1920, h: 1282, title: "Artemis II на закате", kind: 'Запуск', meta: "SLS · 2026", credit: "NASA", nasaId: "Artemis II at the pad sunsetting 01292026_13" },
  { id: 'p31', src: '/photos/p31.jpg', w: 1280, h: 1920, title: "Artemis II на стартовом столе", kind: 'Запуск', meta: "SLS · 2026", credit: "NASA/MSFC", nasaId: "Artemis II at the pad sunsetting jet in background 01292026_6" },
  { id: 'p32', src: '/photos/p32.jpg', w: 1920, h: 1699, title: "Солнце", kind: 'Звезда', meta: "Solar Dynamics Observatory", credit: "NASA/GSFC/SDO", nasaId: "GSFC_20171208_Archive_e000790" },
]

const byId = new Map(PHOTOS.map((photo) => [photo.id, photo]))

/** Фото по id («p08») или по порядковому номеру (с 0, по кругу). */
export function getPhoto(key) {
  if (typeof key === 'number' || /^\d+$/.test(String(key))) {
    const index = Number(key)

    return PHOTOS[((index % PHOTOS.length) + PHOTOS.length) % PHOTOS.length]
  }
  return byId.get(String(key)) ?? null
}

/**
 * Категории для фильтра на странице «Миссии» (модуль flip-filter):
 * название кнопки → какие значения `kind` в неё входят.
 */
export const CATEGORIES = {
  Планеты: ['Юпитер', 'Сатурн', 'Земля', 'Марс', 'Нептун', 'Уран'],
  Туманности: ['Туманность'],
  Галактики: ['Галактика'],
  'Орбита и Луна': ['Орбита', 'Луна'],
  Запуски: ['Запуск'],
  Солнце: ['Звезда'],
}

/** Категория фото (ключ CATEGORIES) или 'Другое', если вида нет в списке. */
export function categoryOf(photo) {
  return Object.keys(CATEGORIES).find((name) => CATEGORIES[name].includes(photo.kind)) ?? 'Другое'
}
