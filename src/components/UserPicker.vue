<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usersService, type UserSearchResult } from '@/services/users.service'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  minChars?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  /** Fired when the user picks a suggestion from the dropdown — carries the
   *  full user record including the UUID. Consumers that need a real user id
   *  should listen to this rather than parsing `modelValue`. */
  (e: 'select', user: UserSearchResult): void
  /** Fired when the input is emptied. */
  (e: 'clear'): void
}>()

const { t } = useI18n()

const MIN = props.minChars ?? 3
const query = ref(props.modelValue)
const results = ref<UserSearchResult[]>([])
const showList = ref(false)
const searching = ref(false)
const touched = ref(false)
let debounceHandle: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.modelValue,
  (value) => {
    if (value !== query.value) query.value = value
  },
)

const tooShort = computed(() => touched.value && query.value.trim().length > 0 && query.value.trim().length < MIN)

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  query.value = value
  touched.value = true
  emit('update:modelValue', value)
  if (value.trim() === '') emit('clear')

  if (debounceHandle) clearTimeout(debounceHandle)

  const trimmed = value.trim()
  if (trimmed.length < MIN) {
    results.value = []
    searching.value = false
    showList.value = false
    return
  }

  searching.value = true
  debounceHandle = setTimeout(() => void runSearch(trimmed), 220)
}

async function runSearch(value: string) {
  try {
    const data = await usersService.search(value)
    if (value !== query.value.trim()) return
    results.value = data
    showList.value = data.length > 0
  } catch {
    results.value = []
    showList.value = false
  } finally {
    searching.value = false
  }
}

function select(user: UserSearchResult) {
  query.value = user.email
  emit('update:modelValue', user.email)
  emit('select', user)
  results.value = []
  showList.value = false
}

function onFocus() {
  if (results.value.length > 0 && query.value.trim().length >= MIN) {
    showList.value = true
  }
}

function onBlur() {
  setTimeout(() => (showList.value = false), 150)
}
</script>

<template>
  <div class="relative">
    <input
      :value="query"
      type="text"
      class="input"
      :placeholder="placeholder ?? t('admin.searchUsersPlaceholder')"
      autocomplete="off"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />

    <div
      v-if="showList && results.length > 0"
      class="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border divider rounded-lg shadow-lg max-h-64 overflow-y-auto"
    >
      <button
        v-for="user in results"
        :key="user.id"
        type="button"
        class="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-3"
        @mousedown.prevent="select(user)"
      >
        <div
          class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-app flex items-center justify-center text-xs font-semibold shrink-0"
        >
          {{ user.name?.[0]?.toUpperCase() ?? '?' }}
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-app truncate">{{ user.name }}</p>
          <p class="text-xs text-muted truncate">{{ user.email }}</p>
        </div>
      </button>
    </div>

    <p
      v-if="tooShort"
      class="text-xs text-subtle mt-1 inline-flex items-center gap-1"
    >
      <font-awesome-icon icon="fa-solid fa-circle-info" class="w-3 h-3" />
      {{ t('projectUsers.tooShort', { count: MIN }) }}
    </p>
    <p v-else-if="searching" class="text-xs text-subtle mt-1">{{ t('common.loading') }}</p>
  </div>
</template>
