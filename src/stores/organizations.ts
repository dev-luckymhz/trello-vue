import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { OrgAccess, Organization } from '@/types'
import { organizationsService } from '@/services/organizations.service'
import { ORG_PERMS } from '@/types'

export const useOrganizationsStore = defineStore('organizations', () => {
  const organizations = ref<Organization[]>([])
  const accessByOrg = ref<Record<string, OrgAccess>>({})
  const loading = ref(false)

  const adminOrganizations = computed(() =>
    organizations.value.filter((o) =>
      accessByOrg.value[o.id]?.permissions.includes(ORG_PERMS.PROJECTS_MANAGE_ALL),
    ),
  )

  async function fetch(): Promise<void> {
    loading.value = true
    try {
      const list = await organizationsService.list()
      organizations.value = list
      const entries = await Promise.all(
        list.map(async (o) => {
          try {
            const access = await organizationsService.myAccess(o.id)
            return [o.id, access] as const
          } catch {
            return null
          }
        }),
      )
      const map: Record<string, OrgAccess> = {}
      for (const e of entries) {
        if (e) map[e[0]] = e[1]
      }
      accessByOrg.value = map
    } finally {
      loading.value = false
    }
  }

  async function create(payload: { name: string; description?: string }): Promise<Organization> {
    const org = await organizationsService.create(payload)
    organizations.value = [org, ...organizations.value]
    try {
      const access = await organizationsService.myAccess(org.id)
      accessByOrg.value = { ...accessByOrg.value, [org.id]: access }
    } catch {
      // ignore — non-critical
    }
    return org
  }

  async function remove(id: string): Promise<void> {
    await organizationsService.remove(id)
    organizations.value = organizations.value.filter((o) => o.id !== id)
    const { [id]: _removed, ...rest } = accessByOrg.value
    accessByOrg.value = rest
    void _removed
  }

  function accessFor(id: string): OrgAccess | null {
    return accessByOrg.value[id] ?? null
  }

  return {
    organizations,
    accessByOrg,
    adminOrganizations,
    loading,
    fetch,
    create,
    remove,
    accessFor,
  }
})
