import type { Invitation, Notification } from '@/types'
import { api } from './api'

export const notificationsService = {
  async list(unreadOnly = false): Promise<Notification[]> {
    const { data } = await api.get<Notification[]>('/me/notifications', {
      params: unreadOnly ? { unread: 'true' } : {},
    })
    return data
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get<{ count: number }>('/me/notifications/unread-count')
    return data.count
  },

  async markRead(id: string): Promise<Notification> {
    const { data } = await api.patch<Notification>(`/me/notifications/${id}/read`)
    return data
  },

  async markAllRead(): Promise<void> {
    await api.post('/me/notifications/read-all')
  },
}

export const invitationsService = {
  async listMine(): Promise<Invitation[]> {
    const { data } = await api.get<Invitation[]>('/me/invitations')
    return data
  },

  async accept(id: string): Promise<Invitation> {
    const { data } = await api.post<Invitation>(`/me/invitations/${id}/accept`)
    return data
  },

  async decline(id: string): Promise<Invitation> {
    const { data } = await api.post<Invitation>(`/me/invitations/${id}/decline`)
    return data
  },
}
