<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Tag } from '@/types'

const props = defineProps<{
  modelValue: Tag[]
  /** Pool of already-known tags (from the org). Additional tags can be
   *  created inline and will be emitted via `create`. */
  suggestions: Tag[]
  /** When true, the caller will create new tags on the backend; otherwise
   *  the picker just emits `create` with a temporary shape. */
  canCreate?: boolean
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Tag[]): void
  /** Emitted when user asks to add an existing tag to the selection. */
  (e: 'attach', tag: Tag): void
  /** Emitted when user types a new name + confirms. The parent should call
   *  the backend to create the tag, then emit it back via `modelValue`. */
  (e: 'create', name: string): void
  /** Emitted when user removes an attached tag. */
  (e: 'detach', tag: Tag): void
}>()

const { t } = useI18n()

const query = ref('')
const open = ref(false)

const selectedIds = computed(() => new Set(props.modelValue.map((t) => t.id)))

const filteredSuggestions = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.suggestions
    .filter((tag) => !selectedIds.value.has(tag.id))
    .filter((tag) => !q || tag.name.toLowerCase().includes(q))
    .slice(0, 8)
})

const exactMatchExists = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return false
  return props.suggestions.some((tag) => tag.name.toLowerCase() === q)
})

const showCreateRow = computed(
  () =>
    props.canCreate !== false &&
    query.value.trim().length > 0 &&
    !exactMatchExists.value,
)

function onAttach(tag: Tag) {
  if (selectedIds.value.has(tag.id)) return
  emit('attach', tag)
  query.value = ''
}

function onCreate() {
  const name = query.value.trim()
  if (!name) return
  emit('create', name)
  query.value = ''
}

function onDetach(tag: Tag) {
  emit('detach', tag)
}

function onEnter(event: KeyboardEvent) {
  event.preventDefault()
  if (filteredSuggestions.value.length > 0) {
    onAttach(filteredSuggestions.value[0])
  } else if (showCreateRow.value) {
    onCreate()
  }
}

watch(() => props.disabled, (value) => {
  if (value) open.value = false
})

function tagBg(tag: Tag): string {
  const color = tag.color ?? '#64748b'
  return `${color}26`
}
function tagFg(tag: Tag): string {
  return tag.color ?? '#334155'
}
</script>

<template>
  <div class="relative" @click.stop>
    <div
      class="input flex flex-wrap gap-1.5 items-center min-h-[38px] cursor-text"
      :class="disabled ? 'opacity-60 cursor-not-allowed' : ''"
      @click="!disabled && (open = true)"
    >
      <span
        v-for="tag in modelValue"
        :key="tag.id"
        class="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-semibold"
        :style="{ backgroundColor: tagBg(tag), color: tagFg(tag) }"
      >
        {{ tag.name }}
        <button
          v-if="!disabled"
          type="button"
          class="text-current opacity-60 hover:opacity-100"
          @click.stop="onDetach(tag)"
          aria-label="Remove tag"
        >
          <font-awesome-icon icon="fa-solid fa-xmark" class="w-2.5 h-2.5" />
        </button>
      </span>
      <input
        v-model="query"
        type="text"
        class="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
        :placeholder="modelValue.length === 0 ? placeholder ?? t('projectSettings.tagsHint') : ''"
        :disabled="disabled"
        @focus="open = true"
        @keydown.enter="onEnter"
        @keydown.esc="open = false"
      />
    </div>

    <div
      v-if="open && !disabled && (filteredSuggestions.length > 0 || showCreateRow)"
      class="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border divider rounded-lg shadow-lg max-h-64 overflow-y-auto z-30"
    >
      <button
        v-for="tag in filteredSuggestions"
        :key="tag.id"
        type="button"
        class="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
        @mousedown.prevent="onAttach(tag)"
      >
        <span
          class="inline-block w-2.5 h-2.5 rounded-full"
          :style="{ backgroundColor: tag.color ?? '#64748b' }"
        />
        <span class="text-app">{{ tag.name }}</span>
      </button>
      <button
        v-if="showCreateRow"
        type="button"
        class="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 border-t divider"
        @mousedown.prevent="onCreate"
      >
        <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3 text-brand-500" />
        <span class="text-app">
          {{ t('tags.create', { name: query.trim() }) }}
        </span>
      </button>
    </div>
  </div>
</template>
