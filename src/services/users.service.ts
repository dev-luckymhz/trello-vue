import { api } from './api'

export interface UserSearchResult {
  id: string
  name: string
  email: string
}

export const usersService = {
  async search(query: string): Promise<UserSearchResult[]> {
    if (!query.trim()) return []
    const { data } = await api.get<UserSearchResult[]>('/users/search', {
      params: { q: query },
    })
    return data
  },

  async getById(id: string): Promise<UserSearchResult> {
    const { data } = await api.get<UserSearchResult>(`/users/${id}`)
    return data
  },
}
