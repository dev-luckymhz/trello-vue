<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    startDate?: string | null
    dueDate?: string | null
    /** Which date the next click assigns. */
    activeField?: 'start' | 'due'
  }>(),
  { startDate: null, dueDate: null, activeField: 'due' },
)

const emit = defineEmits<{
  (e: 'update:startDate', value: string | null): void
  (e: 'update:dueDate', value: string | null): void
}>()

const { locale } = useI18n()

/** Current visible month as the 1st of month. */
const viewDate = ref<Date>(parse(props.dueDate) ?? parse(props.startDate) ?? new Date())
const active = ref<'start' | 'due'>(props.activeField)

watch(
  () => props.activeField,
  (v) => (active.value = v),
)

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  return Number.isNaN(d.getTime()) ? null : d
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const monthGrid = computed(() => {
  const first = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), 1)
  const offset = first.getDay() // 0 = Sunday
  const start = new Date(first)
  start.setDate(first.getDate() - offset)
  const days: Array<{ date: Date; inMonth: boolean }> = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push({ date: d, inMonth: d.getMonth() === viewDate.value.getMonth() })
  }
  return days
})

const monthLabel = computed(() =>
  viewDate.value.toLocaleDateString(locale.value, { month: 'long', year: 'numeric' }),
)

const weekdayLabels = computed(() => {
  // Sunday-first to match the grid.
  const base = new Date(2024, 5, 2) // a Sunday
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d.toLocaleDateString(locale.value, { weekday: 'narrow' })
  })
})

const today = new Date()
const parsedStart = computed(() => parse(props.startDate))
const parsedDue = computed(() => parse(props.dueDate))

function dayClasses(d: Date, inMonth: boolean): string[] {
  const classes: string[] = [
    'h-8 w-8 rounded-full text-xs font-semibold transition flex items-center justify-center',
  ]
  if (!inMonth) classes.push('text-slate-300 dark:text-slate-600')
  else classes.push('text-app hover:bg-slate-100 dark:hover:bg-slate-700')

  const isStart = parsedStart.value && sameDay(parsedStart.value, d)
  const isDue = parsedDue.value && sameDay(parsedDue.value, d)

  // In-range fill for the span between start and due.
  if (parsedStart.value && parsedDue.value) {
    if (d > parsedStart.value && d < parsedDue.value && inMonth) {
      classes.push('!bg-brand-100 dark:!bg-brand-900/40 rounded-none')
    }
  }

  if (isStart && isDue) {
    classes.push('!bg-brand-500 !text-white')
  } else if (isStart) {
    classes.push('!bg-emerald-500 !text-white')
  } else if (isDue) {
    classes.push('!bg-brand-500 !text-white')
  } else if (sameDay(today, d) && inMonth) {
    classes.push('ring-2 ring-brand-300 dark:ring-brand-600')
  }
  return classes
}

function prevMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
}
function nextMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
}

function pick(d: Date) {
  const iso = toISO(d)
  if (active.value === 'start') {
    emit('update:startDate', iso)
    // If due is before start, bump it.
    if (parsedDue.value && parsedDue.value < d) emit('update:dueDate', iso)
    // After picking start, auto-switch to due.
    active.value = 'due'
  } else {
    emit('update:dueDate', iso)
    if (parsedStart.value && parsedStart.value > d) emit('update:startDate', iso)
  }
}

function clearStart() {
  emit('update:startDate', null)
}
function clearDue() {
  emit('update:dueDate', null)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Header: prev / month / next -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="w-7 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-muted"
        @click="prevMonth"
      >
        <font-awesome-icon icon="fa-solid fa-chevron-left" class="w-3 h-3" />
      </button>
      <p class="flex-1 text-center text-sm font-semibold text-app capitalize">{{ monthLabel }}</p>
      <button
        type="button"
        class="w-7 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-muted"
        @click="nextMonth"
      >
        <font-awesome-icon icon="fa-solid fa-chevron-right" class="w-3 h-3" />
      </button>
    </div>

    <!-- Start / Due toggle -->
    <div class="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        class="px-2 py-1.5 rounded-lg text-[11px] font-semibold transition flex flex-col items-center"
        :class="
          active === 'start'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-300'
            : 'bg-slate-50 dark:bg-slate-800 text-muted hover:bg-slate-100'
        "
        @click="active = 'start'"
      >
        <span class="uppercase tracking-wide text-[10px]">Start</span>
        <span class="text-app font-bold">
          {{ parsedStart ? parsedStart.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) : '—' }}
        </span>
      </button>
      <button
        type="button"
        class="px-2 py-1.5 rounded-lg text-[11px] font-semibold transition flex flex-col items-center"
        :class="
          active === 'due'
            ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 ring-1 ring-brand-300'
            : 'bg-slate-50 dark:bg-slate-800 text-muted hover:bg-slate-100'
        "
        @click="active = 'due'"
      >
        <span class="uppercase tracking-wide text-[10px]">Due</span>
        <span class="text-app font-bold">
          {{ parsedDue ? parsedDue.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) : '—' }}
        </span>
      </button>
    </div>

    <!-- Weekday headers -->
    <div class="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-subtle uppercase">
      <span v-for="w in weekdayLabels" :key="w">{{ w }}</span>
    </div>

    <!-- Days -->
    <div class="grid grid-cols-7 gap-0.5 justify-items-center">
      <button
        v-for="(cell, i) in monthGrid"
        :key="i"
        type="button"
        :class="dayClasses(cell.date, cell.inMonth)"
        @click="pick(cell.date)"
      >
        {{ cell.date.getDate() }}
      </button>
    </div>

    <!-- Clear buttons -->
    <div class="flex gap-2 text-xs">
      <button
        v-if="parsedStart"
        class="flex-1 px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-muted hover:bg-slate-200 dark:hover:bg-slate-700"
        @click="clearStart"
      >
        Clear start
      </button>
      <button
        v-if="parsedDue"
        class="flex-1 px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-muted hover:bg-slate-200 dark:hover:bg-slate-700"
        @click="clearDue"
      >
        Clear due
      </button>
    </div>
  </div>
</template>
