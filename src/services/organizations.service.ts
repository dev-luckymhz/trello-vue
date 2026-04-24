import type {
  OrgAccess,
  OrgMember,
  OrgRoleDef,
  Organization,
  PermissionCatalog,
  Priority,
  Project,
} from '@/types'
import { api } from './api'

export const organizationsService = {
  async list(): Promise<Organization[]> {
    const { data } = await api.get<Organization[]>('/organizations')
    return data
  },

  async get(id: string): Promise<Organization & { members?: OrgMember[] }> {
    const { data } = await api.get<Organization & { members?: OrgMember[] }>(
      `/organizations/${id}`,
    )
    return data
  },

  async create(payload: { name: string; description?: string }): Promise<Organization> {
    const { data } = await api.post<Organization>('/organizations', payload)
    return data
  },

  async update(
    id: string,
    payload: Partial<{ name: string; description: string }>,
  ): Promise<Organization> {
    const { data } = await api.patch<Organization>(`/organizations/${id}`, payload)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/organizations/${id}`)
  },

  async myAccess(id: string): Promise<OrgAccess> {
    const { data } = await api.get<OrgAccess>(`/organizations/${id}/my-access`)
    return data
  },

  async permissionCatalog(): Promise<PermissionCatalog> {
    const { data } = await api.get<PermissionCatalog>('/organizations/permissions')
    return data
  },

  async listMembers(id: string): Promise<OrgMember[]> {
    const { data } = await api.get<OrgMember[]>(`/organizations/${id}/members`)
    return data
  },

  async addMember(
    id: string,
    payload: { identifier: string; roleId?: string },
  ): Promise<OrgMember> {
    const { data } = await api.post<OrgMember>(`/organizations/${id}/members`, payload)
    return data
  },

  async updateMember(
    memberId: string,
    payload: { roleId?: string },
  ): Promise<OrgMember> {
    const { data } = await api.patch<OrgMember>(
      `/organizations/members/${memberId}`,
      payload,
    )
    return data
  },

  async removeMember(memberId: string): Promise<void> {
    await api.delete(`/organizations/members/${memberId}`)
  },

  async listInvitations(id: string): Promise<import('@/types').Invitation[]> {
    const { data } = await api.get<import('@/types').Invitation[]>(
      `/organizations/${id}/invitations`,
    )
    return data
  },

  async revokeInvitation(invitationId: string): Promise<void> {
    await api.delete(`/organizations/invitations/${invitationId}`)
  },

  async listRoles(id: string): Promise<OrgRoleDef[]> {
    const { data } = await api.get<OrgRoleDef[]>(`/organizations/${id}/roles`)
    return data
  },

  async createRole(
    id: string,
    payload: { name: string; description?: string; permissions: string[] },
  ): Promise<OrgRoleDef> {
    const { data } = await api.post<OrgRoleDef>(`/organizations/${id}/roles`, payload)
    return data
  },

  async updateRole(
    roleId: string,
    payload: Partial<{ name: string; description: string; permissions: string[] }>,
  ): Promise<OrgRoleDef> {
    const { data } = await api.patch<OrgRoleDef>(`/organizations/roles/${roleId}`, payload)
    return data
  },

  async deleteRole(roleId: string): Promise<void> {
    await api.delete(`/organizations/roles/${roleId}`)
  },

  async listPriorities(id: string): Promise<Priority[]> {
    const { data } = await api.get<Priority[]>(`/organizations/${id}/priorities`)
    return data
  },

  async createPriority(
    id: string,
    payload: { name: string; color?: string; rank?: number },
  ): Promise<Priority> {
    const { data } = await api.post<Priority>(`/organizations/${id}/priorities`, payload)
    return data
  },

  async updatePriority(
    priorityId: string,
    payload: Partial<{ name: string; color: string; rank: number }>,
  ): Promise<Priority> {
    const { data } = await api.patch<Priority>(
      `/organizations/priorities/${priorityId}`,
      payload,
    )
    return data
  },

  async deletePriority(priorityId: string): Promise<void> {
    await api.delete(`/organizations/priorities/${priorityId}`)
  },

  async adminProjects(id: string): Promise<Project[]> {
    const { data } = await api.get<Project[]>(`/organizations/${id}/admin/projects`)
    return data
  },
}
