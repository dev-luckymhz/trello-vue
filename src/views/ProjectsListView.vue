<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Project } from '@/types'
import { ORG_PERMS, ProjectPriority, ProjectStatus } from '@/types'
import { useProjectsStore } from '@/stores/projects'
import { useOrganizationsStore } from '@/stores/organizations'
import { extractErrorMessage } from '@/services/api'
import ProjectWizard from '@/components/ProjectWizard.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useProjectsStore()
const orgStore = useOrganizationsStore()
const router = useRouter()
const { t, locale } = useI18n()

const error = ref<string | null>(null)
const wizardOpen = ref(false)
const wizardDraft = ref<Project | null>(null)

const deleteTarget = ref<string | null>(null)
const showArchived = ref(false)

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchProjects({ includeArchived: showArchived.value }),
      store.fetchDrafts().catch(() => {}),
      orgStore.fetch(),
    ])
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
})

watch(showArchived, async (value) => {
  try {
    await store.fetchProjects({ includeArchived: value })
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
})

function openProject(id: string) {
  router.push({ name: 'project', params: { id } })
}

function openWizard(draft: Project | null = null) {
  wizardDraft.value = draft
  wizardOpen.value = true
}

function onWizardActivated(project: Project) {
  router.push({ name: 'project', params: { id: project.id } })
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await store.deleteProject(deleteTarget.value)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    deleteTarget.value = null
  }
}

async function toggleArchive(projectId: string, archived: boolean) {
  try {
    await store.setArchived(projectId, archived)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function toggleHidden(projectId: string, hidden: boolean) {
  try {
    await store.setHidden(projectId, hidden)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

function orgName(id: string | null): string | null {
  if (!id) return null
  return orgStore.organizations.find((o) => o.id === id)?.name ?? null
}

function isOrgAdmin(organizationId: string | null): boolean {
  if (!organizationId) return false
  return (
    orgStore.accessFor(organizationId)?.permissions.includes(ORG_PERMS.PROJECTS_MANAGE_ALL) ??
    false
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function statusLabel(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    [ProjectStatus.DRAFT]: t('projects.statusDraft'),
    [ProjectStatus.PLANNING]: t('projects.statusPlanning'),
    [ProjectStatus.ACTIVE]: t('projects.statusActive'),
    [ProjectStatus.ON_HOLD]: t('projects.statusOnHold'),
    [ProjectStatus.COMPLETED]: t('projects.statusCompleted'),
    [ProjectStatus.ARCHIVED]: t('projects.statusArchived'),
  }
  return map[status] ?? status
}

function statusTone(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.ACTIVE:
      return 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300'
    case ProjectStatus.PLANNING:
      return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
    case ProjectStatus.ON_HOLD:
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
    case ProjectStatus.COMPLETED:
      return 'bg-slate-100 dark:bg-slate-800 text-muted'
    case ProjectStatus.ARCHIVED:
      return 'bg-slate-200 dark:bg-slate-700 text-muted'
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-muted'
  }
}

function priorityTone(priority: ProjectPriority): string {
  switch (priority) {
    case ProjectPriority.CRITICAL:
      return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
    case ProjectPriority.HIGH:
      return 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
    case ProjectPriority.MEDIUM:
      return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-muted'
  }
}

function priorityLabel(priority: ProjectPriority): string {
  const map: Record<ProjectPriority, string> = {
    [ProjectPriority.LOW]: t('projects.priorityLow'),
    [ProjectPriority.MEDIUM]: t('projects.priorityMedium'),
    [ProjectPriority.HIGH]: t('projects.priorityHigh'),
    [ProjectPriority.CRITICAL]: t('projects.priorityCritical'),
  }
  return map[priority] ?? priority
}

const filteredProjects = computed(() =>
  showArchived.value
    ? store.projects
    : store.projects.filter((p) => !p.isArchived),
)
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full">
    <div class="flex items-end justify-between mb-6 sm:mb-8 gap-4 flex-wrap">
      <div>
        <h2 class="text-2xl sm:text-3xl font-bold text-app">{{ $t('projects.title') }}</h2>
        <p class="text-sm text-muted mt-1">{{ $t('projects.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <label
          class="inline-flex items-center gap-2 text-sm text-muted cursor-pointer select-none px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <input type="checkbox" v-model="showArchived" class="accent-brand-500" />
          {{ $t('projects.showArchived') }}
        </label>
        <button class="btn-primary" @click="openWizard()">
          <font-awesome-icon icon="fa-solid fa-plus" class="w-3.5 h-3.5" />
          {{ $t('projects.new') }}
        </button>
      </div>
    </div>

    <div
      v-if="error"
      class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm"
    >
      {{ error }}
    </div>

    <!-- Drafts section -->
    <section v-if="store.drafts.length > 0" class="mb-8">
      <h3 class="text-base font-semibold text-app mb-3 inline-flex items-center gap-2">
        <font-awesome-icon icon="fa-solid fa-pen-to-square" class="w-3.5 h-3.5 text-amber-500" />
        {{ $t('projects.drafts') }}
        <span class="text-muted text-sm font-normal">({{ store.drafts.length }})</span>
      </h3>
      <ul class="card divide-y divide-slate-100 dark:divide-slate-700">
        <li
          v-for="draft in store.drafts"
          :key="draft.id"
          class="p-4 flex items-center gap-3 flex-wrap"
        >
          <div
            class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0"
          >
            <font-awesome-icon icon="fa-solid fa-pen-to-square" class="w-4 h-4" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-app truncate">
              {{ draft.name || $t('wizard.title') }}
            </p>
            <p class="text-xs text-muted truncate">
              {{ $t('projects.resumeHint') }}
              · {{ formatDate(draft.updatedAt) }}
            </p>
          </div>
          <button class="btn-primary !py-1.5 !px-3 text-xs" @click="openWizard(draft)">
            <font-awesome-icon icon="fa-solid fa-arrow-right" class="w-3 h-3" />
            {{ $t('projects.resume') }}
          </button>
          <button
            class="text-subtle hover:text-red-500 p-2"
            @click="deleteTarget = draft.id"
            :aria-label="$t('common.delete')"
          >
            <font-awesome-icon icon="fa-solid fa-trash" class="w-3.5 h-3.5" />
          </button>
        </li>
      </ul>
    </section>

    <div
      v-if="store.loading && store.projects.length === 0"
      class="text-center py-20 text-muted"
    >
      {{ $t('common.loading') }}
    </div>

    <div
      v-else-if="filteredProjects.length === 0 && store.drafts.length === 0"
      class="card text-center py-16 px-6"
    >
      <div
        class="w-14 h-14 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center mb-4"
      >
        <font-awesome-icon icon="fa-solid fa-layer-group" class="w-6 h-6 text-brand-500" />
      </div>
      <h3 class="text-lg font-semibold text-app">{{ $t('projects.emptyTitle') }}</h3>
      <p class="text-sm text-muted mt-1 max-w-sm mx-auto">{{ $t('projects.emptyBody') }}</p>
      <button class="btn-primary mt-6" @click="openWizard()">
        <font-awesome-icon icon="fa-solid fa-plus" class="w-3.5 h-3.5" />
        {{ $t('projects.emptyCta') }}
      </button>
    </div>

    <div
      v-else-if="filteredProjects.length > 0"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div
        v-for="project in filteredProjects"
        :key="project.id"
        class="group relative card-hover p-5 cursor-pointer"
        :class="{ 'opacity-70': project.isArchived }"
        @click="openProject(project.id)"
      >
        <div
          class="h-20 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 mb-4 relative overflow-hidden"
        >
          <div
            class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.3),_transparent_60%)]"
          />
          <div class="absolute top-2 left-2 flex gap-1 flex-wrap">
            <span
              v-if="project.isArchived"
              class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-800/70 text-white rounded-full inline-flex items-center gap-1"
            >
              <font-awesome-icon icon="fa-solid fa-box-archive" class="w-2.5 h-2.5" />
              {{ $t('projects.archived') }}
            </span>
            <span
              v-if="project.isHidden"
              class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-red-900/70 text-white rounded-full inline-flex items-center gap-1"
            >
              <font-awesome-icon icon="fa-solid fa-eye-slash" class="w-2.5 h-2.5" />
              {{ $t('projects.hidden') }}
            </span>
          </div>
          <div
            v-if="project.progress > 0"
            class="absolute bottom-0 left-0 right-0 h-1 bg-white/20"
          >
            <div
              class="h-full bg-white"
              :style="{ width: `${Math.min(100, project.progress)}%` }"
            />
          </div>
        </div>

        <h3 class="font-semibold text-app truncate">{{ project.name }}</h3>
        <p v-if="project.description" class="text-xs text-muted mt-1 line-clamp-2">
          {{ project.description }}
        </p>

        <div class="flex items-center gap-1.5 mt-3 flex-wrap">
          <span
            v-if="project.status && project.status !== 'DRAFT'"
            class="chip px-2"
            :class="statusTone(project.status)"
          >
            {{ statusLabel(project.status) }}
          </span>
          <span
            v-if="project.priority && project.priority !== 'MEDIUM'"
            class="chip px-2"
            :class="priorityTone(project.priority)"
          >
            {{ priorityLabel(project.priority) }}
          </span>
        </div>

        <div class="flex items-center gap-2 mt-3 text-xs text-subtle flex-wrap">
          <span
            v-if="orgName(project.organizationId)"
            class="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 px-2 py-0.5 rounded-full font-medium"
          >
            <font-awesome-icon icon="fa-solid fa-building" class="w-2.5 h-2.5" />
            {{ orgName(project.organizationId) }}
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 text-muted bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium"
          >
            <font-awesome-icon icon="fa-solid fa-user" class="w-2.5 h-2.5" />
            {{ $t('projects.personal') }}
          </span>
          <span>· {{ formatDate(project.createdAt) }}</span>
        </div>

        <div
          class="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
          @click.stop
        >
          <button
            v-if="isOrgAdmin(project.organizationId)"
            class="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur text-muted hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700 shadow-sm"
            :title="project.isHidden ? $t('projects.unhide') : $t('projects.hide')"
            @click="toggleHidden(project.id, !project.isHidden)"
          >
            <font-awesome-icon
              :icon="project.isHidden ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
              class="w-3 h-3"
            />
          </button>
          <button
            class="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur text-muted hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200 dark:border-slate-700 shadow-sm"
            :title="project.isArchived ? $t('projects.unarchive') : $t('projects.archive')"
            @click="toggleArchive(project.id, !project.isArchived)"
          >
            <font-awesome-icon
              :icon="project.isArchived ? 'fa-solid fa-box-open' : 'fa-solid fa-box-archive'"
              class="w-3 h-3"
            />
          </button>
          <button
            class="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur text-muted hover:text-red-500 border border-slate-200 dark:border-slate-700 shadow-sm"
            @click="deleteTarget = project.id"
            :aria-label="$t('common.delete')"
          >
            <font-awesome-icon icon="fa-solid fa-trash" class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

    <ProjectWizard
      :open="wizardOpen"
      :draft="wizardDraft"
      @close="wizardOpen = false"
      @activated="onWizardActivated"
    />

    <ConfirmDialog
      :open="deleteTarget !== null"
      :title="$t('projects.deleteConfirmTitle')"
      :message="$t('projects.deleteConfirmBody')"
      :confirm-text="$t('common.delete')"
      tone="danger"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
