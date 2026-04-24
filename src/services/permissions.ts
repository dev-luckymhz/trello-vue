import type { ProjectAccess, OrgAccess } from '@/types'

export function can(access: ProjectAccess | OrgAccess | null, permission: string): boolean {
  if (!access) return false
  return access.permissions.includes(permission)
}

export function canAny(
  access: ProjectAccess | OrgAccess | null,
  permissions: string[],
): boolean {
  if (!access) return false
  return permissions.some((p) => access.permissions.includes(p))
}
