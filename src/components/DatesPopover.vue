<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Popover from './Popover.vue'
import DatePickerCalendar from './DatePickerCalendar.vue'

defineProps<{
  open: boolean
  anchor: HTMLElement | null
  startDate: string | null
  dueDate: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:startDate', value: string | null): void
  (e: 'update:dueDate', value: string | null): void
}>()

const { t } = useI18n()
</script>

<template>
  <Popover :open="open" :anchor="anchor" :title="t('taskModal.sidebarDates')" width="320px" @close="emit('close')">
    <DatePickerCalendar
      :start-date="startDate"
      :due-date="dueDate"
      @update:start-date="emit('update:startDate', $event)"
      @update:due-date="emit('update:dueDate', $event)"
    />
    <div class="flex justify-end mt-3">
      <button type="button" class="btn-primary text-sm" @click="emit('close')">
        {{ t('common.done') }}
      </button>
    </div>
  </Popover>
</template>
