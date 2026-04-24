<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usersService, type UserSearchResult } from '@/services/users.service'

const props = defineProps<{
  modelValue: UserSearchResult[]
  disabled?: boolean
  placeholder?: string
  /** Optional pool to show in dropdown without needing a search (e.g. project members). */
  suggestions?: UserSearchResult[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: UserSearchResult[]): void
  (e: 'add', user: UserSearchResult): void
  (e: 'remove', user: UserSearchResult): void
}>()

const { t } = useI18n()

const query = ref('')
const results = ref<UserSearchResult[]>([])
const showList = ref(false)
const searching = ref(false)
let debounceHandle: ReturnType<typeof setTimeout> | null = null
const MIN = 3

const selectedIds = computed(() => new Set(props.modelValue.map((u) => u.id)))

const localSuggestions = computed(() => {
  const q = query.value.trim().toLowerCase()
  const pool = props.suggestions ?? []
  return pool
    .filter((u) => !selectedIds.value.has(u.id))
    .filter((u) =>
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    )
    .slice(0, 8)
})

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  query.value = value
  showList.value = true

  if (debounceHandle) clearTimeout(debounceHandle)
  const trimmed = value.trim()
  if (trimmed.length < MIN) {
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  debounceHandle = setTimeout(() => void runSearch(trimmed), 220)
}

async function runSearch(value: string) {
  try {
    const data = await usersService.search(value)
    if (value !== query.value.trim()) return
    results.value = data.filter((u) => !selectedIds.value.has(u.id))
  } catch {
    results.value = []
  } finally {
    searching.value = false
  }
}

function add(user: UserSearchResult) {
  if (selectedIds.value.has(user.id)) return
  const next = [...props.modelValue, user]
  emit('update:modelValue', next)
  emit('add', user)
  query.value = ''
  results.value = []
  showList.value = false
}

function remove(user: UserSearchResult) {
  const next = props.modelValue.filter((u) => u.id !== user.id)
  emit('update:modelValue', next)
  emit('remove', user)
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || '?'
  )
}
</script>

<template>
  <div class="relative" @click.stop>
    <div
      class="input flex flex-wrap gap-1.5 items-center min-h-[38px] cursor-text"
      :class="disabled ? 'opacity-60 cursor-not-allowed' : ''"
      @click="!disabled && (showList = true)"
    >
      <span
        v-for="user in modelValue"
        :key="user.id"
        class="inline-flex items-center gap-1.5 pl-1 pr-2 h-6 rounded-full text-[11px] font-semibold bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300"
      >
        <span
          class="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[9px] font-bold"
        >
          {{ initials(user.name) }}
        </span>
        {{ user.name }}
        <button
          v-if="!disabled"
          type="button"
          class="text-current opacity-70 hover:opacity-100"
          @click.stop="remove(user)"
          aria-label="Remove"
        >
          <font-awesome-icon icon="fa-solid fa-xmark" class="w-2.5 h-2.5" />
        </button>
      </span>
      <input
        :value="query"
        type="text"
        class="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
        :placeholder="modelValue.length === 0 ? placeholder ?? t('users.searchPlaceholder') : ''"
        :disabled="disabled"
        @input="onInput"
        @focus="showList = true"
      />
    </div>

    <div
      v-if="showList && !disabled && (localSuggestions.length > 0 || results.length > 0)"
      class="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border divider rounded-lg shadow-lg max-h-64 overflow-y-auto"
    >
      <button
        v-for="user in localSuggestions"
        :key="'s-' + user.id"
        type="button"
        class="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"
        @mousedown.prevent="add(user)"
      >
        <div
          class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-app flex items-center justify-center text-[11px] font-semibold"
        >
          {{ initials(user.name) }}
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-app truncate">{{ user.name }}</p>
          <p class="text-xs text-muted truncate">{{ user.email }}</p>
        </div>
      </button>
      <button
        v-for="user in results"
        :key="'r-' + user.id"
        type="button"
        class="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 border-t divider"
        @mousedown.prevent="add(user)"
      >
        <div
          class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-app flex items-center justify-center text-[11px] font-semibold"
        >
          {{ initials(user.name) }}
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-app truncate">{{ user.name }}</p>
          <p class="text-xs text-muted truncate">{{ user.email }}</p>
        </div>
      </button>
    </div>
    <p v-if="searching" class="text-xs text-subtle mt-1">{{ t('common.loading') }}</p>
  </div>
</template>
