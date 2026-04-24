<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useOrganizationsStore } from '@/stores/organizations'
import { extractErrorMessage } from '@/services/api'
import Modal from '@/components/Modal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const store = useOrganizationsStore()

const error = ref<string | null>(null)
const createOpen = ref(false)
const newName = ref('')
const newDescription = ref('')
const submitting = ref(false)
const deleteTarget = ref<string | null>(null)

onMounted(async () => {
  try {
    await store.fetch()
  } catch (err) {
    error.value = extractErrorMessage(err)
  }
})

async function createOrg() {
  if (!newName.value.trim()) return
  submitting.value = true
  try {
    await store.create({
      name: newName.value.trim(),
      description: newDescription.value.trim() || undefined,
    })
    createOpen.value = false
    newName.value = ''
    newDescription.value = ''
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    submitting.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await store.remove(deleteTarget.value)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    deleteTarget.value = null
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full">
    <div class="flex items-end justify-between mb-6 sm:mb-8 gap-4 flex-wrap">
      <div>
        <h2 class="text-2xl sm:text-3xl font-bold text-app">{{ $t('organizations.title') }}</h2>
        <p class="text-sm text-muted mt-1">{{ $t('organizations.subtitle') }}</p>
      </div>
      <button class="btn-primary" @click="createOpen = true">
        <font-awesome-icon icon="fa-solid fa-plus" class="w-3.5 h-3.5" />
        {{ $t('organizations.new') }}
      </button>
    </div>

    <div v-if="error" class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm">
      {{ error }}
    </div>

    <div
      v-if="!store.loading && store.organizations.length === 0"
      class="card text-center py-16 px-6"
    >
      <div
        class="w-14 h-14 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center mb-4"
      >
        <font-awesome-icon icon="fa-solid fa-building" class="w-6 h-6 text-brand-500" />
      </div>
      <h3 class="text-lg font-semibold text-app">{{ $t('organizations.emptyTitle') }}</h3>
      <p class="text-sm text-muted mt-1 max-w-sm mx-auto">{{ $t('organizations.emptyBody') }}</p>
      <button class="btn-primary mt-6" @click="createOpen = true">
        <font-awesome-icon icon="fa-solid fa-plus" class="w-3.5 h-3.5" />
        {{ $t('organizations.emptyCta') }}
      </button>
    </div>

    <ul v-else class="grid gap-3">
      <li
        v-for="org in store.organizations"
        :key="org.id"
        class="group relative card-hover p-4 flex items-start gap-4 cursor-pointer"
        @click="$router.push({ name: 'organization', params: { id: org.id } })"
      >
        <div
          class="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold shadow-sm shrink-0"
        >
          {{ org.name[0]?.toUpperCase() ?? '?' }}
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-app truncate">{{ org.name }}</h3>
          <p v-if="org.description" class="text-sm text-muted mt-0.5 line-clamp-2">
            {{ org.description }}
          </p>
        </div>
        <div class="flex items-center gap-1" @click.stop>
          <router-link
            :to="`/admin/${org.id}`"
            class="btn-ghost !py-1.5 !px-2 hidden sm:inline-flex"
          >
            <font-awesome-icon icon="fa-solid fa-shield" class="w-3 h-3" />
            <span class="text-xs">{{ $t('nav.admin') }}</span>
          </router-link>
          <button
            class="opacity-0 group-hover:opacity-100 text-subtle hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            @click="deleteTarget = org.id"
            :aria-label="$t('common.delete')"
          >
            <font-awesome-icon icon="fa-solid fa-trash" class="w-3.5 h-3.5" />
          </button>
        </div>
      </li>
    </ul>

    <Modal :open="createOpen" :title="$t('organizations.create')" @close="createOpen = false">
      <label class="label">{{ $t('common.name') }}</label>
      <input v-model="newName" type="text" autofocus class="input mb-4" />
      <label class="label">{{ $t('common.description') }}</label>
      <textarea v-model="newDescription" rows="2" class="input resize-none" />
      <template #footer>
        <button class="btn-ghost" @click="createOpen = false">{{ $t('common.cancel') }}</button>
        <button class="btn-primary" :disabled="!newName.trim() || submitting" @click="createOrg">
          {{ submitting ? $t('common.creating') : $t('common.create') }}
        </button>
      </template>
    </Modal>

    <ConfirmDialog
      :open="deleteTarget !== null"
      :title="$t('organizations.deleteConfirmTitle')"
      :message="$t('organizations.deleteConfirmBody')"
      :confirm-text="$t('common.delete')"
      tone="danger"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>
