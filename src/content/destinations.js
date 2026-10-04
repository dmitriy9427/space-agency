/**
 * Направления для страницы «Направления» (полноэкранные слайды).
 * Цифры округлены — это витрина, а не справочник.
 * @module content/destinations
 */

/**
 * @typedef {object} Destination
 * @property {string} name
 * @property {string} tagline Короткая подпись.
 * @property {string} photo id фото из PHOTOS
 * @property {{ label: string, value: string }[]} stats
 */

/** @type {Destination[]} */
export const DESTINATIONS = [
  {
    name: 'Луна',
    tagline: 'Три дня пути. Ближайший берег.',
    photo: 'p15',
    stats: [
      { label: 'От Земли', value: '384 400 км' },
      { label: 'В пути', value: '3 дня' },
      { label: 'Сутки', value: '29,5 земных' },
    ],
  },
  {
    name: 'Марс',
    tagline: 'Красные пески и самый высокий вулкан.',
    photo: 'p11',
    stats: [
      { label: 'От Земли', value: '225 млн км' },
      { label: 'В пути', value: '7 месяцев' },
      { label: 'Сутки', value: '24 ч 37 мин' },
    ],
  },
  {
    name: 'Юпитер',
    tagline: 'Шторм больше Земли не стихает веками.',
    photo: 'p02',
    stats: [
      { label: 'От Земли', value: '628 млн км' },
      { label: 'В пути', value: '5 лет' },
      { label: 'Сутки', value: '9 ч 56 мин' },
    ],
  },
  {
    name: 'Сатурн',
    tagline: 'Кольца шириной в 280 000 км и толщиной с дом.',
    photo: 'p05',
    stats: [
      { label: 'От Земли', value: '1,3 млрд км' },
      { label: 'В пути', value: '7 лет' },
      { label: 'Сутки', value: '10 ч 33 мин' },
    ],
  },
  {
    name: 'Уран',
    tagline: 'Вращается, лёжа на боку.',
    photo: 'p13',
    stats: [
      { label: 'От Земли', value: '2,7 млрд км' },
      { label: 'В пути', value: '9 лет' },
      { label: 'Сутки', value: '17 ч 14 мин' },
    ],
  },
  {
    name: 'Нептун',
    tagline: 'Самые быстрые ветры Солнечной системы.',
    photo: 'p12',
    stats: [
      { label: 'От Земли', value: '4,3 млрд км' },
      { label: 'В пути', value: '12 лет' },
      { label: 'Сутки', value: '16 ч 6 мин' },
    ],
  },
]
