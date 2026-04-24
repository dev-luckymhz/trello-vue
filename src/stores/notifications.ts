import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Invitation, Notification } from '@/types'
import {
  invitationsService,
  notificationsService,
} from '@/services/notifications.service'

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([])
  const invitations = ref<Invitation[]>([])
  const loading = ref(false)

  const unreadCount = computed(() => notifications.value.filter((n) => !n.isRead).length)
  const pendingInvitations = computed(() => invitations.value)

  async function refresh(): Promise<void> {
    loading.value = true
    try {
      const [notifs, invs] = await Promise.all([
        notificationsService.list(),
        invitationsService.listMine(),
      ])
      notifications.value = notifs
      invitations.value = invs
    } finally {
      loading.value = false
    }
  }

  async function markRead(id: string): Promise<void> {
    await notificationsService.markRead(id)
    notifications.value = notifications.value.map((n) =>
      n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
    )
  }

  async function markAllRead(): Promise<void> {
    await notificationsService.markAllRead()
    notifications.value = notifications.value.map((n) => ({
      ...n,
      isRead: true,
      readAt: n.readAt ?? new Date().toISOString(),
    }))
  }

  async function accept(id: string): Promise<void> {
    await invitationsService.accept(id)
    invitations.value = invitations.value.filter((i) => i.id !== id)
    notifications.value = notifications.value.map((n) => {
      const invId = (n.data as { invitationId?: string } | null)?.invitationId
      if (invId === id && !n.isRead) {
        return { ...n, isRead: true, readAt: new Date().toISOString() }
      }
      return n
    })
  }

  async function decline(id: string): Promise<void> {
    await invitationsService.decline(id)
    invitations.value = invitations.value.filter((i) => i.id !== id)
    notifications.value = notifications.value.map((n) => {
      const invId = (n.data as { invitationId?: string } | null)?.invitationId
      if (invId === id && !n.isRead) {
        return { ...n, isRead: true, readAt: new Date().toISOString() }
      }
      return n
    })
  }

  function clear() {
    notifications.value = []
    invitations.value = []
  }

  return {
    notifications,
    invitations,
    loading,
    unreadCount,
    pendingInvitations,
    refresh,
    markRead,
    markAllRead,
    accept,
    decline,
    clear,
  }
})
