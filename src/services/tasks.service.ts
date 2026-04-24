import type {
  Checklist,
  ChecklistItem,
  Tag,
  Task,
  TaskActivity,
  TaskComment,
} from '@/types'
import { api } from './api'

export const tasksService = {
  async get(taskId: string): Promise<Task> {
    const { data } = await api.get<Task>(`/projects/tasks/${taskId}`)
    return data
  },

  // --- Assignees / Watchers ---

  async setAssignees(taskId: string, userIds: string[]): Promise<Task> {
    const { data } = await api.put<Task>(`/projects/tasks/${taskId}/assignees`, { userIds })
    return data
  },

  async setWatchers(taskId: string, userIds: string[]): Promise<Task> {
    const { data } = await api.put<Task>(`/projects/tasks/${taskId}/watchers`, { userIds })
    return data
  },

  async watch(taskId: string): Promise<Task> {
    const { data } = await api.post<Task>(`/projects/tasks/${taskId}/watch`)
    return data
  },

  async unwatch(taskId: string): Promise<Task> {
    const { data } = await api.post<Task>(`/projects/tasks/${taskId}/unwatch`)
    return data
  },

  // --- Tags ---

  async attachTag(
    taskId: string,
    payload: { tagId?: string; name?: string; color?: string | null },
  ): Promise<Tag> {
    const { data } = await api.post<Tag>(`/projects/tasks/${taskId}/tags`, payload)
    return data
  },

  async detachTag(taskId: string, tagId: string): Promise<void> {
    await api.delete(`/projects/tasks/${taskId}/tags/${tagId}`)
  },

  // --- Checklists ---

  async listChecklists(taskId: string): Promise<Checklist[]> {
    const { data } = await api.get<Checklist[]>(`/projects/tasks/${taskId}/checklists`)
    return data
  },

  async createChecklist(
    taskId: string,
    payload: { title: string; position?: number },
  ): Promise<Checklist> {
    const { data } = await api.post<Checklist>(
      `/projects/tasks/${taskId}/checklists`,
      payload,
    )
    return data
  },

  async updateChecklist(
    checklistId: string,
    payload: Partial<{ title: string; position: number }>,
  ): Promise<Checklist> {
    const { data } = await api.patch<Checklist>(
      `/projects/checklists/${checklistId}`,
      payload,
    )
    return data
  },

  async deleteChecklist(checklistId: string): Promise<void> {
    await api.delete(`/projects/checklists/${checklistId}`)
  },

  async addChecklistItem(
    checklistId: string,
    payload: {
      content: string
      position?: number
      assignedUserId?: string | null
      dueDate?: string | null
    },
  ): Promise<ChecklistItem> {
    const { data } = await api.post<ChecklistItem>(
      `/projects/checklists/${checklistId}/items`,
      payload,
    )
    return data
  },

  async updateChecklistItem(
    itemId: string,
    payload: Partial<{
      content: string
      isCompleted: boolean
      position: number
      assignedUserId: string | null
      dueDate: string | null
    }>,
  ): Promise<ChecklistItem> {
    const { data } = await api.patch<ChecklistItem>(
      `/projects/checklist-items/${itemId}`,
      payload,
    )
    return data
  },

  async deleteChecklistItem(itemId: string): Promise<void> {
    await api.delete(`/projects/checklist-items/${itemId}`)
  },

  // --- Comments ---

  async listComments(taskId: string): Promise<TaskComment[]> {
    const { data } = await api.get<TaskComment[]>(`/projects/tasks/${taskId}/comments`)
    return data
  },

  async createComment(
    taskId: string,
    payload: { body: string; mentionedUserIds?: string[] },
  ): Promise<TaskComment> {
    const { data } = await api.post<TaskComment>(
      `/projects/tasks/${taskId}/comments`,
      payload,
    )
    return data
  },

  async updateComment(
    commentId: string,
    payload: { body: string; mentionedUserIds?: string[] },
  ): Promise<TaskComment> {
    const { data } = await api.patch<TaskComment>(`/projects/comments/${commentId}`, payload)
    return data
  },

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/projects/comments/${commentId}`)
  },

  // --- Activity ---

  async listActivity(taskId: string): Promise<TaskActivity[]> {
    const { data } = await api.get<TaskActivity[]>(`/projects/tasks/${taskId}/activity`)
    return data
  },
}
