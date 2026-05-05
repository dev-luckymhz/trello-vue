<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TimeLog, TimeSummary } from '@/types'
import { tasksService } from '@/services/tasks.service'
import { extractErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ taskId: string }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const { t, locale } = useI18n()
const auth = useAuthStore()

const logs = ref<TimeLog[]>([])
const summary = ref<TimeSummary | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const hours = ref<number | null>(null)
const loggedAt = ref(todayISO())
const note = ref('')

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [l, s] = await Promise.all([
      tasksService.listTimeLogs(props.taskId),
      tasksService.timeSummary(props.taskId),
    ])
    logs.value = l
    summary.value = s
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)

const pct = computed(() => {
  if (!summary.value?.estimatedHours || summary.value.estimatedHours <= 0) return null
  return Math.min(
    100,
    Math.round((summary.value.loggedHours / summary.value.estimatedHours) * 100),
  )
})

const overBudget = computed(() => {
  if (!summary.value?.estimatedHours) return false
  return summary.value.loggedHours > summary.value.estimatedHours
})

async function submit() {
  if (!hours.value || hours.value <= 0) return
  try {
    await tasksService.logTime(props.taskId, {
      hours: hours.value,
      loggedAt: loggedAt.value,
      note: note.value.trim() || null,
    })
    hours.value = null
    note.value = ''
    await load()
    emit('changed')
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function remove(log: TimeLog) {
  try {
    await tasksService.deleteTimeLog(log.id)
    await load()
    emit('changed')
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale.value, { month: 'short', day: 'numeric', year: 'numeric' })
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

    <div class="grid grid-cols-3 gap-3">
      <div class="card p-3">
        <p class="text-xs text-muted">{{ t('taskModal.timeEstimated') }}</p>
        <p class="text-lg font-bold text-app">
          {{ summary?.estimatedHours ?? '—' }}{{ summary?.estimatedHours ? 'h' : '' }}
        </p>
      </div>
      <div class="card p-3">
        <p class="text-xs text-muted">{{ t('taskModal.timeLogged') }}</p>
        <p
          class="text-lg font-bold"
          :class="overBudget ? 'text-red-600 dark:text-red-400' : 'text-app'"
        >
          {{ summary?.loggedHours ?? 0 }}h
        </p>
      </div>
      <div class="card p-3">
        <p class="text-xs text-muted">{{ t('taskModal.timeRemaining') }}</p>
        <p class="text-lg font-bold text-app">
          <template v-if="summary?.remaining !== null && summary?.remaining !== undefined">
            {{ summary.remaining }}h
          </template>
          <template v-else>—</template>
        </p>
      </div>
    </div>

    <div v-if="pct !== null" class="space-y-1">
      <div class="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          class="h-full transition-all"
          :class="overBudget ? 'bg-red-500' : 'bg-brand-500'"
          :style="{ width: pct + '%' }"
        />
      </div>
      <p v-if="overBudget" class="text-xs text-red-600 dark:text-red-400">
        {{ t('taskModal.timeOver') }}
      </p>
    </div>

    <form
      class="border divider rounded-lg p-3 space-y-2 bg-slate-50 dark:bg-slate-800/60"
      @submit.prevent="submit"
    >
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="label text-xs">{{ t('taskModal.timeHours') }}</label>
          <input
            v-model.number="hours"
            type="number"
            step="0.25"
            min="0.01"
            max="99.99"
            class="input text-sm"
            placeholder="1.5"
          />
        </div>
        <div>
          <label class="label text-xs">{{ t('taskModal.timeDate') }}</label>
          <input v-model="loggedAt" type="date" class="input text-sm" />
        </div>
      </div>
      <div>
        <label class="label text-xs">{{ t('taskModal.timeNote') }}</label>
        <input
          v-model="note"
          type="text"
          maxlength="500"
          :placeholder="t('taskModal.timeNotePlaceholder')"
          class="input text-sm"
        />
      </div>
      <div class="flex justify-end">
        <button
          type="submit"
          class="btn-primary text-sm"
          :disabled="!hours || hours <= 0"
        >
          {{ t('taskModal.timeAddEntry') }}
        </button>
      </div>
    </form>

    <div v-if="!logs.length && !loading" class="text-sm text-muted">
      {{ t('taskModal.timeNoEntries') }}
    </div>
    <ul v-else class="space-y-1.5">
      <li
        v-for="log in logs"
        :key="log.id"
        class="flex items-center gap-2 p-2 rounded border divider group"
      >
        <span class="text-sm font-semibold text-app w-14">{{ Number(log.hours) }}h</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-app truncate">
            {{ log.note || log.user?.name || '—' }}
          </p>
          <p class="text-xs text-subtle">
            {{ log.user?.name ?? '—' }} · {{ fmtDate(log.loggedAt) }}
          </p>
        </div>
        <button
          v-if="log.userId === auth.user?.id"
          class="opacity-0 group-hover:opacity-100 text-subtle hover:text-red-500"
          @click="remove(log)"
        >
          <font-awesome-icon icon="fa-solid fa-trash" class="w-3 h-3" />
        </button>
      </li>
    </ul>
  </div>
</template>
