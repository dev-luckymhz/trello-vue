<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  Invitation,
  ProjectMember,
  ProjectRoleDef,
} from '@/types'
import { projectsService } from '@/services/projects.service'
import { extractErrorMessage } from '@/services/api'
import Modal from '@/components/Modal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import UserPicker from '@/components/UserPicker.vue'

const props = defineProps<{ projectId: string; canManage: boolean }>()

const { t } = useI18n()

const members = ref<ProjectMember[]>([])
const invitations = ref<Invitation[]>([])
const roles = ref<ProjectRoleDef[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const inviteOpen = ref(false)
const inviteIdentifier = ref('')
const inviteRoleId = ref('')
const inviteError = ref<string | null>(null)
const inviteSent = ref(false)

const removeMemberTarget = ref<string | null>(null)
const revokeInviteTarget = ref<string | null>(null)

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const [m, inv, r] = await Promise.all([
      projectsService.listMembers(props.projectId),
      projectsService.listInvitations(props.projectId).catch(() => [] as Invitation[]),
      projectsService.listRoles(props.projectId),
    ])
    members.value = m
    invitations.value = inv
    roles.value = r
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

async function submitInvite() {
  if (!inviteIdentifier.value.trim()) return
  inviteError.value = null
  inviteSent.value = false
  try {
    await projectsService.addMember(props.projectId, {
      identifier: inviteIdentifier.value.trim(),
      roleId: inviteRoleId.value || undefined,
    })
    inviteSent.value = true
    inviteIdentifier.value = ''
    inviteRoleId.value = ''
    await refresh()
    setTimeout(() => (inviteOpen.value = false), 700)
  } catch (err) {
    inviteError.value = extractErrorMessage(err)
  }
}

async function confirmRemoveMember() {
  if (!removeMemberTarget.value) return
  try {
    await projectsService.removeMember(removeMemberTarget.value)
    await refresh()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    removeMemberTarget.value = null
  }
}

async function confirmRevokeInvite() {
  if (!revokeInviteTarget.value) return
  try {
    await projectsService.revokeInvitation(revokeInviteTarget.value)
    await refresh()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    revokeInviteTarget.value = null
  }
}

async function changeRole(member: ProjectMember, roleId: string) {
  try {
    await projectsService.updateMember(member.id, { roleId })
    await refresh()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="error" class="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm">
      {{ error }}
    </div>

    <section>
      <div class="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 class="text-lg font-semibold text-app">
          {{ t('projectUsers.activeMembers') }} ({{ members.length }})
        </h3>
        <button v-if="canManage" class="btn-primary" @click="inviteOpen = true; inviteError = null; inviteSent = false">
          <font-awesome-icon icon="fa-solid fa-user-plus" class="w-3.5 h-3.5" />
          {{ t('projectUsers.inviteUser') }}
        </button>
      </div>

      <div v-if="loading && members.length === 0" class="card p-8 text-center text-muted">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="members.length === 0" class="card p-8 text-center text-muted text-sm">
        {{ t('projectUsers.noMembers') }}
      </div>

      <div v-else class="card divide-y divide-slate-100 dark:divide-slate-700">
        <div v-for="m in members" :key="m.id" class="p-4 flex items-center gap-3 flex-wrap">
          <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-app flex items-center justify-center font-semibold shrink-0">
            {{ m.user?.name?.[0]?.toUpperCase() ?? '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-app truncate">{{ m.user?.name ?? '—' }}</p>
            <p class="text-xs text-muted truncate">{{ m.user?.email }}</p>
          </div>
          <select
            v-if="canManage"
            class="select !w-auto !py-1 text-xs"
            :value="m.roleId ?? ''"
            @change="changeRole(m, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
          <span
            v-else
            class="px-2 py-1 bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-semibold rounded-full"
          >
            {{ m.roleDef?.name ?? m.role }}
          </span>
          <button
            v-if="canManage"
            class="text-subtle hover:text-red-500 p-2"
            @click="removeMemberTarget = m.id"
            :aria-label="t('common.remove')"
          >
            <font-awesome-icon icon="fa-solid fa-trash" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>

    <section>
      <h3 class="text-lg font-semibold text-app mb-3">
        {{ t('projectUsers.pendingInvitations') }} ({{ invitations.length }})
      </h3>
      <div v-if="invitations.length === 0" class="card p-6 text-center text-muted text-sm">
        {{ t('projectUsers.noInvitations') }}
      </div>
      <div v-else class="card divide-y divide-slate-100 dark:divide-slate-700">
        <div v-for="inv in invitations" :key="inv.id" class="p-4 flex items-center gap-3 flex-wrap">
          <div
            class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0"
          >
            <font-awesome-icon icon="fa-solid fa-clock-rotate-left" class="w-4 h-4" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-app truncate">{{ inv.user?.name ?? inv.user?.email ?? '—' }}</p>
            <p class="text-xs text-muted truncate">{{ inv.user?.email }}</p>
            <span class="text-[10px] font-semibold uppercase text-amber-700 dark:text-amber-400 mt-0.5 inline-block">
              {{ t('invitations.pending') }}
            </span>
          </div>
          <button
            v-if="canManage"
            class="btn-ghost text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-950/40 !py-1.5 !px-3 text-xs"
            @click="revokeInviteTarget = inv.id"
          >
            {{ t('invitations.revoke') }}
          </button>
        </div>
      </div>
    </section>

    <Modal :open="inviteOpen" :title="t('projectUsers.inviteUser')" @close="inviteOpen = false">
      <div
        v-if="inviteError"
        class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm"
      >
        {{ inviteError }}
      </div>
      <div
        v-if="inviteSent"
        class="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-sm inline-flex items-center gap-2 w-full"
      >
        <font-awesome-icon icon="fa-solid fa-check" class="w-3 h-3" />
        {{ t('projectUsers.invitationSent') }}
      </div>
      <label class="label">{{ t('admin.memberIdentifier') }}</label>
      <UserPicker v-model="inviteIdentifier" />
      <p class="text-xs text-subtle mt-1.5 mb-4">{{ t('admin.memberIdentifierHint') }}</p>
      <label class="label">{{ t('admin.role') }}</label>
      <select v-model="inviteRoleId" class="select">
        <option value="">Contributor</option>
        <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
      </select>
      <template #footer>
        <button class="btn-ghost" @click="inviteOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn-primary" :disabled="!inviteIdentifier.trim()" @click="submitInvite">
          {{ t('projectUsers.sendInvitation') }}
        </button>
      </template>
    </Modal>

    <ConfirmDialog
      :open="removeMemberTarget !== null"
      :title="t('admin.removeMemberTitle')"
      :message="t('admin.removeMemberBody')"
      :confirm-text="t('common.remove')"
      tone="danger"
      @confirm="confirmRemoveMember"
      @cancel="removeMemberTarget = null"
    />

    <ConfirmDialog
      :open="revokeInviteTarget !== null"
      :title="t('projectUsers.revokeInvitation')"
      :message="t('invitations.noPending')"
      :confirm-text="t('invitations.revoke')"
      tone="danger"
      @confirm="confirmRevokeInvite"
      @cancel="revokeInviteTarget = null"
    />
  </div>
</template>
