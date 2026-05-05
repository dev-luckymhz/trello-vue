import type {
  AttachmentProvider,
  Checklist,
  ChecklistItem,
  CustomFieldDefinition,
  CustomFieldValue,
  DependencyType,
  RecurrenceFrequency,
  Tag,
  Task,
  TaskActivity,
  TaskAttachment,
  TaskComment,
  TaskDependencyView,
  TaskProgressSnapshot,
  TaskRecurrence,
  TimeLog,
  TimeSummary,
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

  // --- Attachments ---

  async listAttachments(taskId: string): Promise<TaskAttachment[]> {
    const { data } = await api.get<TaskAttachment[]>(`/projects/tasks/${taskId}/attachments`)
    return data
  },

  async addLinkAttachment(
    taskId: string,
    payload: { url: string; name?: string; provider?: AttachmentProvider },
  ): Promise<TaskAttachment> {
    const { data } = await api.post<TaskAttachment>(
      `/projects/tasks/${taskId}/attachments/link`,
      payload,
    )
    return data
  },

  async uploadFileAttachment(taskId: string, file: File): Promise<TaskAttachment> {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post<TaskAttachment>(
      `/projects/tasks/${taskId}/attachments/file`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data
  },

  async renameAttachment(id: string, name: string): Promise<TaskAttachment> {
    const { data } = await api.patch<TaskAttachment>(`/projects/attachments/${id}`, { name })
    return data
  },

  async deleteAttachment(id: string): Promise<void> {
    await api.delete(`/projects/attachments/${id}`)
  },

  /**
   * Fetches the attachment as a blob (carrying the auth header) and either
   * downloads it or returns an object URL for in-browser preview.
   */
  async fetchAttachmentBlob(id: string, download = false): Promise<{ blob: Blob; url: string }> {
    const { data } = await api.get<Blob>(
      `/projects/attachments/${id}/download${download ? '?download=1' : ''}`,
      { responseType: 'blob' },
    )
    const url = URL.createObjectURL(data)
    return { blob: data, url }
  },

  async downloadAttachment(id: string, filename: string): Promise<void> {
    const { url } = await this.fetchAttachmentBlob(id, true)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  },

  // --- Dependencies ---

  async listDependencies(taskId: string): Promise<TaskDependencyView[]> {
    const { data } = await api.get<TaskDependencyView[]>(
      `/projects/tasks/${taskId}/dependencies`,
    )
    return data
  },

  async createDependency(
    taskId: string,
    payload: { otherTaskId: string; type: DependencyType },
  ): Promise<TaskDependencyView> {
    const { data } = await api.post<TaskDependencyView>(
      `/projects/tasks/${taskId}/dependencies`,
      payload,
    )
    return data
  },

  async deleteDependency(taskId: string, dependencyId: string): Promise<void> {
    await api.delete(`/projects/tasks/${taskId}/dependencies/${dependencyId}`)
  },

  // --- Time tracking ---

  async listTimeLogs(taskId: string): Promise<TimeLog[]> {
    const { data } = await api.get<TimeLog[]>(`/projects/tasks/${taskId}/time-logs`)
    return data
  },

  async timeSummary(taskId: string): Promise<TimeSummary> {
    const { data } = await api.get<TimeSummary>(
      `/projects/tasks/${taskId}/time-logs/summary`,
    )
    return data
  },

  async logTime(
    taskId: string,
    payload: { hours: number; loggedAt?: string; note?: string | null },
  ): Promise<TimeLog> {
    const { data } = await api.post<TimeLog>(
      `/projects/tasks/${taskId}/time-logs`,
      payload,
    )
    return data
  },

  async updateTimeLog(
    id: string,
    payload: Partial<{ hours: number; loggedAt: string; note: string | null }>,
  ): Promise<TimeLog> {
    const { data } = await api.patch<TimeLog>(`/projects/time-logs/${id}`, payload)
    return data
  },

  async deleteTimeLog(id: string): Promise<void> {
    await api.delete(`/projects/time-logs/${id}`)
  },

  // --- Recurrence ---

  async getRecurrence(taskId: string): Promise<TaskRecurrence | null> {
    const { data } = await api.get<TaskRecurrence | null>(
      `/projects/tasks/${taskId}/recurrence`,
    )
    return data
  },

  async upsertRecurrence(
    taskId: string,
    payload: {
      frequency: RecurrenceFrequency
      interval: number
      byWeekday?: number[]
      monthDay?: number
      nextRunAt: string
      endDate?: string | null
      isActive?: boolean
    },
  ): Promise<TaskRecurrence> {
    const { data } = await api.put<TaskRecurrence>(
      `/projects/tasks/${taskId}/recurrence`,
      payload,
    )
    return data
  },

  async deleteRecurrence(taskId: string): Promise<void> {
    await api.delete(`/projects/tasks/${taskId}/recurrence`)
  },

  // --- Custom field values (per-task) ---

  async listCustomFieldValues(taskId: string): Promise<CustomFieldValue[]> {
    const { data } = await api.get<CustomFieldValue[]>(
      `/projects/tasks/${taskId}/custom-field-values`,
    )
    return data
  },

  async setCustomFieldValue(
    taskId: string,
    definitionId: string,
    value: unknown,
  ): Promise<CustomFieldValue | null> {
    const { data } = await api.put<CustomFieldValue | null>(
      `/projects/tasks/${taskId}/custom-field-values/${definitionId}`,
      { value },
    )
    return data
  },

  async listProjectCustomFields(projectId: string): Promise<CustomFieldDefinition[]> {
    const { data } = await api.get<CustomFieldDefinition[]>(
      `/projects/${projectId}/custom-fields`,
    )
    return data
  },

  // --- Progress ---

  async progress(taskId: string): Promise<TaskProgressSnapshot> {
    const { data } = await api.get<TaskProgressSnapshot>(
      `/projects/tasks/${taskId}/progress`,
    )
    return data
  },
}
