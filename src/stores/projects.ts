import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  Priority,
  Project,
  ProjectAccess,
  ProjectUpdatePayload,
  Task,
  TaskStatus,
} from '@/types'
import { projectsService, type ListProjectOptions } from '@/services/projects.service'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const drafts = ref<Project[]>([])
  const current = ref<(Project & { statuses: TaskStatus[]; categories: unknown[] }) | null>(null)
  const currentAccess = ref<ProjectAccess | null>(null)
  const tasks = ref<Task[]>([])
  const priorities = ref<Priority[]>([])
  const loading = ref(false)
  const notFound = ref(false)

  async function fetchProjects(options: ListProjectOptions = {}): Promise<void> {
    loading.value = true
    try {
      projects.value = await projectsService.list(options)
    } finally {
      loading.value = false
    }
  }

  async function fetchDrafts(): Promise<void> {
    drafts.value = await projectsService.drafts()
  }

  async function activateProject(id: string): Promise<Project> {
    const activated = await projectsService.activate(id)
    drafts.value = drafts.value.filter((d) => d.id !== id)
    const existing = projects.value.find((p) => p.id === id)
    if (existing) {
      projects.value = projects.value.map((p) => (p.id === id ? activated : p))
    } else {
      projects.value = [activated, ...projects.value]
    }
    if (current.value?.id === id) {
      current.value = { ...current.value, ...activated }
    }
    return activated
  }

  async function updateProjectFields(
    id: string,
    payload: ProjectUpdatePayload,
  ): Promise<Project> {
    const updated = await projectsService.update(id, payload)
    const applyTo = (list: Project[]) =>
      list.map((p) => (p.id === id ? { ...p, ...updated } : p))
    projects.value = applyTo(projects.value)
    drafts.value = applyTo(drafts.value)
    if (current.value?.id === id) current.value = { ...current.value, ...updated }
    return updated
  }

  async function loadProject(id: string): Promise<void> {
    loading.value = true
    notFound.value = false
    try {
      const [project, taskList, access, prio] = await Promise.all([
        projectsService.get(id),
        projectsService.listTasks(id),
        projectsService.myAccess(id),
        projectsService.priorities(id),
      ])
      current.value = project
      tasks.value = taskList
      currentAccess.value = access
      priorities.value = prio
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) notFound.value = true
      current.value = null
      tasks.value = []
      currentAccess.value = null
      priorities.value = []
      if (status !== 404) throw err
    } finally {
      loading.value = false
    }
  }

  function clearCurrent(): void {
    current.value = null
    tasks.value = []
    currentAccess.value = null
    priorities.value = []
    notFound.value = false
  }

  async function createProject(payload: {
    name: string
    description?: string
    organizationId?: string
  }): Promise<Project> {
    const project = await projectsService.create(payload)
    projects.value = [project, ...projects.value]
    return project
  }

  async function renameProject(id: string, name: string): Promise<void> {
    const updated = await projectsService.update(id, { name })
    projects.value = projects.value.map((p) => (p.id === id ? { ...p, ...updated } : p))
    if (current.value?.id === id) current.value = { ...current.value, ...updated }
  }

  async function deleteProject(id: string): Promise<void> {
    await projectsService.remove(id)
    projects.value = projects.value.filter((p) => p.id !== id)
    drafts.value = drafts.value.filter((p) => p.id !== id)
  }

  async function setArchived(id: string, archived: boolean): Promise<void> {
    const updated = await projectsService.setArchived(id, archived)
    projects.value = projects.value.map((p) => (p.id === id ? updated : p))
    if (current.value?.id === id) current.value = { ...current.value, ...updated }
  }

  async function setHidden(id: string, hidden: boolean): Promise<void> {
    const updated = await projectsService.setHidden(id, hidden)
    projects.value = projects.value.map((p) => (p.id === id ? updated : p))
    if (current.value?.id === id) current.value = { ...current.value, ...updated }
  }

  async function addStatus(projectId: string, name: string): Promise<void> {
    const status = await projectsService.createStatus(projectId, { name })
    if (current.value && current.value.id === projectId) {
      current.value = { ...current.value, statuses: [...current.value.statuses, status] }
    }
  }

  async function renameStatus(statusId: string, name: string): Promise<void> {
    const updated = await projectsService.updateStatus(statusId, { name })
    if (current.value) {
      current.value = {
        ...current.value,
        statuses: current.value.statuses.map((s) => (s.id === statusId ? updated : s)),
      }
    }
  }

  async function deleteStatus(statusId: string): Promise<void> {
    await projectsService.deleteStatus(statusId)
    if (current.value) {
      current.value = {
        ...current.value,
        statuses: current.value.statuses.filter((s) => s.id !== statusId),
      }
      tasks.value = tasks.value.filter((t) => t.statusId !== statusId)
    }
  }

  async function reorderStatuses(projectId: string, orderedIds: string[]): Promise<void> {
    const updated = await projectsService.reorderStatuses(projectId, orderedIds)
    if (current.value && current.value.id === projectId) {
      const byId = new Map(updated.map((s) => [s.id, s]))
      current.value = {
        ...current.value,
        statuses: orderedIds
          .map((id) => byId.get(id))
          .filter((s): s is TaskStatus => Boolean(s)),
      }
    }
  }

  async function addTask(projectId: string, payload: Partial<Task>): Promise<Task> {
    const task = await projectsService.createTask(projectId, payload)
    tasks.value = [...tasks.value, task]
    return task
  }

  async function updateTask(taskId: string, payload: Partial<Task>): Promise<void> {
    const updated = await projectsService.updateTask(taskId, payload)
    tasks.value = tasks.value.map((t) => (t.id === taskId ? updated : t))
  }

  async function deleteTask(taskId: string): Promise<void> {
    await projectsService.deleteTask(taskId)
    tasks.value = tasks.value.filter((t) => t.id !== taskId)
  }

  async function reorderTasks(
    projectId: string,
    statusId: string,
    taskIds: string[],
  ): Promise<void> {
    const updated = await projectsService.reorderTasks(projectId, { statusId, taskIds })
    const byId = new Map(updated.map((t) => [t.id, t]))
    tasks.value = tasks.value.map((t) => byId.get(t.id) ?? t)
  }

  const tasksByStatus = computed(() => {
    const map = new Map<string, Task[]>()
    for (const status of current.value?.statuses ?? []) {
      map.set(
        status.id,
        tasks.value
          .filter((t) => t.statusId === status.id)
          .sort((a, b) => a.position - b.position),
      )
    }
    return map
  })

  return {
    projects,
    drafts,
    current,
    currentAccess,
    tasks,
    priorities,
    loading,
    notFound,
    tasksByStatus,
    fetchProjects,
    fetchDrafts,
    activateProject,
    updateProjectFields,
    loadProject,
    clearCurrent,
    createProject,
    renameProject,
    deleteProject,
    setArchived,
    setHidden,
    addStatus,
    renameStatus,
    deleteStatus,
    reorderStatuses,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
  }
})
