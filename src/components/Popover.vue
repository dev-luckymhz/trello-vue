<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    /** The element the popover is anchored to. Pass the trigger's DOM ref. */
    anchor?: HTMLElement | null
    title?: string
    width?: string
    /** `top` / `bottom` / `auto`. Default auto flips based on viewport. */
    placement?: 'auto' | 'top' | 'bottom' | 'right' | 'left'
  }>(),
  { width: '320px', placement: 'auto' },
)

const emit = defineEmits<{ (e: 'close'): void }>()

const panel = ref<HTMLDivElement | null>(null)
const position = ref<{ top: number; left: number; placement: 'top' | 'bottom' }>({
  top: 0,
  left: 0,
  placement: 'bottom',
})

function recompute() {
  const anchor = props.anchor
  if (!anchor || !panel.value) return
  const r = anchor.getBoundingClientRect()
  const panelRect = panel.value.getBoundingClientRect()
  const margin = 8
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Prefer bottom. Flip to top if overflow.
  let placement: 'top' | 'bottom' = 'bottom'
  let top = r.bottom + margin
  if (
    (props.placement === 'top' || (props.placement === 'auto' && top + panelRect.height > vh - 8))
    && r.top - panelRect.height - margin > 8
  ) {
    placement = 'top'
    top = r.top - panelRect.height - margin
  }

  // Try to align left edge with anchor, but keep in-viewport.
  let left = r.left
  if (left + panelRect.width > vw - 8) left = vw - panelRect.width - 8
  if (left < 8) left = 8
  position.value = { top, left, placement }
}

function onOutsideClick(event: MouseEvent) {
  if (!props.open) return
  const target = event.target as Node
  if (panel.value?.contains(target)) return
  if (props.anchor?.contains(target)) return
  emit('close')
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) emit('close')
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    await nextTick()
    recompute()
    window.addEventListener('resize', recompute)
    window.addEventListener('scroll', recompute, true)
    document.addEventListener('mousedown', onOutsideClick)
    document.addEventListener('keydown', onKey)
  },
)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) return
    window.removeEventListener('resize', recompute)
    window.removeEventListener('scroll', recompute, true)
    document.removeEventListener('mousedown', onOutsideClick)
    document.removeEventListener('keydown', onKey)
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', recompute)
  window.removeEventListener('scroll', recompute, true)
  document.removeEventListener('mousedown', onOutsideClick)
  document.removeEventListener('keydown', onKey)
})

const style = computed(() => ({
  top: position.value.top + 'px',
  left: position.value.left + 'px',
  width: props.width,
}))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-from-class="opacity-0 translate-y-1"
      enter-active-class="transition ease-out duration-150"
      enter-to-class="opacity-100 translate-y-0"
      leave-from-class="opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        ref="panel"
        class="fixed z-[70] bg-white dark:bg-slate-900 rounded-xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden"
        :style="style"
      >
        <header
          v-if="title"
          class="flex items-center px-3 py-2 border-b divider"
        >
          <p class="flex-1 text-center text-xs font-semibold text-muted uppercase tracking-wide">
            {{ title }}
          </p>
          <button
            type="button"
            class="text-subtle hover:text-app w-6 h-6 rounded inline-flex items-center justify-center"
            @click="emit('close')"
          >
            <font-awesome-icon icon="fa-solid fa-xmark" class="w-3 h-3" />
          </button>
        </header>
        <div class="p-3 max-h-[70vh] overflow-y-auto">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
