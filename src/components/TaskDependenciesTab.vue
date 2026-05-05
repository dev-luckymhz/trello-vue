<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Task, TaskDependencyView } from '@/types'
import { DependencyType, TaskState } from '@/types'
import { tasksService } from '@/services/tasks.service'
import { projectsService } from '@/services/projects.service'
import { extractErrorMessage } from '@/services/api'

const props = defineProps<{ taskId: string; projectId: string }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const { t } = useI18n()

const dependencies = ref<TaskDependencyView[]>([])
const projectTasks = ref<Task[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const showAdd = ref(false)
const addType = ref<DependencyType>(DependencyType.DEPENDS_ON)
const otherSearch = ref('')
const selectedOtherId = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [deps, tasks] = await Promise.all([
      tasksService.listDependencies(props.taskId),
      projectsService.listTasks(props.projectId),
    ])
    dependencies.value = deps
    projectTasks.value = tasks
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)

const selectedIds = computed(() => {
  const s = new Set<string>([props.taskId])
  for (const d of dependencies.value) s.add(d.otherTaskId)
  return s
})

const taskSuggestions = computed(() => {
  const q = otherSearch.value.trim().toLowerCase()
  return projectTasks.value
    .filter((t) => !selectedIds.value.has(t.id))
    .filter((t) => !q || t.title.toLowerCase().includes(q))
    .slice(0, 8)
})

const blockedByThis = computed(() =>
  dependencies.value.filter((d) => d.type === DependencyType.BLOCKS),
)
const dependsOn = computed(() =>
  dependencies.value.filter((d) => d.type === DependencyType.DEPENDS_ON),
)

async function add() {
  if (!selectedOtherId.value) return
  try {
    await tasksService.createDependency(props.taskId, {
      otherTaskId: selectedOtherId.value,
      type: addType.value,
    })
    selectedOtherId.value = null
    otherSearch.value = ''
    showAdd.value = false
    await load()
    emit('changed')
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function remove(d: TaskDependencyView) {
  try {
    await tasksService.deleteDependency(props.taskId, d.id)
    dependencies.value = dependencies.value.filter((x) => x.id !== d.id)
    emit('changed')
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

function pickTask(task: Task) {
  selectedOtherId.value = task.id
  otherSearch.value = task.title
}

function stateStyle(state: TaskState): { bg: string; fg: string } {
  switch (state) {
    case TaskState.DONE:
      return { bg: '#16a34a33', fg: '#15803d' }
    case TaskState.BLOCKED:
      return { bg: '#dc262633', fg: '#b91c1c' }
    case TaskState.IN_PROGRESS:
      return { bg: '#2563eb33', fg: '#1d4ed8' }
    case TaskState.IN_REVIEW:
      return { bg: '#7c3aed33', fg: '#6d28d9' }
    case TaskState.ARCHIVED:
      return { bg: '#64748b33', fg: '#475569' }
    default:
      return { bg: '#94a3b833', fg: '#475569' }
  }
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="error"
      class="p-2 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs"
    >
      {{ error }}
    </div>

    <div v-if="dependsOn.length">
      <p class="text-xs font-semibold uppercase text-muted mb-2">
        {{ t('taskModal.depsBlockedByThis') }}
      </p>
      <ul class="space-y-1.5">
        <li
          v-for="d in dependsOn"
          :key="d.id"
          class="flex items-center gap-2 p-2 rounded border divider group"
        >
          <font-awesome-icon icon="fa-solid fa-hand" class="w-3 h-3 text-amber-500" />
          <span class="flex-1 text-sm text-app truncate">{{ d.otherTask?.title ?? '—' }}</span>
          <span
            v-if="d.otherTask"
            class="px-1.5 h-5 inline-flex items-center rounded text-[10px] font-semibold"
            :style="{
              backgroundColor: stateStyle(d.otherTask.state).bg,
              color: stateStyle(d.otherTask.state).fg,
            }"
          >
            {{ t(`taskState.${d.otherTask.state}`) }}
          </span>
          <button
            class="opacity-0 group-hover:opacity-100 text-subtle hover:text-red-500"
            @click="remove(d)"
          >
            <font-awesome-icon icon="fa-solid fa-xmark" class="w-3 h-3" />
          </button>
        </li>
      </ul>
    </div>

    <div v-if="blockedByThis.length">
      <p class="text-xs font-semibold uppercase text-muted mb-2">
        {{ t('taskModal.depsBlocksThis') }}
      </p>
      <ul class="space-y-1.5">
        <li
          v-for="d in blockedByThis"
          :key="d.id"
          class="flex items-center gap-2 p-2 rounded border divider group"
        >
          <font-awesome-icon icon="fa-solid fa-bolt" class="w-3 h-3 text-rose-500" />
          <span class="flex-1 text-sm text-app truncate">{{ d.otherTask?.title ?? '—' }}</span>
          <span
            v-if="d.otherTask"
            class="px-1.5 h-5 inline-flex items-center rounded text-[10px] font-semibold"
            :style="{
              backgroundColor: stateStyle(d.otherTask.state).bg,
              color: stateStyle(d.otherTask.state).fg,
            }"
          >
            {{ t(`taskState.${d.otherTask.state}`) }}
          </span>
          <button
            class="opacity-0 group-hover:opacity-100 text-subtle hover:text-red-500"
            @click="remove(d)"
          >
            <font-awesome-icon icon="fa-solid fa-xmark" class="w-3 h-3" />
          </button>
        </li>
      </ul>
    </div>

    <p v-if="!dependencies.length && !loading" class="text-sm text-muted">
      {{ t('taskModal.depsNothing') }}
    </p>

    <div v-if="showAdd" class="border divider rounded-lg p-3 bg-slate-50 dark:bg-slate-800/60 space-y-2">
      <div class="flex gap-2 items-center text-sm">
        <span class="text-muted">{{ t('taskModal.depsType') }}</span>
        <select v-model="addType" class="select text-sm">
          <option :value="DependencyType.DEPENDS_ON">{{ t('taskModal.depsDependsOn') }}</option>
          <option :value="DependencyType.BLOCKS">{{ t('taskModal.depsBlocks') }}</option>
        </select>
      </div>
      <div class="relative">
        <input
          v-model="otherSearch"
          type="text"
          class="input text-sm"
          :placeholder="t('taskModal.depsOtherPlaceholder')"
          @input="selectedOtherId = null"
        />
        <div
          v-if="taskSuggestions.length > 0 && otherSearch.trim()"
          class="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border divider rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          <button
            v-for="task in taskSuggestions"
            :key="task.id"
            type="button"
            class="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between gap-2"
            @mousedown.prevent="pickTask(task)"
          >
            <span class="text-app truncate">{{ task.title }}</span>
            <span
              v-if="task.state"
              class="px-1.5 h-4 inline-flex items-center rounded text-[10px] font-semibold shrink-0"
              :style="{
                backgroundColor: stateStyle(task.state).bg,
                color: stateStyle(task.state).fg,
              }"
            >
              {{ t(`taskState.${task.state}`) }}
            </span>
          </button>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button class="btn-ghost text-sm" @click="showAdd = false">
          {{ t('common.cancel') }}
        </button>
        <button
          class="btn-primary text-sm"
          :disabled="!selectedOtherId"
          @click="add"
        >
          {{ t('common.add') }}
        </button>
      </div>
    </div>
    <button
      v-else
      class="btn-ghost text-sm inline-flex items-center gap-1.5"
      @click="showAdd = true"
    >
      <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
      {{ t('taskModal.depsAdd') }}
    </button>
  </div>
</template>
