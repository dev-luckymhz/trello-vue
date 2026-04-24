<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Project, ProjectCategory, ProjectUpdatePayload, Tag } from '@/types'
import { ProjectPriority, ProjectStatus, Visibility } from '@/types'
import { useProjectsStore } from '@/stores/projects'
import { useOrganizationsStore } from '@/stores/organizations'
import { projectsService } from '@/services/projects.service'
import { projectCategoriesService } from '@/services/project-categories.service'
import { tagsService } from '@/services/tags.service'
import { extractErrorMessage } from '@/services/api'
import Modal from './Modal.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import TagPicker from './TagPicker.vue'
import ClientPicker from './ClientPicker.vue'

const props = defineProps<{
  open: boolean
  draft?: Project | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'activated', project: Project): void
}>()

const { t } = useI18n()
const store = useProjectsStore()
const orgStore = useOrganizationsStore()

type Step = 0 | 1 | 2 | 3
const step = ref<Step>(0)

const form = reactive({
  name: '',
  description: '',
  organizationId: '' as string,
  visibility: Visibility.PUBLIC as Visibility,
  priority: ProjectPriority.MEDIUM as ProjectPriority,
  plannedStartDate: '',
  endDate: '',
  estimatedDurationDays: null as number | null,
  categoryId: '' as string,
  clientUserId: '' as string,
  clientOrganizationId: '' as string,
  department: '',
})

const draftId = ref<string | null>(null)
const savingState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const error = ref<string | null>(null)
const discardOpen = ref(false)
const activating = ref(false)

const categories = ref<ProjectCategory[]>([])
const orgTags = ref<Tag[]>([])
const projectTags = ref<Tag[]>([])

let debounceHandle: ReturnType<typeof setTimeout> | null = null
let latestSaveToken = 0
let suppressWatch = false

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

async function loadAuxiliary(orgId: string | null): Promise<void> {
  try {
    categories.value = orgId
      ? await projectCategoriesService.listForOrg(orgId)
      : await projectCategoriesService.listGlobal()
  } catch {
    categories.value = []
  }
  try {
    orgTags.value = orgId ? await tagsService.listForOrg(orgId) : []
  } catch {
    orgTags.value = []
  }
}

async function loadProjectTags(id: string) {
  try {
    projectTags.value = await tagsService.listForProject(id)
  } catch {
    projectTags.value = []
  }
}

async function resetFromDraft(d: Project | null): Promise<void> {
  suppressWatch = true
  draftId.value = d?.id ?? null
  form.name = d?.name ?? ''
  form.description = d?.description ?? ''
  form.organizationId = d?.organizationId ?? ''
  form.visibility = d?.visibility ?? Visibility.PUBLIC
  form.priority = d?.priority ?? ProjectPriority.MEDIUM
  form.plannedStartDate = d?.plannedStartDate ?? ''
  form.endDate = d?.endDate ?? ''
  form.estimatedDurationDays = d?.estimatedDurationDays ?? null
  form.categoryId = d?.categoryId ?? ''
  form.clientUserId = d?.clientUserId ?? ''
  form.clientOrganizationId = d?.clientOrganizationId ?? ''
  form.department = d?.department ?? ''
  step.value = 0
  savingState.value = d ? 'saved' : 'idle'
  error.value = null

  await loadAuxiliary(d?.organizationId ?? form.organizationId ?? null)
  if (d?.id) await loadProjectTags(d.id)
  else projectTags.value = []

  setTimeout(() => {
    suppressWatch = false
  }, 0)
}

watch(
  () => props.open,
  (value) => {
    if (value) void resetFromDraft(props.draft ?? null)
    else if (debounceHandle) {
      clearTimeout(debounceHandle)
      debounceHandle = null
    }
  },
  { immediate: true },
)

watch(
  () => form.organizationId,
  (value, previous) => {
    if (value === previous || draftId.value) return
    void loadAuxiliary(value || null)
    // Selecting a different org invalidates the chosen category (scoped).
    form.categoryId = ''
  },
)

onBeforeUnmount(() => {
  if (debounceHandle) clearTimeout(debounceHandle)
})

function currentPayload(): ProjectUpdatePayload {
  return {
    name: form.name.trim(),
    description: form.description,
    visibility: form.visibility,
    priority: form.priority,
    plannedStartDate: form.plannedStartDate || null,
    endDate: form.endDate || null,
    estimatedDurationDays: form.estimatedDurationDays,
    categoryId: form.categoryId || null,
    clientUserId: form.clientUserId || null,
    clientOrganizationId: form.clientOrganizationId || null,
    department: form.department.trim() || null,
  }
}

async function ensureDraft(): Promise<string | null> {
  if (draftId.value) return draftId.value
  const trimmed = form.name.trim()
  if (!trimmed) return null
  try {
    const created = await projectsService.create({
      name: trimmed,
      description: form.description || undefined,
      organizationId: form.organizationId || undefined,
      visibility: form.visibility,
      priority: form.priority,
      status: ProjectStatus.DRAFT,
    })
    draftId.value = created.id
    if (!store.drafts.find((d) => d.id === created.id)) {
      store.drafts = [created, ...store.drafts]
    }
    return created.id
  } catch (err) {
    error.value = extractErrorMessage(err)
    savingState.value = 'error'
    return null
  }
}

async function flushAutosave(): Promise<void> {
  if (!form.name.trim()) return
  const id = await ensureDraft()
  if (!id) return
  const token = ++latestSaveToken
  savingState.value = 'saving'
  try {
    const updated = await projectsService.update(id, currentPayload())
    if (token !== latestSaveToken) return
    store.drafts = store.drafts.map((d) => (d.id === id ? { ...d, ...updated } : d))
    savingState.value = 'saved'
    error.value = null
  } catch (err) {
    if (token !== latestSaveToken) return
    error.value = extractErrorMessage(err)
    savingState.value = 'error'
  }
}

function scheduleAutosave(): void {
  if (suppressWatch) return
  if (debounceHandle) clearTimeout(debounceHandle)
  savingState.value = form.name.trim() ? 'saving' : 'idle'
  debounceHandle = setTimeout(() => void flushAutosave(), 600)
}

watch(() => ({ ...form }), scheduleAutosave, { deep: true })

// Date ↔ Duration linkage: last edited field is source of truth.
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

async function onAttachTag(tag: Tag): Promise<void> {
  if (!draftId.value) await ensureDraft()
  if (!draftId.value) return
  try {
    await tagsService.attachToProject(draftId.value, { tagId: tag.id })
    await loadProjectTags(draftId.value)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function onCreateTag(name: string): Promise<void> {
  if (!draftId.value) await ensureDraft()
  if (!draftId.value) return
  try {
    const tag = await tagsService.attachToProject(draftId.value, { name })
    if (form.organizationId) {
      try {
        orgTags.value = await tagsService.listForOrg(form.organizationId)
      } catch {
        // keep stale list, tag still attached
      }
    } else if (!orgTags.value.find((o) => o.id === tag.id)) {
      orgTags.value = [...orgTags.value, tag]
    }
    await loadProjectTags(draftId.value)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function onDetachTag(tag: Tag): Promise<void> {
  if (!draftId.value) return
  try {
    await tagsService.detachFromProject(draftId.value, tag.id)
    await loadProjectTags(draftId.value)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function goNext(): Promise<void> {
  if (step.value === 0 && !form.name.trim()) {
    error.value = t('wizard.nameRequired')
    return
  }
  if (debounceHandle) {
    clearTimeout(debounceHandle)
    debounceHandle = null
  }
  await flushAutosave()
  if (step.value < 3) step.value = (step.value + 1) as Step
}

function goBack(): void {
  if (step.value > 0) step.value = (step.value - 1) as Step
}

async function finish(): Promise<void> {
  if (!form.name.trim()) {
    error.value = t('wizard.nameRequired')
    return
  }
  activating.value = true
  try {
    if (debounceHandle) {
      clearTimeout(debounceHandle)
      debounceHandle = null
    }
    await flushAutosave()
    const id = draftId.value
    if (!id) return
    const activated = await store.activateProject(id)
    emit('activated', activated)
    emit('close')
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    activating.value = false
  }
}

async function confirmDiscard(): Promise<void> {
  const id = draftId.value
  discardOpen.value = false
  if (id) {
    try {
      await store.deleteProject(id)
    } catch (err) {
      error.value = extractErrorMessage(err)
      return
    }
  }
  emit('close')
}

const steps = computed(() => [
  { id: 0 as Step, label: t('wizard.stepBasics') },
  { id: 1 as Step, label: t('wizard.stepTimeline') },
  { id: 2 as Step, label: t('wizard.stepMetadata') },
  { id: 3 as Step, label: t('wizard.stepReview') },
])

const statusIndicator = computed(() => {
  switch (savingState.value) {
    case 'saving':
      return { text: t('wizard.savingLabel'), tone: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' }
    case 'saved':
      return { text: t('wizard.savedLabel'), tone: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400' }
    case 'error':
      return { text: t('wizard.saveFailed'), tone: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400' }
    default:
      return null
  }
})

const categoryName = computed(() => {
  if (!form.categoryId) return null
  return categories.value.find((c) => c.id === form.categoryId)?.name ?? null
})
</script>

<template>
  <Modal
    :open="open"
    :title="draft ? t('wizard.resumeTitle') : t('wizard.title')"
    width="640px"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div class="flex gap-1 items-center">
        <template v-for="(s, index) in steps" :key="s.id">
          <button
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition"
            :class="
              step === s.id
                ? 'bg-brand-500 text-white'
                : step > s.id
                ? 'text-brand-700 dark:text-brand-300'
                : 'text-subtle'
            "
            @click="step > s.id && (step = s.id)"
          >
            <span
              class="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px]"
              :class="
                step === s.id
                  ? 'bg-white/20'
                  : step > s.id
                  ? 'bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300'
                  : 'bg-slate-100 dark:bg-slate-800'
              "
            >
              {{ index + 1 }}
            </span>
            {{ s.label }}
          </button>
          <span v-if="index < steps.length - 1" class="text-subtle">›</span>
        </template>
      </div>
      <span
        v-if="statusIndicator"
        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
        :class="statusIndicator.tone"
      >
        <span
          v-if="savingState === 'saving'"
          class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
        />
        <font-awesome-icon
          v-else-if="savingState === 'saved'"
          icon="fa-solid fa-check"
          class="w-2.5 h-2.5"
        />
        {{ statusIndicator.text }}
      </span>
    </div>

    <div
      v-if="error"
      class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm"
    >
      {{ error }}
    </div>

    <!-- Step 0: Basics -->
    <div v-if="step === 0" class="space-y-4">
      <div>
        <label class="label">{{ t('common.name') }} *</label>
        <input v-model="form.name" type="text" autofocus class="input" />
      </div>
      <div>
        <label class="label">{{ t('common.description') }}</label>
        <textarea v-model="form.description" rows="3" class="input resize-none" />
      </div>
      <div>
        <label class="label">{{ t('projects.owner') }}</label>
        <select v-model="form.organizationId" class="select" :disabled="!!draftId">
          <option value="">{{ t('projects.personal') }}</option>
          <option v-for="org in orgStore.organizations" :key="org.id" :value="org.id">
            {{ org.name }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">{{ t('projectFormExtra.categoryLabel') }}</label>
        <select v-model="form.categoryId" class="select">
          <option value="">{{ t('projectFormExtra.categoryPlaceholder') }}</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}{{ cat.isSystem ? '' : '' }}
          </option>
        </select>
      </div>
      <div>
        <label class="label">{{ t('projectSettings.visibility') }}</label>
        <div class="grid sm:grid-cols-2 gap-3">
          <label
            class="border divider rounded-xl p-3 cursor-pointer transition"
            :class="
              form.visibility === Visibility.PUBLIC
                ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
            "
          >
            <div class="flex items-start gap-2">
              <input type="radio" :value="Visibility.PUBLIC" v-model="form.visibility" class="mt-1" />
              <div>
                <p class="font-medium text-app inline-flex items-center gap-1.5 text-sm">
                  <font-awesome-icon icon="fa-solid fa-lock-open" class="w-3 h-3" />
                  {{ t('projectSettings.public') }}
                </p>
                <p class="text-xs text-muted mt-0.5">{{ t('projectSettings.visibilityPublicHelp') }}</p>
              </div>
            </div>
          </label>
          <label
            class="border divider rounded-xl p-3 cursor-pointer transition"
            :class="
              form.visibility === Visibility.PRIVATE
                ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
            "
          >
            <div class="flex items-start gap-2">
              <input type="radio" :value="Visibility.PRIVATE" v-model="form.visibility" class="mt-1" />
              <div>
                <p class="font-medium text-app inline-flex items-center gap-1.5 text-sm">
                  <font-awesome-icon icon="fa-solid fa-lock" class="w-3 h-3" />
                  {{ t('projectSettings.private') }}
                </p>
                <p class="text-xs text-muted mt-0.5">{{ t('projectSettings.visibilityPrivateHelp') }}</p>
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- Step 1: Timeline + priority -->
    <div v-else-if="step === 1" class="space-y-4">
      <div class="grid sm:grid-cols-2 gap-3">
        <div>
          <label class="label">{{ t('projectSettings.plannedStart') }}</label>
          <input
            v-model="form.plannedStartDate"
            type="date"
            class="input"
            @change="onStartChange"
          />
        </div>
        <div>
          <label class="label">{{ t('projectSettings.plannedEnd') }}</label>
          <input
            v-model="form.endDate"
            type="date"
            class="input"
            @change="onEndChange"
          />
        </div>
      </div>
      <div>
        <label class="label">{{ t('projectSettings.estimatedDuration') }}</label>
        <input
          v-model.number="form.estimatedDurationDays"
          type="number"
          min="0"
          class="input sm:w-40"
          @change="onDurationChange"
        />
        <p class="text-xs text-subtle mt-1">{{ t('wizard.durationAutoHint') }}</p>
      </div>
      <div>
        <label class="label">{{ t('projectSettings.priorityLabel') }}</label>
        <select v-model="form.priority" class="select sm:w-48">
          <option :value="ProjectPriority.LOW">{{ t('projects.priorityLow') }}</option>
          <option :value="ProjectPriority.MEDIUM">{{ t('projects.priorityMedium') }}</option>
          <option :value="ProjectPriority.HIGH">{{ t('projects.priorityHigh') }}</option>
          <option :value="ProjectPriority.CRITICAL">{{ t('projects.priorityCritical') }}</option>
        </select>
      </div>
    </div>

    <!-- Step 2: Details -->
    <div v-else-if="step === 2" class="space-y-4">
      <div>
        <label class="label">{{ t('projectFormExtra.clientLabel') }}</label>
        <ClientPicker
          :client-user-id="form.clientUserId || null"
          :client-organization-id="form.clientOrganizationId || null"
          :exclude-organization-ids="form.organizationId ? [form.organizationId] : []"
          @update:client-user-id="form.clientUserId = $event ?? ''"
          @update:client-organization-id="form.clientOrganizationId = $event ?? ''"
        />
      </div>
      <div>
        <label class="label">{{ t('projectSettings.department') }}</label>
        <input v-model="form.department" type="text" class="input sm:w-64" />
      </div>
      <div>
        <label class="label">{{ t('projectFormExtra.tagsLabel') }}</label>
        <TagPicker
          :model-value="projectTags"
          :suggestions="orgTags"
          @attach="onAttachTag"
          @create="onCreateTag"
          @detach="onDetachTag"
        />
      </div>
    </div>

    <!-- Step 3: Review -->
    <div v-else-if="step === 3" class="space-y-3">
      <div class="p-3 rounded-lg bg-brand-50/60 dark:bg-brand-900/20 text-sm text-app">
        {{ t('wizard.reviewBanner') }}
      </div>
      <dl class="card divide-y divide-slate-100 dark:divide-slate-700 text-sm">
        <div class="p-3 flex justify-between gap-4">
          <dt class="text-muted">{{ t('common.name') }}</dt>
          <dd class="text-app font-medium text-right">{{ form.name || '—' }}</dd>
        </div>
        <div v-if="form.description" class="p-3 flex justify-between gap-4">
          <dt class="text-muted">{{ t('common.description') }}</dt>
          <dd class="text-app text-right whitespace-pre-wrap">{{ form.description }}</dd>
        </div>
        <div class="p-3 flex justify-between gap-4">
          <dt class="text-muted">{{ t('projects.owner') }}</dt>
          <dd class="text-app text-right">
            <template v-if="form.organizationId">
              {{ orgStore.organizations.find((o) => o.id === form.organizationId)?.name ?? '—' }}
            </template>
            <template v-else>{{ t('projects.personal') }}</template>
          </dd>
        </div>
        <div v-if="categoryName" class="p-3 flex justify-between gap-4">
          <dt class="text-muted">{{ t('projectFormExtra.categoryLabel') }}</dt>
          <dd class="text-app text-right">{{ categoryName }}</dd>
        </div>
        <div class="p-3 flex justify-between gap-4">
          <dt class="text-muted">{{ t('projectSettings.visibility') }}</dt>
          <dd class="text-app text-right">
            {{ form.visibility === Visibility.PUBLIC ? t('projectSettings.public') : t('projectSettings.private') }}
          </dd>
        </div>
        <div class="p-3 flex justify-between gap-4">
          <dt class="text-muted">{{ t('projectSettings.priorityLabel') }}</dt>
          <dd class="text-app text-right">
            {{
              form.priority === ProjectPriority.LOW
                ? t('projects.priorityLow')
                : form.priority === ProjectPriority.MEDIUM
                ? t('projects.priorityMedium')
                : form.priority === ProjectPriority.HIGH
                ? t('projects.priorityHigh')
                : t('projects.priorityCritical')
            }}
          </dd>
        </div>
        <div v-if="form.plannedStartDate || form.endDate" class="p-3 flex justify-between gap-4">
          <dt class="text-muted">{{ t('projectSettings.timeline') }}</dt>
          <dd class="text-app text-right">
            {{ form.plannedStartDate || '—' }}<span v-if="form.endDate"> → {{ form.endDate }}</span>
          </dd>
        </div>
        <div v-if="form.estimatedDurationDays != null" class="p-3 flex justify-between gap-4">
          <dt class="text-muted">{{ t('projectSettings.estimatedDuration') }}</dt>
          <dd class="text-app text-right">{{ form.estimatedDurationDays }}</dd>
        </div>
        <div v-if="form.department" class="p-3 flex justify-between gap-4">
          <dt class="text-muted">{{ t('projectSettings.department') }}</dt>
          <dd class="text-app text-right">{{ form.department }}</dd>
        </div>
        <div v-if="projectTags.length > 0" class="p-3 flex justify-between gap-4">
          <dt class="text-muted">{{ t('projectSettings.tags') }}</dt>
          <dd class="text-app text-right flex flex-wrap justify-end gap-1">
            <span
              v-for="tag in projectTags"
              :key="tag.id"
              class="inline-flex items-center gap-1 px-2 h-5 rounded-full text-[11px] font-semibold"
              :style="{
                backgroundColor: (tag.color ?? '#64748b') + '26',
                color: tag.color ?? '#334155',
              }"
            >
              {{ tag.name }}
            </span>
          </dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <button
        v-if="draftId"
        class="btn-ghost text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-950/40 mr-auto"
        @click="discardOpen = true"
      >
        {{ t('wizard.discardDraft') }}
      </button>
      <span class="text-xs text-subtle mr-2 hidden sm:inline">
        {{ t('wizard.autosaveHint') }}
      </span>
      <button v-if="step > 0" class="btn-ghost" @click="goBack">{{ t('wizard.back') }}</button>
      <button
        v-if="step < 3"
        class="btn-primary"
        :disabled="step === 0 && !form.name.trim()"
        @click="goNext"
      >
        {{ t('wizard.next') }}
      </button>
      <button
        v-else
        class="btn-primary"
        :disabled="!form.name.trim() || activating"
        @click="finish"
      >
        {{ activating ? t('wizard.savingLabel') : t('wizard.finish') }}
      </button>
    </template>

    <ConfirmDialog
      :open="discardOpen"
      :title="t('wizard.discardDraft') + '?'"
      :message="t('projects.deleteConfirmBody')"
      :confirm-text="t('common.delete')"
      tone="danger"
      @confirm="confirmDiscard"
      @cancel="discardOpen = false"
    />
  </Modal>
</template>
