<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Popover from './Popover.vue'

const props = defineProps<{
  open: boolean
  anchor: HTMLElement | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', title: string): void
}>()

const { t } = useI18n()
const title = ref('')

watch(
  () => props.open,
  (v) => {
    if (v) title.value = 'Checklist'
  },
)

function submit() {
  const v = title.value.trim()
  if (!v) return
  emit('submit', v)
  emit('close')
}
</script>

<template>
  <Popover :open="open" :anchor="anchor" :title="t('taskModal.sidebarChecklist')" width="300px" @close="emit('close')">
    <div class="space-y-3">
      <div>
        <label class="label text-xs">Title</label>
        <input
          v-model="title"
          type="text"
          maxlength="160"
          class="input text-sm"
          autofocus
          @keydown.enter.prevent="submit"
        />
      </div>
      <div class="flex justify-end">
        <button
          type="button"
          class="btn-primary text-sm"
          :disabled="!title.trim()"
          @click="submit"
        >
          {{ t('common.add') }}
        </button>
      </div>
    </div>
  </Popover>
</template>
