<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Project, ProjectCategory, Tag } from '@/types'
import { ProjectPriority, ProjectStatus, Visibility } from '@/types'
import { useProjectsStore } from '@/stores/projects'
import { projectsService } from '@/services/projects.service'
import { projectCategoriesService } from '@/services/project-categories.service'
import { tagsService } from '@/services/tags.service'
import { extractErrorMessage } from '@/services/api'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TagPicker from '@/components/TagPicker.vue'
import ClientPicker from '@/components/ClientPicker.vue'

const props = defineProps<{ project: Project; canEdit: boolean; canDelete: boolean }>()

const { t } = useI18n()
const router = useRouter()
const store = useProjectsStore()

const form = reactive({
  name: '',
  description: '',
  visibility: Visibility.PUBLIC as Visibility,
  status: ProjectStatus.ACTIVE as ProjectStatus,
  priority: ProjectPriority.MEDIUM as ProjectPriority,
  plannedStartDate: '',
  actualStartDate: '',
  endDate: '',
  actualEndDate: '',
  estimatedDurationDays: null as number | null,
  progress: 0,
  categoryId: '' as string,
  clientUserId: '' as string,
  clientOrganizationId: '' as string,
  department: '',
})

const categories = ref<ProjectCategory[]>([])
const orgTags = ref<Tag[]>([])
const projectTags = ref<Tag[]>([])

const error = ref<string | null>(null)
const saving = ref(false)
const savedFlash = ref(false)
const deleteOpen = ref(false)

function reset() {
  form.name = props.project.name
  form.description = props.project.description ?? ''
  form.visibility = props.project.visibility
  form.status = props.project.status ?? ProjectStatus.ACTIVE
  form.priority = props.project.priority ?? ProjectPriority.MEDIUM
  form.plannedStartDate = props.project.plannedStartDate ?? ''
  form.actualStartDate = props.project.actualStartDate ?? ''
  form.endDate = props.project.endDate ?? ''
  form.actualEndDate = props.project.actualEndDate ?? ''
  form.estimatedDurationDays = props.project.estimatedDurationDays ?? null
  form.progress = props.project.progress ?? 0
  form.categoryId = props.project.categoryId ?? ''
  form.clientUserId = props.project.clientUserId ?? ''
  form.clientOrganizationId = props.project.clientOrganizationId ?? ''
  form.department = props.project.department ?? ''
}

watch(() => props.project, reset, { immediate: true })

async function loadAuxiliary() {
  try {
    categories.value = props.project.organizationId
      ? await projectCategoriesService.listForOrg(props.project.organizationId)
      : await projectCategoriesService.listGlobal()
  } catch {
    categories.value = []
  }
  try {
    orgTags.value = props.project.organizationId
      ? await tagsService.listForOrg(props.project.organizationId)
      : []
  } catch {
    orgTags.value = []
  }
  try {
    projectTags.value = await tagsService.listForProject(props.project.id)
  } catch {
    projectTags.value = []
  }
}

onMounted(loadAuxiliary)
watch(() => props.project.id, loadAuxiliary)

function parseDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function diffDays(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)))
}

function addDaysIso(start: Date, days: number): string {
  const d = new Date(start.getTime())
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function onStartChange() {
  const start = parseDate(form.plannedStartDate)
  const end = parseDate(form.endDate)
  if (start && end) {
    form.estimatedDurationDays = diffDays(start, end)
  } else if (start && form.estimatedDurationDays && form.estimatedDurationDays > 0) {
    form.endDate = addDaysIso(start, form.estimatedDurationDays)
  }
}

function onEndChange() {
  const start = parseDate(form.plannedStartDate)
  const end = parseDate(form.endDate)
  if (start && end) form.estimatedDurationDays = diffDays(start, end)
}

function onDurationChange() {
  const start = parseDate(form.plannedStartDate)
  if (start && form.estimatedDurationDays != null && form.estimatedDurationDays >= 0) {
    form.endDate = addDaysIso(start, form.estimatedDurationDays)
  }
}

async function save() {
  saving.value = true
  error.value = null
  try {
    const updated = await projectsService.update(props.project.id, {
      name: form.name,
      description: form.description,
      visibility: form.visibility,
      status: form.status,
      priority: form.priority,
      plannedStartDate: form.plannedStartDate || null,
      actualStartDate: form.actualStartDate || null,
      endDate: form.endDate || null,
      actualEndDate: form.actualEndDate || null,
      estimatedDurationDays: form.estimatedDurationDays,
      progress: form.progress,
      categoryId: form.categoryId || null,
      clientUserId: form.clientUserId || null,
      clientOrganizationId: form.clientOrganizationId || null,
      department: form.department.trim() || null,
    })
    savedFlash.value = true
    setTimeout(() => (savedFlash.value = false), 2000)
    await store.loadProject(updated.id)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function remove() {
  try {
    await store.deleteProject(props.project.id)
    router.replace({ name: 'projects' })
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    deleteOpen.value = false
  }
}

async function onAttachTag(tag: Tag) {
  try {
    await tagsService.attachToProject(props.project.id, { tagId: tag.id })
    projectTags.value = await tagsService.listForProject(props.project.id)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function onCreateTag(name: string) {
  try {
    await tagsService.attachToProject(props.project.id, { name })
    if (props.project.organizationId) {
      orgTags.value = await tagsService.listForOrg(props.project.organizationId)
    }
    projectTags.value = await tagsService.listForProject(props.project.id)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function onDetachTag(tag: Tag) {
  try {
    await tagsService.detachFromProject(props.project.id, tag.id)
    projectTags.value = await tagsService.listForProject(props.project.id)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <div
      v-if="error"
      class="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm"
    >
      {{ error }}
    </div>
    <div
      v-if="savedFlash"
      class="p-3 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-sm inline-flex items-center gap-2"
    >
      <font-awesome-icon icon="fa-solid fa-check" class="w-3 h-3" />
      {{ t('wizard.savedLabel') }}
    </div>

    <section class="card p-6 space-y-4">
      <h3 class="text-base font-semibold text-app">{{ t('projectSettings.general') }}</h3>
      <div>
        <label class="label">{{ t('common.name') }}</label>
        <input v-model="form.name" type="text" class="input" :disabled="!canEdit" />
      </div>
      <div>
        <label class="label">{{ t('common.description') }}</label>
        <textarea v-model="form.description" rows="3" class="input resize-none" :disabled="!canEdit" />
      </div>
      <div>
        <label class="label">{{ t('projectFormExtra.categoryLabel') }}</label>
        <select v-model="form.categoryId" class="select" :disabled="!canEdit">
          <option value="">{{ t('projectFormExtra.categoryPlaceholder') }}</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>
    </section>

    <section class="card p-6 space-y-4">
      <h3 class="text-base font-semibold text-app">{{ t('projectSettings.statusLifecycle') }}</h3>
      <div class="grid sm:grid-cols-2 gap-3">
        <div>
          <label class="label">{{ t('projectSettings.statusLabel') }}</label>
          <select v-model="form.status" class="select" :disabled="!canEdit">
            <option :value="ProjectStatus.PLANNING">{{ t('projects.statusPlanning') }}</option>
            <option :value="ProjectStatus.ACTIVE">{{ t('projects.statusActive') }}</option>
            <option :value="ProjectStatus.ON_HOLD">{{ t('projects.statusOnHold') }}</option>
            <option :value="ProjectStatus.COMPLETED">{{ t('projects.statusCompleted') }}</option>
            <option :value="ProjectStatus.ARCHIVED">{{ t('projects.statusArchived') }}</option>
          </select>
        </div>
        <div>
          <label class="label">{{ t('projectSettings.priorityLabel') }}</label>
          <select v-model="form.priority" class="select" :disabled="!canEdit">
            <option :value="ProjectPriority.LOW">{{ t('projects.priorityLow') }}</option>
            <option :value="ProjectPriority.MEDIUM">{{ t('projects.priorityMedium') }}</option>
            <option :value="ProjectPriority.HIGH">{{ t('projects.priorityHigh') }}</option>
            <option :value="ProjectPriority.CRITICAL">{{ t('projects.priorityCritical') }}</option>
          </select>
        </div>
      </div>
    </section>

    <section class="card p-6 space-y-4">
      <h3 class="text-base font-semibold text-app">{{ t('projectSettings.visibility') }}</h3>
      <div class="grid sm:grid-cols-2 gap-3">
        <label
          class="border divider rounded-xl p-4 cursor-pointer transition"
          :class="
            form.visibility === Visibility.PUBLIC
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800'
          "
        >
          <div class="flex items-start gap-3">
            <input
              type="radio"
              :value="Visibility.PUBLIC"
              v-model="form.visibility"
              :disabled="!canEdit"
              class="mt-1"
            />
            <div>
              <p class="font-medium text-app inline-flex items-center gap-2">
                <font-awesome-icon icon="fa-solid fa-lock-open" class="w-3.5 h-3.5" />
                {{ t('projectSettings.public') }}
              </p>
              <p class="text-xs text-muted mt-1">{{ t('projectSettings.visibilityPublicHelp') }}</p>
            </div>
          </div>
        </label>
        <label
          class="border divider rounded-xl p-4 cursor-pointer transition"
          :class="
            form.visibility === Visibility.PRIVATE
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800'
          "
        >
          <div class="flex items-start gap-3">
            <input
              type="radio"
              :value="Visibility.PRIVATE"
              v-model="form.visibility"
              :disabled="!canEdit"
              class="mt-1"
            />
            <div>
              <p class="font-medium text-app inline-flex items-center gap-2">
                <font-awesome-icon icon="fa-solid fa-lock" class="w-3.5 h-3.5" />
                {{ t('projectSettings.private') }}
              </p>
              <p class="text-xs text-muted mt-1">{{ t('projectSettings.visibilityPrivateHelp') }}</p>
            </div>
          </div>
        </label>
      </div>
    </section>

    <section class="card p-6 space-y-4">
      <h3 class="text-base font-semibold text-app">{{ t('projectSettings.timeline') }}</h3>
      <div class="grid sm:grid-cols-2 gap-3">
        <div>
          <label class="label">{{ t('projectSettings.plannedStart') }}</label>
          <input
            v-model="form.plannedStartDate"
            type="date"
            class="input"
            :disabled="!canEdit"
            @change="onStartChange"
          />
        </div>
        <div>
          <label class="label">{{ t('projectSettings.plannedEnd') }}</label>
          <input
            v-model="form.endDate"
            type="date"
            class="input"
            :disabled="!canEdit"
            @change="onEndChange"
          />
        </div>
        <div>
          <label class="label">{{ t('projectSettings.actualStart') }}</label>
          <input v-model="form.actualStartDate" type="date" class="input" :disabled="!canEdit" />
        </div>
        <div>
          <label class="label">{{ t('projectSettings.actualEnd') }}</label>
          <input v-model="form.actualEndDate" type="date" class="input" :disabled="!canEdit" />
        </div>
      </div>
      <div>
        <label class="label">{{ t('projectSettings.estimatedDuration') }}</label>
        <input
          v-model.number="form.estimatedDurationDays"
          type="number"
          min="0"
          class="input sm:w-40"
          :disabled="!canEdit"
          @change="onDurationChange"
        />
        <p class="text-xs text-subtle mt-1">{{ t('wizard.durationAutoHint') }}</p>
      </div>
    </section>

    <section class="card p-6 space-y-4">
      <h3 class="text-base font-semibold text-app">{{ t('projectSettings.metadata') }}</h3>
      <div>
        <label class="label">{{ t('projectFormExtra.clientLabel') }}</label>
        <ClientPicker
          :client-user-id="form.clientUserId || null"
          :client-organization-id="form.clientOrganizationId || null"
          :exclude-organization-ids="props.project.organizationId ? [props.project.organizationId] : []"
          :disabled="!canEdit"
          @update:client-user-id="form.clientUserId = $event ?? ''"
          @update:client-organization-id="form.clientOrganizationId = $event ?? ''"
        />
      </div>
      <div>
        <label class="label">{{ t('projectSettings.department') }}</label>
        <input v-model="form.department" type="text" class="input sm:w-64" :disabled="!canEdit" />
      </div>
      <div>
        <label class="label">{{ t('projectSettings.tags') }}</label>
        <TagPicker
          :model-value="projectTags"
          :suggestions="orgTags"
          :disabled="!canEdit"
          @attach="onAttachTag"
          @create="onCreateTag"
          @detach="onDetachTag"
        />
      </div>
    </section>

    <div class="flex items-center justify-between pt-2 flex-wrap gap-3">
      <button v-if="canDelete" class="btn-danger" @click="deleteOpen = true">
        <font-awesome-icon icon="fa-solid fa-trash" class="w-3.5 h-3.5" />
        {{ t('projectSettings.deleteProject') }}
      </button>
      <button
        v-if="canEdit"
        class="btn-primary ml-auto"
        :disabled="saving || !form.name.trim()"
        @click="save"
      >
        {{ saving ? t('common.saving') : t('projectSettings.saveChanges') }}
      </button>
    </div>

    <ConfirmDialog
      :open="deleteOpen"
      :title="t('projects.deleteConfirmTitle')"
      :message="t('projects.deleteConfirmBody')"
      :confirm-text="t('common.delete')"
      tone="danger"
      @confirm="remove"
      @cancel="deleteOpen = false"
    />
  </div>
</template>
