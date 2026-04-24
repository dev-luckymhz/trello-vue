import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '@/types'
import { authService } from '@/services/auth.service'
import { getStoredToken, setAuthToken } from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(getStoredToken())
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => token.value !== null && user.value !== null)

  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    try {
      const { token: t, user: u } = await authService.login({ email, password })
      setAuthToken(t)
      token.value = t
      user.value = u
    } finally {
      loading.value = false
    }
  }

  async function register(name: string, email: string, password: string): Promise<void> {
    loading.value = true
    try {
      const { token: t, user: u } = await authService.register({ name, email, password })
      setAuthToken(t)
      token.value = t
      user.value = u
    } finally {
      loading.value = false
    }
  }

  async function restore(): Promise<void> {
    if (initialized.value) return
    initialized.value = true
    if (!token.value) return
    try {
      user.value = await authService.me()
    } catch {
      logout()
    }
  }

  function logout(): void {
    setAuthToken(null)
    token.value = null
    user.value = null
  }

  return { user, token, loading, isAuthenticated, initialized, login, register, restore, logout }
})
