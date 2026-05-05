<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TaskAttachment } from '@/types'
import { AttachmentKind, AttachmentProvider } from '@/types'
import { tasksService } from '@/services/tasks.service'
import { extractErrorMessage } from '@/services/api'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{ taskId: string; maxBytes?: number }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const { t, locale } = useI18n()

const attachments = ref<TaskAttachment[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const dragging = ref(false)
const showLinkForm = ref(false)
const linkUrl = ref('')
const linkLabel = ref('')
const pendingDeleteId = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const previewing = ref<TaskAttachment | null>(null)
const previewUrl = ref<string | null>(null)

const maxMB = computed(() => Math.round((props.maxBytes ?? 5 * 1024 * 1024) / (1024 * 1024)))

async function load() {
  loading.value = true
  try {
    attachments.value = await tasksService.listAttachments(props.taskId)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)

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
  if (props.maxBytes && file.size > props.maxBytes) {
    error.value = t('taskModal.attachmentUploadFailed') + ` (> ${maxMB.value} MB)`
    return
  }
  uploading.value = true
  uploadProgress.value = 0
  error.value = null
  try {
    const att = await tasksService.uploadFileAttachment(props.taskId, file)
    attachments.value = [att, ...attachments.value]
    emit('changed')
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

async function addLink() {
  const url = linkUrl.value.trim()
  if (!url) return
  error.value = null
  try {
    const att = await tasksService.addLinkAttachment(props.taskId, {
      url,
      name: linkLabel.value.trim() || undefined,
    })
    attachments.value = [att, ...attachments.value]
    linkUrl.value = ''
    linkLabel.value = ''
    showLinkForm.value = false
    emit('changed')
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function remove(id: string) {
  try {
    await tasksService.deleteAttachment(id)
    attachments.value = attachments.value.filter((a) => a.id !== id)
    pendingDeleteId.value = null
    emit('changed')
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function download(att: TaskAttachment) {
  try {
    await tasksService.downloadAttachment(att.id, att.name)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function preview(att: TaskAttachment) {
  if (att.kind === AttachmentKind.LINK && att.url) {
    window.open(att.url, '_blank', 'noopener')
    return
  }
  try {
    const { url } = await tasksService.fetchAttachmentBlob(att.id, false)
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = url
    previewing.value = att
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

function closePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
  previewing.value = null
}

function iconFor(att: TaskAttachment): string {
  if (att.kind === AttachmentKind.LINK) {
    switch (att.provider) {
      case AttachmentProvider.GOOGLE_DRIVE:
        return 'fa-brands fa-google-drive'
      case AttachmentProvider.DROPBOX:
        return 'fa-brands fa-dropbox'
      case AttachmentProvider.GITHUB:
        return 'fa-brands fa-github'
      case AttachmentProvider.FIGMA:
        return 'fa-brands fa-figma'
      default:
        return 'fa-solid fa-link'
    }
  }
  const m = (att.mimeType ?? '').toLowerCase()
  if (m.startsWith('image/')) return 'fa-solid fa-image'
  if (m === 'application/pdf') return 'fa-solid fa-file-pdf'
  if (m.includes('spreadsheet') || m.includes('excel') || m.includes('csv'))
    return 'fa-solid fa-file-csv'
  if (m.includes('word') || m.includes('document')) return 'fa-solid fa-file-word'
  if (m.startsWith('video/')) return 'fa-solid fa-video'
  if (m.startsWith('audio/')) return 'fa-solid fa-music'
  return 'fa-solid fa-file'
}

function humanSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isImage(att: TaskAttachment): boolean {
  return att.kind === AttachmentKind.FILE && (att.mimeType ?? '').startsWith('image/')
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-if="error"
      class="p-2 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs"
    >
      {{ error }}
    </div>

    <div
      class="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition"
      :class="dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'divider hover:border-brand-300'"
      @click="fileInput?.click()"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        @change="onSelectFile"
      />
      <font-awesome-icon icon="fa-solid fa-cloud-arrow-up" class="w-5 h-5 text-subtle" />
      <p class="text-sm text-muted mt-1">
        {{ t('taskModal.attachmentDropzone', { max: maxMB }) }}
      </p>
      <p v-if="uploading" class="text-xs text-brand-600 dark:text-brand-400 mt-2">
        {{ t('common.loading') }}
      </p>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="btn-ghost text-sm inline-flex items-center gap-1.5"
        @click="showLinkForm = !showLinkForm"
      >
        <font-awesome-icon icon="fa-solid fa-link" class="w-3 h-3" />
        {{ t('taskModal.attachmentAddLink') }}
      </button>
    </div>

    <div
      v-if="showLinkForm"
      class="border divider rounded-lg p-3 space-y-2 bg-slate-50 dark:bg-slate-800/60"
    >
      <input
        v-model="linkUrl"
        type="url"
        class="input text-sm"
        :placeholder="t('taskModal.attachmentUrlPlaceholder')"
      />
      <input
        v-model="linkLabel"
        type="text"
        class="input text-sm"
        :placeholder="t('taskModal.attachmentLinkNamePlaceholder')"
      />
      <div class="flex justify-end gap-2">
        <button class="btn-ghost text-sm" @click="showLinkForm = false">
          {{ t('common.cancel') }}
        </button>
        <button class="btn-primary text-sm" :disabled="!linkUrl.trim()" @click="addLink">
          {{ t('common.add') }}
        </button>
      </div>
    </div>

    <div v-if="loading && attachments.length === 0" class="text-sm text-muted">
      {{ t('common.loading') }}
    </div>

    <div
      v-else-if="attachments.length === 0 && !loading"
      class="text-sm text-muted"
    >
      {{ t('taskModal.noAttachments') }}
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="att in attachments"
        :key="att.id"
        class="border divider rounded-lg p-2 flex items-center gap-3 group"
      >
        <div
          class="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-muted shrink-0"
        >
          <font-awesome-icon :icon="iconFor(att)" class="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <p
            class="text-sm font-medium text-app truncate cursor-pointer hover:text-brand-600"
            :title="att.name"
            @click="preview(att)"
          >
            {{ att.name }}
          </p>
          <p class="text-xs text-subtle">
            {{ att.uploadedByUser?.name ?? '—' }} · {{ formatDate(att.createdAt) }}
            <template v-if="att.sizeBytes"> · {{ humanSize(att.sizeBytes) }}</template>
          </p>
        </div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <a
            v-if="att.kind === 'link' && att.url"
            :href="att.url"
            target="_blank"
            rel="noopener"
            class="btn-icon w-8 h-8"
            :title="t('taskModal.attachmentOpen')"
          >
            <font-awesome-icon icon="fa-solid fa-arrow-up-right-from-square" class="w-3 h-3" />
          </a>
          <button
            v-if="att.kind === 'file'"
            class="btn-icon w-8 h-8"
            :title="t('taskModal.attachmentDownload')"
            @click="download(att)"
          >
            <font-awesome-icon icon="fa-solid fa-download" class="w-3 h-3" />
          </button>
          <button
            class="btn-icon w-8 h-8 hover:text-red-500"
            :title="t('common.delete')"
            @click="pendingDeleteId = att.id"
          >
            <font-awesome-icon icon="fa-solid fa-trash" class="w-3 h-3" />
          </button>
        </div>
      </li>
    </ul>

    <!-- Inline preview overlay for images/PDFs -->
    <div
      v-if="previewing && previewUrl"
      class="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
      @click.self="closePreview"
    >
      <button
        class="absolute top-4 right-4 text-white text-2xl"
        @click="closePreview"
      >
        <font-awesome-icon icon="fa-solid fa-xmark" />
      </button>
      <img
        v-if="isImage(previewing)"
        :src="previewUrl"
        :alt="previewing.name"
        class="max-w-full max-h-[90vh] rounded shadow-xl"
      />
      <iframe
        v-else-if="previewing.mimeType === 'application/pdf'"
        :src="previewUrl"
        class="w-[min(90vw,1100px)] h-[85vh] rounded bg-white"
      />
      <div v-else class="bg-white dark:bg-slate-900 rounded-xl p-8 text-center">
        <p class="text-app font-medium mb-2">{{ previewing.name }}</p>
        <button class="btn-primary" @click="download(previewing)">
          {{ t('taskModal.attachmentDownload') }}
        </button>
      </div>
    </div>

    <ConfirmDialog
      :open="pendingDeleteId !== null"
      :title="t('taskModal.attachmentDeleteTitle')"
      :message="t('taskModal.attachmentDeleteBody')"
      :confirm-text="t('common.delete')"
      tone="danger"
      @confirm="pendingDeleteId && remove(pendingDeleteId)"
      @cancel="pendingDeleteId = null"
    />
  </div>
</template>
