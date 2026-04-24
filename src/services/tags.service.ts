import type { Tag } from '@/types'
import { api } from './api'

export const tagsService = {
  async listForOrg(organizationId: string): Promise<Tag[]> {
    const { data } = await api.get<Tag[]>(`/organizations/${organizationId}/tags`)
    return data
  },

  async listForProject(projectId: string): Promise<Tag[]> {
    const { data } = await api.get<Tag[]>(`/projects/${projectId}/tags`)
    return data
  },

  async createInOrg(
    organizationId: string,
    payload: { name: string; color?: string },
  ): Promise<Tag> {
    const { data } = await api.post<Tag>(`/organizations/${organizationId}/tags`, payload)
    return data
  },

  async attachToProject(
    projectId: string,
    payload: { tagId?: string; name?: string; color?: string },
  ): Promise<Tag> {
    const { data } = await api.post<Tag>(`/projects/${projectId}/tags`, payload)
    return data
  },

  async detachFromProject(projectId: string, tagId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/tags/${tagId}`)
  },
}
