<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Popover from './Popover.vue'
import { tasksService } from '@/services/tasks.service'
import { extractErrorMessage } from '@/services/api'

const props = defineProps<{
  open: boolean
  anchor: HTMLElement | null
  taskId: string | null
  maxBytes?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'added'): void
}>()

const { t } = useI18n()

const mode = ref<'file' | 'link'>('file')
const linkUrl = ref('')
const linkLabel = ref('')
const error = ref<string | null>(null)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

const maxMB = computed(() => Math.round((props.maxBytes ?? 5 * 1024 * 1024) / (1024 * 1024)))

async function onSelectFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) await uploadFile(file)
  input.value = ''
}

async function onDrop(event: DragEvent) {
  event.preventDefault()
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) await uploadFile(file)
}

async function uploadFile(file: File) {
  if (!props.taskId) return
  if (props.maxBytes && file.size > props.maxBytes) {
    error.value = `File too large (> ${maxMB.value} MB)`
    return
  }
  uploading.value = true
  error.value = null
  try {
    await tasksService.uploadFileAttachment(props.taskId, file)
    emit('added')
    emit('close')
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    uploading.value = false
  }
}

async function addLink() {
  if (!props.taskId) return
  const url = linkUrl.value.trim()
  if (!url) return
  error.value = null
  try {
    await tasksService.addLinkAttachment(props.taskId, {
      url,
      name: linkLabel.value.trim() || undefined,
    })
    linkUrl.value = ''
    linkLabel.value = ''
    emit('added')
    emit('close')
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}
</script>

<template>
  <Popover :open="open" :anchor="anchor" :title="t('taskModal.sidebarAttachment')" width="360px" @close="emit('close')">
    <div class="space-y-3">
      <!-- Mode switch -->
      <div class="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <button
          type="button"
          class="py-1.5 rounded-md text-xs font-semibold transition"
          :class="mode === 'file' ? 'bg-white dark:bg-slate-900 text-app shadow' : 'text-muted'"
          @click="mode = 'file'"
        >
          <font-awesome-icon icon="fa-solid fa-upload" class="w-3 h-3 mr-1" />
          File
        </button>
        <button
          type="button"
          class="py-1.5 rounded-md text-xs font-semibold transition"
          :class="mode === 'link' ? 'bg-white dark:bg-slate-900 text-app shadow' : 'text-muted'"
          @click="mode = 'link'"
        >
          <font-awesome-icon icon="fa-solid fa-link" class="w-3 h-3 mr-1" />
          Link
        </button>
      </div>

      <div
        v-if="error"
        class="p-2 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs"
      >
        {{ error }}
      </div>

      <!-- File -->
      <div v-if="mode === 'file'">
        <div
          class="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition"
          :class="dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'divider hover:border-brand-300'"
          @click="fileInput?.click()"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop="onDrop"
        >
          <input ref="fileInput" type="file" class="hidden" @change="onSelectFile" />
          <font-awesome-icon icon="fa-solid fa-cloud-arrow-up" class="w-6 h-6 text-subtle" />
          <p class="text-sm text-muted mt-2">
            {{ t('taskModal.attachmentDropzone', { max: maxMB }) }}
          </p>
          <p v-if="uploading" class="text-xs text-brand-600 dark:text-brand-400 mt-2">
            {{ t('common.loading') }}
          </p>
        </div>
      </div>

      <!-- Link -->
      <div v-if="mode === 'link'" class="space-y-2">
        <div>
          <label class="label text-xs">URL</label>
          <input
            v-model="linkUrl"
            type="url"
            class="input text-sm"
            :placeholder="t('taskModal.attachmentUrlPlaceholder')"
          />
        </div>
        <div>
          <label class="label text-xs">Label (optional)</label>
          <input
            v-model="linkLabel"
            type="text"
            class="input text-sm"
            :placeholder="t('taskModal.attachmentLinkNamePlaceholder')"
          />
        </div>
        <div class="flex justify-end">
          <button
            type="button"
            class="btn-primary text-sm"
            :disabled="!linkUrl.trim()"
            @click="addLink"
          >
            {{ t('common.add') }}
          </button>
        </div>
      </div>
    </div>
  </Popover>
</template>
