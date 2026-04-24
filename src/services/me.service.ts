import { api } from './api'

export interface AssignedTask {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  importance: string
  priorityId: string | null
  statusId: string | null
  projectId: string
  createdAt: string
  updatedAt: string
  project: { id: string; name: string; organizationId: string | null } | null
  priority: { id: string; name: string; color: string | null; rank: number } | null
  status: { id: string; name: string } | null
}

export interface MyStats {
  assignedTaskCount: number
  projectCount: number
}

export const meService = {
  async tasks(params: { organizationId?: string } = {}): Promise<AssignedTask[]> {
    const { data } = await api.get<AssignedTask[]>('/me/tasks', {
      params: params.organizationId ? { organizationId: params.organizationId } : {},
    })
    return data
  },
  async stats(): Promise<MyStats> {
    const { data } = await api.get<MyStats>('/me/stats')
    return data
  },
}
