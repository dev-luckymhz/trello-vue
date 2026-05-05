<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type {
  Checklist,
  Priority,
  Tag,
  Task,
  TaskActivity,
  TaskComment,
  TaskProgressSnapshot,
  TaskRecurrence,
} from '@/types'
import { TaskState } from '@/types'
import RichTextEditor from './RichTextEditor.vue'
import CommentInput from './CommentInput.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import TaskSectionCard from './TaskSectionCard.vue'
import TaskAttachmentsTab from './TaskAttachmentsTab.vue'
import TaskDependenciesTab from './TaskDependenciesTab.vue'
import TaskTimeTab from './TaskTimeTab.vue'
import TaskRecurrenceSection from './TaskRecurrenceSection.vue'
import TaskCustomFieldsSection from './TaskCustomFieldsSection.vue'
import LabelsPopover from './LabelsPopover.vue'
import DatesPopover from './DatesPopover.vue'
import MembersPopover from './MembersPopover.vue'
import AttachmentPopover from './AttachmentPopover.vue'
import ChecklistPopover from './ChecklistPopover.vue'
import CoverPopover from './CoverPopover.vue'
import { tasksService } from '@/services/tasks.service'
import { tagsService } from '@/services/tags.service'
import { projectsService } from '@/services/projects.service'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/services/api'
import type { UserSearchResult } from '@/services/users.service'

const props = defineProps<{
  /** Existing task (for edit mode) OR null for create mode. */
  task: Task | null
  priorities: Priority[]
  projectId: string
  /** `modal` = compact, sidebar on the right. `page` = full-width, wider columns. */
  variant?: 'modal' | 'page'
  /** When true, shows an "Open in full view" icon button. Relevant only for the modal. */
  showOpenInPage?: boolean
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
      estimatedHours: number | null
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
const router = useRouter()

const variant = computed(() => props.variant ?? 'modal')
const isPage = computed(() => variant.value === 'page')

// Popover state.
type PopoverKind =
  | 'labels'
  | 'members'
  | 'watchers'
  | 'dates'
  | 'cover'
  | 'attachment'
  | 'checklistAdd'
const openPopover = ref<PopoverKind | null>(null)
const popoverAnchor = ref<HTMLElement | null>(null)

function triggerPopover(event: MouseEvent, kind: PopoverKind) {
  popoverAnchor.value = event.currentTarget as HTMLElement
  openPopover.value = kind
}
function closePopover() {
  openPopover.value = null
  popoverAnchor.value = null
}

const form = reactive({
  title: '',
  shortDescription: '',
  longDescription: '',
  description: '',
  state: TaskState.TODO as TaskState,
  startDate: null as string | null,
  dueDate: null as string | null,
  estimatedCompletionDate: '' as string,
  coverColor: null as string | null,
  coverImageUrl: null as string | null,
  priorityId: '' as string,
  estimatedHours: null as number | null,
})

const assignees = ref<UserSearchResult[]>([])
const watchers = ref<UserSearchResult[]>([])
const selectedTags = ref<Tag[]>([])
const projectTags = ref<Tag[]>([])
const projectMembers = ref<UserSearchResult[]>([])

const checklists = ref<Checklist[]>([])
const comments = ref<TaskComment[]>([])
const activities = ref<TaskActivity[]>([])
const recurrence = ref<TaskRecurrence | null>(null)
const progress = ref<TaskProgressSnapshot | null>(null)

const loading = ref(false)
const error = ref<string | null>(null)
const editingLongDesc = ref(false)
const pendingDeleteChecklistId = ref<string | null>(null)
const pendingDeleteCommentId = ref<string | null>(null)
const editingCommentId = ref<string | null>(null)
const newItemDrafts = reactive<Record<string, string>>({})
const itemInputOpen = reactive<Record<string, boolean>>({})
const feedFilter = ref<'all' | 'comments' | 'updates'>('all')

const isEdit = computed(() => Boolean(props.task?.id))
const currentUserId = computed(() => auth.user?.id ?? null)
const isWatching = computed(
  () => !!watchers.value.find((w) => w.id === currentUserId.value),
)

const sortedPriorities = computed(() =>
  [...props.priorities].sort((a, b) => a.rank - b.rank),
)

const dueDateOverdue = computed(() => {
  if (!form.dueDate) return false
  const d = new Date(form.dueDate)
  d.setHours(23, 59, 59)
  return d < new Date()
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
  form.startDate = task?.startDate ?? null
  form.dueDate = task?.dueDate ?? null
  form.estimatedCompletionDate = task?.estimatedCompletionDate ?? ''
  form.coverColor = task?.coverColor ?? null
  form.coverImageUrl = task?.coverImageUrl ?? null
  form.priorityId = task?.priorityId ?? defaultPriority()
  form.estimatedHours = task?.estimatedHours ?? null
  assignees.value = (task?.assignees ?? [])
    .map((a) => (a.user ? { id: a.user.id, name: a.user.name, email: a.user.email } : null))
    .filter((u): u is UserSearchResult => u !== null)
  watchers.value = (task?.watchers ?? [])
    .map((w) => (w.user ? { id: w.user.id, name: w.user.name, email: w.user.email } : null))
    .filter((u): u is UserSearchResult => u !== null)
  selectedTags.value = (task?.taskTags ?? [])
    .map((tt) => tt.tag ?? null)
    .filter((tag): tag is Tag => tag !== null)
  editingLongDesc.value = false
}

async function loadTaskDetails(taskId: string) {
  loading.value = true
  error.value = null
  try {
    const [full, ck, cm, ac, rec, prog] = await Promise.all([
      tasksService.get(taskId),
      tasksService.listChecklists(taskId),
      tasksService.listComments(taskId),
      tasksService.listActivity(taskId),
      tasksService.getRecurrence(taskId),
      tasksService.progress(taskId),
    ])
    resetForm(full)
    checklists.value = ck
    comments.value = cm
    activities.value = ac
    recurrence.value = rec
    progress.value = prog
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

// Re-init whenever the task prop changes (also fires on mount thanks to `immediate`).
watch(
  () => props.task?.id ?? null,
  async (taskId) => {
    closePopover()
    error.value = null
    resetForm(props.task ?? null)
    await loadProjectContext()
    if (taskId) {
      await loadTaskDetails(taskId)
    } else {
      checklists.value = []
      comments.value = []
      activities.value = []
      recurrence.value = null
      progress.value = null
    }
  },
  { immediate: true },
)

function openInPage() {
  if (!props.task?.id) return
  router.push({
    name: 'task-detail',
    params: { projectId: props.projectId, taskId: props.task.id },
  })
  emit('close')
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
      startDate: form.startDate,
      dueDate: form.dueDate,
      estimatedCompletionDate: form.estimatedCompletionDate || null,
      coverColor: form.coverColor,
      coverImageUrl: form.coverImageUrl,
      priorityId: form.priorityId || null,
      estimatedHours: form.estimatedHours ?? null,
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
      startDate: form.startDate,
      dueDate: form.dueDate,
      estimatedCompletionDate: form.estimatedCompletionDate || null,
      coverColor: form.coverColor,
      coverImageUrl: form.coverImageUrl,
      priorityId: form.priorityId || null,
      estimatedHours: form.estimatedHours ?? null,
    } as Partial<Task>)
    const initialAssignees = (props.task!.assignees ?? [])
      .map((a) => a.userId)
      .sort()
      .join(',')
    const currentAssignees = assignees.value.map((u) => u.id).sort().join(',')
    if (initialAssignees !== currentAssignees) {
      await tasksService.setAssignees(taskId, assignees.value.map((u) => u.id))
    }
    const initialWatchers = (props.task!.watchers ?? [])
      .map((w) => w.userId)
      .sort()
      .join(',')
    const currentWatchers = watchers.value.map((u) => u.id).sort().join(',')
    if (initialWatchers !== currentWatchers) {
      await tasksService.setWatchers(taskId, watchers.value.map((u) => u.id))
    }
    const fresh = await tasksService.get(taskId)
    emit('updated', { ...updated, ...fresh } as Task)
    editingLongDesc.value = false
    await Promise.all([refreshActivity(), refreshProgress()])
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

// --- Labels ---

async function onAttachLabel(tag: Tag) {
  if (!props.task?.id) {
    if (!selectedTags.value.some((t) => t.id === tag.id)) {
      selectedTags.value = [...selectedTags.value, tag]
    }
    return
  }
  try {
    await tasksService.attachTag(props.task.id, { tagId: tag.id })
    if (!selectedTags.value.some((t) => t.id === tag.id)) {
      selectedTags.value = [...selectedTags.value, tag]
    }
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function onCreateLabel(payload: { name: string; color: string }) {
  try {
    let tag: Tag
    if (props.task?.id) {
      tag = await tasksService.attachTag(props.task.id, payload)
    } else {
      tag = await tagsService.attachToProject(props.projectId, payload)
    }
    projectTags.value = projectTags.value.some((tg) => tg.id === tag.id)
      ? projectTags.value.map((tg) => (tg.id === tag.id ? tag : tg))
      : [...projectTags.value, tag]
    if (!selectedTags.value.some((t) => t.id === tag.id)) {
      selectedTags.value = [...selectedTags.value, tag]
    }
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function onDetachLabel(tag: Tag) {
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

// --- Members ---

async function onAddMember(user: UserSearchResult) {
  if (assignees.value.some((u) => u.id === user.id)) return
  assignees.value = [...assignees.value, user]
  if (props.task?.id) {
    try {
      await tasksService.setAssignees(props.task.id, assignees.value.map((u) => u.id))
      await refreshActivity()
    } catch (err) {
      error.value = extractErrorMessage(err)
      assignees.value = assignees.value.filter((u) => u.id !== user.id)
    }
  }
}

async function onRemoveMember(user: UserSearchResult) {
  const next = assignees.value.filter((u) => u.id !== user.id)
  assignees.value = next
  if (props.task?.id) {
    try {
      await tasksService.setAssignees(props.task.id, next.map((u) => u.id))
      await refreshActivity()
    } catch (err) {
      error.value = extractErrorMessage(err)
    }
  }
}

async function onAddWatcher(user: UserSearchResult) {
  if (watchers.value.some((u) => u.id === user.id)) return
  watchers.value = [...watchers.value, user]
  if (props.task?.id) {
    try {
      await tasksService.setWatchers(props.task.id, watchers.value.map((u) => u.id))
    } catch (err) {
      error.value = extractErrorMessage(err)
      watchers.value = watchers.value.filter((u) => u.id !== user.id)
    }
  }
}

async function onRemoveWatcher(user: UserSearchResult) {
  const next = watchers.value.filter((u) => u.id !== user.id)
  watchers.value = next
  if (props.task?.id) {
    try {
      await tasksService.setWatchers(props.task.id, next.map((u) => u.id))
    } catch (err) {
      error.value = extractErrorMessage(err)
    }
  }
}

async function persistDates() {
  if (!props.task?.id) return
  try {
    const updated = await projectsService.updateTask(props.task.id, {
      startDate: form.startDate,
      dueDate: form.dueDate,
    } as Partial<Task>)
    emit('updated', updated as Task)
    await refreshActivity()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

async function persistCover() {
  if (!props.task?.id) return
  try {
    const updated = await projectsService.updateTask(props.task.id, {
      coverColor: form.coverColor,
      coverImageUrl: form.coverImageUrl,
    } as Partial<Task>)
    emit('updated', updated as Task)
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

// --- Checklists ---

async function addChecklistFromPopover(title: string) {
  if (!props.task?.id) return
  try {
    const cl = await tasksService.createChecklist(props.task.id, { title })
    checklists.value = [...checklists.value, { ...cl, items: cl.items ?? [] }]
    await refreshActivity()
    await refreshProgress()
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
    await refreshProgress()
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
    await refreshProgress()
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
    await refreshProgress()
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
    await refreshProgress()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}

function checklistPct(cl: Checklist): number {
  if (cl.items.length === 0) return 0
  const done = cl.items.filter((i) => i.isCompleted).length
  return Math.round((done / cl.items.length) * 100)
}

// --- Comments ---

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

// --- Activity / Progress ---

async function refreshActivity() {
  if (!props.task?.id) return
  try { activities.value = await tasksService.listActivity(props.task.id) } catch { /* ignore */ }
}

async function refreshProgress() {
  if (!props.task?.id) return
  try { progress.value = await tasksService.progress(props.task.id) } catch { /* ignore */ }
}

async function refreshAttachments() {
  await refreshActivity()
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale.value, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
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

function formatDateChip(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
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
    case 'created': return t('taskModal.activityCreated')
    case 'state_changed':
      return t('taskModal.activityStateChanged', {
        to: t(`taskState.${String(payload.to ?? '')}`, String(payload.to ?? '')),
      })
    case 'status_changed': return t('taskModal.activityStatusChanged')
    case 'priority_changed': return t('taskModal.activityPriorityChanged')
    case 'due_date_changed': return t('taskModal.activityDueChanged')
    case 'assignee_added': return t('taskModal.activityAssigneeAdded')
    case 'assignee_removed': return t('taskModal.activityAssigneeRemoved')
    case 'watcher_added': return t('taskModal.activityWatcherAdded')
    case 'watcher_removed': return t('taskModal.activityWatcherRemoved')
    case 'tag_added': return t('taskModal.activityTagAdded', { name: String(payload.name ?? '') })
    case 'tag_removed': return t('taskModal.activityTagRemoved')
    case 'cover_changed': return t('taskModal.activityCoverChanged')
    case 'checklist_added': return t('taskModal.activityChecklistAdded', { title: String(payload.title ?? '') })
    case 'checklist_removed': return t('taskModal.activityChecklistRemoved')
    case 'checklist_item_added':
      return t('taskModal.activityChecklistItemAdded', { content: String(payload.content ?? '').slice(0, 40) })
    case 'checklist_item_completed':
      return t('taskModal.activityChecklistItemCompleted', { content: String(payload.content ?? '').slice(0, 40) })
    case 'checklist_item_uncompleted':
      return t('taskModal.activityChecklistItemUncompleted', { content: String(payload.content ?? '').slice(0, 40) })
    case 'checklist_item_removed': return t('taskModal.activityChecklistItemRemoved')
    case 'comment_added': return t('taskModal.activityCommentAdded')
    case 'comment_edited': return t('taskModal.activityCommentEdited')
    case 'comment_removed': return t('taskModal.activityCommentRemoved')
    case 'attachment_added': return t('taskModal.activityAttachmentAdded', { name: String(payload.name ?? '') })
    case 'attachment_removed': return t('taskModal.activityAttachmentRemoved')
    case 'dependency_added': return t('taskModal.activityDependencyAdded')
    case 'dependency_removed': return t('taskModal.activityDependencyRemoved')
    case 'estimated_hours_changed': return t('taskModal.activityEstimatedHoursChanged')
    case 'time_logged': return t('taskModal.activityTimeLogged', { hours: String(payload.hours ?? '') })
    case 'time_log_removed': return t('taskModal.activityTimeLogRemoved')
    default: return t('taskModal.activityUpdated', { field: String(payload.field ?? '') })
  }
}

// Sidebar buttons. Popover-type works in both create + edit; scroll-type only
// in edit mode because those sections need a saved task.
interface SidebarItem {
  id: string
  icon: string
  label: string
  accent: 'sky' | 'purple' | 'amber' | 'pink' | 'emerald' | 'indigo' | 'rose' | 'violet' | 'teal'
  kind: 'popover' | 'scroll'
  popover?: PopoverKind
  sectionKey?: string
  editOnly?: boolean
}

const sidebarItems = computed<SidebarItem[]>(() => [
  { id: 'members',   icon: 'fa-solid fa-user-plus',     label: t('taskModal.sidebarMembers'),       accent: 'sky',     kind: 'popover', popover: 'members' },
  { id: 'labels',    icon: 'fa-solid fa-tag',           label: t('taskModal.sidebarLabels'),        accent: 'purple',  kind: 'popover', popover: 'labels' },
  { id: 'dates',     icon: 'fa-solid fa-clock',         label: t('taskModal.sidebarDates'),         accent: 'amber',   kind: 'popover', popover: 'dates' },
  { id: 'cover',     icon: 'fa-solid fa-image',         label: t('taskModal.sidebarCover'),         accent: 'pink',    kind: 'popover', popover: 'cover' },
  { id: 'check',     icon: 'fa-solid fa-square-check',  label: t('taskModal.sidebarChecklist'),     accent: 'emerald', kind: 'popover', popover: 'checklistAdd', editOnly: true },
  { id: 'attach',    icon: 'fa-solid fa-paperclip',     label: t('taskModal.sidebarAttachment'),    accent: 'indigo',  kind: 'popover', popover: 'attachment',   editOnly: true },
  { id: 'deps',      icon: 'fa-solid fa-diagram-project', label: t('taskModal.tabDependencies'),    accent: 'rose',    kind: 'scroll',  sectionKey: 'dependencies', editOnly: true },
  { id: 'time',      icon: 'fa-solid fa-hourglass-half', label: t('taskModal.tabTime'),             accent: 'violet',  kind: 'scroll',  sectionKey: 'time', editOnly: true },
  { id: 'custom',    icon: 'fa-solid fa-list-check',    label: t('taskModal.sidebarCustomFields'),  accent: 'teal',    kind: 'scroll',  sectionKey: 'custom', editOnly: true },
  { id: 'recurring', icon: 'fa-solid fa-rotate',        label: t('taskModal.sidebarRecurrence'),    accent: 'violet',  kind: 'scroll',  sectionKey: 'recurrence', editOnly: true },
])

function onSidebarClick(event: MouseEvent, item: SidebarItem) {
  if (item.editOnly && !isEdit.value) return
  if (item.kind === 'popover' && item.popover) {
    triggerPopover(event, item.popover)
    return
  }
  if (item.kind === 'scroll' && item.sectionKey) {
    setTimeout(() => {
      const el = document.querySelector(`[data-section="${item.sectionKey}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }
}

const progressTone = computed(() => {
  const p = progress.value?.percent ?? 0
  if (p >= 100) return 'bg-emerald-500'
  if (p >= 60) return 'bg-brand-500'
  if (p >= 30) return 'bg-amber-500'
  return 'bg-rose-500'
})

const stateToneMap: Record<TaskState, string> = {
  [TaskState.TODO]: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  [TaskState.IN_PROGRESS]: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  [TaskState.IN_REVIEW]: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  [TaskState.BLOCKED]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  [TaskState.DONE]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  [TaskState.ARCHIVED]: 'bg-slate-200 text-slate-600 dark:bg-slate-900 dark:text-slate-400',
}

const filteredFeed = computed(() => {
  type FeedItem =
    | { kind: 'comment'; id: string; createdAt: string; comment: TaskComment }
    | { kind: 'activity'; id: string; createdAt: string; activity: TaskActivity }
  const items: FeedItem[] = []
  if (feedFilter.value !== 'updates') {
    for (const c of comments.value) items.push({ kind: 'comment', id: c.id, createdAt: c.createdAt, comment: c })
  }
  if (feedFilter.value !== 'comments') {
    for (const a of activities.value) {
      if (feedFilter.value === 'all' && a.type.startsWith('comment_')) continue
      items.push({ kind: 'activity', id: a.id, createdAt: a.createdAt, activity: a })
    }
  }
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

// Expose for parent chrome (page view wants to render the title / Save button in its own header).
defineExpose({
  formTitle: computed(() => form.title),
  canSave: computed(() => Boolean(form.title.trim()) && !loading.value),
  onSave,
  loading,
})
</script>

<template>
  <div>
    <!-- Cover -->
    <div
      v-if="form.coverImageUrl"
      class="rounded-t-lg bg-cover bg-center"
      :class="isPage ? 'h-40 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4' : 'h-28 -mt-4 -mx-4 mb-4'"
      :style="{ backgroundImage: `url(${form.coverImageUrl})` }"
    ></div>
    <div
      v-else-if="form.coverColor"
      class="rounded-t-lg"
      :class="isPage ? 'h-16 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4' : 'h-12 -mt-4 -mx-4 mb-4'"
      :style="{ backgroundColor: form.coverColor }"
    ></div>

    <div v-if="error" class="mb-3 p-2 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
      {{ error }}
    </div>

    <!-- HERO TITLE -->
    <div class="flex items-start gap-3 mb-4">
      <font-awesome-icon icon="fa-regular fa-credit-card" class="w-5 h-5 mt-2.5 text-subtle shrink-0" />
      <input
        v-model="form.title"
        type="text"
        :placeholder="t('board.titlePlaceholder')"
        class="flex-1 font-bold text-app bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-brand-500 dark:focus:border-brand-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-900/40 transition"
        :class="isPage ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'"
      />
      <button
        v-if="isEdit && showOpenInPage && !isPage"
        type="button"
        class="mt-2 shrink-0 w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-muted hover:text-app hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center justify-center transition"
        :title="t('taskModal.openInPage')"
        @click="openInPage"
      >
        <font-awesome-icon icon="fa-solid fa-up-right-and-down-left-from-center" class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- 2-column layout -->
    <div
      class="flex flex-col gap-5"
      :class="isPage ? 'lg:flex-row lg:gap-6' : 'lg:flex-row'"
    >
      <!-- MAIN -->
      <div class="flex-1 min-w-0 space-y-4">
        <!-- CHIP STRIP -->
        <div class="flex flex-wrap gap-x-5 gap-y-3 items-start">
          <!-- Labels -->
          <div class="min-w-0">
            <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1">
              {{ t('taskModal.tags') }}
            </p>
            <div class="flex flex-wrap items-center gap-1.5">
              <button
                v-for="tg in selectedTags"
                :key="tg.id"
                type="button"
                class="h-7 px-3 rounded-md text-xs font-semibold text-white transition hover:brightness-110"
                :style="{ backgroundColor: tg.color ?? '#64748b' }"
                @click="(e) => triggerPopover(e, 'labels')"
              >
                {{ tg.name }}
              </button>
              <button
                type="button"
                class="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-800 text-muted hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center justify-center transition"
                @click="(e) => triggerPopover(e, 'labels')"
              >
                <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
              </button>
            </div>
          </div>

          <!-- Members -->
          <div class="min-w-0">
            <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1">
              {{ t('taskModal.assignees') }}
            </p>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="flex -space-x-1.5"
                @click="(e) => triggerPopover(e, 'members')"
              >
                <span
                  v-for="(u, idx) in assignees.slice(0, 4)"
                  :key="u.id"
                  class="w-7 h-7 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 hover:brightness-110 transition"
                  :title="u.name"
                  :style="{ zIndex: 10 - idx }"
                >
                  {{ initials(u.name) }}
                </span>
                <span
                  v-if="assignees.length > 4"
                  class="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-app text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900"
                >
                  +{{ assignees.length - 4 }}
                </span>
              </button>
              <button
                type="button"
                class="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-muted hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center justify-center transition"
                @click="(e) => triggerPopover(e, 'members')"
              >
                <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
              </button>
            </div>
          </div>

          <!-- Dates -->
          <div>
            <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1">
              {{ t('taskModal.sidebarDates') }}
            </p>
            <button
              v-if="form.startDate || form.dueDate"
              type="button"
              class="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition"
              :class="
                dueDateOverdue
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 hover:bg-rose-200'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200'
              "
              @click="(e) => triggerPopover(e, 'dates')"
            >
              <font-awesome-icon icon="fa-regular fa-clock" class="w-3 h-3" />
              <span v-if="form.startDate && form.dueDate">
                {{ formatDateChip(form.startDate) }} → {{ formatDateChip(form.dueDate) }}
              </span>
              <span v-else>{{ formatDateChip(form.startDate || form.dueDate) }}</span>
            </button>
            <button
              v-else
              type="button"
              class="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-800 text-muted hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center justify-center transition"
              @click="(e) => triggerPopover(e, 'dates')"
            >
              <font-awesome-icon icon="fa-solid fa-plus" class="w-3 h-3" />
            </button>
          </div>

          <!-- State -->
          <div>
            <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1">
              {{ t('taskModal.state') }}
            </p>
            <select
              v-model="form.state"
              class="h-7 text-xs font-semibold rounded-md px-2 pr-6 border-0 focus:ring-2 focus:ring-brand-300 focus:outline-none cursor-pointer"
              :class="stateToneMap[form.state]"
            >
              <option v-for="s in Object.values(TaskState)" :key="s" :value="s">
                {{ t(`taskState.${s}`) }}
              </option>
            </select>
          </div>

          <!-- Watch -->
          <div v-if="isEdit" class="ml-auto">
            <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1">&nbsp;</p>
            <button
              type="button"
              class="h-7 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition"
              :class="
                isWatching
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 hover:bg-brand-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-muted hover:bg-slate-200 dark:hover:bg-slate-700'
              "
              @click="toggleWatch"
            >
              <font-awesome-icon
                :icon="isWatching ? 'fa-solid fa-eye' : 'fa-regular fa-eye'"
                class="w-3 h-3"
              />
              {{ isWatching ? t('taskModal.unwatch') : t('taskModal.watch') }}
            </button>
          </div>
        </div>

        <!-- PROGRESS -->
        <TaskSectionCard
          v-if="isEdit && progress"
          icon="fa-solid fa-chart-line"
          :title="t('taskModal.progressSection')"
          accent="amber"
          :count="`${progress.percent}%`"
        >
          <div class="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
            <div class="h-full transition-all" :class="progressTone" :style="{ width: progress.percent + '%' }" />
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div v-if="progress.components.checklist">
              <p class="text-subtle">{{ t('taskModal.tabChecklist') }}</p>
              <p class="font-semibold text-app">{{ progress.components.checklist.done }}/{{ progress.components.checklist.total }}</p>
            </div>
            <div v-if="progress.components.dependencies">
              <p class="text-subtle">{{ t('taskModal.tabDependencies') }}</p>
              <p class="font-semibold text-app">{{ progress.components.dependencies.resolved }}/{{ progress.components.dependencies.total }}</p>
            </div>
            <div v-if="progress.components.time">
              <p class="text-subtle">{{ t('taskModal.timeLogged') }}</p>
              <p class="font-semibold text-app">{{ progress.components.time.loggedHours }}h / {{ progress.components.time.estimatedHours }}h</p>
            </div>
            <div>
              <p class="text-subtle">{{ t('taskModal.state') }}</p>
              <p class="font-semibold text-app">{{ t(`taskState.${progress.components.state.value}`) }}</p>
            </div>
          </div>
        </TaskSectionCard>

        <!-- DESCRIPTION -->
        <TaskSectionCard icon="fa-solid fa-align-left" :title="t('taskModal.description')" accent="slate">
          <input
            v-model="form.shortDescription"
            type="text"
            maxlength="280"
            :placeholder="t('taskModal.shortDescriptionPlaceholder')"
            class="input text-sm mb-2"
          />
          <div v-if="!editingLongDesc && form.longDescription" class="space-y-2">
            <div
              class="text-sm text-app rich-text-view max-h-48 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-800/60 rounded cursor-text"
              v-html="form.longDescription"
              @click="editingLongDesc = true"
            />
            <button class="text-xs text-brand-600 hover:underline" @click="editingLongDesc = true">
              {{ t('common.edit') }}
            </button>
          </div>
          <RichTextEditor
            v-else
            v-model="form.longDescription"
            :placeholder="t('taskModal.longDescriptionPlaceholder')"
          />
          <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t divider">
            <div>
              <label class="label text-xs">{{ t('taskModal.priority') }}</label>
              <select v-model="form.priorityId" class="select text-sm">
                <option value="">{{ t('common.none') }}</option>
                <option v-for="p in sortedPriorities" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div>
              <label class="label text-xs">{{ t('taskModal.estimatedHours') }}</label>
              <input
                v-model.number="form.estimatedHours"
                type="number"
                step="0.5"
                min="0"
                class="input text-sm"
                placeholder="0"
              />
            </div>
          </div>
        </TaskSectionCard>

        <!-- CHECKLISTS -->
        <TaskSectionCard
          v-if="isEdit && checklists.length"
          data-section="checklist"
          icon="fa-solid fa-square-check"
          :title="t('taskModal.tabChecklist')"
          accent="emerald"
          :count="checklists.length"
        >
          <div v-for="cl in checklists" :key="cl.id" class="mb-3 last:mb-0">
            <div class="flex items-center justify-between mb-1">
              <p class="text-sm font-semibold text-app">{{ cl.title }}</p>
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-muted">{{ checklistPct(cl) }}%</span>
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
            <div class="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
              <div class="h-full bg-emerald-500 transition-all" :style="{ width: checklistPct(cl) + '%' }" />
            </div>
            <ul class="space-y-1">
              <li
                v-for="item in cl.items"
                :key="item.id"
                class="flex items-center gap-2 group py-0.5"
              >
                <input
                  type="checkbox"
                  :checked="item.isCompleted"
                  class="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
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
              <button class="btn-primary text-sm" @click="addItem(cl.id)">{{ t('common.add') }}</button>
            </div>
            <button
              v-else
              type="button"
              class="mt-1 text-xs text-muted hover:text-emerald-600 inline-flex items-center gap-1"
              @click="itemInputOpen[cl.id] = true"
            >
              <font-awesome-icon icon="fa-solid fa-plus" class="w-2.5 h-2.5" />
              {{ t('taskModal.addItem') }}
            </button>
          </div>
        </TaskSectionCard>

        <!-- ATTACHMENTS -->
        <TaskSectionCard
          v-if="isEdit"
          data-section="attachments"
          icon="fa-solid fa-paperclip"
          :title="t('taskModal.tabAttachments')"
          accent="indigo"
        >
          <TaskAttachmentsTab :task-id="task!.id" @changed="refreshActivity" />
        </TaskSectionCard>

        <!-- DEPENDENCIES (always visible in edit) -->
        <TaskSectionCard
          v-if="isEdit"
          data-section="dependencies"
          icon="fa-solid fa-diagram-project"
          :title="t('taskModal.tabDependencies')"
          accent="rose"
        >
          <TaskDependenciesTab
            :task-id="task!.id"
            :project-id="projectId"
            @changed="() => { refreshActivity(); refreshProgress(); }"
          />
        </TaskSectionCard>

        <!-- TIME -->
        <TaskSectionCard
          v-if="isEdit"
          data-section="time"
          icon="fa-solid fa-hourglass-half"
          :title="t('taskModal.timeTitle')"
          accent="violet"
        >
          <TaskTimeTab :task-id="task!.id" @changed="() => { refreshActivity(); refreshProgress(); }" />
        </TaskSectionCard>

        <!-- RECURRENCE -->
        <TaskSectionCard
          v-if="isEdit"
          data-section="recurrence"
          icon="fa-solid fa-rotate"
          :title="t('recurrence.title')"
          accent="violet"
        >
          <TaskRecurrenceSection :task-id="task!.id" @changed="refreshActivity" />
        </TaskSectionCard>

        <!-- CUSTOM FIELDS -->
        <TaskSectionCard
          v-if="isEdit"
          data-section="custom"
          icon="fa-solid fa-list-check"
          :title="t('customFields.title')"
          accent="teal"
        >
          <TaskCustomFieldsSection :task-id="task!.id" :project-id="projectId" @changed="refreshActivity" />
        </TaskSectionCard>

        <!-- ACTIVITY + COMMENTS -->
        <TaskSectionCard
          v-if="isEdit"
          icon="fa-solid fa-comment"
          :title="t('taskModal.activity')"
          accent="slate"
        >
          <div class="mb-3">
            <CommentInput :members="projectMembers" @submit="submitComment" @cancel="() => {}" />
          </div>
          <div class="flex gap-1.5 mb-3">
            <button
              v-for="f in ([
                { id: 'all', label: t('taskModal.feedAll') },
                { id: 'comments', label: t('taskModal.feedComments') },
                { id: 'updates', label: t('taskModal.feedUpdates') },
              ] as const)"
              :key="f.id"
              type="button"
              class="px-2 h-6 rounded text-[11px] font-semibold transition"
              :class="
                feedFilter === f.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-muted hover:bg-slate-200'
              "
              @click="feedFilter = f.id"
            >
              {{ f.label }}
            </button>
          </div>
          <div v-if="filteredFeed.length === 0" class="text-sm text-muted py-3">
            {{ t('taskModal.noComments') }}
          </div>
          <ul class="space-y-3">
            <li v-for="item in filteredFeed" :key="`${item.kind}-${item.id}`" class="flex gap-2.5">
              <div
                class="w-7 h-7 rounded-full text-[10px] font-semibold flex items-center justify-center shrink-0"
                :class="
                  item.kind === 'comment'
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-subtle'
                "
              >
                {{ initials(item.kind === 'comment' ? item.comment.user?.name : item.activity.user?.name) }}
              </div>
              <div v-if="item.kind === 'comment'" class="flex-1 min-w-0">
                <div class="flex items-center gap-2 text-xs mb-0.5 flex-wrap">
                  <span class="font-semibold text-app">{{ item.comment.user?.name ?? '—' }}</span>
                  <span class="text-subtle">{{ formatRelative(item.comment.createdAt) }}</span>
                  <span v-if="item.comment.editedAt" class="text-subtle italic">({{ t('common.edited') }})</span>
                  <template v-if="item.comment.userId === currentUserId">
                    <button
                      v-if="editingCommentId !== item.comment.id"
                      class="text-subtle hover:text-brand-600 ml-auto"
                      @click="beginEditComment(item.comment.id)"
                    >
                      <font-awesome-icon icon="fa-solid fa-pencil" class="w-3 h-3" />
                    </button>
                    <button
                      v-if="editingCommentId !== item.comment.id"
                      class="text-subtle hover:text-red-500"
                      @click="pendingDeleteCommentId = item.comment.id"
                    >
                      <font-awesome-icon icon="fa-solid fa-trash" class="w-3 h-3" />
                    </button>
                  </template>
                </div>
                <div
                  v-if="editingCommentId !== item.comment.id"
                  class="text-sm text-app whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2"
                >
                  {{ item.comment.body }}
                </div>
                <CommentInput
                  v-else
                  :initial-body="item.comment.body"
                  :members="projectMembers"
                  :submit-label="t('common.saveChanges')"
                  @submit="(p) => saveEditedComment(item.comment.id, p)"
                  @cancel="editingCommentId = null"
                />
              </div>
              <div v-else class="flex-1 min-w-0">
                <p class="text-xs">
                  <span class="font-semibold text-app">{{ item.activity.user?.name ?? '—' }}</span>
                  <span class="text-muted"> {{ activityLabel(item.activity) }}</span>
                </p>
                <p class="text-[11px] text-subtle">{{ formatRelative(item.activity.createdAt) }}</p>
              </div>
            </li>
          </ul>
        </TaskSectionCard>
      </div>

      <!-- SIDEBAR -->
      <aside class="w-full shrink-0" :class="isPage ? 'lg:w-56' : 'lg:w-44'">
        <div :class="isPage ? 'lg:sticky lg:top-4' : ''">
          <p class="text-[10px] font-semibold uppercase text-subtle tracking-wide mb-1.5 px-1">
            {{ t('taskModal.sidebarAddToCard') }}
          </p>
          <div class="space-y-1">
            <button
              v-for="item in sidebarItems"
              :key="item.id"
              type="button"
              :disabled="item.editOnly && !isEdit"
              class="w-full flex items-center gap-2 px-2.5 h-9 rounded-lg text-xs font-medium text-app bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              @click="(e) => onSidebarClick(e, item)"
            >
              <span
                class="w-6 h-6 rounded inline-flex items-center justify-center shrink-0"
                :class="{
                  'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300': item.accent === 'sky',
                  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300': item.accent === 'purple',
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': item.accent === 'amber',
                  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300': item.accent === 'pink',
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300': item.accent === 'emerald',
                  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300': item.accent === 'indigo',
                  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300': item.accent === 'rose',
                  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300': item.accent === 'violet',
                  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300': item.accent === 'teal',
                }"
              >
                <font-awesome-icon :icon="item.icon" class="w-3 h-3" />
              </span>
              <span class="truncate">{{ item.label }}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>

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

    <!-- POPOVERS -->
    <LabelsPopover
      :open="openPopover === 'labels'"
      :anchor="popoverAnchor"
      :selected="selectedTags"
      :suggestions="projectTags"
      @close="closePopover"
      @attach="onAttachLabel"
      @detach="onDetachLabel"
      @create="onCreateLabel"
    />
    <DatesPopover
      :open="openPopover === 'dates'"
      :anchor="popoverAnchor"
      :start-date="form.startDate"
      :due-date="form.dueDate"
      @close="closePopover"
      @update:start-date="(v) => { form.startDate = v; if (isEdit) persistDates() }"
      @update:due-date="(v) => { form.dueDate = v; if (isEdit) persistDates() }"
    />
    <MembersPopover
      :open="openPopover === 'members'"
      :anchor="popoverAnchor"
      :selected="assignees"
      :suggestions="projectMembers"
      @close="closePopover"
      @add="onAddMember"
      @remove="onRemoveMember"
    />
    <MembersPopover
      :open="openPopover === 'watchers'"
      :anchor="popoverAnchor"
      :title="t('taskModal.watchers')"
      :selected="watchers"
      :suggestions="projectMembers"
      @close="closePopover"
      @add="onAddWatcher"
      @remove="onRemoveWatcher"
    />
    <CoverPopover
      :open="openPopover === 'cover'"
      :anchor="popoverAnchor"
      :cover-color="form.coverColor"
      :cover-image-url="form.coverImageUrl"
      @close="closePopover"
      @update:cover-color="(v) => { form.coverColor = v; if (isEdit) persistCover() }"
      @update:cover-image-url="(v) => { form.coverImageUrl = v; if (isEdit) persistCover() }"
    />
    <AttachmentPopover
      :open="openPopover === 'attachment'"
      :anchor="popoverAnchor"
      :task-id="task?.id ?? null"
      @close="closePopover"
      @added="refreshAttachments"
    />
    <ChecklistPopover
      :open="openPopover === 'checklistAdd'"
      :anchor="popoverAnchor"
      @close="closePopover"
      @submit="addChecklistFromPopover"
    />
  </div>
</template>

<style>
.rich-text-view p { margin: 0.25rem 0; }
.rich-text-view ul { list-style: disc; padding-left: 1.4rem; margin: 0.4rem 0; }
.rich-text-view ol { list-style: decimal; padding-left: 1.4rem; margin: 0.4rem 0; }
.rich-text-view blockquote {
  border-left: 3px solid #cbd5e1;
  padding-left: 0.75rem;
  color: #64748b;
  margin: 0.5rem 0;
}
.rich-text-view pre {
  background: rgb(241 245 249);
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
  white-space: pre-wrap;
}
.dark .rich-text-view pre { background: rgb(30 41 59); }
.rich-text-view a { color: #2563eb; text-decoration: underline; }
.dark .rich-text-view a { color: #60a5fa; }
</style>
