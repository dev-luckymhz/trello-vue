<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    minHeight?: string
    disabled?: boolean
  }>(),
  { placeholder: '', minHeight: '140px', disabled: false },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editor = ref<HTMLDivElement | null>(null)
const focused = ref(false)

function exec(command: string, value?: string) {
  if (props.disabled) return
  editor.value?.focus()
  document.execCommand(command, false, value)
  sync()
}

function sync() {
  if (!editor.value) return
  emit('update:modelValue', editor.value.innerHTML)
}

function onLinkClick() {
  const url = prompt('Enter URL (include https://):')
  if (!url) return
  try {
    const safe = new URL(url)
    if (safe.protocol !== 'http:' && safe.protocol !== 'https:') return
    exec('createLink', safe.toString())
  } catch {
    /* ignore */
  }
}

function onClear() {
  exec('removeFormat')
}

function onPaste(event: ClipboardEvent) {
  // Strip formatting on paste — keep only plain text to avoid importing huge
  // external styles/images by accident.
  event.preventDefault()
  const text = event.clipboardData?.getData('text/plain') ?? ''
  document.execCommand('insertText', false, text)
}

onMounted(() => {
  if (editor.value && editor.value.innerHTML !== (props.modelValue ?? '')) {
    editor.value.innerHTML = props.modelValue ?? ''
  }
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return
    if (editor.value.innerHTML !== (value ?? '')) {
      editor.value.innerHTML = value ?? ''
    }
  },
)

const TOOLS: Array<{ icon: string; cmd: string; title: string; value?: string }> = [
  { icon: 'fa-solid fa-bold', cmd: 'bold', title: 'Bold' },
  { icon: 'fa-solid fa-italic', cmd: 'italic', title: 'Italic' },
  { icon: 'fa-solid fa-underline', cmd: 'underline', title: 'Underline' },
  { icon: 'fa-solid fa-strikethrough', cmd: 'strikeThrough', title: 'Strikethrough' },
  { icon: 'fa-solid fa-list-ul', cmd: 'insertUnorderedList', title: 'Bulleted list' },
  { icon: 'fa-solid fa-list-ol', cmd: 'insertOrderedList', title: 'Numbered list' },
  { icon: 'fa-solid fa-quote-right', cmd: 'formatBlock', title: 'Quote', value: 'blockquote' },
  { icon: 'fa-solid fa-code', cmd: 'formatBlock', title: 'Code block', value: 'pre' },
]
</script>

<template>
  <div
    class="border rounded-lg overflow-hidden transition"
    :class="[
      focused ? 'border-brand-400 ring-2 ring-brand-100 dark:ring-brand-900' : 'divider',
      disabled ? 'opacity-60' : '',
    ]"
  >
    <div
      class="flex items-center gap-0.5 px-2 py-1 bg-slate-50 dark:bg-slate-800/60 border-b divider flex-wrap"
    >
      <button
        v-for="tool in TOOLS"
        :key="tool.title"
        type="button"
        class="w-7 h-7 rounded text-muted hover:text-app hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center justify-center text-xs"
        :title="tool.title"
        :disabled="disabled"
        @mousedown.prevent="exec(tool.cmd, tool.value)"
      >
        <font-awesome-icon :icon="tool.icon" class="w-3 h-3" />
      </button>
      <div class="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
      <button
        type="button"
        class="w-7 h-7 rounded text-muted hover:text-app hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center justify-center text-xs"
        title="Link"
        :disabled="disabled"
        @mousedown.prevent="onLinkClick"
      >
        <font-awesome-icon icon="fa-solid fa-link" class="w-3 h-3" />
      </button>
      <button
        type="button"
        class="w-7 h-7 rounded text-muted hover:text-app hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center justify-center text-xs"
        title="Clear formatting"
        :disabled="disabled"
        @mousedown.prevent="onClear"
      >
        <font-awesome-icon icon="fa-solid fa-eraser" class="w-3 h-3" />
      </button>
    </div>
    <div
      ref="editor"
      :contenteditable="!disabled"
      class="rich-text-editor px-3 py-2 text-sm text-app focus:outline-none bg-white dark:bg-slate-900"
      :style="{ minHeight: minHeight }"
      :data-placeholder="placeholder"
      @input="sync"
      @focus="focused = true"
      @blur="focused = false"
      @paste="onPaste"
    ></div>
  </div>
</template>

<style>
.rich-text-editor:empty:before {
  content: attr(data-placeholder);
  color: #94a3b8;
  pointer-events: none;
}
.rich-text-editor ul { list-style: disc; padding-left: 1.4rem; margin: 0.4rem 0; }
.rich-text-editor ol { list-style: decimal; padding-left: 1.4rem; margin: 0.4rem 0; }
.rich-text-editor blockquote {
  border-left: 3px solid #cbd5e1;
  padding-left: 0.75rem;
  color: #64748b;
  margin: 0.5rem 0;
}
.rich-text-editor pre {
  background: rgb(241 245 249);
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
  white-space: pre-wrap;
}
.dark .rich-text-editor pre { background: rgb(30 41 59); }
.rich-text-editor a { color: #2563eb; text-decoration: underline; }
.dark .rich-text-editor a { color: #60a5fa; }
.rich-text-editor p { margin: 0.25rem 0; }
</style>
