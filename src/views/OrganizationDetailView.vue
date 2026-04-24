<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { OrgMember, Organization, Project } from '@/types'
import { ORG_PERMS } from '@/types'
import { organizationsService } from '@/services/organizations.service'
import { projectsService } from '@/services/projects.service'
import { meService, type AssignedTask } from '@/services/me.service'
import { extractErrorMessage } from '@/services/api'
import { setDocumentTitle } from '@/router'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const orgId = computed(() => route.params.id as string)

const organization = ref<Organization | null>(null)
const projects = ref<Project[]>([])
const tasks = ref<AssignedTask[]>([])
const members = ref<OrgMember[]>([])
const permissions = ref<string[]>([])
const loading = ref(false)
const notFound = ref(false)
const error = ref<string | null>(null)

type Tab = 'projects' | 'tasks' | 'members'
const activeTab = ref<Tab>('projects')

const canManageOrg = computed(() =>
  permissions.value.includes(ORG_PERMS.PROJECTS_MANAGE_ALL) ||
  permissions.value.includes(ORG_PERMS.MEMBERS_MANAGE) ||
  permissions.value.includes(ORG_PERMS.ROLES_MANAGE),
)

const assignedProjects = computed(() =>
  projects.value.filter((p) => p.isExplicitMember && !p.isArchived),
)
const publicProjects = computed(() =>
  projects.value.filter((p) => !p.isExplicitMember && !p.isArchived),
)
const archivedProjects = computed(() => projects.value.filter((p) => p.isArchived))

const tabs = computed(() => [
  {
    id: 'projects' as Tab,
    label: t('admin.projects'),
    icon: 'fa-solid fa-layer-group',
    count: projects.value.filter((p) => !p.isArchived).length,
  },
  {
    id: 'tasks' as Tab,
    label: t('nav.myTasks'),
    icon: 'fa-solid fa-list-check',
    count: tasks.value.length,
  },
  {
    id: 'members' as Tab,
    label: t('admin.members'),
    icon: 'fa-solid fa-users',
    count: members.value.length,
  },
])

async function load() {
  loading.value = true
  notFound.value = false
  error.value = null
  try {
    const [org, access, projList, taskList, memberList] = await Promise.all([
      organizationsService.get(orgId.value),
      organizationsService.myAccess(orgId.value),
      projectsService.list({
        organizationId: orgId.value,
        includeArchived: true,
      }),
      meService.tasks({ organizationId: orgId.value }),
      organizationsService.listMembers(orgId.value).catch(() => [] as OrgMember[]),
    ])
    organization.value = org
    permissions.value = access.permissions
    projects.value = projList
    tasks.value = taskList
    members.value = memberList
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status
    if (status === 404 || status === 403) {
      notFound.value = true
    } else {
      error.value = extractErrorMessage(err)
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(orgId, load)
watch(organization, (value) => {
  if (value) setDocumentTitle(value.name)
})

function openProject(id: string) {
  router.push({ name: 'project', params: { id } })
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale.value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function priorityStyle(task: AssignedTask) {
  const color = task.priority?.color ?? '#94a3b8'
  return {
    backgroundColor: `${color}20`,
    color,
    borderColor: `${color}40`,
  }
}

const now = new Date()
now.setHours(0, 0, 0, 0)
function isOverdue(iso: string | null): boolean {
  if (!iso) return false
  return new Date(iso) < now
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full">
    <div v-if="notFound" class="card p-10 text-center">
      <div class="text-5xl font-bold text-slate-300 dark:text-slate-700">404</div>
      <p class="mt-3 text-muted">{{ $t('organizations.title') }}</p>
      <button class="btn-primary mt-4" @click="router.replace({ name: 'organizations' })">
        {{ $t('common.back') }}
      </button>
    </div>

    <template v-else>
      <div
        v-if="error"
        class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm"
      >
        {{ error }}
      </div>

      <div v-if="organization" class="mb-6 flex items-start gap-4 flex-wrap">
        <div
          class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xl font-bold flex items-center justify-center shadow-sm shrink-0"
        >
          {{ organization.name[0]?.toUpperCase() ?? '?' }}
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl sm:text-3xl font-bold text-app">
            {{ organization.name }}
          </h2>
          <p v-if="organization.description" class="text-sm text-muted mt-1">
            {{ organization.description }}
          </p>
        </div>
        <router-link
          v-if="canManageOrg"
          :to="`/admin/${orgId}`"
          class="btn-ghost"
        >
          <font-awesome-icon icon="fa-solid fa-shield" class="w-3.5 h-3.5" />
          {{ $t('nav.admin') }}
        </router-link>
      </div>

      <!-- Tab bar (same style as admin dashboard) -->
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

      <div v-if="loading" class="card p-12 text-center text-muted">{{ $t('common.loading') }}</div>

      <!-- Projects tab -->
      <div v-else-if="activeTab === 'projects'" class="space-y-8">
        <section>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-app inline-flex items-center gap-2">
              <font-awesome-icon icon="fa-solid fa-user-check" class="w-4 h-4" />
              {{ $t('orgDetail.assignedProjects') }}
              <span class="text-muted text-sm font-normal">({{ assignedProjects.length }})</span>
            </h3>
          </div>
          <div v-if="assignedProjects.length === 0" class="card p-8 text-center text-muted text-sm">
            {{ $t('orgDetail.noAssigned') }}
          </div>
          <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              v-for="p in assignedProjects"
              :key="p.id"
              class="card-hover p-4 text-left"
              @click="openProject(p.id)"
            >
              <div class="flex items-center gap-2 mb-2">
                <div
                  class="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white font-bold flex items-center justify-center text-sm shrink-0"
                >
                  {{ p.name[0]?.toUpperCase() ?? '?' }}
                </div>
                <h4 class="font-semibold text-app truncate">{{ p.name }}</h4>
              </div>
              <p v-if="p.description" class="text-xs text-muted line-clamp-2">{{ p.description }}</p>
              <div class="flex items-center gap-2 mt-3 text-[11px]">
                <span
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold"
                  :class="
                    p.visibility === 'PUBLIC'
                      ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-muted'
                  "
                >
                  <font-awesome-icon
                    :icon="p.visibility === 'PUBLIC' ? 'fa-solid fa-lock-open' : 'fa-solid fa-lock'"
                    class="w-2.5 h-2.5"
                  />
                  {{ p.visibility === 'PUBLIC' ? $t('projectSettings.public') : $t('projectSettings.private') }}
                </span>
              </div>
            </button>
          </div>
        </section>

        <section>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-app inline-flex items-center gap-2">
              <font-awesome-icon icon="fa-solid fa-lock-open" class="w-4 h-4" />
              {{ $t('orgDetail.publicProjects') }}
              <span class="text-muted text-sm font-normal">({{ publicProjects.length }})</span>
            </h3>
          </div>
          <div v-if="publicProjects.length === 0" class="card p-8 text-center text-muted text-sm">
            {{ $t('orgDetail.noPublic') }}
          </div>
          <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              v-for="p in publicProjects"
              :key="p.id"
              class="card-hover p-4 text-left"
              @click="openProject(p.id)"
            >
              <div class="flex items-center gap-2 mb-2">
                <div
                  class="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 text-white font-bold flex items-center justify-center text-sm shrink-0"
                >
                  {{ p.name[0]?.toUpperCase() ?? '?' }}
                </div>
                <h4 class="font-semibold text-app truncate">{{ p.name }}</h4>
              </div>
              <p v-if="p.description" class="text-xs text-muted line-clamp-2">{{ p.description }}</p>
              <div class="flex items-center gap-2 mt-3 text-[11px]">
                <span
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                >
                  <font-awesome-icon icon="fa-solid fa-lock-open" class="w-2.5 h-2.5" />
                  {{ $t('projectSettings.public') }}
                </span>
              </div>
            </button>
          </div>
        </section>

        <section v-if="archivedProjects.length > 0">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-app inline-flex items-center gap-2">
              <font-awesome-icon icon="fa-solid fa-box-archive" class="w-4 h-4" />
              {{ $t('orgDetail.archivedProjects') }}
              <span class="text-muted text-sm font-normal">({{ archivedProjects.length }})</span>
            </h3>
          </div>
          <div class="card divide-y divide-slate-100 dark:divide-slate-700">
            <button
              v-for="p in archivedProjects"
              :key="p.id"
              class="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-center gap-3"
              @click="openProject(p.id)"
            >
              <font-awesome-icon
                icon="fa-solid fa-box-archive"
                class="w-4 h-4 text-subtle shrink-0"
              />
              <div class="flex-1 min-w-0">
                <p class="font-medium text-app truncate">{{ p.name }}</p>
                <p v-if="p.description" class="text-xs text-muted truncate">{{ p.description }}</p>
              </div>
              <span
                class="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-muted rounded"
              >
                {{ $t('projects.archived') }}
              </span>
            </button>
          </div>
        </section>
      </div>

      <!-- Tasks tab -->
      <div v-else-if="activeTab === 'tasks'">
        <div v-if="tasks.length === 0" class="card p-10 text-center">
          <div
            class="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4"
          >
            <font-awesome-icon icon="fa-solid fa-inbox" class="w-6 h-6 text-subtle" />
          </div>
          <p class="text-sm text-muted">{{ $t('orgDetail.noTasksInOrg') }}</p>
        </div>
        <div v-else class="card overflow-hidden">
          <ul class="divide-y divide-slate-100 dark:divide-slate-700">
            <li
              v-for="task in tasks"
              :key="task.id"
              class="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer flex items-center gap-3 flex-wrap"
              @click="openProject(task.projectId)"
            >
              <div class="flex-1 min-w-0">
                <p class="font-medium text-app truncate">{{ task.title }}</p>
                <div class="flex items-center gap-2 text-xs text-muted mt-1 flex-wrap">
                  <span v-if="task.project" class="inline-flex items-center gap-1">
                    <font-awesome-icon icon="fa-solid fa-layer-group" class="w-2.5 h-2.5" />
                    {{ task.project.name }}
                  </span>
                  <span
                    v-if="task.status"
                    class="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
                  >
                    {{ task.status.name }}
                  </span>
                </div>
              </div>
              <span
                v-if="task.priority"
                class="chip border"
                :style="priorityStyle(task)"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                {{ task.priority.name }}
              </span>
              <span
                v-if="task.dueDate"
                class="text-xs shrink-0"
                :class="
                  isOverdue(task.dueDate)
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : 'text-subtle'
                "
              >
                <font-awesome-icon icon="fa-solid fa-calendar-day" class="w-2.5 h-2.5 mr-1" />
                {{ formatDate(task.dueDate) }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Members tab (read-only) -->
      <div v-else-if="activeTab === 'members'">
        <div v-if="members.length === 0" class="card p-10 text-center text-muted text-sm">
          {{ $t('projectUsers.noMembers') }}
        </div>
        <div v-else class="card divide-y divide-slate-100 dark:divide-slate-700">
          <div
            v-for="m in members"
            :key="m.id"
            class="p-4 flex items-center gap-3"
          >
            <div
              class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-app flex items-center justify-center font-semibold shrink-0"
            >
              {{ m.user?.name?.[0]?.toUpperCase() ?? '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-app truncate">{{ m.user?.name ?? '—' }}</p>
              <p class="text-xs text-muted truncate">{{ m.user?.email }}</p>
            </div>
            <span
              class="px-2 py-1 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-semibold rounded-full"
            >
              {{ m.roleDef?.name ?? m.role }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
