import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { i18n } from '@/i18n'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, titleKey: 'auth.signIn' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { public: true, titleKey: 'auth.createAccount' },
  },
  {
    path: '/',
    name: 'me',
    component: () => import('@/views/PersonalDashboardView.vue'),
    meta: { titleKey: 'dashboard.title' },
  },
  {
    path: '/me/tasks',
    name: 'my-tasks',
    component: () => import('@/views/MyTasksView.vue'),
    meta: { titleKey: 'tasksTable.title' },
  },
  {
    path: '/projects',
    name: 'projects',
    component: () => import('@/views/ProjectsListView.vue'),
    meta: { titleKey: 'projects.title' },
  },
  {
    path: '/projects/:id',
    name: 'project',
    component: () => import('@/views/ProjectView.vue'),
    props: true,
    meta: { titleKey: 'projectTitleDynamic' },
  },
  {
    path: '/projects/:projectId/tasks/:taskId',
    name: 'task-detail',
    component: () => import('@/views/TaskDetailView.vue'),
    props: true,
    meta: { titleKey: 'taskTitleDynamic' },
  },
  {
    path: '/organizations',
    name: 'organizations',
    component: () => import('@/views/OrganizationsView.vue'),
    meta: { titleKey: 'organizations.title' },
  },
  {
    path: '/organizations/:id',
    name: 'organization',
    component: () => import('@/views/OrganizationDetailView.vue'),
    props: true,
    meta: { titleKey: 'organizationTitleDynamic' },
  },
  {
    path: '/admin/:id',
    name: 'admin',
    component: () => import('@/views/AdminDashboardView.vue'),
    props: true,
    meta: { titleKey: 'admin.title' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.restore()
  const isPublic = to.meta.public === true
  if (!isPublic && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (isPublic && auth.isAuthenticated) {
    return { name: 'me' }
  }
})

export function setDocumentTitle(pageTitle: string): void {
  const appName = i18n.global.t('app.name')
  document.title = `${pageTitle} · ${appName}`
}

router.afterEach((to) => {
  const t = i18n.global.t
  const key = to.meta.titleKey as string | undefined
  if (
    !key ||
    key === 'projectTitleDynamic' ||
    key === 'organizationTitleDynamic' ||
    key === 'taskTitleDynamic'
  ) {
    // Dynamic routes set their own title via setDocumentTitle() once the
    // resource loads. Provide a sensible placeholder in the meantime.
    if (key === 'projectTitleDynamic') setDocumentTitle(t('projects.title'))
    else if (key === 'organizationTitleDynamic') setDocumentTitle(t('organizations.title'))
    else if (key === 'taskTitleDynamic') setDocumentTitle(t('tasksTable.title'))
    else setDocumentTitle(t('app.name'))
    return
  }
  setDocumentTitle(t(key))
})
