<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Priority, Task } from '@/types'
import Modal from './Modal.vue'

const props = defineProps<{
  open: boolean
  task?: Task | null
  priorities: Priority[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'save',
    payload: {
      title: string
      description: string
      dueDate: string | null
      priorityId: string | null
    },
  ): void
}>()

const { t } = useI18n()

const form = reactive({
  title: '',
  description: '',
  dueDate: '',
  priorityId: '' as string,
})

const sortedPriorities = computed(() =>
  [...props.priorities].sort((a, b) => a.rank - b.rank),
)

function defaultPriority(): string {
  const medium = props.priorities.find((p) => p.name.toLowerCase() === 'medium')
  if (medium) return medium.id
  return props.priorities[0]?.id ?? ''
}

watch(
  () => [props.open, props.task, props.priorities],
  () => {
    if (!props.open) return
    form.title = props.task?.title ?? ''
    form.description = props.task?.description ?? ''
    form.dueDate = props.task?.dueDate ?? ''
    form.priorityId = props.task?.priorityId ?? defaultPriority()
  },
  { immediate: true },
)

function onSave() {
  if (!form.title.trim()) return
  emit('save', {
    title: form.title,
    description: form.description,
    dueDate: form.dueDate ? form.dueDate : null,
    priorityId: form.priorityId || null,
  })
}
</script>

<template>
  <Modal
    :open="open"
    :title="task ? t('board.editTask') : t('board.newTask')"
    width="560px"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent="onSave">
      <div>
        <label class="label">{{ t('board.fieldTitle') }}</label>
        <input
          v-model="form.title"
          type="text"
          :placeholder="t('board.titlePlaceholder')"
          autofocus
          class="input"
        />
      </div>

      <div>
        <label class="label">{{ t('board.fieldDescription') }}</label>
        <textarea
          v-model="form.description"
          rows="3"
          :placeholder="t('board.descriptionPlaceholder')"
          class="input resize-none"
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">{{ t('board.fieldDueDate') }}</label>
          <input v-model="form.dueDate" type="date" class="input" />
        </div>

        <div>
          <label class="label">{{ t('board.fieldPriority') }}</label>
          <select v-model="form.priorityId" class="select">
            <option value="">{{ t('common.none') }}</option>
            <option v-for="option in sortedPriorities" :key="option.id" :value="option.id">
              {{ option.name }}
            </option>
          </select>
        </div>
      </div>
    </form>

    <template #footer>
      <button class="btn-ghost" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button class="btn-primary" :disabled="!form.title.trim()" @click="onSave">
        {{ task ? t('common.saveChanges') : t('common.create') }}
      </button>
    </template>
  </Modal>
</template>
