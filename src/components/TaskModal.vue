<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Priority, Task } from '@/types'
import Modal from './Modal.vue'
import TaskDetailPanel from './TaskDetailPanel.vue'
import type { TaskState } from '@/types'

defineProps<{
  open: boolean
  task?: Task | null
  priorities: Priority[]
  projectId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'create',
    payload: {
      title: string
      shortDescription: string | null
      longDescription: string | null
      description: string | null
      state: TaskState
      startDate: string | null
      dueDate: string | null
      estimatedCompletionDate: string | null
      coverColor: string | null
      coverImageUrl: string | null
      priorityId: string | null
      estimatedHours: number | null
      assigneeIds: string[]
      watcherIds: string[]
      tagIds: string[]
    },
  ): void
  (e: 'updated', task: Task): void
  (e: 'deleted', taskId: string): void
}>()

const { t } = useI18n()

const panelRef = ref<InstanceType<typeof TaskDetailPanel> | null>(null)

const canSave = computed(() => {
  const exposed = panelRef.value as unknown as
    | { canSave?: { value: boolean } }
    | null
  return exposed?.canSave?.value ?? false
})

function triggerSave() {
  const exposed = panelRef.value as unknown as { onSave?: () => void } | null
  exposed?.onSave?.()
}
</script>

<template>
  <Modal
    :open="open"
    :title="''"
    width="780px"
    @close="emit('close')"
  >
    <!-- `v-if` ensures the panel fully unmounts between opens so stale state
         doesn't leak across different tasks. -->
    <TaskDetailPanel
      v-if="open"
      ref="panelRef"
      :task="task ?? null"
      :priorities="priorities"
      :project-id="projectId"
      variant="modal"
      :show-open-in-page="true"
      @close="emit('close')"
      @create="(p) => emit('create', p)"
      @updated="(task2) => emit('updated', task2)"
      @deleted="(id) => emit('deleted', id)"
    />

    <template #footer>
      <button class="btn-ghost" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button class="btn-primary" :disabled="!canSave" @click="triggerSave">
        {{ task ? t('common.saveChanges') : t('common.create') }}
      </button>
    </template>
  </Modal>
</template>
