import type { AuthResponse, User } from '@/types'
import { api } from './api'

export const authService = {
  async register(payload: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/register', payload)
    return data
  },

  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', payload)
    return data
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
}
