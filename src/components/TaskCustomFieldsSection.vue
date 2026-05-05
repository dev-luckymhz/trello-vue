<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CustomFieldDefinition, CustomFieldValue } from '@/types'
import { CustomFieldType } from '@/types'
import { tasksService } from '@/services/tasks.service'
import { extractErrorMessage } from '@/services/api'

const props = defineProps<{ taskId: string; projectId: string }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const { t } = useI18n()

const definitions = ref<CustomFieldDefinition[]>([])
const values = ref<CustomFieldValue[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const pendingFieldId = ref<string | null>(null)

const byDefId = computed(() => {
  const map = new Map<string, CustomFieldValue>()
  for (const v of values.value) map.set(v.definitionId, v)
  return map
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const [defs, vals] = await Promise.all([
      tasksService.listProjectCustomFields(props.projectId),
      tasksService.listCustomFieldValues(props.taskId),
    ])
    definitions.value = defs
    values.value = vals
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function setValue(def: CustomFieldDefinition, value: unknown) {
  pendingFieldId.value = def.id
  try {
    const saved = await tasksService.setCustomFieldValue(props.taskId, def.id, value)
    if (saved === null) {
      values.value = values.value.filter((v) => v.definitionId !== def.id)
    } else {
      const idx = values.value.findIndex((v) => v.definitionId === def.id)
      if (idx >= 0) values.value[idx] = saved
      else values.value = [...values.value, saved]
    }
    emit('changed')
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    pendingFieldId.value = null
  }
}

function valueOf(def: CustomFieldDefinition): unknown {
  return byDefId.value.get(def.id)?.value ?? null
}

function toggleMultiselectOption(def: CustomFieldDefinition, optValue: string) {
  const current = (valueOf(def) as string[] | null) ?? []
  const next = current.includes(optValue)
    ? current.filter((v) => v !== optValue)
    : [...current, optValue]
  setValue(def, next)
}

</script>

<template>
  <div class="space-y-3">
    <div
      v-if="error"
      class="p-2 rounded bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs"
    >
      {{ error }}
    </div>

    <p v-if="!loading && definitions.length === 0" class="text-sm text-muted">
      {{ t('customFields.empty') }}
    </p>

    <div
      v-for="def in definitions"
      :key="def.id"
      class="grid grid-cols-[7rem_1fr] items-center gap-3"
    >
      <label class="text-xs font-semibold text-muted truncate" :title="def.label">
        {{ def.label }}
        <span v-if="def.isRequired" class="text-red-500">*</span>
      </label>

      <!-- TEXT -->
      <input
        v-if="def.type === CustomFieldType.TEXT"
        :value="(valueOf(def) as string | null) ?? ''"
        type="text"
        class="input text-sm"
        :placeholder="def.label"
        @change="setValue(def, ($event.target as HTMLInputElement).value)"
      />

      <!-- URL -->
      <input
        v-else-if="def.type === CustomFieldType.URL"
        :value="(valueOf(def) as string | null) ?? ''"
        type="url"
        class="input text-sm"
        placeholder="https://…"
        @change="setValue(def, ($event.target as HTMLInputElement).value)"
      />

      <!-- NUMBER -->
      <input
        v-else-if="def.type === CustomFieldType.NUMBER"
        :value="(valueOf(def) as number | null) ?? ''"
        type="number"
        step="any"
        class="input text-sm"
        @change="setValue(def, Number(($event.target as HTMLInputElement).value))"
      />

      <!-- DATE -->
      <input
        v-else-if="def.type === CustomFieldType.DATE"
        :value="(valueOf(def) as string | null) ?? ''"
        type="date"
        class="input text-sm"
        @change="setValue(def, ($event.target as HTMLInputElement).value)"
      />

      <!-- CHECKBOX -->
      <label
        v-else-if="def.type === CustomFieldType.CHECKBOX"
        class="inline-flex items-center gap-2 text-sm text-app"
      >
        <input
          type="checkbox"
          :checked="Boolean(valueOf(def))"
          class="w-4 h-4"
          @change="setValue(def, ($event.target as HTMLInputElement).checked)"
        />
      </label>

      <!-- SELECT -->
      <select
        v-else-if="def.type === CustomFieldType.SELECT"
        :value="(valueOf(def) as string | null) ?? ''"
        class="select text-sm"
        @change="setValue(def, ($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ t('common.none') }}</option>
        <option v-for="opt in def.options ?? []" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <!-- MULTISELECT -->
      <div
        v-else-if="def.type === CustomFieldType.MULTISELECT"
        class="flex flex-wrap gap-1"
      >
        <button
          v-for="opt in def.options ?? []"
          :key="opt.value"
          type="button"
          class="px-2 h-6 rounded-full text-[11px] font-semibold transition"
          :style="{
            backgroundColor:
              ((valueOf(def) as string[] | null) ?? []).includes(opt.value)
                ? (opt.color ?? '#64748b')
                : (opt.color ?? '#64748b') + '22',
            color:
              ((valueOf(def) as string[] | null) ?? []).includes(opt.value)
                ? '#fff'
                : (opt.color ?? '#334155'),
          }"
          @click="toggleMultiselectOption(def, opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Shown chips row (read-only preview of set values for multiselect/select using colors) -->
  </div>
</template>
