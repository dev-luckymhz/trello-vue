<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Popover from './Popover.vue'
import { usersService, type UserSearchResult } from '@/services/users.service'

const props = defineProps<{
  open: boolean
  anchor: HTMLElement | null
  selected: UserSearchResult[]
  suggestions: UserSearchResult[]
  /** Optional title override. Lets the same popover be reused for watchers. */
  title?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add', user: UserSearchResult): void
  (e: 'remove', user: UserSearchResult): void
}>()

const { t } = useI18n()

const query = ref('')
const searching = ref(false)
const searchResults = ref<UserSearchResult[]>([])
let debounce: ReturnType<typeof setTimeout> | null = null

const selectedIds = computed(() => new Set(props.selected.map((u) => u.id)))

const projectMatches = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.suggestions
    .filter((u) =>
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    )
    .slice(0, 8)
})

const outsideMatches = computed(() => {
  const projectIds = new Set(props.suggestions.map((u) => u.id))
  return searchResults.value.filter((u) => !projectIds.has(u.id))
})

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  query.value = value
  if (debounce) clearTimeout(debounce)
  if (value.trim().length < 3) {
    searchResults.value = []
    return
  }
  searching.value = true
  debounce = setTimeout(async () => {
    try {
      searchResults.value = await usersService.search(value.trim())
    } catch {
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 220)
}

function toggle(user: UserSearchResult) {
  if (selectedIds.value.has(user.id)) emit('remove', user)
  else emit('add', user)
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || '?'
  )
}
</script>

<template>
  <Popover
    :open="open"
    :anchor="anchor"
    :title="title ?? t('taskModal.sidebarMembers')"
    width="320px"
    @close="emit('close')"
  >
    <div class="space-y-3">
      <input
        :value="query"
        type="text"
        class="input text-sm"
        :placeholder="t('users.searchPlaceholder')"
        @input="onInput"
      />

      <div v-if="selected.length">
        <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1.5">
          Assigned
        </p>
        <ul class="space-y-1">
          <li v-for="u in selected" :key="'sel-' + u.id">
            <button
              type="button"
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
              @click="toggle(u)"
            >
              <span class="w-7 h-7 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {{ initials(u.name) }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-app truncate">{{ u.name }}</p>
                <p class="text-[11px] text-subtle truncate">{{ u.email }}</p>
              </div>
              <font-awesome-icon icon="fa-solid fa-check" class="w-3.5 h-3.5 text-brand-500" />
            </button>
          </li>
        </ul>
      </div>

      <div v-if="projectMatches.length">
        <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1.5">
          Project members
        </p>
        <ul class="space-y-1">
          <li v-for="u in projectMatches" :key="'pm-' + u.id">
            <button
              type="button"
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
              @click="toggle(u)"
            >
              <span class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-app text-[10px] font-semibold flex items-center justify-center shrink-0">
                {{ initials(u.name) }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-app truncate">{{ u.name }}</p>
                <p class="text-[11px] text-subtle truncate">{{ u.email }}</p>
              </div>
              <font-awesome-icon
                v-if="selectedIds.has(u.id)"
                icon="fa-solid fa-check"
                class="w-3.5 h-3.5 text-brand-500"
              />
            </button>
          </li>
        </ul>
      </div>

      <div v-if="outsideMatches.length">
        <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1.5">
          Other users
        </p>
        <ul class="space-y-1">
          <li v-for="u in outsideMatches" :key="'o-' + u.id">
            <button
              type="button"
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
              @click="toggle(u)"
            >
              <span class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-app text-[10px] font-semibold flex items-center justify-center shrink-0">
                {{ initials(u.name) }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-app truncate">{{ u.name }}</p>
                <p class="text-[11px] text-subtle truncate">{{ u.email }}</p>
              </div>
              <font-awesome-icon
                v-if="selectedIds.has(u.id)"
                icon="fa-solid fa-check"
                class="w-3.5 h-3.5 text-brand-500"
              />
            </button>
          </li>
        </ul>
      </div>

      <p v-if="searching" class="text-xs text-subtle text-center">{{ t('common.loading') }}</p>
    </div>
  </Popover>
</template>
