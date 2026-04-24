<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Priority, Task } from '@/types'

const props = defineProps<{
  task: Task
  priorities?: Priority[]
  readonly?: boolean
  canEdit?: boolean
  canDelete?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', task: Task): void
  (e: 'delete', taskId: string): void
}>()

const { t, locale } = useI18n()

function formattedDate(date: string | null): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
}

const priority = computed<Priority | null>(() => {
  if (!props.task.priorityId) return null
  return props.priorities?.find((p) => p.id === props.task.priorityId) ?? null
})

const priorityLabel = computed(() => {
  if (priority.value) return priority.value.name
  const v = props.task.importance
  return v.charAt(0) + v.slice(1).toLowerCase()
})

const priorityStyle = computed(() => {
  const color = priority.value?.color ?? fallbackColor(props.task.importance)
  return {
    backgroundColor: `${color}20`,
    color,
    borderColor: `${color}40`,
  }
})

function fallbackColor(importance: string): string {
  switch (importance) {
    case 'URGENT':
      return '#ea580c'
    case 'HIGH':
      return '#d97706'
    case 'MEDIUM':
      return '#2563eb'
    case 'LOW':
      return '#64748b'
    default:
      return '#64748b'
  }
}

function initials(name: string | undefined): string {
  const v = (name ?? '?').trim()
  return (
    v
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || '?'
  )
}

const assignees = computed(() => props.task.assignees ?? [])
const tags = computed(() =>
  (props.task.taskTags ?? []).map((tt) => tt.tag).filter((tg): tg is NonNullable<typeof tg> => Boolean(tg)),
)
</script>

<template>
  <div
    class="group bg-white dark:bg-slate-900 rounded-xl border divider shadow-sm hover:shadow-md hover:border-brand-200 dark:hover:border-brand-600 transition overflow-hidden"
    :class="readonly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'"
    @dblclick="!readonly && canEdit && emit('edit', task)"
  >
    <div
      v-if="task.coverImageUrl"
      class="h-16 bg-cover bg-center"
      :style="{ backgroundImage: `url(${task.coverImageUrl})` }"
    />
    <div
      v-else-if="task.coverColor"
      class="h-8"
      :style="{ backgroundColor: task.coverColor }"
    />

    <div class="p-3">
      <!-- tags -->
      <div v-if="tags.length" class="flex flex-wrap gap-1 mb-2">
        <span
          v-for="tag in tags"
          :key="tag.id"
          class="inline-flex items-center px-1.5 h-4 rounded text-[10px] font-semibold"
          :style="{
            backgroundColor: (tag.color ?? '#64748b') + '26',
            color: tag.color ?? '#334155',
          }"
        >
          {{ tag.name }}
        </span>
      </div>

      <div class="flex items-start justify-between gap-2">
        <p class="text-sm font-semibold text-app leading-snug">{{ task.title }}</p>
        <div
          v-if="canEdit || canDelete"
          class="flex items-center opacity-0 group-hover:opacity-100 transition shrink-0"
        >
          <button
            v-if="canEdit"
            class="text-subtle hover:text-brand-600 dark:hover:text-brand-400 p-1 rounded"
            @click.stop="emit('edit', task)"
            :aria-label="t('common.edit')"
          >
            <font-awesome-icon icon="fa-solid fa-pencil" class="w-3.5 h-3.5" />
          </button>
          <button
            v-if="canDelete"
            class="text-subtle hover:text-red-500 p-1 rounded"
            @click.stop="emit('delete', task.id)"
            :aria-label="t('common.delete')"
          >
            <font-awesome-icon icon="fa-solid fa-trash" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p
        v-if="task.shortDescription || task.description"
        class="mt-1.5 text-xs text-muted line-clamp-2 leading-relaxed"
      >
        {{ task.shortDescription || task.description }}
      </p>

      <div class="flex items-center justify-between mt-3 gap-2 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <span
            class="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[11px] font-semibold border"
            :style="priorityStyle"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
            {{ priorityLabel }}
          </span>
          <span
            v-if="task.dueDate"
            class="inline-flex items-center gap-1 text-[11px] text-subtle"
          >
            <font-awesome-icon icon="fa-solid fa-calendar-day" class="w-2.5 h-2.5" />
            {{ formattedDate(task.dueDate) }}
          </span>
        </div>

        <div v-if="assignees.length" class="flex -space-x-1.5">
          <span
            v-for="(a, idx) in assignees.slice(0, 3)"
            :key="a.id"
            class="w-6 h-6 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900"
            :title="a.user?.name ?? ''"
            :style="{ zIndex: 10 - idx }"
          >
            {{ initials(a.user?.name) }}
          </span>
          <span
            v-if="assignees.length > 3"
            class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-app text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900"
          >
            +{{ assignees.length - 3 }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
