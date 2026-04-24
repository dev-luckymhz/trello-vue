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

export interface Task {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  importance: Importance
  priorityId: string | null
  assignedUserId: string | null
  projectId: string
  categoryId: string | null
  statusId: string | null
  position: number
  createdAt: string
  updatedAt: string
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
