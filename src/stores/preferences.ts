import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'
export type Locale = 'en' | 'fr'

const THEME_KEY = 'kanban:theme'
const LOCALE_KEY = 'kanban:locale'

function readTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

function readLocale(): Locale {
  const stored = localStorage.getItem(LOCALE_KEY) as Locale | null
  if (stored === 'en' || stored === 'fr') return stored
  const navigatorLocale =
    typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en'
  return navigatorLocale.startsWith('fr') ? 'fr' : 'en'
}

function applyTheme(value: Theme): void {
  const root = document.documentElement
  if (value === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  root.style.colorScheme = value
}

export const usePreferencesStore = defineStore('preferences', () => {
  const theme = ref<Theme>(readTheme())
  const locale = ref<Locale>(readLocale())

  applyTheme(theme.value)

  watch(theme, (value) => {
    localStorage.setItem(THEME_KEY, value)
    applyTheme(value)
  })

  watch(locale, (value) => {
    localStorage.setItem(LOCALE_KEY, value)
  })

  function toggleTheme(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(value: Theme): void {
    theme.value = value
  }

  function setLocale(value: Locale): void {
    locale.value = value
  }

  return { theme, locale, toggleTheme, setTheme, setLocale }
})
