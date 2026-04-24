export enum Importance {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum Visibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum ProjectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum InvitationType {
  ORGANIZATION = 'organization',
  PROJECT = 'project',
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export enum NotificationType {
  INVITATION_ORGANIZATION = 'invitation.organization',
  INVITATION_PROJECT = 'invitation.project',
  INVITATION_ACCEPTED = 'invitation.accepted',
  INVITATION_DECLINED = 'invitation.declined',
  TASK_ASSIGNED = 'task.assigned',
  TASK_UNASSIGNED = 'task.unassigned',
  TASK_MENTIONED = 'task.mentioned',
  TASK_COMMENTED = 'task.commented',
  TASK_DUE_CHANGED = 'task.due_changed',
  TASK_STATUS_CHANGED = 'task.status_changed',
  TASK_WATCHING = 'task.watching',
}

export enum TaskState {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  BLOCKED = 'BLOCKED',
  DONE = 'DONE',
  ARCHIVED = 'ARCHIVED',
}

export enum TaskActivityType {
  CREATED = 'created',
  UPDATED = 'updated',
  STATE_CHANGED = 'state_changed',
  STATUS_CHANGED = 'status_changed',
  PRIORITY_CHANGED = 'priority_changed',
  DUE_DATE_CHANGED = 'due_date_changed',
  ASSIGNEE_ADDED = 'assignee_added',
  ASSIGNEE_REMOVED = 'assignee_removed',
  WATCHER_ADDED = 'watcher_added',
  WATCHER_REMOVED = 'watcher_removed',
  TAG_ADDED = 'tag_added',
  TAG_REMOVED = 'tag_removed',
  COVER_CHANGED = 'cover_changed',
  CHECKLIST_ADDED = 'checklist_added',
  CHECKLIST_REMOVED = 'checklist_removed',
  CHECKLIST_ITEM_ADDED = 'checklist_item_added',
  CHECKLIST_ITEM_COMPLETED = 'checklist_item_completed',
  CHECKLIST_ITEM_UNCOMPLETED = 'checklist_item_uncompleted',
  CHECKLIST_ITEM_REMOVED = 'checklist_item_removed',
  COMMENT_ADDED = 'comment_added',
  COMMENT_EDITED = 'comment_edited',
  COMMENT_REMOVED = 'comment_removed',
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string | null
  data: Record<string, unknown> | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface Invitation {
  id: string
  type: InvitationType
  userId: string
  organizationId: string | null
  projectId: string | null
  roleId: string | null
  invitedByUserId: string | null
  status: InvitationStatus
  respondedAt: string | null
  createdAt: string
  organization?: { id: string; name: string } | null
  project?: { id: string; name: string; organizationId: string | null } | null
  invitedBy?: { id: string; name: string; email: string } | null
  user?: { id: string; name: string; email: string } | null
}

export enum ProjectRole {
  ADMIN = 'ADMIN',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER',
}

export const ORG_PERMS = {
  VIEW: 'org:view',
  MANAGE: 'org:manage',
  MEMBERS_MANAGE: 'org:members:manage',
  ROLES_MANAGE: 'org:roles:manage',
  PROJECTS_CREATE: 'org:projects:create',
  PROJECTS_MANAGE_ALL: 'org:projects:manage_all',
  PRIORITIES_MANAGE: 'org:priorities:manage',
  CATEGORIES_MANAGE: 'org:categories:manage',
  TAGS_MANAGE: 'org:tags:manage',
} as const

export const PROJECT_PERMS = {
  VIEW: 'project:view',
  EDIT: 'project:edit',
  DELETE: 'project:delete',
  MEMBERS_MANAGE: 'project:members:manage',
  TASKS_CREATE: 'project:tasks:create',
  TASKS_EDIT: 'project:tasks:edit',
  TASKS_DELETE: 'project:tasks:delete',
  STATUSES_MANAGE: 'project:statuses:manage',
  CATEGORIES_MANAGE: 'project:categories:manage',
  ROLES_MANAGE: 'project:roles:manage',
} as const

export type OrgPermission = (typeof ORG_PERMS)[keyof typeof ORG_PERMS]
export type ProjectPermission = (typeof PROJECT_PERMS)[keyof typeof PROJECT_PERMS]

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface Organization {
  id: string
  name: string
  description: string | null
  visibility: Visibility
  createdAt: string
  updatedAt: string
}

export interface OrgMember {
  id: string
  userId: string
  organizationId: string
  role: OrgRole
  roleId: string | null
  joinedAt: string
  user?: User
  roleDef?: OrgRoleDef | null
}

export interface OrgRoleDef {
  id: string
  organizationId: string
  name: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  createdAt: string
}

export interface ProjectRoleDef {
  id: string
  projectId: string
  name: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  createdAt: string
}

export interface Priority {
  id: string
  organizationId: string | null
  name: string
  color: string | null
  rank: number
  isSystem: boolean
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  ownerUserId: string | null
  managerUserId: string | null
  organizationId: string | null
  categoryId: string | null
  clientUserId: string | null
  clientOrganizationId: string | null
  visibility: Visibility
  status: ProjectStatus
  priority: ProjectPriority
  isHidden: boolean
  isArchived: boolean
  archivedAt: string | null
  plannedStartDate: string | null
  actualStartDate: string | null
  endDate: string | null
  actualEndDate: string | null
  estimatedDurationDays: number | null
  progress: number
  useManualProgress: boolean
  tags: string[] | null
  category: string | null
  client: string | null
  department: string | null
  createdAt: string
  updatedAt: string
  /** Set by the backend list endpoint for the requesting user. */
  isExplicitMember?: boolean
}

export interface ProjectCategory {
  id: string
  organizationId: string | null
  name: string
  color: string | null
  icon: string | null
  isSystem: boolean
  createdAt: string
}

export interface Tag {
  id: string
  organizationId: string | null
  name: string
  color: string | null
  createdAt: string
}

export interface ProjectProgressSnapshot {
  total: number
  completed: number
  inProgress: number
  overdue: number
  notStarted: number
  percentComplete: number
  useManualProgress: boolean
  manualProgress: number
  byStatus: Array<{ statusId: string; name: string; isDone: boolean; count: number }>
  byPriority: Array<{ id: string | null; name: string; color: string | null; count: number }>
}

export type ProjectUpdatePayload = Partial<{
  name: string
  description: string
  managerUserId: string | null
  categoryId: string | null
  clientUserId: string | null
  clientOrganizationId: string | null
  visibility: Visibility
  status: ProjectStatus
  priority: ProjectPriority
  plannedStartDate: string | null
  actualStartDate: string | null
  endDate: string | null
  actualEndDate: string | null
  estimatedDurationDays: number | null
  progress: number
  useManualProgress: boolean
  tags: string[]
  category: string | null
  client: string | null
  department: string | null
}>

export interface TaskStatus {
  id: string
  name: string
  projectId: string
  position: number
}

export interface Category {
  id: string
  name: string
  projectId: string
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: ProjectRole
  roleId: string | null
  joinedAt: string
  user?: User
  roleDef?: ProjectRoleDef | null
}

export interface TaskAssigneeLink {
  id: string
  taskId: string
  userId: string
  assignedAt: string
  user?: User
}

export interface TaskWatcherLink {
  id: string
  taskId: string
  userId: string
  followedAt: string
  user?: User
}

export interface TaskTagLink {
  id: string
  taskId: string
  tagId: string
  createdAt: string
  tag?: Tag
}

export interface Task {
  id: string
  title: string
  shortDescription: string | null
  description: string | null
  longDescription: string | null
  state: TaskState
  startDate: string | null
  dueDate: string | null
  estimatedCompletionDate: string | null
  coverColor: string | null
  coverImageUrl: string | null
  importance: Importance
  priorityId: string | null
  priority?: Priority | null
  assignedUserId: string | null
  assignedUser?: User | null
  projectId: string
  categoryId: string | null
  statusId: string | null
  status?: TaskStatus | null
  position: number
  createdAt: string
  updatedAt: string
  assignees?: TaskAssigneeLink[]
  watchers?: TaskWatcherLink[]
  taskTags?: TaskTagLink[]
}

export interface ChecklistItem {
  id: string
  checklistId: string
  content: string
  isCompleted: boolean
  position: number
  assignedUserId: string | null
  dueDate: string | null
  completedByUserId: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Checklist {
  id: string
  taskId: string
  title: string
  position: number
  createdAt: string
  updatedAt: string
  items: ChecklistItem[]
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  body: string
  mentionedUserIds: string[] | null
  editedAt: string | null
  createdAt: string
  updatedAt: string
  user?: User
}

export interface TaskActivity {
  id: string
  taskId: string
  userId: string | null
  type: TaskActivityType
  payload: Record<string, unknown> | null
  createdAt: string
  user?: User | null
}

export interface AuthResponse {
  token: string
  user: User
}

export interface OrgAccess {
  organizationId: string
  roleName: string
  permissions: string[]
}

export interface ProjectAccess {
  projectId: string
  roleName: string
  permissions: string[]
  isOwner: boolean
  viaOrgAdmin: boolean
}

export interface PermissionCatalog {
  org: string[]
  project: string[]
}
