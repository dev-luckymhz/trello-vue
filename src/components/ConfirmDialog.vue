<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Modal from './Modal.vue'

defineProps<{
  open: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  tone?: 'danger' | 'primary'
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
</script>

<template>
  <Modal :open="open" :title="title ?? t('common.confirm')" width="440px" @close="emit('cancel')">
    <p class="text-sm text-muted leading-relaxed">
      {{ message }}
    </p>
    <template #footer>
      <button class="btn-ghost" @click="emit('cancel')">
        {{ cancelText ?? t('common.cancel') }}
      </button>
      <button
        :class="tone === 'danger' ? 'btn-danger' : 'btn-primary'"
        @click="emit('confirm')"
      >
        {{ confirmText ?? t('common.confirm') }}
      </button>
    </template>
  </Modal>
</template>
