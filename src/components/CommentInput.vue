<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usersService, type UserSearchResult } from '@/services/users.service'

const props = withDefaults(
  defineProps<{
    initialBody?: string
    initialMentions?: UserSearchResult[]
    members?: UserSearchResult[]
    submitLabel?: string
    placeholder?: string
  }>(),
  {
    initialBody: '',
    initialMentions: () => [],
    members: () => [],
    submitLabel: '',
    placeholder: '',
  },
)

const emit = defineEmits<{
  (e: 'submit', payload: { body: string; mentionedUserIds: string[] }): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

const textarea = ref<HTMLTextAreaElement | null>(null)
const body = ref(props.initialBody)
const mentioned = ref<Map<string, UserSearchResult>>(
  new Map(props.initialMentions.map((u) => [u.id, u])),
)

const query = ref('')
const showPicker = ref(false)
const searchResults = ref<UserSearchResult[]>([])
const mentionStart = ref(-1)
let debounceHandle: ReturnType<typeof setTimeout> | null = null

const pickerSuggestions = computed(() => {
  const q = query.value.trim().toLowerCase()
  const pool = [...props.members, ...searchResults.value]
  const dedup = new Map(pool.map((u) => [u.id, u]))
  return Array.from(dedup.values())
    .filter((u) =>
      !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
    .slice(0, 6)
})

function onInput(event: Event) {
  const el = event.target as HTMLTextAreaElement
  body.value = el.value
  const caret = el.selectionStart ?? 0
  const before = el.value.slice(0, caret)
  const match = /(^|\s)@([A-Za-z0-9._-]*)$/.exec(before)
  if (match) {
    mentionStart.value = caret - match[2].length - 1
    query.value = match[2]
    showPicker.value = true
    triggerSearch(match[2])
  } else {
    showPicker.value = false
    mentionStart.value = -1
  }
}

function triggerSearch(q: string) {
  if (debounceHandle) clearTimeout(debounceHandle)
  if (q.trim().length < 3) {
    searchResults.value = []
    return
  }
  debounceHandle = setTimeout(async () => {
    try {
      searchResults.value = await usersService.search(q.trim())
    } catch {
      searchResults.value = []
    }
  }, 220)
}

async function pick(user: UserSearchResult) {
  const el = textarea.value
  if (!el) return
  const caret = el.selectionStart ?? 0
  const before = body.value.slice(0, mentionStart.value)
  const after = body.value.slice(caret)
  const insert = `@${user.name} `
  body.value = before + insert + after
  mentioned.value.set(user.id, user)
  showPicker.value = false
  mentionStart.value = -1
  await nextTick()
  const pos = (before + insert).length
  el.focus()
  el.setSelectionRange(pos, pos)
}

function submit() {
  const trimmed = body.value.trim()
  if (!trimmed) return
  // Only keep mentions that actually appear in the body.
  const kept: string[] = []
  mentioned.value.forEach((u) => {
    if (body.value.includes(`@${u.name}`)) kept.push(u.id)
  })
  emit('submit', { body: trimmed, mentionedUserIds: kept })
  body.value = ''
  mentioned.value.clear()
}

function cancel() {
  body.value = ''
  mentioned.value.clear()
  emit('cancel')
}

function onKey(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <div class="relative">
    <textarea
      ref="textarea"
      :value="body"
      class="input resize-none w-full"
      rows="3"
      :placeholder="placeholder || t('taskModal.commentPlaceholder')"
      @input="onInput"
      @keydown="onKey"
    />

    <div
      v-if="showPicker && pickerSuggestions.length > 0"
      class="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border divider rounded-lg shadow-lg max-h-60 overflow-y-auto"
    >
      <button
        v-for="user in pickerSuggestions"
        :key="user.id"
        type="button"
        class="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
        @mousedown.prevent="pick(user)"
      >
        <div class="w-6 h-6 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-bold">
          {{ user.name[0]?.toUpperCase() }}
        </div>
        <div class="min-w-0">
          <p class="font-medium text-app truncate">{{ user.name }}</p>
          <p class="text-xs text-muted truncate">{{ user.email }}</p>
        </div>
      </button>
    </div>

    <div class="flex justify-end gap-2 mt-2">
      <button type="button" class="btn-ghost text-sm" @click="cancel">
        {{ t('common.cancel') }}
      </button>
      <button
        type="button"
        class="btn-primary text-sm"
        :disabled="!body.trim()"
        @click="submit"
      >
        {{ submitLabel || t('common.post') }}
      </button>
    </div>
  </div>
</template>
