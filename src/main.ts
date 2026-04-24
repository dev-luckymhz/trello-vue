import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faTrash,
  faPencil,
  faPlus,
  faEllipsisV,
  faXmark,
  faChevronLeft,
  faArrowRotateLeft,
  faRightFromBracket,
  faBuilding,
  faFire,
  faUser,
  faEye,
  faEyeSlash,
  faBoxArchive,
  faBoxOpen,
  faGear,
  faShield,
  faUsers,
  faFlag,
  faCheck,
  faSun,
  faMoon,
  faLanguage,
  faLayerGroup,
  faHouse,
  faListCheck,
  faClockRotateLeft,
  faCalendarDay,
  faInbox,
  faBell,
  faLock,
  faLockOpen,
  faUserPlus,
  faCircleInfo,
  faSliders,
  faUserCheck,
  faPenToSquare,
  faArrowRight,
  faChartPie,
} from '@fortawesome/free-solid-svg-icons'

import './style.css'
import App from './App.vue'
import { router } from './router'
import { i18n, setI18nLocale } from './i18n'
import { usePreferencesStore } from './stores/preferences'

library.add(
  faTrash,
  faPencil,
  faPlus,
  faEllipsisV,
  faXmark,
  faChevronLeft,
  faArrowRotateLeft,
  faRightFromBracket,
  faBuilding,
  faFire,
  faUser,
  faEye,
  faEyeSlash,
  faBoxArchive,
  faBoxOpen,
  faGear,
  faShield,
  faUsers,
  faFlag,
  faCheck,
  faSun,
  faMoon,
  faLanguage,
  faLayerGroup,
  faHouse,
  faListCheck,
  faClockRotateLeft,
  faCalendarDay,
  faInbox,
  faBell,
  faLock,
  faLockOpen,
  faUserPlus,
  faCircleInfo,
  faSliders,
  faUserCheck,
  faPenToSquare,
  faArrowRight,
  faChartPie,
)

const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon)

const pinia = createPinia()
app.use(pinia)

const preferences = usePreferencesStore()
setI18nLocale(preferences.locale)
watch(
  () => preferences.locale,
  (value) => setI18nLocale(value),
)

app.use(i18n)
app.use(router)
app.mount('#app')
