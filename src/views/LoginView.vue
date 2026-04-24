<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore, type Locale } from '@/stores/preferences'
import { availableLocales } from '@/i18n'
import { extractErrorMessage } from '@/services/api'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const prefs = usePreferencesStore()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)

async function submit() {
  error.value = null
  try {
    await auth.login(email.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-100 to-brand-50 dark:from-slate-950 dark:to-slate-900"
  >
    <div class="w-full max-w-sm">
      <div class="flex items-center justify-end mb-2 gap-1">
        <button
          class="btn-icon"
          :aria-label="$t('nav.theme')"
          :title="$t('nav.theme')"
          @click="prefs.toggleTheme()"
        >
          <font-awesome-icon
            :icon="prefs.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"
            class="w-4 h-4"
          />
        </button>
        <select
          :value="prefs.locale"
          @change="prefs.setLocale(($event.target as HTMLSelectElement).value as Locale)"
          class="text-xs bg-transparent text-muted rounded-md px-2 py-1 focus:outline-none"
        >
          <option v-for="l in availableLocales" :key="l.code" :value="l.code">{{ l.label }}</option>
        </select>
      </div>

      <form
        class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700"
        @submit.prevent="submit"
      >
        <div class="text-center mb-6">
          <div
            class="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold shadow-sm mx-auto mb-3"
          >
            K
          </div>
          <h1 class="text-2xl font-bold text-app">{{ $t('auth.loginTitle') }}</h1>
          <p class="text-sm text-muted mt-1">{{ $t('auth.loginSubtitle') }}</p>
        </div>

        <div v-if="error" class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm">
          {{ error }}
        </div>

        <label class="label">{{ $t('auth.fieldEmail') }}</label>
        <input v-model="email" type="email" required autocomplete="email" class="input mb-4" />

        <label class="label">{{ $t('auth.fieldPassword') }}</label>
        <input
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="input mb-6"
        />

        <button type="submit" :disabled="auth.loading" class="btn-primary w-full">
          {{ auth.loading ? $t('auth.signingIn') : $t('auth.signIn') }}
        </button>

        <p class="text-center text-sm text-muted mt-4">
          {{ $t('auth.noAccount') }}
          <router-link to="/register" class="text-brand-600 dark:text-brand-400 hover:underline font-medium">
            {{ $t('auth.createOne') }}
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>
