<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { VueDraggable } from 'vue-draggable-plus'
import type { TaskStatus } from '@/types'
import { PROJECT_PERMS } from '@/types'
import { useProjectsStore } from '@/stores/projects'
import { extractErrorMessage } from '@/services/api'
import { can } from '@/services/permissions'
import { setDocumentTitle } from '@/router'
import BoardColumn from '@/components/BoardColumn.vue'
import ProjectUsersTab from '@/views/ProjectUsersTab.vue'
import ProjectSettingsTab from '@/views/ProjectSettingsTab.vue'
import ProjectProgressTab from '@/views/ProjectProgressTab.vue'

const props = defineProps<{ id: string }>()

const store = useProjectsStore()
const router = useRouter()
const { t } = useI18n()

const error = ref<string | null>(null)
const addingColumn = ref(false)
const newColumnName = ref('')

type Tab = 'board' | 'progress' | 'users' | 'settings'
const activeTab = ref<Tab>('board')

const statuses = computed<TaskStatus[]>(() => store.current?.statuses ?? [])

const canManageStatuses = computed(() =>
  can(store.currentAccess, PROJECT_PERMS.STATUSES_MANAGE),
)
const canManageMembers = computed(() =>
  can(store.currentAccess, PROJECT_PERMS.MEMBERS_MANAGE),
)
const canEdit = computed(() => can(store.currentAccess, PROJECT_PERMS.EDIT))
const canDelete = computed(() => can(store.currentAccess, PROJECT_PERMS.DELETE))

const isViewer = computed(() => {
  const perms = store.currentAccess?.permissions ?? []
  return perms.length > 0 && perms.every((p) => p === PROJECT_PERMS.VIEW)
})

const localStatuses = computed<TaskStatus[]>({
  get: () => statuses.value,
  set: (value) => {
    if (!canManageStatuses.value) return
    void store.reorderStatuses(props.id, value.map((s) => s.id))
  },
})

const tabs = computed(() => {
  const base = [
    { id: 'board' as Tab, label: t('projectTabs.board'), icon: 'fa-solid fa-layer-group' },
    {
      id: 'progress' as Tab,
      label: t('projectTabs_progress'),
      icon: 'fa-solid fa-chart-pie',
    },
    { id: 'users' as Tab, label: t('projectTabs.users'), icon: 'fa-solid fa-users' },
  ]
  if (canEdit.value || canDelete.value) {
    base.push({
      id: 'settings' as Tab,
      label: t('projectTabs.settings'),
      icon: 'fa-solid fa-sliders',
    })
  }
  return base
})

async function load() {
  error.value = null
  try {
    await store.loadProject(props.id)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

onMounted(load)
watch(() => props.id, load)
onBeforeUnmount(() => store.clearCurrent())

watch(
  () => store.current?.name,
  (name) => {
    if (name) setDocumentTitle(name)
  },
)

async function addColumn() {
  const name = newColumnName.value.trim()
  if (!name) return
  try {
    await store.addStatus(props.id, name)
    newColumnName.value = ''
    addingColumn.value = false
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

function goHome() {
  router.replace({ name: 'projects' })
}
</script>

<template>
  <div class="flex-1 min-h-0 flex flex-col">
    <div
      v-if="store.notFound"
      class="flex-1 flex flex-col items-center justify-center text-center p-6"
    >
      <div class="text-6xl font-bold text-slate-300 dark:text-slate-700">404</div>
      <h2 class="mt-4 text-xl font-semibold text-app">{{ $t('projects.notFoundTitle') }}</h2>
      <p class="text-sm text-muted mt-1 max-w-sm">{{ $t('projects.notFoundBody') }}</p>
      <button class="btn-primary mt-6" @click="goHome">
        {{ $t('projects.backToProjects') }}
      </button>
    </div>

    <template v-else>
      <div
        v-if="error"
        class="mx-4 sm:mx-6 mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm"
      >
        {{ error }}
      </div>

      <template v-if="store.current">
        <!-- Tab bar -->
        <div class="px-4 sm:px-6 pt-4 pb-2 flex items-center gap-4 flex-wrap border-b divider">
          <div class="flex gap-1">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="px-3 py-2 text-sm font-medium rounded-lg transition inline-flex items-center gap-2"
              :class="
                activeTab === tab.id
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                  : 'text-muted hover:bg-slate-100 dark:hover:bg-slate-800'
              "
              @click="activeTab = tab.id"
            >
              <font-awesome-icon :icon="tab.icon" class="w-3.5 h-3.5" />
              {{ tab.label }}
            </button>
          </div>
          <span
            v-if="isViewer && activeTab === 'board'"
            class="ml-auto inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-muted text-xs font-medium"
          >
            <font-awesome-icon icon="fa-solid fa-eye" class="w-3 h-3" />
            {{ $t('projects.viewOnly') }}
          </span>
        </div>

        <div
          v-if="activeTab === 'board'"
          class="flex-1 min-h-0 overflow-x-auto scrollbar-thin"
        >
          <div class="flex items-start gap-4 p-4 sm:p-6 min-h-full w-max">
            <VueDraggable
              v-model="localStatuses"
              :animation="180"
              :disabled="!canManageStatuses"
              handle=".column-drag-handle"
              class="flex items-start gap-4"
            >
              <div
                v-for="status in localStatuses"
                :key="status.id"
                class="column-drag-handle"
              >
                <BoardColumn
                  :project-id="id"
                  :status="status"
                  :tasks="store.tasksByStatus.get(status.id) ?? []"
                  :priorities="store.priorities"
                  :access="store.currentAccess"
                />
              </div>
            </VueDraggable>

            <div v-if="canManageStatuses" class="flex-shrink-0 w-80">
              <div v-if="addingColumn" class="bg-slate-50 dark:bg-slate-800 border divider rounded-xl p-3">
                <input
                  v-model="newColumnName"
                  type="text"
                  :placeholder="$t('board.columnName')"
                  autofocus
                  class="input"
                  @keydown.enter="addColumn"
                  @keydown.esc="addingColumn = false"
                />
                <div class="flex gap-2 mt-2">
                  <button class="btn-primary flex-1" @click="addColumn">
                    {{ $t('board.addColumn') }}
                  </button>
                  <button class="btn-ghost" @click="addingColumn = false">
                    {{ $t('common.cancel') }}
                  </button>
                </div>
              </div>
              <button
                v-else
                class="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted hover:text-brand-600 dark:hover:text-brand-400 bg-slate-50 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 border border-dashed divider hover:border-brand-400 py-3 rounded-xl transition"
                @click="addingColumn = true"
              >
                <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
                {{ $t('board.addColumn') }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-else-if="activeTab === 'progress'"
          class="flex-1 min-h-0 overflow-y-auto scrollbar-thin w-full"
        >
          <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <ProjectProgressTab
              :project="store.current"
              :can-edit="canEdit"
              :can-manage-statuses="canManageStatuses"
            />
          </div>
        </div>

        <div
          v-else-if="activeTab === 'users'"
          class="flex-1 min-h-0 overflow-y-auto scrollbar-thin w-full"
        >
          <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <ProjectUsersTab :project-id="id" :can-manage="canManageMembers" />
          </div>
        </div>

        <div
          v-else-if="activeTab === 'settings' && (canEdit || canDelete)"
          class="flex-1 min-h-0 overflow-y-auto scrollbar-thin w-full"
        >
          <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <ProjectSettingsTab
              :project="store.current"
              :can-edit="canEdit"
              :can-delete="canDelete"
            />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
