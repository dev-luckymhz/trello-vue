<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type {
  OrgMember,
  OrgRoleDef,
  Organization,
  PermissionCatalog,
  Priority,
  Project,
} from '@/types'
import { ORG_PERMS } from '@/types'
import { organizationsService } from '@/services/organizations.service'
import { extractErrorMessage } from '@/services/api'
import Modal from '@/components/Modal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import UserPicker from '@/components/UserPicker.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const orgId = computed(() => route.params.id as string)

const organization = ref<Organization | null>(null)
const members = ref<OrgMember[]>([])
const roles = ref<OrgRoleDef[]>([])
const priorities = ref<Priority[]>([])
const projects = ref<Project[]>([])
const catalog = ref<PermissionCatalog>({ org: [], project: [] })
const myPermissions = ref<string[]>([])

const loading = ref(false)
const error = ref<string | null>(null)
const activeTab = ref<'members' | 'projects' | 'roles' | 'priorities'>('members')

const canManageMembers = computed(() =>
  myPermissions.value.includes(ORG_PERMS.MEMBERS_MANAGE),
)
const canManageRoles = computed(() => myPermissions.value.includes(ORG_PERMS.ROLES_MANAGE))
const canManagePriorities = computed(() =>
  myPermissions.value.includes(ORG_PERMS.PRIORITIES_MANAGE),
)
const canManageProjects = computed(() =>
  myPermissions.value.includes(ORG_PERMS.PROJECTS_MANAGE_ALL),
)

const tabs = computed(() => [
  { id: 'members' as const, label: t('admin.members'), icon: 'fa-solid fa-users', count: members.value.length },
  { id: 'projects' as const, label: t('admin.projects'), icon: 'fa-solid fa-building', count: projects.value.length },
  { id: 'roles' as const, label: t('admin.roles'), icon: 'fa-solid fa-shield', count: roles.value.length },
  { id: 'priorities' as const, label: t('admin.priorities'), icon: 'fa-solid fa-flag', count: priorities.value.length },
])

async function loadAll() {
  loading.value = true
  error.value = null
  try {
    const [org, accessData, memberList, roleList, priorityList, projectList, cat] =
      await Promise.all([
        organizationsService.get(orgId.value),
        organizationsService.myAccess(orgId.value),
        organizationsService.listMembers(orgId.value),
        organizationsService.listRoles(orgId.value),
        organizationsService.listPriorities(orgId.value),
        organizationsService.adminProjects(orgId.value).catch(() => [] as Project[]),
        organizationsService.permissionCatalog(),
      ])
    organization.value = org
    members.value = memberList
    roles.value = roleList
    priorities.value = priorityList
    projects.value = projectList
    catalog.value = cat
    myPermissions.value = accessData.permissions
  } catch (err) {
    error.value = extractErrorMessage(err)
    if ((err as { response?: { status?: number } }).response?.status === 404) {
      router.replace({ name: 'projects' })
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)
watch(orgId, loadAll)

// Members
const addMemberOpen = ref(false)
const newMemberIdentifier = ref('')
const newMemberRoleId = ref('')
const addMemberError = ref<string | null>(null)
const removeMemberTarget = ref<string | null>(null)

async function addMember() {
  if (!newMemberIdentifier.value.trim()) return
  addMemberError.value = null
  try {
    await organizationsService.addMember(orgId.value, {
      identifier: newMemberIdentifier.value.trim(),
      roleId: newMemberRoleId.value || undefined,
    })
    addMemberOpen.value = false
    newMemberIdentifier.value = ''
    newMemberRoleId.value = ''
    await loadAll()
  } catch (err) {
    addMemberError.value = extractErrorMessage(err)
  }
}

async function changeMemberRole(member: OrgMember, roleId: string) {
  try {
    await organizationsService.updateMember(member.id, { roleId })
    await loadAll()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function confirmRemoveMember() {
  if (!removeMemberTarget.value) return
  try {
    await organizationsService.removeMember(removeMemberTarget.value)
    await loadAll()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    removeMemberTarget.value = null
  }
}

// Roles
const roleDraftOpen = ref(false)
const roleDraft = ref<{ id?: string; name: string; description: string; permissions: string[] }>({
  name: '',
  description: '',
  permissions: [],
})
const deleteRoleTarget = ref<string | null>(null)

function openNewRole() {
  roleDraft.value = { name: '', description: '', permissions: [] }
  roleDraftOpen.value = true
}

function openEditRole(role: OrgRoleDef) {
  roleDraft.value = {
    id: role.id,
    name: role.name,
    description: role.description ?? '',
    permissions: [...role.permissions],
  }
  roleDraftOpen.value = true
}

async function saveRole() {
  if (!roleDraft.value.name.trim()) return
  try {
    if (roleDraft.value.id) {
      await organizationsService.updateRole(roleDraft.value.id, {
        name: roleDraft.value.name.trim(),
        description: roleDraft.value.description,
        permissions: roleDraft.value.permissions,
      })
    } else {
      await organizationsService.createRole(orgId.value, {
        name: roleDraft.value.name.trim(),
        description: roleDraft.value.description || undefined,
        permissions: roleDraft.value.permissions,
      })
    }
    roleDraftOpen.value = false
    await loadAll()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function confirmDeleteRole() {
  if (!deleteRoleTarget.value) return
  try {
    await organizationsService.deleteRole(deleteRoleTarget.value)
    await loadAll()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    deleteRoleTarget.value = null
  }
}

function togglePermission(perm: string) {
  const idx = roleDraft.value.permissions.indexOf(perm)
  if (idx >= 0) roleDraft.value.permissions.splice(idx, 1)
  else roleDraft.value.permissions.push(perm)
}

// Priorities
const priorityDraftOpen = ref(false)
const priorityDraft = ref<{ id?: string; name: string; color: string; rank: number }>({
  name: '',
  color: '#2563eb',
  rank: 0,
})
const deletePriorityTarget = ref<string | null>(null)

function openNewPriority() {
  priorityDraft.value = {
    name: '',
    color: '#2563eb',
    rank: priorities.value.length,
  }
  priorityDraftOpen.value = true
}

function openEditPriority(priority: Priority) {
  priorityDraft.value = {
    id: priority.id,
    name: priority.name,
    color: priority.color ?? '#2563eb',
    rank: priority.rank,
  }
  priorityDraftOpen.value = true
}

async function savePriority() {
  if (!priorityDraft.value.name.trim()) return
  try {
    if (priorityDraft.value.id) {
      await organizationsService.updatePriority(priorityDraft.value.id, {
        name: priorityDraft.value.name.trim(),
        color: priorityDraft.value.color,
        rank: priorityDraft.value.rank,
      })
    } else {
      await organizationsService.createPriority(orgId.value, {
        name: priorityDraft.value.name.trim(),
        color: priorityDraft.value.color,
        rank: priorityDraft.value.rank,
      })
    }
    priorityDraftOpen.value = false
    await loadAll()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function confirmDeletePriority() {
  if (!deletePriorityTarget.value) return
  try {
    await organizationsService.deletePriority(deletePriorityTarget.value)
    await loadAll()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    deletePriorityTarget.value = null
  }
}

// Projects
async function toggleHidden(project: Project) {
  try {
    const { projectsService } = await import('@/services/projects.service')
    await projectsService.setHidden(project.id, !project.isHidden)
    await loadAll()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function toggleArchived(project: Project) {
  try {
    const { projectsService } = await import('@/services/projects.service')
    await projectsService.setArchived(project.id, !project.isArchived)
    await loadAll()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
    <div v-if="error" class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm">
      {{ error }}
    </div>

    <div class="mb-6">
      <h2 class="text-2xl sm:text-3xl font-bold text-app inline-flex items-center gap-3">
        <font-awesome-icon icon="fa-solid fa-shield" class="w-6 h-6 text-brand-500" />
        {{ organization?.name ?? $t('admin.title') }}
      </h2>
      <p class="text-sm text-muted mt-1">{{ $t('admin.subtitle') }}</p>
    </div>

    <div class="card p-1 mb-6 inline-flex gap-1 overflow-x-auto scrollbar-thin max-w-full">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="px-3 py-1.5 text-sm font-medium rounded-lg transition inline-flex items-center gap-2 whitespace-nowrap"
        :class="
          activeTab === tab.id
            ? 'bg-brand-500 text-white shadow-sm'
            : 'text-muted hover:bg-slate-100 dark:hover:bg-slate-700'
        "
        @click="activeTab = tab.id"
      >
        <font-awesome-icon :icon="tab.icon" class="w-3.5 h-3.5" />
        {{ tab.label }}
        <span
          class="text-[11px] px-1.5 rounded-full"
          :class="
            activeTab === tab.id
              ? 'bg-white/20 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-muted'
          "
        >
          {{ tab.count }}
        </span>
      </button>
    </div>

    <div v-if="loading" class="text-center py-12 text-muted">{{ $t('common.loading') }}</div>

    <section v-else-if="activeTab === 'members'">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-app">
          {{ $t('admin.members') }} ({{ members.length }})
        </h3>
        <button v-if="canManageMembers" class="btn-primary" @click="addMemberOpen = true">
          <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
          {{ $t('admin.addMember') }}
        </button>
      </div>
      <div class="card divide-y divide-slate-100 dark:divide-slate-700">
        <div v-for="m in members" :key="m.id" class="p-4 flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-app flex items-center justify-center font-semibold shrink-0"
          >
            {{ m.user?.name?.[0]?.toUpperCase() ?? '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-app truncate">{{ m.user?.name ?? '—' }}</p>
            <p class="text-xs text-muted truncate">{{ m.user?.email }}</p>
          </div>
          <select
            v-if="canManageMembers && m.roleDef?.name !== 'OWNER'"
            class="select !py-1 text-xs !w-auto"
            :value="m.roleId ?? ''"
            @change="changeMemberRole(m, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
          <span
            v-else
            class="px-2 py-1 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-semibold rounded-full"
          >
            {{ m.roleDef?.name ?? m.role }}
          </span>
          <button
            v-if="canManageMembers && m.roleDef?.name !== 'OWNER'"
            class="text-subtle hover:text-red-500 p-2"
            @click="removeMemberTarget = m.id"
            :aria-label="$t('common.remove')"
          >
            <font-awesome-icon icon="fa-solid fa-trash" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'projects'">
      <h3 class="text-lg font-semibold text-app mb-4">
        {{ $t('admin.projects') }} ({{ projects.length }})
      </h3>
      <div class="card divide-y divide-slate-100 dark:divide-slate-700">
        <div
          v-for="p in projects"
          :key="p.id"
          class="p-4 flex items-center gap-3"
          :class="{ 'opacity-60': p.isArchived }"
        >
          <div class="flex-1 min-w-0">
            <router-link
              :to="`/projects/${p.id}`"
              class="font-medium text-app hover:text-brand-600 dark:hover:text-brand-400 truncate inline-block max-w-full"
            >
              {{ p.name }}
            </router-link>
            <p v-if="p.description" class="text-xs text-muted truncate">{{ p.description }}</p>
            <div class="flex gap-1 mt-1">
              <span
                v-if="p.isHidden"
                class="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded"
              >
                {{ $t('projects.hidden') }}
              </span>
              <span
                v-if="p.isArchived"
                class="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-muted rounded"
              >
                {{ $t('projects.archived') }}
              </span>
            </div>
          </div>
          <button
            v-if="canManageProjects"
            class="btn-icon"
            :title="p.isHidden ? $t('projects.unhide') : $t('projects.hide')"
            @click="toggleHidden(p)"
          >
            <font-awesome-icon
              :icon="p.isHidden ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
              class="w-3.5 h-3.5"
            />
          </button>
          <button
            v-if="canManageProjects"
            class="btn-icon"
            :title="p.isArchived ? $t('projects.unarchive') : $t('projects.archive')"
            @click="toggleArchived(p)"
          >
            <font-awesome-icon
              :icon="p.isArchived ? 'fa-solid fa-box-open' : 'fa-solid fa-box-archive'"
              class="w-3.5 h-3.5"
            />
          </button>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'roles'">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-app">{{ $t('admin.roles') }} ({{ roles.length }})</h3>
        <button v-if="canManageRoles" class="btn-primary" @click="openNewRole">
          <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
          {{ $t('admin.newRole') }}
        </button>
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <div v-for="role in roles" :key="role.id" class="card p-4">
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="min-w-0">
              <h4 class="font-semibold text-app truncate">
                {{ role.name }}
                <span
                  v-if="role.isSystem"
                  class="ml-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-muted px-1.5 py-0.5 rounded font-semibold uppercase"
                >
                  {{ $t('admin.system') }}
                </span>
              </h4>
              <p v-if="role.description" class="text-xs text-muted mt-0.5">
                {{ role.description }}
              </p>
            </div>
            <div v-if="canManageRoles" class="flex items-center gap-1">
              <button
                v-if="role.name !== 'OWNER'"
                class="p-1.5 text-subtle hover:text-brand-600 dark:hover:text-brand-400 rounded"
                @click="openEditRole(role)"
                :aria-label="$t('common.edit')"
              >
                <font-awesome-icon icon="fa-solid fa-pencil" class="w-3 h-3" />
              </button>
              <button
                v-if="!role.isSystem"
                class="p-1.5 text-subtle hover:text-red-500 rounded"
                @click="deleteRoleTarget = role.id"
                :aria-label="$t('common.delete')"
              >
                <font-awesome-icon icon="fa-solid fa-trash" class="w-3 h-3" />
              </button>
            </div>
          </div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="perm in role.permissions"
              :key="perm"
              class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-muted font-mono"
            >
              {{ perm }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'priorities'">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-app">
          {{ $t('admin.priorities') }} ({{ priorities.length }})
        </h3>
        <button v-if="canManagePriorities" class="btn-primary" @click="openNewPriority">
          <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
          {{ $t('admin.newPriority') }}
        </button>
      </div>
      <div class="card divide-y divide-slate-100 dark:divide-slate-700">
        <div
          v-for="p in [...priorities].sort((a, b) => a.rank - b.rank)"
          :key="p.id"
          class="p-4 flex items-center gap-3"
        >
          <span
            class="w-4 h-4 rounded-full shrink-0 border border-black/10 dark:border-white/10"
            :style="{ backgroundColor: p.color ?? '#94a3b8' }"
          />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-app">
              {{ p.name }}
              <span
                v-if="p.isSystem"
                class="ml-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-muted px-1.5 py-0.5 rounded font-semibold uppercase"
              >
                {{ $t('admin.system') }}
              </span>
            </p>
            <p class="text-xs text-muted">{{ $t('admin.rank') }} {{ p.rank }}</p>
          </div>
          <div v-if="canManagePriorities" class="flex items-center gap-1">
            <button
              class="p-1.5 text-subtle hover:text-brand-600 dark:hover:text-brand-400 rounded"
              @click="openEditPriority(p)"
              :aria-label="$t('common.edit')"
            >
              <font-awesome-icon icon="fa-solid fa-pencil" class="w-3 h-3" />
            </button>
            <button
              v-if="!p.isSystem"
              class="p-1.5 text-subtle hover:text-red-500 rounded"
              @click="deletePriorityTarget = p.id"
              :aria-label="$t('common.delete')"
            >
              <font-awesome-icon icon="fa-solid fa-trash" class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <Modal :open="addMemberOpen" :title="$t('admin.addMember')" @close="addMemberOpen = false">
      <div
        v-if="addMemberError"
        class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm"
      >
        {{ addMemberError }}
      </div>
      <label class="label">{{ $t('admin.memberIdentifier') }}</label>
      <UserPicker v-model="newMemberIdentifier" />
      <p class="text-xs text-subtle mt-1.5 mb-4">{{ $t('admin.memberIdentifierHint') }}</p>
      <label class="label">{{ $t('admin.role') }}</label>
      <select v-model="newMemberRoleId" class="select">
        <option value="">MEMBER</option>
        <option v-for="r in roles.filter((r) => r.name !== 'OWNER')" :key="r.id" :value="r.id">
          {{ r.name }}
        </option>
      </select>
      <template #footer>
        <button class="btn-ghost" @click="addMemberOpen = false">{{ $t('common.cancel') }}</button>
        <button class="btn-primary" :disabled="!newMemberIdentifier.trim()" @click="addMember">
          {{ $t('common.add') }}
        </button>
      </template>
    </Modal>

    <Modal
      :open="roleDraftOpen"
      :title="roleDraft.id ? $t('admin.editRole') : $t('admin.createRole')"
      width="620px"
      @close="roleDraftOpen = false"
    >
      <label class="label">{{ $t('common.name') }}</label>
      <input v-model="roleDraft.name" type="text" class="input mb-4" />
      <label class="label">{{ $t('common.description') }}</label>
      <input v-model="roleDraft.description" type="text" class="input mb-4" />
      <label class="label">{{ $t('admin.orgPermissions') }}</label>
      <div class="grid gap-1.5 mb-4">
        <label
          v-for="perm in catalog.org"
          :key="perm"
          class="flex items-center gap-2 text-sm text-muted cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="roleDraft.permissions.includes(perm)"
            @change="togglePermission(perm)"
          />
          <code class="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{{ perm }}</code>
        </label>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="roleDraftOpen = false">{{ $t('common.cancel') }}</button>
        <button
          class="btn-primary"
          :disabled="!roleDraft.name.trim() || roleDraft.permissions.length === 0"
          @click="saveRole"
        >
          {{ $t('common.save') }}
        </button>
      </template>
    </Modal>

    <Modal
      :open="priorityDraftOpen"
      :title="priorityDraft.id ? $t('admin.editPriority') : $t('admin.createPriority')"
      @close="priorityDraftOpen = false"
    >
      <label class="label">{{ $t('common.name') }}</label>
      <input v-model="priorityDraft.name" type="text" class="input mb-4" />
      <div class="grid grid-cols-2 gap-3 mb-2">
        <div>
          <label class="label">{{ $t('admin.color') }}</label>
          <input
            v-model="priorityDraft.color"
            type="color"
            class="w-full h-10 px-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
          />
        </div>
        <div>
          <label class="label">{{ $t('admin.rank') }}</label>
          <input v-model.number="priorityDraft.rank" type="number" min="0" class="input" />
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="priorityDraftOpen = false">{{ $t('common.cancel') }}</button>
        <button class="btn-primary" :disabled="!priorityDraft.name.trim()" @click="savePriority">
          {{ $t('common.save') }}
        </button>
      </template>
    </Modal>

    <ConfirmDialog
      :open="removeMemberTarget !== null"
      :title="$t('admin.removeMemberTitle')"
      :message="$t('admin.removeMemberBody')"
      :confirm-text="$t('common.remove')"
      tone="danger"
      @confirm="confirmRemoveMember"
      @cancel="removeMemberTarget = null"
    />

    <ConfirmDialog
      :open="deleteRoleTarget !== null"
      :title="$t('admin.deleteRoleTitle')"
      :message="$t('admin.deleteRoleBody')"
      :confirm-text="$t('common.delete')"
      tone="danger"
      @confirm="confirmDeleteRole"
      @cancel="deleteRoleTarget = null"
    />

    <ConfirmDialog
      :open="deletePriorityTarget !== null"
      :title="$t('admin.deletePriorityTitle')"
      :message="$t('admin.deletePriorityBody')"
      :confirm-text="$t('common.delete')"
      tone="danger"
      @confirm="confirmDeletePriority"
      @cancel="deletePriorityTarget = null"
    />
  </div>
</template>
