import type {
  Category,
  Invitation,
  Priority,
  Project,
  ProjectAccess,
  ProjectMember,
  ProjectPriority,
  ProjectRoleDef,
  ProjectStatus,
  ProjectUpdatePayload,
  Task,
  TaskStatus,
  Visibility,
} from '@/types'
import { api } from './api'

export interface ListProjectOptions {
  includeArchived?: boolean
  includeHidden?: boolean
  includeDrafts?: boolean
  organizationId?: string
}

export const projectsService = {
  async list(options: ListProjectOptions = {}): Promise<Project[]> {
    const { data } = await api.get<Project[]>('/projects', {
      params: {
        ...(options.includeArchived ? { includeArchived: 'true' } : {}),
        ...(options.includeHidden ? { includeHidden: 'true' } : {}),
        ...(options.includeDrafts ? { includeDrafts: 'true' } : {}),
        ...(options.organizationId ? { organizationId: options.organizationId } : {}),
      },
    })
    return data
  },

  async drafts(): Promise<Project[]> {
    const { data } = await api.get<Project[]>('/projects/drafts')
    return data
  },

  async activate(id: string): Promise<Project> {
    const { data } = await api.post<Project>(`/projects/${id}/activate`)
    return data
  },

  async progress(id: string): Promise<import('@/types').ProjectProgressSnapshot> {
    const { data } = await api.get<import('@/types').ProjectProgressSnapshot>(
      `/projects/${id}/progress`,
    )
    return data
  },

  async get(id: string): Promise<Project & { statuses: TaskStatus[]; categories: Category[] }> {
    const { data } = await api.get<Project & { statuses: TaskStatus[]; categories: Category[] }>(
      `/projects/${id}`,
    )
    return data
  },

  async myAccess(id: string): Promise<ProjectAccess> {
    const { data } = await api.get<ProjectAccess>(`/projects/${id}/my-access`)
    return data
  },

  async priorities(id: string): Promise<Priority[]> {
    const { data } = await api.get<Priority[]>(`/projects/${id}/priorities`)
    return data
  },

  async create(payload: {
    name: string
    description?: string
    organizationId?: string
    managerUserId?: string
    visibility?: Visibility
    status?: ProjectStatus
    priority?: ProjectPriority
    plannedStartDate?: string
    actualStartDate?: string
    endDate?: string
    actualEndDate?: string
    estimatedDurationDays?: number
    progress?: number
    tags?: string[]
    category?: string
    client?: string
    department?: string
  }): Promise<Project> {
    const { data } = await api.post<Project>('/projects', payload)
    return data
  },

  async update(id: string, payload: ProjectUpdatePayload): Promise<Project> {
    const { data } = await api.patch<Project>(`/projects/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/projects/${id}`)
  },

  async setArchived(id: string, archived: boolean): Promise<Project> {
    const { data } = await api.patch<Project>(`/projects/${id}/archive`, { archived })
    return data
  },

  async setHidden(id: string, hidden: boolean): Promise<Project> {
    const { data } = await api.patch<Project>(`/projects/${id}/visibility`, { hidden })
    return data
  },

  async listStatuses(projectId: string): Promise<TaskStatus[]> {
    const { data } = await api.get<TaskStatus[]>(`/projects/${projectId}/statuses`)
    return data
  },

  async createStatus(
    projectId: string,
    payload: { name: string; position?: number },
  ): Promise<TaskStatus> {
    const { data } = await api.post<TaskStatus>(`/projects/${projectId}/statuses`, payload)
    return data
  },

  async updateStatus(
    statusId: string,
    payload: Partial<{ name: string; position: number }>,
  ): Promise<TaskStatus> {
    const { data } = await api.patch<TaskStatus>(`/projects/statuses/${statusId}`, payload)
    return data
  },

  async deleteStatus(statusId: string): Promise<void> {
    await api.delete(`/projects/statuses/${statusId}`)
  },

  async reorderStatuses(projectId: string, orderedIds: string[]): Promise<TaskStatus[]> {
    const { data } = await api.post<TaskStatus[]>(
      `/projects/${projectId}/statuses/reorder`,
      { orderedIds },
    )
    return data
  },

  async listTasks(projectId: string): Promise<Task[]> {
    const { data } = await api.get<Task[]>(`/projects/${projectId}/tasks`)
    return data
  },

  async createTask(projectId: string, payload: Partial<Task>): Promise<Task> {
    const { data } = await api.post<Task>(`/projects/${projectId}/tasks`, payload)
    return data
  },

  async updateTask(taskId: string, payload: Partial<Task>): Promise<Task> {
    const { data } = await api.patch<Task>(`/projects/tasks/${taskId}`, payload)
    return data
  },

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/projects/tasks/${taskId}`)
  },

  async reorderTasks(
    projectId: string,
    payload: { statusId: string; taskIds: string[] },
  ): Promise<Task[]> {
    const { data } = await api.post<Task[]>(
      `/projects/${projectId}/tasks/reorder`,
      payload,
    )
    return data
  },

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    const { data } = await api.get<ProjectMember[]>(`/projects/${projectId}/members`)
    return data
  },

  async addMember(
    projectId: string,
    payload: { identifier: string; roleId?: string },
  ): Promise<ProjectMember> {
    const { data } = await api.post<ProjectMember>(
      `/projects/${projectId}/members`,
      payload,
    )
    return data
  },

  async updateMember(
    memberId: string,
    payload: { roleId?: string },
  ): Promise<ProjectMember> {
    const { data } = await api.patch<ProjectMember>(`/projects/members/${memberId}`, payload)
    return data
  },

  async removeMember(memberId: string): Promise<void> {
    await api.delete(`/projects/members/${memberId}`)
  },

  async listInvitations(projectId: string): Promise<Invitation[]> {
    const { data } = await api.get<Invitation[]>(`/projects/${projectId}/invitations`)
    return data
  },

  async revokeInvitation(invitationId: string): Promise<void> {
    await api.delete(`/projects/invitations/${invitationId}`)
  },

  async listRoles(projectId: string): Promise<ProjectRoleDef[]> {
    const { data } = await api.get<ProjectRoleDef[]>(`/projects/${projectId}/roles`)
    return data
  },

  async createRole(
    projectId: string,
    payload: { name: string; description?: string; permissions: string[] },
  ): Promise<ProjectRoleDef> {
    const { data } = await api.post<ProjectRoleDef>(
      `/projects/${projectId}/roles`,
      payload,
    )
    return data
  },

  async updateRole(
    roleId: string,
    payload: Partial<{ name: string; description: string; permissions: string[] }>,
  ): Promise<ProjectRoleDef> {
    const { data } = await api.patch<ProjectRoleDef>(`/projects/roles/${roleId}`, payload)
    return data
  },

  async deleteRole(roleId: string): Promise<void> {
    await api.delete(`/projects/roles/${roleId}`)
  },
}
