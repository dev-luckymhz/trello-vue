<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useOrganizationsStore } from '@/stores/organizations'
import { useNotificationsStore } from '@/stores/notifications'
import { usePreferencesStore, type Locale } from '@/stores/preferences'
import { availableLocales } from '@/i18n'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projects = useProjectsStore()
const orgStore = useOrganizationsStore()
const notifStore = useNotificationsStore()
const prefs = usePreferencesStore()
const { locale } = useI18n()

const onProjectPage = computed(() => route.name === 'project')

const pageTitle = computed(() => {
  if (onProjectPage.value && projects.current) return projects.current.name
  if (route.name === 'organizations') return ''
  if (route.name === 'admin') return ''
  if (route.name === 'me') return ''
  return ''
})

const userMenu = ref(false)
const settingsMenu = ref(false)
const notificationsMenu = ref(false)
const mobileMenu = ref(false)

const totalBadge = computed(
  () => notifStore.unreadCount + notifStore.pendingInvitations.length,
)

async function loadNotifications() {
  if (!auth.isAuthenticated) return
  try {
    await notifStore.refresh()
  } catch {
    // ignore — not critical for nav
  }
}

watch(
  () => auth.isAuthenticated,
  (value) => {
    if (value) void loadNotifications()
    else notifStore.clear()
  },
  { immediate: true },
)

function relative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
}

async function openNotifications() {
  const opening = !notificationsMenu.value
  notificationsMenu.value = opening
  settingsMenu.value = false
  userMenu.value = false
  if (opening) await loadNotifications()
}

async function acceptInvitation(id: string) {
  try {
    await notifStore.accept(id)
    await orgStore.fetch()
    await projects.fetchProjects()
  } catch {
    // surface on the page; banner shows status
  }
}

async function declineInvitation(id: string) {
  try {
    await notifStore.decline(id)
  } catch {
    // noop
  }
}

function selectLocale(value: Locale) {
  prefs.setLocale(value)
}

function logout() {
  auth.logout()
  userMenu.value = false
  mobileMenu.value = false
  router.push({ name: 'login' })
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('[data-popover]')) {
    userMenu.value = false
    settingsMenu.value = false
    notificationsMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

const hasAdminOrg = computed(() => orgStore.adminOrganizations.length > 0)
const primaryAdminOrgId = computed(() => orgStore.adminOrganizations[0]?.id ?? null)

const navItems = computed(() => [
  { to: { name: 'me' }, label: 'nav.home', icon: 'fa-solid fa-house' },
  { to: { name: 'projects' }, label: 'nav.projects', icon: 'fa-solid fa-layer-group' },
  { to: { name: 'my-tasks' }, label: 'nav.myTasks', icon: 'fa-solid fa-list-check' },
  { to: { name: 'organizations' }, label: 'nav.organizations', icon: 'fa-solid fa-building' },
])
</script>

<template>
  <header
    v-if="auth.isAuthenticated"
    class="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800"
  >
    <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
      <!-- Left: brand + page context -->
      <div class="flex items-center gap-2 min-w-0">
        <button
          v-if="onProjectPage"
          class="btn-icon shrink-0"
          :title="$t('common.back')"
          @click="router.push({ name: 'projects' })"
        >
          <font-awesome-icon icon="fa-solid fa-chevron-left" class="w-4 h-4" />
        </button>
        <router-link :to="{ name: 'me' }" class="flex items-center gap-2 shrink-0">
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold shadow-sm"
          >
            K
          </div>
          <span class="font-semibold text-app hidden sm:inline">{{ $t('app.name') }}</span>
        </router-link>
        <span
          v-if="pageTitle"
          class="hidden md:inline ml-3 pl-3 border-l border-slate-200 dark:border-slate-700 text-sm text-muted truncate max-w-xs"
        >
          {{ pageTitle }}
        </span>
      </div>

      <!-- Center: desktop nav -->
      <nav class="hidden md:flex items-center gap-0.5">
        <router-link
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          class="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center gap-2"
          active-class="!text-brand-700 dark:!text-brand-300 bg-brand-50 dark:bg-brand-900/40"
        >
          <font-awesome-icon :icon="item.icon" class="w-3.5 h-3.5" />
          {{ $t(item.label) }}
        </router-link>
        <router-link
          v-if="hasAdminOrg && primaryAdminOrgId"
          :to="`/admin/${primaryAdminOrgId}`"
          class="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition inline-flex items-center gap-2"
          active-class="!text-brand-700 dark:!text-brand-300 bg-brand-50 dark:bg-brand-900/40"
        >
          <font-awesome-icon icon="fa-solid fa-shield" class="w-3.5 h-3.5" />
          {{ $t('nav.admin') }}
        </router-link>
      </nav>

      <!-- Right: settings + avatar -->
      <div class="flex items-center gap-1">
        <div class="relative" data-popover>
          <button
            class="btn-icon"
            :title="$t('nav.settings')"
            :aria-label="$t('nav.settings')"
            @click.stop="settingsMenu = !settingsMenu; userMenu = false"
          >
            <font-awesome-icon icon="fa-solid fa-gear" class="w-4 h-4" />
          </button>
          <div
            v-if="settingsMenu"
            class="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-2 z-40"
          >
            <div class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {{ $t('nav.theme') }}
            </div>
            <div class="px-2 pb-2 flex gap-1">
              <button
                class="flex-1 inline-flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition"
                :class="
                  prefs.theme === 'light'
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                "
                @click="prefs.setTheme('light')"
              >
                <font-awesome-icon icon="fa-solid fa-sun" class="w-3.5 h-3.5" />
                {{ $t('nav.themeLight') }}
              </button>
              <button
                class="flex-1 inline-flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition"
                :class="
                  prefs.theme === 'dark'
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                "
                @click="prefs.setTheme('dark')"
              >
                <font-awesome-icon icon="fa-solid fa-moon" class="w-3.5 h-3.5" />
                {{ $t('nav.themeDark') }}
              </button>
            </div>
            <div class="border-t border-slate-100 dark:border-slate-700 my-1"></div>
            <div class="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {{ $t('nav.language') }}
            </div>
            <button
              v-for="loc in availableLocales"
              :key="loc.code"
              class="w-full text-left px-3 py-2 text-sm inline-flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              :class="
                prefs.locale === loc.code
                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300'
              "
              @click="selectLocale(loc.code)"
            >
              {{ loc.label }}
              <font-awesome-icon
                v-if="prefs.locale === loc.code"
                icon="fa-solid fa-check"
                class="w-3 h-3"
              />
            </button>
          </div>
        </div>

        <div class="relative" data-popover>
          <button
            class="btn-icon relative"
            :title="$t('notifications.title')"
            :aria-label="$t('notifications.title')"
            @click.stop="openNotifications"
          >
            <font-awesome-icon icon="fa-solid fa-bell" class="w-4 h-4" />
            <span
              v-if="totalBadge > 0"
              class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
            >
              {{ totalBadge > 99 ? '99+' : totalBadge }}
            </span>
          </button>
          <div
            v-if="notificationsMenu"
            class="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1 z-40 max-h-[32rem] overflow-y-auto scrollbar-thin"
          >
            <div class="flex items-center justify-between px-4 py-2.5 border-b divider">
              <span class="text-sm font-semibold text-app">{{ $t('notifications.title') }}</span>
              <button
                v-if="notifStore.unreadCount > 0"
                class="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                @click="notifStore.markAllRead()"
              >
                {{ $t('notifications.markAllRead') }}
              </button>
            </div>

            <div v-if="notifStore.pendingInvitations.length > 0" class="p-3 space-y-2">
              <div class="text-[11px] font-semibold uppercase tracking-wide text-subtle px-1">
                {{ $t('invitations.pendingList') }}
              </div>
              <div
                v-for="invite in notifStore.pendingInvitations"
                :key="invite.id"
                class="rounded-lg border divider p-3 bg-brand-50/60 dark:bg-brand-900/20"
              >
                <div class="flex items-start gap-2">
                  <div
                    class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white font-semibold flex items-center justify-center text-xs shrink-0"
                  >
                    <font-awesome-icon
                      :icon="invite.type === 'organization' ? 'fa-solid fa-building' : 'fa-solid fa-layer-group'"
                      class="w-3.5 h-3.5"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-app truncate">
                      {{ invite.type === 'organization' ? invite.organization?.name : invite.project?.name }}
                    </p>
                    <p class="text-xs text-muted mt-0.5">
                      <template v-if="invite.invitedBy">
                        <span class="font-medium">{{ invite.invitedBy.name }}</span>
                        {{ ' ' }}
                        <span v-if="invite.type === 'organization'">
                          {{ $t('invitations.invitedToOrg', { name: invite.organization?.name ?? '' }) }}
                        </span>
                        <span v-else>
                          {{ $t('invitations.invitedToProject', { name: invite.project?.name ?? '' }) }}
                        </span>
                      </template>
                    </p>
                  </div>
                </div>
                <div class="flex gap-2 mt-3">
                  <button
                    class="btn-primary !py-1.5 !px-3 text-xs flex-1"
                    @click="acceptInvitation(invite.id)"
                  >
                    {{ $t('invitations.accept') }}
                  </button>
                  <button
                    class="btn-ghost !py-1.5 !px-3 text-xs flex-1"
                    @click="declineInvitation(invite.id)"
                  >
                    {{ $t('invitations.decline') }}
                  </button>
                </div>
              </div>
            </div>

            <div v-if="notifStore.notifications.length === 0 && notifStore.pendingInvitations.length === 0" class="p-8 text-center text-muted text-sm">
              <div class="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-2">
                <font-awesome-icon icon="fa-solid fa-bell" class="w-4 h-4 text-subtle" />
              </div>
              {{ $t('notifications.empty') }}
            </div>

            <ul v-else-if="notifStore.notifications.length > 0" class="divide-y divide-slate-100 dark:divide-slate-700">
              <li
                v-for="n in notifStore.notifications.slice(0, 10)"
                :key="n.id"
                class="px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-start gap-3"
                :class="!n.isRead ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''"
                @click="notifStore.markRead(n.id)"
              >
                <span
                  class="w-2 h-2 rounded-full mt-2 shrink-0"
                  :class="n.isRead ? 'bg-slate-300 dark:bg-slate-600' : 'bg-brand-500'"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-app">{{ n.title }}</p>
                  <p v-if="n.message" class="text-xs text-muted mt-0.5 line-clamp-2">{{ n.message }}</p>
                  <p class="text-xs text-subtle mt-1">{{ relative(n.createdAt) }}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Mobile menu toggle -->
        <button
          class="btn-icon md:hidden"
          :aria-label="$t('nav.settings')"
          @click.stop="mobileMenu = !mobileMenu"
        >
          <font-awesome-icon
            :icon="mobileMenu ? 'fa-solid fa-xmark' : 'fa-solid fa-ellipsis-v'"
            class="w-4 h-4"
          />
        </button>

        <div class="relative" data-popover>
          <button
            class="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 font-semibold flex items-center justify-center transition"
            @click.stop="userMenu = !userMenu; settingsMenu = false"
            :aria-label="auth.user?.name"
          >
            {{ auth.user?.name?.[0]?.toUpperCase() ?? '?' }}
          </button>
          <div
            v-if="userMenu"
            class="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1 z-40"
          >
            <div class="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
              <p class="text-sm font-semibold text-app truncate">
                {{ auth.user?.name }}
              </p>
              <p class="text-xs text-muted truncate">{{ auth.user?.email }}</p>
            </div>
            <router-link
              :to="{ name: 'me' }"
              class="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              @click="userMenu = false"
            >
              <font-awesome-icon icon="fa-solid fa-house" class="w-3.5 h-3.5 mr-2" />
              {{ $t('nav.home') }}
            </router-link>
            <button
              class="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
              @click="logout"
            >
              <font-awesome-icon icon="fa-solid fa-right-from-bracket" class="w-3.5 h-3.5" />
              {{ $t('nav.signOut') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile nav drawer -->
    <nav
      v-if="mobileMenu"
      class="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 flex flex-col gap-0.5"
    >
      <router-link
        v-for="item in navItems"
        :key="item.label"
        :to="item.to"
        class="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-2"
        active-class="!text-brand-700 dark:!text-brand-300 bg-brand-50 dark:bg-brand-900/40"
        @click="mobileMenu = false"
      >
        <font-awesome-icon :icon="item.icon" class="w-3.5 h-3.5" />
        {{ $t(item.label) }}
      </router-link>
      <router-link
        v-if="hasAdminOrg && primaryAdminOrgId"
        :to="`/admin/${primaryAdminOrgId}`"
        class="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-2"
        active-class="!text-brand-700 dark:!text-brand-300 bg-brand-50 dark:bg-brand-900/40"
        @click="mobileMenu = false"
      >
        <font-awesome-icon icon="fa-solid fa-shield" class="w-3.5 h-3.5" />
        {{ $t('nav.admin') }}
      </router-link>
    </nav>
  </header>
</template>
