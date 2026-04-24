<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Project, ProjectProgressSnapshot } from '@/types'
import { projectsService } from '@/services/projects.service'
import { api, extractErrorMessage } from '@/services/api'
import ProgressDonut from '@/components/ProgressDonut.vue'
import StatusBreakdownBar from '@/components/StatusBreakdownBar.vue'

const props = defineProps<{
  project: Project
  canEdit: boolean
  canManageStatuses: boolean
}>()

const { t } = useI18n()

const snapshot = ref<ProjectProgressSnapshot | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const savingManual = ref(false)

async function load() {
  loading.value = true
  error.value = null
  try {
    snapshot.value = await projectsService.progress(props.project.id)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.project.id, load)

const manualMode = ref(false)
const manualProgress = ref(0)

watch(
  () => snapshot.value,
  (value) => {
    if (!value) return
    manualMode.value = value.useManualProgress
    manualProgress.value = value.manualProgress
  },
  { immediate: true },
)

const headlinePercent = computed(() => {
  if (!snapshot.value) return 0
  return snapshot.value.useManualProgress
    ? snapshot.value.manualProgress
    : snapshot.value.percentComplete
})

async function saveManualToggle() {
  savingManual.value = true
  try {
    await projectsService.update(props.project.id, {
      useManualProgress: manualMode.value,
      progress: manualProgress.value,
    })
    await load()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    savingManual.value = false
  }
}

let debounceHandle: ReturnType<typeof setTimeout> | null = null
watch(
  () => manualProgress.value,
  (value) => {
    if (!manualMode.value) return
    if (debounceHandle) clearTimeout(debounceHandle)
    debounceHandle = setTimeout(async () => {
      try {
        await projectsService.update(props.project.id, { progress: value })
      } catch (err) {
        error.value = extractErrorMessage(err)
      }
    }, 400)
  },
)

const statusSegments = computed(() => {
  if (!snapshot.value) return []
  const palette = ['#3b5bff', '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899']
  return snapshot.value.byStatus.map((s, i) => ({
    key: s.statusId,
    label: s.name,
    count: s.count,
    color: s.isDone ? '#10b981' : palette[i % palette.length],
  }))
})

const prioritySegments = computed(() => {
  if (!snapshot.value) return []
  return snapshot.value.byPriority.map((p, i) => ({
    key: p.id ?? `none-${i}`,
    label: p.name,
    count: p.count,
    color: p.color ?? '#64748b',
  }))
})

async function toggleStatusDone(status: { statusId: string; isDone: boolean }) {
  if (!props.canManageStatuses) return
  try {
    await api.patch(`/projects/statuses/${status.statusId}`, {
      isDone: !status.isDone,
    })
    await load()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <div class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h3 class="text-lg font-semibold text-app">{{ t('progressTab.title') }}</h3>
        <p class="text-sm text-muted">{{ t('progressTab.subtitle') }}</p>
      </div>
    </div>

    <div
      v-if="error"
      class="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm"
    >
      {{ error }}
    </div>

    <div v-if="loading && !snapshot" class="card p-12 text-center text-muted">
      {{ t('common.loading') }}
    </div>

    <template v-else-if="snapshot">
      <div class="card p-6 flex gap-8 items-center flex-wrap">
        <ProgressDonut :value="headlinePercent" :size="160" />
        <div class="flex-1 min-w-[240px] grid grid-cols-2 gap-3">
          <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <p class="text-xs text-muted uppercase tracking-wide font-semibold">
              {{ t('progressTab.totalTasks') }}
            </p>
            <p class="text-2xl font-bold text-app">{{ snapshot.total }}</p>
          </div>
          <div class="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
            <p class="text-xs text-green-700 dark:text-green-400 uppercase tracking-wide font-semibold">
              {{ t('progressTab.completed') }}
            </p>
            <p class="text-2xl font-bold text-app">{{ snapshot.completed }}</p>
          </div>
          <div class="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <p class="text-xs text-blue-700 dark:text-blue-400 uppercase tracking-wide font-semibold">
              {{ t('progressTab.inProgress') }}
            </p>
            <p class="text-2xl font-bold text-app">{{ snapshot.inProgress }}</p>
          </div>
          <div class="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
            <p class="text-xs text-red-700 dark:text-red-400 uppercase tracking-wide font-semibold">
              {{ t('progressTab.overdue') }}
            </p>
            <p class="text-2xl font-bold text-app">{{ snapshot.overdue }}</p>
          </div>
        </div>
      </div>

      <section class="card p-6">
        <h4 class="font-semibold text-app mb-3">{{ t('progressTab.byStatus') }}</h4>
        <div v-if="snapshot.total === 0" class="text-sm text-muted">
          {{ t('progressTab.noTasks') }}
        </div>
        <template v-else>
          <StatusBreakdownBar :segments="statusSegments" />
          <p class="text-xs text-muted mt-3">{{ t('progressTab.autoHint') }}</p>
          <div v-if="canManageStatuses" class="mt-4 border-t divider pt-3">
            <p class="text-xs text-muted font-semibold uppercase tracking-wide mb-2">
              {{ t('progressTab.markDoneHint') }}
            </p>
            <ul class="flex flex-wrap gap-2">
              <li
                v-for="s in snapshot.byStatus"
                :key="s.statusId"
                class="inline-flex items-center gap-2"
              >
                <button
                  type="button"
                  class="px-2 py-1 text-xs font-medium rounded-full border transition"
                  :class="
                    s.isDone
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-muted border-slate-200 dark:border-slate-700 hover:border-brand-400'
                  "
                  @click="toggleStatusDone(s)"
                >
                  <font-awesome-icon
                    :icon="s.isDone ? 'fa-solid fa-check' : 'fa-solid fa-circle-info'"
                    class="w-2.5 h-2.5 mr-1"
                  />
                  {{ s.name }}
                </button>
              </li>
            </ul>
          </div>
        </template>
      </section>

      <section v-if="snapshot.byPriority.length > 0" class="card p-6">
        <h4 class="font-semibold text-app mb-3">{{ t('progressTab.byPriority') }}</h4>
        <StatusBreakdownBar :segments="prioritySegments" />
      </section>

      <section class="card p-6">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h4 class="font-semibold text-app">{{ t('progressTab.useManualProgress') }}</h4>
            <p class="text-xs text-muted mt-1 max-w-md">{{ t('progressTab.manualHint') }}</p>
          </div>
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              class="accent-brand-500"
              :disabled="!canEdit || savingManual"
              v-model="manualMode"
              @change="saveManualToggle"
            />
            <span class="text-sm text-app">
              {{ manualMode ? t('common.yes') : t('common.no') }}
            </span>
          </label>
        </div>
        <div v-if="manualMode" class="mt-4 flex items-center gap-3">
          <input
            v-model.number="manualProgress"
            type="range"
            min="0"
            max="100"
            step="5"
            class="flex-1 accent-brand-500"
            :disabled="!canEdit"
          />
          <span class="text-sm font-semibold text-app w-10 text-right">
            {{ manualProgress }}%
          </span>
        </div>
      </section>
    </template>
  </div>
</template>
