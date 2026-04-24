<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  open: boolean
  title?: string
  width?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

watch(
  () => props.open,
  (value) => {
    document.body.style.overflow = value ? 'hidden' : ''
  },
)
</script>

<template>
  <Teleport to="body">
    <transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div
          class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-700"
          :style="{ maxWidth: width ?? '520px' }"
        >
          <div
            v-if="title"
            class="flex items-center justify-between px-6 py-4 border-b divider"
          >
            <h3 class="text-lg font-semibold text-app">{{ title }}</h3>
            <button
              class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              @click="emit('close')"
              :aria-label="t('common.close')"
            >
              <font-awesome-icon icon="fa-solid fa-xmark" class="w-5 h-5" />
            </button>
          </div>
          <div class="p-6">
            <slot />
          </div>
          <div
            v-if="$slots.footer"
            class="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t divider flex justify-end gap-2"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 150ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 150ms ease;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: translateY(8px) scale(0.98);
}
</style>
