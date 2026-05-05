<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Popover from './Popover.vue'

defineProps<{
  open: boolean
  anchor: HTMLElement | null
  coverColor: string | null
  coverImageUrl: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:coverColor', value: string | null): void
  (e: 'update:coverImageUrl', value: string | null): void
}>()

const { t } = useI18n()

const COVERS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
]
</script>

<template>
  <Popover :open="open" :anchor="anchor" :title="t('taskModal.sidebarCover')" width="300px" @close="emit('close')">
    <div class="space-y-3">
      <div>
        <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1.5">Colors</p>
        <div class="grid grid-cols-5 gap-1.5">
          <button
            v-for="c in COVERS"
            :key="c"
            type="button"
            class="h-10 rounded-lg border-2 transition"
            :style="{ backgroundColor: c }"
            :class="coverColor === c ? 'border-slate-900 dark:border-white scale-105' : 'border-transparent hover:scale-105'"
            @click="emit('update:coverColor', coverColor === c ? null : c)"
          />
          <button
            type="button"
            class="h-10 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 inline-flex items-center justify-center text-slate-400 hover:border-slate-400"
            :title="t('common.none')"
            @click="emit('update:coverColor', null)"
          >
            <font-awesome-icon icon="fa-solid fa-xmark" class="w-3 h-3" />
          </button>
        </div>
      </div>
      <div>
        <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1.5">Image URL</p>
        <input
          :value="coverImageUrl ?? ''"
          type="url"
          class="input text-sm"
          :placeholder="t('taskModal.coverImagePlaceholder')"
          @change="emit('update:coverImageUrl', ($event.target as HTMLInputElement).value || null)"
        />
      </div>
    </div>
  </Popover>
</template>
