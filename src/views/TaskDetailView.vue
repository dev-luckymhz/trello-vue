<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Priority, Task } from '@/types'
import { projectsService } from '@/services/projects.service'
import { tasksService } from '@/services/tasks.service'
import { extractErrorMessage } from '@/services/api'
import { setDocumentTitle } from '@/router'
import TaskDetailPanel from '@/components/TaskDetailPanel.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const props = defineProps<{
  projectId: string
  taskId: string
}>()

const { t } = useI18n()
const router = useRouter()

const task = ref<Task | null>(null)
const priorities = ref<Priority[]>([])
const projectName = ref<string>('')
const loading = ref(true)
const error = ref<string | null>(null)
const pendingDelete = ref(false)
const saving = ref(false)
const panelRef = ref<InstanceType<typeof TaskDetailPanel> | null>(null)

const canSave = computed(() => {
  const exposed = panelRef.value as unknown as { canSave?: { value: boolean } } | null
  return exposed?.canSave?.value ?? false
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const [t2, prio, proj] = await Promise.all([
      tasksService.get(props.taskId),
      projectsService.priorities(props.projectId),
      projectsService.get(props.projectId).catch(() => null),
    ])
    task.value = t2
    priorities.value = prio
    projectName.value = proj?.name ?? ''
    if (t2?.title) setDocumentTitle(t2.title)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)

watch(
  () => [props.projectId, props.taskId],
  () => {
    void load()
  },
)

function backToBoard() {
  router.push({ name: 'project', params: { id: props.projectId } })
}

async function handleDelete() {
  if (!task.value) return
  try {
    await projectsService.deleteTask(task.value.id)
    pendingDelete.value = false
    backToBoard()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

function onUpdated(updated: Task) {
  task.value = { ...task.value, ...updated }
  if (updated.title) setDocumentTitle(updated.title)
}

async function triggerSave() {
  if (saving.value) return
  const exposed = panelRef.value as unknown as { onSave?: () => Promise<void> | void } | null
  if (!exposed?.onSave) return
  try {
    saving.value = true
    await exposed.onSave()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <!-- Sticky header -->
    <header
      class="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b divider"
    >
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <button
          type="button"
          class="btn-ghost text-sm inline-flex items-center gap-1.5"
          @click="backToBoard"
        >
          <font-awesome-icon icon="fa-solid fa-arrow-left" class="w-3 h-3" />
          {{ t('projects.backToProjects') }}
        </button>
        <nav class="flex-1 min-w-0 text-xs text-muted truncate">
          <span v-if="projectName">{{ projectName }}</span>
          <font-awesome-icon
            v-if="projectName && task?.title"
            icon="fa-solid fa-chevron-right"
            class="w-2 h-2 mx-1.5 text-subtle"
          />
          <span v-if="task?.title" class="text-app font-medium">{{ task.title }}</span>
        </nav>
        <button
          v-if="task"
          type="button"
          class="btn-ghost text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-1.5"
          @click="pendingDelete = true"
        >
          <font-awesome-icon icon="fa-solid fa-trash" class="w-3 h-3" />
          {{ t('common.delete') }}
        </button>
        <button
          type="button"
          class="btn-primary text-sm"
          :disabled="!canSave || saving"
          @click="triggerSave"
        >
          {{ saving ? t('common.saving') : t('common.saveChanges') }}
        </button>
      </div>
    </header>

    <!-- Body -->
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div v-if="loading" class="card p-10 text-center text-muted">
        {{ t('common.loading') }}
      </div>
      <div
        v-else-if="error"
        class="card p-6 text-sm text-red-600 dark:text-red-400"
      >
        {{ error }}
      </div>
      <div
        v-else-if="task"
        class="card p-4 sm:p-6"
      >
        <TaskDetailPanel
          ref="panelRef"
          :task="task"
          :priorities="priorities"
          :project-id="projectId"
          variant="page"
          @updated="onUpdated"
          @deleted="backToBoard"
        />
      </div>
    </main>

    <ConfirmDialog
      :open="pendingDelete"
      :title="t('board.deleteTaskTitle')"
      :message="t('board.deleteTaskBody')"
      :confirm-text="t('common.delete')"
      tone="danger"
      @confirm="handleDelete"
      @cancel="pendingDelete = false"
    />
  </div>
</template>
