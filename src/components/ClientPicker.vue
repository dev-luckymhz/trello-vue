<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Organization } from '@/types'
import { organizationsService } from '@/services/organizations.service'
import { usersService, type UserSearchResult } from '@/services/users.service'
import UserPicker from './UserPicker.vue'

const props = defineProps<{
  clientUserId: string | null
  clientOrganizationId: string | null
  excludeOrganizationIds?: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:clientUserId', value: string | null): void
  (e: 'update:clientOrganizationId', value: string | null): void
}>()

const { t } = useI18n()

type Mode = 'none' | 'user' | 'organization'
const mode = ref<Mode>(
  props.clientUserId ? 'user' : props.clientOrganizationId ? 'organization' : 'none',
)

// Display-only identifier string shown inside UserPicker. When the user picks
// a suggestion we also store the UUID in selectedUserId and emit ONLY that
// UUID up to the parent. Typed text that hasn't matched a suggestion never
// leaves this component.
const displayIdentifier = ref('')
const selectedUserId = ref<string | null>(props.clientUserId ?? null)

const organizations = ref<Organization[]>([])

const filteredOrgs = computed(() =>
  organizations.value.filter(
    (o) => !(props.excludeOrganizationIds ?? []).includes(o.id),
  ),
)

async function hydrateUserDisplay(id: string) {
  try {
    const user = await usersService.getById(id)
    displayIdentifier.value = user.email
  } catch {
    // If we can't fetch (deleted user, permission, etc.) clear silently.
    displayIdentifier.value = ''
  }
}

onMounted(async () => {
  try {
    organizations.value = await organizationsService.list()
  } catch {
    organizations.value = []
  }
  if (props.clientUserId) {
    selectedUserId.value = props.clientUserId
    await hydrateUserDisplay(props.clientUserId)
  }
})

watch(
  () => props.clientUserId,
  async (value) => {
    if (value === selectedUserId.value) return
    selectedUserId.value = value ?? null
    if (value) await hydrateUserDisplay(value)
    else displayIdentifier.value = ''
  },
)

function setMode(next: Mode) {
  mode.value = next
  if (next !== 'user') {
    selectedUserId.value = null
    displayIdentifier.value = ''
    if (props.clientUserId !== null) emit('update:clientUserId', null)
  }
  if (next !== 'organization') {
    if (props.clientOrganizationId !== null) emit('update:clientOrganizationId', null)
  }
}

function onOrgSelect(value: string) {
  emit('update:clientOrganizationId', value || null)
}

// When the user types into the UserPicker, we just keep the displayed text;
// we do NOT forward a non-UUID as clientUserId.
function onIdentifierChange(value: string) {
  displayIdentifier.value = value
  if (value.trim() === '') {
    if (selectedUserId.value !== null) {
      selectedUserId.value = null
      emit('update:clientUserId', null)
    }
    return
  }
  // If the typed value no longer matches the last selected user's email,
  // the previous selection is stale — drop it until a new suggestion is
  // picked.
  if (selectedUserId.value) {
    selectedUserId.value = null
    emit('update:clientUserId', null)
  }
}

function onUserSelected(user: UserSearchResult) {
  selectedUserId.value = user.id
  displayIdentifier.value = user.email
  emit('update:clientUserId', user.id)
}

function onUserClear() {
  if (selectedUserId.value !== null) {
    selectedUserId.value = null
    emit('update:clientUserId', null)
  }
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-2">
      <button
        type="button"
        class="px-3 py-1.5 text-xs font-medium rounded-lg transition"
        :class="
          mode === 'none'
            ? 'bg-brand-500 text-white'
            : 'text-muted hover:bg-slate-100 dark:hover:bg-slate-700'
        "
        :disabled="disabled"
        @click="setMode('none')"
      >
        {{ t('common.none') }}
      </button>
      <button
        type="button"
        class="px-3 py-1.5 text-xs font-medium rounded-lg transition inline-flex items-center gap-1.5"
        :class="
          mode === 'user'
            ? 'bg-brand-500 text-white'
            : 'text-muted hover:bg-slate-100 dark:hover:bg-slate-700'
        "
        :disabled="disabled"
        @click="setMode('user')"
      >
        <font-awesome-icon icon="fa-solid fa-user" class="w-3 h-3" />
        {{ t('clientPicker.user') }}
      </button>
      <button
        type="button"
        class="px-3 py-1.5 text-xs font-medium rounded-lg transition inline-flex items-center gap-1.5"
        :class="
          mode === 'organization'
            ? 'bg-brand-500 text-white'
            : 'text-muted hover:bg-slate-100 dark:hover:bg-slate-700'
        "
        :disabled="disabled"
        @click="setMode('organization')"
      >
        <font-awesome-icon icon="fa-solid fa-building" class="w-3 h-3" />
        {{ t('clientPicker.organization') }}
      </button>
    </div>

    <template v-if="mode === 'user'">
      <UserPicker
        :model-value="displayIdentifier"
        :placeholder="t('clientPicker.searchUser')"
        @update:model-value="onIdentifierChange"
        @select="onUserSelected"
        @clear="onUserClear"
      />
      <p
        v-if="displayIdentifier.trim().length > 0 && !selectedUserId"
        class="text-xs text-subtle"
      >
        <font-awesome-icon icon="fa-solid fa-circle-info" class="w-3 h-3 mr-1" />
        {{ t('clientPicker.pickFromSuggestion') }}
      </p>
    </template>

    <select
      v-if="mode === 'organization'"
      class="select"
      :value="clientOrganizationId ?? ''"
      :disabled="disabled"
      @change="onOrgSelect(($event.target as HTMLSelectElement).value)"
    >
      <option value="">{{ t('clientPicker.selectOrg') }}</option>
      <option v-for="org in filteredOrgs" :key="org.id" :value="org.id">
        {{ org.name }}
      </option>
    </select>
  </div>
</template>
