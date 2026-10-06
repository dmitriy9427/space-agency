/**
 * Точка входа. Её подключает каждая HTML-страница сайта:
 *   <script type="module" src="/src/main.js"></script>
 *
 * Здесь только три вещи:
 *   1. подключить шрифты и стили (Vite превратит эти import в <link>);
 *   2. перечислить модули — какое имя из `data-module="…"` каким кодом запускать;
 *   3. запустить приложение (src/app.js).
 *
 * Чтобы добавить свой эффект: создайте папку src/modules/<имя>/ с функцией
 * `init(el, ctx)`, импортируйте её здесь, добавьте в PAGE_MODULES и поставьте
 * `data-module="<имя>"` на элемент в HTML. Подробно — docs/07-customization.md.
 */

// Шрифты с кириллицей (лежат в node_modules, Vite копирует их в сборку):
// Unbounded — заголовки, Manrope — текст, JetBrains Mono — моноширинный.
import '@fontsource-variable/unbounded'
import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'
import './styles/base.css'
import './styles/sections.css'
import './styles/sliders.css'
import './styles/effects.css'
import './styles/pages.css'
import './styles/mobile.css' // телефон — последним, поверх всего

import { startApp } from './app.js'

// Общий слой — живёт на всех страницах, не пересоздаётся при переходах.
import * as cursor from './modules/cursor/index.js'
import * as nav from './modules/nav/index.js'

// Модули страниц.
import * as rocket from './modules/rocket/index.js'
import * as hero from './modules/hero/index.js'
import * as manifesto from './modules/manifesto/index.js'
import * as story from './modules/story/index.js'
import * as orbit from './modules/orbit/index.js'
import * as mission from './modules/mission/index.js'
import * as ring from './modules/sliders/ring/index.js'
import * as stack from './modules/sliders/stack/index.js'
import * as infinite from './modules/sliders/infinite/index.js'
import * as videoStrip from './modules/sliders/video-strip/index.js'
import * as shader from './modules/sliders/shader/index.js'
import * as liquid from './modules/liquid/index.js'
import * as gallery from './modules/gallery/index.js'
import * as pageIntro from './modules/page-intro/index.js'
import * as hscroll from './modules/hscroll/index.js'
import * as flipFilter from './modules/flip-filter/index.js'
import * as fullscreenSlides from './modules/fullscreen-slides/index.js'

/** Модули общего слоя: имя в data-module → функция init. */
const SHARED_MODULES = {
  cursor: cursor.init,
  nav: nav.init,
}

/** Модули страниц: имя в data-module → функция init. */
const PAGE_MODULES = {
  // главная
  rocket: rocket.init,
  hero: hero.init,
  manifesto: manifesto.init,
  story: story.init,
  orbit: orbit.init,
  mission: mission.init,
  ring: ring.init,
  stack: stack.init,
  infinite: infinite.init,
  infinite3d: infinite.init3d,
  'video-strip': videoStrip.init,
  shader: shader.init,
  liquid: liquid.init,
  gallery: gallery.init,
  // «Миссии»
  'page-intro': pageIntro.init,
  hscroll: hscroll.init,
  'flip-filter': flipFilter.init,
  // «Направления»
  'fullscreen-slides': fullscreenSlides.init,
}

startApp({ shared: SHARED_MODULES, page: PAGE_MODULES }).then((app) => {
  // Vite при правке файла заменяет модули «на лету» (HMR) — убираем старое
  // приложение, чтобы не было двух курсоров и двух роутеров.
  if (import.meta.hot) import.meta.hot.dispose(() => app.destroy())
})
