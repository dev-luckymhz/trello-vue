<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { meService, type AssignedTask } from '@/services/me.service'
import { extractErrorMessage } from '@/services/api'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()

const tasks = ref<AssignedTask[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

type Filter = 'all' | 'overdue' | 'upcoming' | 'noDate'

function readFilterFromQuery(): Filter {
  const raw = route.query.filter
  if (raw === 'overdue' || raw === 'upcoming' || raw === 'noDate') return raw
  return 'all'
}

const filter = ref<Filter>(readFilterFromQuery())
const search = ref('')

onMounted(async () => {
  try {
    tasks.value = await meService.tasks()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
})

const startOfToday = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})()

function dueStatus(task: AssignedTask): 'overdue' | 'upcoming' | 'noDate' {
  if (!task.dueDate) return 'noDate'
  return new Date(task.dueDate) < startOfToday ? 'overdue' : 'upcoming'
}

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return tasks.value.filter((t) => {
    if (filter.value !== 'all' && dueStatus(t) !== filter.value) return false
    if (query) {
      const haystack = `${t.title} ${t.project?.name ?? ''} ${t.priority?.name ?? ''} ${t.status?.name ?? ''}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })
})

function formatDate(iso: string | null): string {
  if (!iso) return t('tasksTable.noDueDate')
  return new Date(iso).toLocaleDateString(locale.value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function openTaskProject(task: AssignedTask) {
  router.push({
    name: 'task-detail',
    params: { projectId: task.projectId, taskId: task.id },
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
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full">
    <div class="mb-6 sm:mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h2 class="text-2xl sm:text-3xl font-bold text-app">{{ t('tasksTable.title') }}</h2>
        <p class="text-sm text-muted mt-1">{{ t('tasksTable.subtitle') }}</p>
      </div>
      <div class="w-full sm:w-auto">
        <input
          v-model="search"
          type="search"
          :placeholder="t('common.search')"
          class="input sm:w-64"
        />
      </div>
    </div>

    <div
      v-if="error"
      class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm"
    >
      {{ error }}
    </div>

    <div class="card p-1 mb-4 inline-flex gap-1 overflow-x-auto scrollbar-thin max-w-full">
      <button
        v-for="f in [
          { id: 'all' as Filter, label: t('tasksTable.filterAll') },
          { id: 'overdue' as Filter, label: t('tasksTable.filterOverdue') },
          { id: 'upcoming' as Filter, label: t('tasksTable.filterUpcoming') },
          { id: 'noDate' as Filter, label: t('tasksTable.filterNoDate') },
        ]"
        :key="f.id"
        class="px-3 py-1.5 text-sm font-medium rounded-lg transition whitespace-nowrap"
        :class="
          filter === f.id
            ? 'bg-brand-500 text-white shadow-sm'
            : 'text-muted hover:bg-slate-100 dark:hover:bg-slate-700'
        "
        @click="filter = f.id"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="loading" class="card p-12 text-center text-muted">{{ t('common.loading') }}</div>

    <div v-else-if="filtered.length === 0" class="card p-12 text-center">
      <div
        class="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4"
      >
        <font-awesome-icon icon="fa-solid fa-inbox" class="w-6 h-6 text-subtle" />
      </div>
      <p class="text-sm text-muted">{{ t('tasksTable.empty') }}</p>
    </div>

    <div v-else class="card overflow-hidden">
      <!-- Desktop table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/60 border-b divider">
            <tr class="text-left text-xs font-semibold text-muted uppercase tracking-wide">
              <th class="px-4 py-3">{{ t('tasksTable.task') }}</th>
              <th class="px-4 py-3">{{ t('tasksTable.project') }}</th>
              <th class="px-4 py-3">{{ t('tasksTable.priority') }}</th>
              <th class="px-4 py-3">{{ t('tasksTable.status') }}</th>
              <th class="px-4 py-3">{{ t('tasksTable.dueDate') }}</th>
              <th class="px-4 py-3">{{ t('tasksTable.added') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr
              v-for="task in filtered"
              :key="task.id"
              class="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
              @click="openTaskProject(task)"
            >
              <td class="px-4 py-3 align-top">
                <p class="font-medium text-app">{{ task.title }}</p>
                <p
                  v-if="task.description"
                  class="text-xs text-muted line-clamp-1 mt-0.5 max-w-xs"
                >
                  {{ task.description }}
                </p>
              </td>
              <td class="px-4 py-3 align-top text-muted">
                <span class="inline-flex items-center gap-1.5">
                  <font-awesome-icon icon="fa-solid fa-layer-group" class="w-3 h-3 text-subtle" />
                  {{ task.project?.name ?? '—' }}
                </span>
              </td>
              <td class="px-4 py-3 align-top">
                <span
                  v-if="task.priority"
                  class="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[11px] font-semibold border"
                  :style="priorityStyle(task)"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                  {{ task.priority.name }}
                </span>
                <span v-else class="text-subtle text-xs">—</span>
              </td>
              <td class="px-4 py-3 align-top">
                <span
                  v-if="task.status"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-muted"
                >
                  {{ task.status.name }}
                </span>
                <span v-else class="text-subtle text-xs">—</span>
              </td>
              <td class="px-4 py-3 align-top">
                <span
                  v-if="task.dueDate"
                  class="text-sm"
                  :class="
                    dueStatus(task) === 'overdue'
                      ? 'text-red-600 dark:text-red-400 font-semibold'
                      : 'text-muted'
                  "
                >
                  {{ formatDate(task.dueDate) }}
                </span>
                <span v-else class="text-subtle text-sm">{{ t('tasksTable.noDueDate') }}</span>
              </td>
              <td class="px-4 py-3 align-top text-subtle text-sm">
                {{ formatDate(task.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile card list -->
      <ul class="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
        <li
          v-for="task in filtered"
          :key="task.id"
          class="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
          @click="openTaskProject(task)"
        >
          <div class="flex items-start justify-between gap-2 mb-1">
            <p class="font-medium text-app">{{ task.title }}</p>
            <span
              v-if="task.priority"
              class="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[11px] font-semibold border shrink-0"
              :style="priorityStyle(task)"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
              {{ task.priority.name }}
            </span>
          </div>
          <div class="flex items-center gap-2 flex-wrap text-xs text-muted">
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
          <div class="flex items-center justify-between gap-2 mt-2 text-xs">
            <span
              :class="
                dueStatus(task) === 'overdue'
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : 'text-muted'
              "
            >
              <font-awesome-icon icon="fa-solid fa-calendar-day" class="w-2.5 h-2.5 mr-1" />
              {{ formatDate(task.dueDate) }}
            </span>
            <span class="text-subtle">{{ t('tasksTable.added') }}: {{ formatDate(task.createdAt) }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
