import type { ProjectCategory } from '@/types'
import { api } from './api'

export const projectCategoriesService = {
  async listGlobal(): Promise<ProjectCategory[]> {
    const { data } = await api.get<ProjectCategory[]>('/organizations/categories/global')
    return data
  },

  async listForOrg(organizationId: string): Promise<ProjectCategory[]> {
    const { data } = await api.get<ProjectCategory[]>(
      `/organizations/${organizationId}/project-categories`,
    )
    return data
  },

  async create(
    organizationId: string,
    payload: { name: string; color?: string; icon?: string },
  ): Promise<ProjectCategory> {
    const { data } = await api.post<ProjectCategory>(
      `/organizations/${organizationId}/project-categories`,
      payload,
    )
    return data
  },

  async update(
    id: string,
    payload: Partial<{ name: string; color: string; icon: string }>,
  ): Promise<ProjectCategory> {
    const { data } = await api.patch<ProjectCategory>(
      `/organizations/project-categories/${id}`,
      payload,
    )
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/organizations/project-categories/${id}`)
  },
}
