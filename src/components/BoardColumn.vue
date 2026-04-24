<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { VueDraggable } from 'vue-draggable-plus'
import type { Priority, ProjectAccess, Task, TaskStatus } from '@/types'
import { PROJECT_PERMS } from '@/types'
import { useProjectsStore } from '@/stores/projects'
import { extractErrorMessage } from '@/services/api'
import { can } from '@/services/permissions'
import TaskCard from './TaskCard.vue'
import TaskModal from './TaskModal.vue'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  projectId: string
  status: TaskStatus
  tasks: Task[]
  priorities: Priority[]
  access: ProjectAccess | null
}>()

const store = useProjectsStore()
const { t } = useI18n()

const canEditTasks = computed(() => can(props.access, PROJECT_PERMS.TASKS_EDIT))
const canCreateTasks = computed(() => can(props.access, PROJECT_PERMS.TASKS_CREATE))
const canDeleteTasks = computed(() => can(props.access, PROJECT_PERMS.TASKS_DELETE))
const canManageStatuses = computed(() => can(props.access, PROJECT_PERMS.STATUSES_MANAGE))

const localTasks = computed<Task[]>({
  get: () => props.tasks,
  set: (value) => {
    if (!canEditTasks.value) return
    void store.reorderTasks(
      props.projectId,
      props.status.id,
      value.map((task) => task.id),
    )
  },
})

const editing = ref(false)
const titleDraft = ref(props.status.name)
const titleInput = ref<HTMLInputElement | null>(null)

const menuOpen = ref(false)
const taskModalOpen = ref(false)
const taskBeingEdited = ref<Task | null>(null)
const confirmDeleteColumn = ref(false)
const taskPendingDelete = ref<string | null>(null)
const error = ref<string | null>(null)

function startEditTitle() {
  if (!canManageStatuses.value) return
  titleDraft.value = props.status.name
  editing.value = true
  menuOpen.value = false
  void nextTick(() => titleInput.value?.select())
}

async function saveTitle() {
  if (!editing.value) return
  editing.value = false
  const next = titleDraft.value.trim()
  if (next && next !== props.status.name) {
    try {
      await store.renameStatus(props.status.id, next)
    } catch (err) {
      error.value = extractErrorMessage(err)
    }
  }
}

function openNewTask() {
  taskBeingEdited.value = null
  taskModalOpen.value = true
}

function openEditTask(task: Task) {
  taskBeingEdited.value = task
  taskModalOpen.value = true
}

async function onSaveTask(payload: {
  title: string
  description: string
  dueDate: string | null
  priorityId: string | null
}) {
  try {
    if (taskBeingEdited.value) {
      await store.updateTask(taskBeingEdited.value.id, payload)
    } else {
      await store.addTask(props.projectId, { ...payload, statusId: props.status.id })
    }
    taskModalOpen.value = false
    taskBeingEdited.value = null
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function confirmDeleteTask() {
  if (!taskPendingDelete.value) return
  try {
    await store.deleteTask(taskPendingDelete.value)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    taskPendingDelete.value = null
  }
}

async function doDeleteColumn() {
  try {
    await store.deleteStatus(props.status.id)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    confirmDeleteColumn.value = false
  }
}
</script>

<template>
  <div
    class="flex-shrink-0 w-80 bg-slate-50 dark:bg-slate-800/60 rounded-xl border divider flex flex-col max-h-full"
  >
    <div class="px-3 pt-3 pb-2 flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-brand-400 shrink-0"></span>
      <input
        v-if="editing"
        ref="titleInput"
        v-model="titleDraft"
        class="flex-1 bg-white dark:bg-slate-900 border border-brand-400 rounded px-2 py-1 text-sm font-semibold text-app focus:outline-none"
        @keydown.enter.prevent="saveTitle"
        @keydown.esc="editing = false"
        @blur="saveTitle"
      />
      <h3
        v-else
        class="flex-1 text-sm font-semibold text-app px-1 py-1 rounded truncate"
        :class="canManageStatuses ? 'cursor-text hover:bg-slate-100 dark:hover:bg-slate-700' : 'cursor-default'"
        @click="startEditTitle"
      >
        {{ status.name }}
      </h3>
      <span class="text-xs text-subtle font-medium">{{ tasks.length }}</span>
      <div v-if="canManageStatuses" class="relative">
        <button
          class="btn-icon w-7 h-7"
          @click="menuOpen = !menuOpen"
          :aria-label="t('common.edit')"
        >
          <font-awesome-icon icon="fa-solid fa-ellipsis-v" class="w-3.5 h-3.5" />
        </button>
        <div
          v-if="menuOpen"
          class="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border divider py-1 w-40 z-20"
          @click.stop
        >
          <button
            class="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            @click="startEditTitle"
          >
            {{ t('common.rename') }}
          </button>
          <button
            class="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
            @click="confirmDeleteColumn = true; menuOpen = false"
          >
            {{ t('board.deleteColumnTitle').replace('?', '') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="mx-3 mb-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2 rounded">
      {{ error }}
    </div>

    <VueDraggable
      v-model="localTasks"
      :animation="180"
      group="tasks"
      ghost-class="ghost-card"
      :disabled="!canEditTasks"
      class="flex-1 px-3 pb-2 space-y-2 overflow-y-auto min-h-[40px] scrollbar-thin"
    >
      <TaskCard
        v-for="task in localTasks"
        :key="task.id"
        :task="task"
        :priorities="priorities"
        :readonly="!canEditTasks"
        :can-edit="canEditTasks"
        :can-delete="canDeleteTasks"
        @edit="openEditTask"
        @delete="(id) => (taskPendingDelete = id)"
      />
    </VueDraggable>

    <button
      v-if="canCreateTasks"
      class="mx-3 mb-3 mt-1 flex items-center justify-center gap-2 text-sm font-medium text-muted hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-slate-800 py-2 rounded-lg border border-dashed divider hover:border-brand-400 transition"
      @click="openNewTask"
    >
      <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
      {{ t('board.addTask') }}
    </button>

    <TaskModal
      :open="taskModalOpen"
      :task="taskBeingEdited"
      :priorities="priorities"
      @close="taskModalOpen = false"
      @save="onSaveTask"
    />

    <ConfirmDialog
      :open="taskPendingDelete !== null"
      :title="t('board.deleteTaskTitle')"
      :message="t('board.deleteTaskBody')"
      :confirm-text="t('common.delete')"
      tone="danger"
      @confirm="confirmDeleteTask"
      @cancel="taskPendingDelete = null"
    />

    <ConfirmDialog
      :open="confirmDeleteColumn"
      :title="t('board.deleteColumnTitle')"
      :message="t('board.deleteColumnBody')"
      :confirm-text="t('common.delete')"
      tone="danger"
      @confirm="doDeleteColumn"
      @cancel="confirmDeleteColumn = false"
    />
  </div>
</template>
