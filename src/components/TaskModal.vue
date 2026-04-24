<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  Checklist,
  Priority,
  Tag,
  Task,
  TaskActivity,
  TaskComment,
} from '@/types'
import { TaskState } from '@/types'
import Modal from './Modal.vue'
import RichTextEditor from './RichTextEditor.vue'
import TagPicker from './TagPicker.vue'
import MultiUserPicker from './MultiUserPicker.vue'
import CommentInput from './CommentInput.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { tasksService } from '@/services/tasks.service'
import { tagsService } from '@/services/tags.service'
import { projectsService } from '@/services/projects.service'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/services/api'
import type { UserSearchResult } from '@/services/users.service'

const props = defineProps<{
  open: boolean
  task?: Task | null
  priorities: Priority[]
  projectId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (
    e: 'create',
    payload: {
      title: string
      shortDescription: string | null
      longDescription: string | null
      description: string | null
      state: TaskState
      startDate: string | null
      dueDate: string | null
      estimatedCompletionDate: string | null
      coverColor: string | null
      coverImageUrl: string | null
      priorityId: string | null
      assigneeIds: string[]
      watcherIds: string[]
      tagIds: string[]
    },
  ): void
  (e: 'updated', task: Task): void
  (e: 'deleted', taskId: string): void
}>()

const { t, locale } = useI18n()
const auth = useAuthStore()

type Tab = 'overview' | 'checklist' | 'comments' | 'activity'
const activeTab = ref<Tab>('overview')

const form = reactive({
  title: '',
  shortDescription: '',
  longDescription: '',
  description: '',
  state: TaskState.TODO as TaskState,
  startDate: '' as string,
  dueDate: '' as string,
  estimatedCompletionDate: '' as string,
  coverColor: '' as string,
  coverImageUrl: '' as string,
  priorityId: '' as string,
})

const assignees = ref<UserSearchResult[]>([])
const watchers = ref<UserSearchResult[]>([])
const selectedTags = ref<Tag[]>([])
const projectTags = ref<Tag[]>([])
const projectMembers = ref<UserSearchResult[]>([])

const checklists = ref<Checklist[]>([])
const comments = ref<TaskComment[]>([])
const activities = ref<TaskActivity[]>([])

const loading = ref(false)
const error = ref<string | null>(null)
const pendingDeleteChecklistId = ref<string | null>(null)
const pendingDeleteCommentId = ref<string | null>(null)
const editingCommentId = ref<string | null>(null)
const newChecklistTitle = ref('')
const addingChecklist = ref(false)
const newItemDrafts = reactive<Record<string, string>>({})
const itemInputOpen = reactive<Record<string, boolean>>({})

const isEdit = computed(() => Boolean(props.task?.id))
const currentUserId = computed(() => auth.user?.id ?? null)
const isWatching = computed(
  () => !!watchers.value.find((w) => w.id === currentUserId.value),
)

const sortedPriorities = computed(() =>
  [...props.priorities].sort((a, b) => a.rank - b.rank),
)

const checklistProgress = computed(() => {
  const all = checklists.value.flatMap((c) => c.items)
  if (all.length === 0) return null
  const done = all.filter((i) => i.isCompleted).length
  return { done, total: all.length, pct: Math.round((done / all.length) * 100) }
})

function defaultPriority(): string {
  const medium = props.priorities.find((p) => p.name.toLowerCase() === 'medium')
  if (medium) return medium.id
  return props.priorities[0]?.id ?? ''
}

function resetForm(task: Task | null | undefined) {
  form.title = task?.title ?? ''
  form.shortDescription = task?.shortDescription ?? ''
  form.longDescription = task?.longDescription ?? task?.description ?? ''
  form.description = task?.description ?? ''
  form.state = task?.state ?? TaskState.TODO
  form.startDate = task?.startDate ?? ''
  form.dueDate = task?.dueDate ?? ''
  form.estimatedCompletionDate = task?.estimatedCompletionDate ?? ''
  form.coverColor = task?.coverColor ?? ''
  form.coverImageUrl = task?.coverImageUrl ?? ''
  form.priorityId = task?.priorityId ?? defaultPriority()
  assignees.value = (task?.assignees ?? [])
    .map((a) => (a.user ? { id: a.user.id, name: a.user.name, email: a.user.email } : null))
    .filter((u): u is UserSearchResult => u !== null)
  watchers.value = (task?.watchers ?? [])
    .map((w) => (w.user ? { id: w.user.id, name: w.user.name, email: w.user.email } : null))
    .filter((u): u is UserSearchResult => u !== null)
  selectedTags.value = (task?.taskTags ?? [])
    .map((tt) => tt.tag ?? null)
    .filter((tag): tag is Tag => tag !== null)
}

async function loadTaskDetails(taskId: string) {
  loading.value = true
  error.value = null
  try {
    const [full, ck, cm, ac] = await Promise.all([
      tasksService.get(taskId),
      tasksService.listChecklists(taskId),
      tasksService.listComments(taskId),
      tasksService.listActivity(taskId),
    ])
    resetForm(full)
    checklists.value = ck
    comments.value = cm
    activities.value = ac
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function loadProjectContext() {
  try {
    const [tags, members] = await Promise.all([
      tagsService.listForProject(props.projectId).catch(() => [] as Tag[]),
      projectsService
        .listMembers(props.projectId)
        .then((ms) =>
          ms
            .map((m) =>
              m.user ? { id: m.user.id, name: m.user.name, email: m.user.email } : null,
            )
            .filter((u): u is UserSearchResult => u !== null),
        )
        .catch(() => [] as UserSearchResult[]),
    ])
    projectTags.value = tags
    projectMembers.value = members
  } catch {
    /* ignore */
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    activeTab.value = 'overview'
    error.value = null
    resetForm(props.task ?? null)
    await loadProjectContext()
    if (props.task?.id) {
      await loadTaskDetails(props.task.id)
    } else {
      checklists.value = []
      comments.value = []
      activities.value = []
    }
  },
  { immediate: true },
)

function dateOrNull(value: string): string | null {
  return value ? value : null
}

async function onSave() {
  if (!form.title.trim()) return
  if (!isEdit.value) {
    emit('create', {
      title: form.title,
      shortDescription: form.shortDescription || null,
      longDescription: form.longDescription || null,
      description: form.description || null,
      state: form.state,
      startDate: dateOrNull(form.startDate),
      dueDate: dateOrNull(form.dueDate),
      estimatedCompletionDate: dateOrNull(form.estimatedCompletionDate),
      coverColor: form.coverColor || null,
      coverImageUrl: form.coverImageUrl || null,
      priorityId: form.priorityId || null,
      assigneeIds: assignees.value.map((u) => u.id),
      watcherIds: watchers.value.map((u) => u.id),
      tagIds: selectedTags.value.map((tg) => tg.id),
    })
    return
  }

  try {
    loading.value = true
    const taskId = props.task!.id
    const updated = await projectsService.updateTask(taskId, {
      title: form.title,
      shortDescription: form.shortDescription || null,
      longDescription: form.longDescription || null,
      description: form.description || null,
      state: form.state,
      startDate: dateOrNull(form.startDate),
      dueDate: dateOrNull(form.dueDate),
      estimatedCompletionDate: dateOrNull(form.estimatedCompletionDate),
      coverColor: form.coverColor || null,
      coverImageUrl: form.coverImageUrl || null,
      priorityId: form.priorityId || null,
    } as Partial<Task>)
    // Sync assignees/watchers separately if they changed vs initial.
    const initialAssignees = (props.task!.assignees ?? [])
      .map((a) => a.userId)
      .sort()
      .join(',')
    const currentAssignees = assignees.value
      .map((u) => u.id)
      .sort()
      .join(',')
    if (initialAssignees !== currentAssignees) {
      await tasksService.setAssignees(
        taskId,
        assignees.value.map((u) => u.id),
      )
    }
    const initialWatchers = (props.task!.watchers ?? [])
      .map((w) => w.userId)
      .sort()
      .join(',')
    const currentWatchers = watchers.value
      .map((u) => u.id)
      .sort()
      .join(',')
    if (initialWatchers !== currentWatchers) {
      await tasksService.setWatchers(
        taskId,
        watchers.value.map((u) => u.id),
      )
    }
    const fresh = await tasksService.get(taskId)
    emit('updated', { ...updated, ...fresh } as Task)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function toggleWatch() {
  if (!props.task?.id) return
  try {
    const updated = isWatching.value
      ? await tasksService.unwatch(props.task.id)
      : await tasksService.watch(props.task.id)
    watchers.value = (updated.watchers ?? [])
      .map((w) => (w.user ? { id: w.user.id, name: w.user.name, email: w.user.email } : null))
      .filter((u): u is UserSearchResult => u !== null)
    emit('updated', updated)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function onAttachTag(tag: Tag) {
  if (!props.task?.id) {
    selectedTags.value = [...selectedTags.value, tag]
    return
  }
  try {
    await tasksService.attachTag(props.task.id, { tagId: tag.id })
    selectedTags.value = [...selectedTags.value, tag]
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function onCreateTag(name: string) {
  try {
    let tag: Tag
    if (props.task?.id) {
      tag = await tasksService.attachTag(props.task.id, { name })
    } else {
      tag = await tagsService.attachToProject(props.projectId, { name })
    }
    projectTags.value = projectTags.value.some((tg) => tg.id === tag.id)
      ? projectTags.value
      : [...projectTags.value, tag]
    selectedTags.value = [...selectedTags.value, tag]
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function onDetachTag(tag: Tag) {
  if (props.task?.id) {
    try {
      await tasksService.detachTag(props.task.id, tag.id)
    } catch (err) {
      error.value = extractErrorMessage(err)
      return
    }
  }
  selectedTags.value = selectedTags.value.filter((tg) => tg.id !== tag.id)
}

// ---------------- Checklists ----------------

async function addChecklist() {
  const title = newChecklistTitle.value.trim()
  if (!title || !props.task?.id) return
  try {
    const cl = await tasksService.createChecklist(props.task.id, { title })
    checklists.value = [...checklists.value, { ...cl, items: cl.items ?? [] }]
    newChecklistTitle.value = ''
    addingChecklist.value = false
    await refreshActivity()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function removeChecklist(id: string) {
  try {
    await tasksService.deleteChecklist(id)
    checklists.value = checklists.value.filter((c) => c.id !== id)
    pendingDeleteChecklistId.value = null
    await refreshActivity()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function addItem(checklistId: string) {
  const content = (newItemDrafts[checklistId] ?? '').trim()
  if (!content) return
  try {
    const item = await tasksService.addChecklistItem(checklistId, { content })
    const cl = checklists.value.find((c) => c.id === checklistId)
    if (cl) cl.items = [...cl.items, item]
    newItemDrafts[checklistId] = ''
    await refreshActivity()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function toggleItem(checklistId: string, itemId: string, isCompleted: boolean) {
  try {
    const item = await tasksService.updateChecklistItem(itemId, { isCompleted })
    const cl = checklists.value.find((c) => c.id === checklistId)
    if (cl) cl.items = cl.items.map((i) => (i.id === itemId ? item : i))
    await refreshActivity()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function removeItem(checklistId: string, itemId: string) {
  try {
    await tasksService.deleteChecklistItem(itemId)
    const cl = checklists.value.find((c) => c.id === checklistId)
    if (cl) cl.items = cl.items.filter((i) => i.id !== itemId)
    await refreshActivity()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

function checklistPct(cl: Checklist): number {
  if (cl.items.length === 0) return 0
  const done = cl.items.filter((i) => i.isCompleted).length
  return Math.round((done / cl.items.length) * 100)
}

// ---------------- Comments ----------------

async function submitComment(payload: { body: string; mentionedUserIds: string[] }) {
  if (!props.task?.id) return
  try {
    const c = await tasksService.createComment(props.task.id, payload)
    comments.value = [...comments.value, c]
    await refreshActivity()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function removeComment(id: string) {
  try {
    await tasksService.deleteComment(id)
    comments.value = comments.value.filter((c) => c.id !== id)
    pendingDeleteCommentId.value = null
    await refreshActivity()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

function beginEditComment(id: string) {
  editingCommentId.value = id
}

async function saveEditedComment(
  id: string,
  payload: { body: string; mentionedUserIds: string[] },
) {
  try {
    const updated = await tasksService.updateComment(id, payload)
    comments.value = comments.value.map((c) => (c.id === id ? updated : c))
    editingCommentId.value = null
    await refreshActivity()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

// ---------------- Activity ----------------

async function refreshActivity() {
  if (!props.task?.id) return
  try {
    activities.value = await tasksService.listActivity(props.task.id)
  } catch {
    /* ignore */
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return formatTimestamp(iso)
}

function initials(name: string | undefined): string {
  const v = (name ?? '?').trim()
  return (
    v
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || '?'
  )
}

function activityLabel(a: TaskActivity): string {
  const payload = (a.payload ?? {}) as Record<string, unknown>
  switch (a.type) {
    case 'created':
      return t('taskModal.activityCreated')
    case 'state_changed':
      return t('taskModal.activityStateChanged', {
        to: t(`taskState.${String(payload.to ?? '')}`, String(payload.to ?? '')),
      })
    case 'status_changed':
      return t('taskModal.activityStatusChanged')
    case 'priority_changed':
      return t('taskModal.activityPriorityChanged')
    case 'due_date_changed':
      return t('taskModal.activityDueChanged')
    case 'assignee_added':
      return t('taskModal.activityAssigneeAdded')
    case 'assignee_removed':
      return t('taskModal.activityAssigneeRemoved')
    case 'watcher_added':
      return t('taskModal.activityWatcherAdded')
    case 'watcher_removed':
      return t('taskModal.activityWatcherRemoved')
    case 'tag_added':
      return t('taskModal.activityTagAdded', { name: String(payload.name ?? '') })
    case 'tag_removed':
      return t('taskModal.activityTagRemoved')
    case 'cover_changed':
      return t('taskModal.activityCoverChanged')
    case 'checklist_added':
      return t('taskModal.activityChecklistAdded', { title: String(payload.title ?? '') })
    case 'checklist_removed':
      return t('taskModal.activityChecklistRemoved')
    case 'checklist_item_added':
      return t('taskModal.activityChecklistItemAdded', {
        content: String(payload.content ?? '').slice(0, 40),
      })
    case 'checklist_item_completed':
      return t('taskModal.activityChecklistItemCompleted', {
        content: String(payload.content ?? '').slice(0, 40),
      })
    case 'checklist_item_uncompleted':
      return t('taskModal.activityChecklistItemUncompleted', {
        content: String(payload.content ?? '').slice(0, 40),
      })
    case 'checklist_item_removed':
      return t('taskModal.activityChecklistItemRemoved')
    case 'comment_added':
      return t('taskModal.activityCommentAdded')
    case 'comment_edited':
      return t('taskModal.activityCommentEdited')
    case 'comment_removed':
      return t('taskModal.activityCommentRemoved')
    default:
      return t('taskModal.activityUpdated', { field: String(payload.field ?? '') })
  }
}

const COVER_SWATCHES = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
]
</script>

<template>
  <Modal
    :open="open"
    :title="task ? t('board.editTask') : t('board.newTask')"
    width="780px"
    @close="emit('close')"
  >
    <div
      v-if="form.coverImageUrl"
      class="h-28 -mt-4 -mx-4 mb-4 rounded-t-lg bg-cover bg-center"
      :style="{ backgroundImage: `url(${form.coverImageUrl})` }"
    ></div>
    <div
      v-else-if="form.coverColor"
      class="h-16 -mt-4 -mx-4 mb-4 rounded-t-lg"
      :style="{ backgroundColor: form.coverColor }"
    ></div>

    <div v-if="error" class="mb-3 p-2 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
      {{ error }}
    </div>

    <!-- Title + state + watch always visible -->
    <div class="flex items-start gap-3 mb-4">
      <input
        v-model="form.title"
        type="text"
        :placeholder="t('board.titlePlaceholder')"
        autofocus
        class="input flex-1 text-base font-semibold"
      />
      <select v-model="form.state" class="select w-40 text-sm">
        <option v-for="s in Object.values(TaskState)" :key="s" :value="s">
          {{ t(`taskState.${s}`) }}
        </option>
      </select>
      <button
        v-if="isEdit"
        type="button"
        class="btn-ghost text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
        @click="toggleWatch"
      >
        <font-awesome-icon
          :icon="isWatching ? 'fa-solid fa-eye' : 'fa-regular fa-eye'"
          class="w-3.5 h-3.5"
        />
        {{ isWatching ? t('taskModal.unwatch') : t('taskModal.watch') }}
      </button>
    </div>

    <!-- Checklist overall progress bar -->
    <div v-if="isEdit && checklistProgress" class="mb-4">
      <div class="flex items-center justify-between mb-1 text-xs text-muted">
        <span>{{ t('taskModal.progress') }}</span>
        <span>{{ checklistProgress.done }}/{{ checklistProgress.total }} · {{ checklistProgress.pct }}%</span>
      </div>
      <div class="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-brand-500 transition-all"
          :style="{ width: checklistProgress.pct + '%' }"
        ></div>
      </div>
    </div>

    <!-- Tabs (only in edit mode) -->
    <div
      v-if="isEdit"
      class="flex gap-1 border-b divider mb-4 -mx-4 px-4 overflow-x-auto"
    >
      <button
        v-for="tab in [
          { id: 'overview' as Tab, label: t('taskModal.tabOverview') },
          { id: 'checklist' as Tab, label: t('taskModal.tabChecklist') },
          { id: 'comments' as Tab, label: t('taskModal.tabComments') },
          { id: 'activity' as Tab, label: t('taskModal.tabActivity') },
        ]"
        :key="tab.id"
        type="button"
        class="px-3 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap"
        :class="
          activeTab === tab.id
            ? 'border-brand-500 text-brand-600 dark:text-brand-400'
            : 'border-transparent text-muted hover:text-app'
        "
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- OVERVIEW -->
    <div v-show="!isEdit || activeTab === 'overview'" class="space-y-4">
      <div>
        <label class="label">{{ t('taskModal.shortDescription') }}</label>
        <input
          v-model="form.shortDescription"
          type="text"
          maxlength="280"
          :placeholder="t('taskModal.shortDescriptionPlaceholder')"
          class="input"
        />
      </div>

      <div>
        <label class="label">{{ t('taskModal.longDescription') }}</label>
        <RichTextEditor
          v-model="form.longDescription"
          :placeholder="t('taskModal.longDescriptionPlaceholder')"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="label">{{ t('taskModal.startDate') }}</label>
          <input v-model="form.startDate" type="date" class="input" />
        </div>
        <div>
          <label class="label">{{ t('taskModal.dueDate') }}</label>
          <input v-model="form.dueDate" type="date" class="input" />
        </div>
        <div>
          <label class="label">{{ t('taskModal.estimatedCompletion') }}</label>
          <input v-model="form.estimatedCompletionDate" type="date" class="input" />
        </div>
      </div>

      <div>
        <label class="label">{{ t('taskModal.priority') }}</label>
        <select v-model="form.priorityId" class="select">
          <option value="">{{ t('common.none') }}</option>
          <option v-for="p in sortedPriorities" :key="p.id" :value="p.id">
            {{ p.name }}
          </option>
        </select>
      </div>

      <div>
        <label class="label">{{ t('taskModal.assignees') }}</label>
        <MultiUserPicker
          v-model="assignees"
          :suggestions="projectMembers"
          :placeholder="t('users.searchPlaceholder')"
        />
      </div>

      <div>
        <label class="label">{{ t('taskModal.watchers') }}</label>
        <MultiUserPicker
          v-model="watchers"
          :suggestions="projectMembers"
          :placeholder="t('users.searchPlaceholder')"
        />
      </div>

      <div>
        <label class="label">{{ t('taskModal.tags') }}</label>
        <TagPicker
          :model-value="selectedTags"
          :suggestions="projectTags"
          can-create
          @attach="onAttachTag"
          @create="onCreateTag"
          @detach="onDetachTag"
        />
      </div>

      <div>
        <label class="label">{{ t('taskModal.cover') }}</label>
        <div class="flex items-center gap-2 flex-wrap mb-2">
          <button
            v-for="c in COVER_SWATCHES"
            :key="c"
            type="button"
            class="w-7 h-7 rounded-full border-2 transition"
            :style="{ backgroundColor: c }"
            :class="form.coverColor === c ? 'border-app scale-110' : 'border-transparent'"
            @click="form.coverColor = form.coverColor === c ? '' : c"
          />
          <button
            type="button"
            class="w-7 h-7 rounded-full border-2 border-slate-300 dark:border-slate-600 inline-flex items-center justify-center text-slate-400"
            :title="t('common.none')"
            @click="form.coverColor = ''"
          >
            <font-awesome-icon icon="fa-solid fa-xmark" class="w-3 h-3" />
          </button>
        </div>
        <input
          v-model="form.coverImageUrl"
          type="url"
          :placeholder="t('taskModal.coverImagePlaceholder')"
          class="input text-sm"
        />
      </div>
    </div>

    <!-- CHECKLIST -->
    <div v-if="isEdit" v-show="activeTab === 'checklist'" class="space-y-4">
      <div v-if="checklists.length === 0 && !addingChecklist" class="text-sm text-muted">
        {{ t('taskModal.noChecklists') }}
      </div>

      <div
        v-for="cl in checklists"
        :key="cl.id"
        class="border divider rounded-lg p-3"
      >
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-semibold text-app">{{ cl.title }}</p>
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted">{{ checklistPct(cl) }}%</span>
            <button
              type="button"
              class="text-subtle hover:text-red-500"
              :aria-label="t('common.delete')"
              @click="pendingDeleteChecklistId = cl.id"
            >
              <font-awesome-icon icon="fa-solid fa-trash" class="w-3 h-3" />
            </button>
          </div>
        </div>
        <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
          <div
            class="h-full bg-brand-500 transition-all"
            :style="{ width: checklistPct(cl) + '%' }"
          />
        </div>
        <ul class="space-y-1.5">
          <li
            v-for="item in cl.items"
            :key="item.id"
            class="flex items-center gap-2 group"
          >
            <input
              type="checkbox"
              :checked="item.isCompleted"
              class="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
              @change="toggleItem(cl.id, item.id, !item.isCompleted)"
            />
            <span
              class="flex-1 text-sm text-app"
              :class="item.isCompleted ? 'line-through text-subtle' : ''"
            >
              {{ item.content }}
            </span>
            <button
              type="button"
              class="opacity-0 group-hover:opacity-100 text-subtle hover:text-red-500 transition"
              :aria-label="t('common.delete')"
              @click="removeItem(cl.id, item.id)"
            >
              <font-awesome-icon icon="fa-solid fa-xmark" class="w-3 h-3" />
            </button>
          </li>
        </ul>

        <div v-if="itemInputOpen[cl.id]" class="mt-2 flex gap-2">
          <input
            v-model="newItemDrafts[cl.id]"
            type="text"
            class="input flex-1 text-sm"
            :placeholder="t('taskModal.itemPlaceholder')"
            @keydown.enter.prevent="addItem(cl.id)"
            @keydown.esc="itemInputOpen[cl.id] = false"
          />
          <button class="btn-primary text-sm" @click="addItem(cl.id)">
            {{ t('common.add') }}
          </button>
          <button
            class="btn-ghost text-sm"
            @click="itemInputOpen[cl.id] = false"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
        <button
          v-else
          type="button"
          class="mt-2 text-sm text-muted hover:text-brand-600 inline-flex items-center gap-1"
          @click="itemInputOpen[cl.id] = true"
        >
          <font-awesome-icon icon="fa-solid fa-plus" class="w-2.5 h-2.5" />
          {{ t('taskModal.addItem') }}
        </button>
      </div>

      <div v-if="addingChecklist" class="flex gap-2">
        <input
          v-model="newChecklistTitle"
          type="text"
          :placeholder="t('taskModal.checklistTitle')"
          class="input flex-1"
          @keydown.enter.prevent="addChecklist"
          @keydown.esc="addingChecklist = false"
        />
        <button class="btn-primary" @click="addChecklist">{{ t('common.add') }}</button>
        <button class="btn-ghost" @click="addingChecklist = false">
          {{ t('common.cancel') }}
        </button>
      </div>
      <button
        v-else
        type="button"
        class="btn-ghost text-sm inline-flex items-center gap-1.5"
        @click="addingChecklist = true"
      >
        <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
        {{ t('taskModal.addChecklist') }}
      </button>
    </div>

    <!-- COMMENTS -->
    <div v-if="isEdit" v-show="activeTab === 'comments'" class="space-y-4">
      <div v-if="comments.length === 0" class="text-sm text-muted">
        {{ t('taskModal.noComments') }}
      </div>
      <div
        v-for="c in comments"
        :key="c.id"
        class="flex gap-3"
      >
        <div
          class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-app flex items-center justify-center text-[11px] font-semibold shrink-0"
        >
          {{ initials(c.user?.name) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 text-xs mb-1 flex-wrap">
            <span class="font-semibold text-app">{{ c.user?.name ?? '—' }}</span>
            <span class="text-subtle">{{ formatRelative(c.createdAt) }}</span>
            <span v-if="c.editedAt" class="text-subtle italic">
              ({{ t('common.edited') }})
            </span>
            <template v-if="c.userId === currentUserId">
              <button
                v-if="editingCommentId !== c.id"
                class="text-subtle hover:text-brand-600 ml-auto"
                @click="beginEditComment(c.id)"
              >
                <font-awesome-icon icon="fa-solid fa-pencil" class="w-3 h-3" />
              </button>
              <button
                v-if="editingCommentId !== c.id"
                class="text-subtle hover:text-red-500"
                @click="pendingDeleteCommentId = c.id"
              >
                <font-awesome-icon icon="fa-solid fa-trash" class="w-3 h-3" />
              </button>
            </template>
          </div>
          <div
            v-if="editingCommentId !== c.id"
            class="text-sm text-app whitespace-pre-wrap break-words"
          >
            {{ c.body }}
          </div>
          <CommentInput
            v-else
            :initial-body="c.body"
            :members="projectMembers"
            :submit-label="t('common.saveChanges')"
            @submit="(p) => saveEditedComment(c.id, p)"
            @cancel="editingCommentId = null"
          />
        </div>
      </div>

      <div class="pt-2 border-t divider">
        <CommentInput :members="projectMembers" @submit="submitComment" @cancel="() => {}" />
      </div>
    </div>

    <!-- ACTIVITY -->
    <div v-if="isEdit" v-show="activeTab === 'activity'" class="space-y-3">
      <div v-if="activities.length === 0" class="text-sm text-muted">
        {{ t('taskModal.noActivity') }}
      </div>
      <div
        v-for="a in activities"
        :key="a.id"
        class="flex items-start gap-3 text-sm"
      >
        <div
          class="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-subtle flex items-center justify-center text-[10px] font-semibold shrink-0"
        >
          {{ initials(a.user?.name) }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-app">
            <span class="font-semibold">{{ a.user?.name ?? '—' }}</span>
            <span class="text-muted"> {{ activityLabel(a) }}</span>
          </p>
          <p class="text-xs text-subtle">{{ formatRelative(a.createdAt) }}</p>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn-ghost" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button
        class="btn-primary"
        :disabled="!form.title.trim() || loading"
        @click="onSave"
      >
        {{ task ? t('common.saveChanges') : t('common.create') }}
      </button>
    </template>

    <ConfirmDialog
      :open="pendingDeleteChecklistId !== null"
      :title="t('taskModal.deleteChecklistTitle')"
      :message="t('taskModal.deleteChecklistBody')"
      :confirm-text="t('common.delete')"
      tone="danger"
      @confirm="pendingDeleteChecklistId && removeChecklist(pendingDeleteChecklistId)"
      @cancel="pendingDeleteChecklistId = null"
    />
    <ConfirmDialog
      :open="pendingDeleteCommentId !== null"
      :title="t('taskModal.deleteCommentTitle')"
      :message="t('taskModal.deleteCommentBody')"
      :confirm-text="t('common.delete')"
      tone="danger"
      @confirm="pendingDeleteCommentId && removeComment(pendingDeleteCommentId)"
      @cancel="pendingDeleteCommentId = null"
    />
  </Modal>
</template>
