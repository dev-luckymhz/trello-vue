<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Tag } from '@/types'
import Popover from './Popover.vue'

const props = defineProps<{
  open: boolean
  anchor: HTMLElement | null
  /** Currently attached labels on the task. */
  selected: Tag[]
  /** Known pool of labels for the project/org. */
  suggestions: Tag[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'attach', tag: Tag): void
  (e: 'detach', tag: Tag): void
  (e: 'create', payload: { name: string; color: string }): void
}>()

const { t } = useI18n()

const LABEL_COLORS = [
  '#b6bbbf', // gray
  '#61bd4f', // green
  '#f2d600', // yellow
  '#ff9f1a', // orange
  '#eb5a46', // red
  '#c377e0', // purple
  '#0079bf', // blue
  '#00c2e0', // sky
  '#51e898', // lime
  '#ff78cb', // pink
  '#344563', // slate
]

const query = ref('')
const creating = ref(false)
const newName = ref('')
const newColor = ref<string>(LABEL_COLORS[1])

const selectedIds = computed(() => new Set(props.selected.map((t) => t.id)))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.suggestions
    .filter((tag) => !q || tag.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
})

function toggle(tag: Tag) {
  if (selectedIds.value.has(tag.id)) emit('detach', tag)
  else emit('attach', tag)
}

function doCreate() {
  const name = newName.value.trim()
  if (!name) return
  emit('create', { name, color: newColor.value })
  newName.value = ''
  creating.value = false
}
</script>

<template>
  <Popover :open="open" :anchor="anchor" :title="t('taskModal.sidebarLabels')" width="320px" @close="emit('close')">
    <div class="space-y-3">
      <input
        v-model="query"
        type="text"
        class="input text-sm"
        placeholder="Search labels…"
      />

      <ul class="space-y-1 max-h-64 overflow-y-auto">
        <li v-for="tag in filtered" :key="tag.id">
          <button
            type="button"
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            @click="toggle(tag)"
          >
            <span
              class="flex-1 h-7 rounded-md flex items-center px-2 text-xs font-semibold text-white"
              :style="{ backgroundColor: tag.color ?? '#64748b' }"
            >
              {{ tag.name }}
            </span>
            <font-awesome-icon
              v-if="selectedIds.has(tag.id)"
              icon="fa-solid fa-check"
              class="w-3.5 h-3.5 text-brand-500"
            />
          </button>
        </li>
        <li v-if="filtered.length === 0" class="text-xs text-subtle text-center py-2">
          No labels match.
        </li>
      </ul>

      <div v-if="creating" class="pt-2 border-t divider space-y-2">
        <input
          v-model="newName"
          type="text"
          maxlength="80"
          class="input text-sm"
          placeholder="Label name"
          autofocus
          @keydown.enter.prevent="doCreate"
        />
        <div>
          <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1.5">
            Color
          </p>
          <div class="grid grid-cols-6 gap-1.5">
            <button
              v-for="c in LABEL_COLORS"
              :key="c"
              type="button"
              class="h-7 rounded-md transition ring-offset-1 ring-offset-white dark:ring-offset-slate-900"
              :style="{ backgroundColor: c }"
              :class="newColor === c ? 'ring-2 ring-brand-500 scale-105' : 'hover:scale-105'"
              @click="newColor = c"
            />
          </div>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn-ghost text-sm flex-1"
            @click="creating = false"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="btn-primary text-sm flex-1"
            :disabled="!newName.trim()"
            @click="doCreate"
          >
            {{ t('common.create') }}
          </button>
        </div>
      </div>

      <button
        v-else
        type="button"
        class="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-app hover:bg-slate-200 dark:hover:bg-slate-700 transition inline-flex items-center justify-center gap-1.5"
        @click="creating = true"
      >
        <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
        Create new label
      </button>
    </div>
  </Popover>
</template>
