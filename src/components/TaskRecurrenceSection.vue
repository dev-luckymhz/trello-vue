<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaskRecurrence } from '@/types'
import { RecurrenceFrequency } from '@/types'
import { tasksService } from '@/services/tasks.service'
import { extractErrorMessage } from '@/services/api'

const props = defineProps<{ taskId: string }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const { t, locale } = useI18n()

const recurrence = ref<TaskRecurrence | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const editing = ref(false)

const form = reactive({
  frequency: RecurrenceFrequency.WEEKLY,
  interval: 1,
  byWeekday: [] as number[],
  monthDay: null as number | null,
  nextRunAt: '' as string,
  endDate: '' as string,
  isActive: true,
})

const WEEKDAYS = [
  { id: 0, label: 'S' },
  { id: 1, label: 'M' },
  { id: 2, label: 'T' },
  { id: 3, label: 'W' },
  { id: 4, label: 'T' },
  { id: 5, label: 'F' },
  { id: 6, label: 'S' },
]

async function load() {
  loading.value = true
  try {
    recurrence.value = await tasksService.getRecurrence(props.taskId)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function beginEdit() {
  const r = recurrence.value
  form.frequency = r?.frequency ?? RecurrenceFrequency.WEEKLY
  form.interval = r?.interval ?? 1
  form.byWeekday = r?.byWeekday ?? []
  form.monthDay = r?.monthDay ?? null
  const nextDate = r?.nextRunAt ? new Date(r.nextRunAt) : new Date()
  form.nextRunAt = toDateInput(nextDate)
  form.endDate = r?.endDate ?? ''
  form.isActive = r?.isActive ?? true
  editing.value = true
}

function toggleWeekday(d: number) {
  if (form.byWeekday.includes(d)) {
    form.byWeekday = form.byWeekday.filter((x) => x !== d)
  } else {
    form.byWeekday = [...form.byWeekday, d]
  }
}

async function save() {
  try {
    error.value = null
    const payload = {
      frequency: form.frequency,
      interval: Math.max(1, form.interval),
      byWeekday: form.frequency === RecurrenceFrequency.WEEKLY && form.byWeekday.length
        ? form.byWeekday
        : undefined,
      monthDay: form.frequency === RecurrenceFrequency.MONTHLY && form.monthDay
        ? form.monthDay
        : undefined,
      nextRunAt: new Date(form.nextRunAt + 'T09:00:00').toISOString(),
      endDate: form.endDate || null,
      isActive: form.isActive,
    }
    recurrence.value = await tasksService.upsertRecurrence(props.taskId, payload)
    editing.value = false
    emit('changed')
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function remove() {
  try {
    await tasksService.deleteRecurrence(props.taskId)
    recurrence.value = null
    emit('changed')
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

function fmtSummary(r: TaskRecurrence): string {
  const f = r.frequency
  const i = r.interval
  if (f === RecurrenceFrequency.DAILY) return i === 1 ? t('recurrence.daily') : t('recurrence.everyNDays', { n: i })
  if (f === RecurrenceFrequency.WEEKLY) {
    if (r.byWeekday && r.byWeekday.length) {
      const days = r.byWeekday.map((d) => WEEKDAYS[d].label).join('')
      return t('recurrence.weeklyOn', { days, n: i })
    }
    return i === 1 ? t('recurrence.weekly') : t('recurrence.everyNWeeks', { n: i })
  }
  if (f === RecurrenceFrequency.MONTHLY) {
    const day = r.monthDay ? t('recurrence.onDay', { d: r.monthDay }) : ''
    return (i === 1 ? t('recurrence.monthly') : t('recurrence.everyNMonths', { n: i })) + (day ? ` · ${day}` : '')
  }
  return t('recurrence.custom', { n: i })
}

function fmtNext(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(locale.value, { weekday: 'short', month: 'short', day: 'numeric' })
}

const summary = computed(() => (recurrence.value ? fmtSummary(recurrence.value) : ''))
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="error"
      class="p-2 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs"
    >
      {{ error }}
    </div>

    <div v-if="!editing && recurrence" class="flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-app">{{ summary }}</p>
        <p class="text-xs text-subtle">
          {{ t('recurrence.nextRun') }}: {{ fmtNext(recurrence.nextRunAt) }}
          <span v-if="!recurrence.isActive" class="ml-2 text-amber-600">· {{ t('recurrence.paused') }}</span>
        </p>
      </div>
      <button class="btn-ghost text-sm" @click="beginEdit">{{ t('common.edit') }}</button>
      <button class="btn-ghost text-sm text-red-500" @click="remove">{{ t('common.delete') }}</button>
    </div>

    <button
      v-if="!editing && !recurrence"
      class="btn-ghost text-sm inline-flex items-center gap-1.5"
      @click="beginEdit"
    >
      <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
      {{ t('recurrence.add') }}
    </button>

    <div v-if="editing" class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="label text-xs">{{ t('recurrence.frequency') }}</label>
          <select v-model="form.frequency" class="select text-sm">
            <option :value="RecurrenceFrequency.DAILY">{{ t('recurrence.daily') }}</option>
            <option :value="RecurrenceFrequency.WEEKLY">{{ t('recurrence.weekly') }}</option>
            <option :value="RecurrenceFrequency.MONTHLY">{{ t('recurrence.monthly') }}</option>
            <option :value="RecurrenceFrequency.CUSTOM">{{ t('recurrence.custom', { n: '' }) }}</option>
          </select>
        </div>
        <div>
          <label class="label text-xs">{{ t('recurrence.every') }}</label>
          <input
            v-model.number="form.interval"
            type="number"
            min="1"
            max="365"
            class="input text-sm"
          />
        </div>
      </div>

      <div v-if="form.frequency === RecurrenceFrequency.WEEKLY">
        <label class="label text-xs">{{ t('recurrence.onDays') }}</label>
        <div class="flex gap-1">
          <button
            v-for="d in WEEKDAYS"
            :key="d.id"
            type="button"
            class="w-8 h-8 rounded-full text-xs font-semibold transition"
            :class="
              form.byWeekday.includes(d.id)
                ? 'bg-brand-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-muted hover:bg-slate-200'
            "
            @click="toggleWeekday(d.id)"
          >
            {{ d.label }}
          </button>
        </div>
      </div>

      <div v-if="form.frequency === RecurrenceFrequency.MONTHLY">
        <label class="label text-xs">{{ t('recurrence.dayOfMonth') }}</label>
        <input
          v-model.number="form.monthDay"
          type="number"
          min="1"
          max="31"
          class="input text-sm w-24"
          placeholder="15"
        />
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="label text-xs">{{ t('recurrence.nextRun') }}</label>
          <input v-model="form.nextRunAt" type="date" class="input text-sm" />
        </div>
        <div>
          <label class="label text-xs">{{ t('recurrence.endDate') }}</label>
          <input v-model="form.endDate" type="date" class="input text-sm" />
        </div>
      </div>

      <label class="inline-flex items-center gap-2 text-sm text-app">
        <input v-model="form.isActive" type="checkbox" class="w-4 h-4" />
        {{ t('recurrence.active') }}
      </label>

      <div class="flex justify-end gap-2">
        <button class="btn-ghost text-sm" @click="editing = false">
          {{ t('common.cancel') }}
        </button>
        <button class="btn-primary text-sm" :disabled="!form.nextRunAt" @click="save">
          {{ t('common.save') }}
        </button>
      </div>
    </div>
  </div>
</template>
