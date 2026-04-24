<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useOrganizationsStore } from '@/stores/organizations'
import { useNotificationsStore } from '@/stores/notifications'
import { meService, type AssignedTask, type MyStats } from '@/services/me.service'
import { extractErrorMessage } from '@/services/api'

const auth = useAuthStore()
const projects = useProjectsStore()
const orgStore = useOrganizationsStore()
const notifStore = useNotificationsStore()
const router = useRouter()
const { locale, t } = useI18n()

async function acceptInvitation(id: string) {
  try {
    await notifStore.accept(id)
    await Promise.all([projects.fetchProjects(), orgStore.fetch()])
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function declineInvitation(id: string) {
  try {
    await notifStore.decline(id)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

const tasks = ref<AssignedTask[]>([])
const stats = ref<MyStats>({ assignedTaskCount: 0, projectCount: 0 })
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const [taskList, statData] = await Promise.all([
      meService.tasks(),
      meService.stats(),
      projects.fetchProjects(),
    ])
    tasks.value = taskList
    stats.value = statData
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
})

const now = new Date()
now.setHours(0, 0, 0, 0)

const overdueTasks = computed(() =>
  tasks.value.filter((t) => t.dueDate && new Date(t.dueDate) < now),
)
const upcomingTasks = computed(() =>
  tasks.value.filter((t) => !t.dueDate || new Date(t.dueDate) >= now),
)

const recentProjects = computed(() =>
  [...projects.projects]
    .filter((p) => !p.isArchived && !p.isHidden)
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() -
        new Date(a.updatedAt ?? a.createdAt).getTime(),
    )
    .slice(0, 6),
)

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
}

function openProject(id: string) {
  router.push({ name: 'project', params: { id } })
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full">
    <div class="mb-6 sm:mb-8">
      <h2 class="text-2xl sm:text-3xl font-bold text-app">
        {{ $t('dashboard.welcome', { name: auth.user?.name ?? '' }) }}
      </h2>
      <p class="text-sm text-muted mt-1">{{ $t('dashboard.title') }}</p>
    </div>

    <div
      v-if="error"
      class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm"
    >
      {{ error }}
    </div>

    <div
      v-if="notifStore.pendingInvitations.length > 0"
      class="mb-6 card p-4 border-brand-200 dark:border-brand-700 bg-brand-50/40 dark:bg-brand-900/20"
    >
      <div class="flex items-center gap-2 mb-3">
        <font-awesome-icon icon="fa-solid fa-bell" class="w-4 h-4 text-brand-500" />
        <h3 class="font-semibold text-app">
          {{ t('invitations.pendingList') }} ({{ notifStore.pendingInvitations.length }})
        </h3>
      </div>
      <div class="space-y-2">
        <div
          v-for="invite in notifStore.pendingInvitations"
          :key="invite.id"
          class="bg-white dark:bg-slate-800 rounded-lg p-3 flex items-center gap-3 flex-wrap border divider"
        >
          <div
            class="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shrink-0"
          >
            <font-awesome-icon
              :icon="invite.type === 'organization' ? 'fa-solid fa-building' : 'fa-solid fa-layer-group'"
              class="w-4 h-4"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-app truncate">
              {{ invite.type === 'organization' ? invite.organization?.name : invite.project?.name }}
            </p>
            <p v-if="invite.invitedBy" class="text-xs text-muted">
              <span class="font-medium">{{ invite.invitedBy.name }}</span>
              {{ ' · ' }}
              <span v-if="invite.type === 'organization'">
                {{ t('invitations.invitedToOrg', { name: invite.organization?.name ?? '' }) }}
              </span>
              <span v-else>
                {{ t('invitations.invitedToProject', { name: invite.project?.name ?? '' }) }}
              </span>
            </p>
          </div>
          <div class="flex gap-2">
            <button class="btn-primary !py-1.5 !px-3 text-xs" @click="acceptInvitation(invite.id)">
              {{ t('invitations.accept') }}
            </button>
            <button class="btn-ghost !py-1.5 !px-3 text-xs" @click="declineInvitation(invite.id)">
              {{ t('invitations.decline') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Stat cards (all link to relevant pages) -->
    <div class="grid gap-4 sm:grid-cols-3 mb-8">
      <router-link
        :to="{ name: 'my-tasks' }"
        class="card-hover p-5 block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center">
            <font-awesome-icon icon="fa-solid fa-list-check" class="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <p class="text-2xl font-bold text-app">{{ stats.assignedTaskCount }}</p>
            <p class="text-xs text-muted uppercase tracking-wide font-semibold">
              {{ $t('nav.myTasks') }}
            </p>
          </div>
        </div>
      </router-link>
      <router-link
        :to="{ name: 'projects' }"
        class="card-hover p-5 block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center">
            <font-awesome-icon icon="fa-solid fa-layer-group" class="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <p class="text-2xl font-bold text-app">{{ stats.projectCount }}</p>
            <p class="text-xs text-muted uppercase tracking-wide font-semibold">
              {{ $t('dashboard.myProjects') }}
            </p>
          </div>
        </div>
      </router-link>
      <router-link
        :to="{ name: 'my-tasks', query: { filter: 'overdue' } }"
        class="card-hover p-5 block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center"
          >
            <font-awesome-icon
              icon="fa-solid fa-clock-rotate-left"
              class="w-4 h-4 text-red-500"
            />
          </div>
          <div>
            <p class="text-2xl font-bold text-app">{{ overdueTasks.length }}</p>
            <p class="text-xs text-muted uppercase tracking-wide font-semibold">
              {{ $t('dashboard.overdue') }}
            </p>
          </div>
        </div>
      </router-link>
    </div>

    <!-- Main grid -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Tasks -->
      <div class="lg:col-span-2">
        <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <router-link
            :to="{ name: 'my-tasks' }"
            class="text-lg font-semibold text-app inline-flex items-center gap-2 hover:text-brand-600 dark:hover:text-brand-400 transition"
          >
            <font-awesome-icon icon="fa-solid fa-list-check" class="w-4 h-4" />
            {{ $t('dashboard.myTasks') }}
            <font-awesome-icon icon="fa-solid fa-chevron-left" class="w-3 h-3 rotate-180 opacity-50" />
          </router-link>
          <router-link
            :to="{ name: 'my-tasks' }"
            class="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
          >
            {{ $t('dashboard.seeAllTasks') }}
          </router-link>
        </div>

        <div v-if="loading" class="card p-12 text-center text-muted">{{ $t('common.loading') }}</div>

        <div v-else-if="tasks.length === 0" class="card p-10 text-center">
          <div
            class="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4"
          >
            <font-awesome-icon icon="fa-solid fa-inbox" class="w-6 h-6 text-subtle" />
          </div>
          <p class="text-sm text-muted">{{ $t('dashboard.noTasks') }}</p>
        </div>

        <div v-else class="space-y-4">
          <div v-if="overdueTasks.length" class="card">
            <div
              class="px-4 py-2 border-b divider bg-red-50/60 dark:bg-red-950/20 text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-300 inline-flex items-center gap-2 w-full"
            >
              <font-awesome-icon icon="fa-solid fa-clock-rotate-left" class="w-3 h-3" />
              {{ $t('dashboard.overdue') }} · {{ overdueTasks.length }}
            </div>
            <ul class="divide-y divide-slate-100 dark:divide-slate-700">
              <li
                v-for="t in overdueTasks"
                :key="t.id"
                class="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                @click="openProject(t.projectId)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-app truncate">{{ t.title }}</p>
                    <div class="flex items-center gap-2 mt-1 text-xs text-muted flex-wrap">
                      <span v-if="t.project" class="inline-flex items-center gap-1">
                        <font-awesome-icon icon="fa-solid fa-layer-group" class="w-2.5 h-2.5" />
                        {{ t.project.name }}
                      </span>
                      <span v-if="t.status" class="chip bg-slate-100 dark:bg-slate-800 text-muted">
                        {{ t.status.name }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <span
                      v-if="t.priority"
                      class="chip"
                      :style="{
                        backgroundColor: (t.priority.color ?? '#94a3b8') + '20',
                        color: t.priority.color ?? '#94a3b8',
                      }"
                    >
                      {{ t.priority.name }}
                    </span>
                    <p
                      v-if="t.dueDate"
                      class="text-xs text-red-600 dark:text-red-400 font-semibold mt-1 inline-flex items-center gap-1"
                    >
                      <font-awesome-icon icon="fa-solid fa-calendar-day" class="w-2.5 h-2.5" />
                      {{ formatDate(t.dueDate) }}
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div v-if="upcomingTasks.length" class="card">
            <div
              class="px-4 py-2 border-b divider bg-slate-50 dark:bg-slate-800/50 text-xs font-bold uppercase tracking-wide text-muted inline-flex items-center gap-2 w-full"
            >
              <font-awesome-icon icon="fa-solid fa-calendar-day" class="w-3 h-3" />
              {{ $t('dashboard.upcoming') }} · {{ upcomingTasks.length }}
            </div>
            <ul class="divide-y divide-slate-100 dark:divide-slate-700">
              <li
                v-for="t in upcomingTasks"
                :key="t.id"
                class="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                @click="openProject(t.projectId)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-app truncate">{{ t.title }}</p>
                    <div class="flex items-center gap-2 mt-1 text-xs text-muted flex-wrap">
                      <span v-if="t.project" class="inline-flex items-center gap-1">
                        <font-awesome-icon icon="fa-solid fa-layer-group" class="w-2.5 h-2.5" />
                        {{ t.project.name }}
                      </span>
                      <span v-if="t.status" class="chip bg-slate-100 dark:bg-slate-800 text-muted">
                        {{ t.status.name }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <span
                      v-if="t.priority"
                      class="chip"
                      :style="{
                        backgroundColor: (t.priority.color ?? '#94a3b8') + '20',
                        color: t.priority.color ?? '#94a3b8',
                      }"
                    >
                      {{ t.priority.name }}
                    </span>
                    <p v-if="t.dueDate" class="text-xs text-subtle mt-1">{{ formatDate(t.dueDate) }}</p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Projects -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-app inline-flex items-center gap-2">
            <font-awesome-icon icon="fa-solid fa-layer-group" class="w-4 h-4" />
            {{ $t('dashboard.myProjects') }}
          </h3>
          <router-link
            :to="{ name: 'projects' }"
            class="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
          >
            {{ $t('dashboard.viewAll') }}
          </router-link>
        </div>

        <div
          v-if="!loading && recentProjects.length === 0"
          class="card p-10 text-center"
        >
          <div
            class="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3"
          >
            <font-awesome-icon icon="fa-solid fa-layer-group" class="w-5 h-5 text-subtle" />
          </div>
          <p class="text-sm text-muted">{{ $t('dashboard.noProjects') }}</p>
        </div>

        <ul v-else class="space-y-2">
          <li
            v-for="p in recentProjects"
            :key="p.id"
            class="card-hover p-3 cursor-pointer"
            @click="openProject(p.id)"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm shrink-0"
              >
                {{ p.name[0]?.toUpperCase() ?? '?' }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-app truncate">{{ p.name }}</p>
                <p class="text-xs text-muted truncate">
                  <template v-if="p.organizationId">
                    <font-awesome-icon icon="fa-solid fa-building" class="w-2.5 h-2.5 mr-1" />
                  </template>
                  <template v-else>
                    <font-awesome-icon icon="fa-solid fa-user" class="w-2.5 h-2.5 mr-1" />
                    {{ $t('projects.personal') }}
                  </template>
                </p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
