import { createI18n } from 'vue-i18n'
import en from './en.json'
import fr from './fr.json'

export const availableLocales = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
] as const

const stored = (typeof localStorage !== 'undefined'
  ? localStorage.getItem('kanban:locale')
  : null) as 'en' | 'fr' | null

const initial = stored === 'fr' || stored === 'en' ? stored : 'en'

export const i18n = createI18n({
  legacy: false,
  locale: initial,
  fallbackLocale: 'en',
  messages: { en, fr },
  globalInjection: true,
})

export function setI18nLocale(locale: 'en' | 'fr'): void {
  i18n.global.locale.value = locale
}
