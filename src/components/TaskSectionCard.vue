<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    icon: string
    title: string
    /** Tailwind color key (slate, emerald, indigo, rose, violet, amber, teal, sky, pink). */
    accent?: string
    count?: number | string | null
    collapsible?: boolean
    collapsed?: boolean
  }>(),
  { accent: 'slate', collapsible: false, collapsed: false, count: null },
)

const emit = defineEmits<{ (e: 'toggle'): void }>()

const palette: Record<string, { bg: string; fg: string; ring: string }> = {
  slate: { bg: 'bg-slate-100 dark:bg-slate-800', fg: 'text-slate-600 dark:text-slate-300', ring: 'ring-slate-200/70 dark:ring-slate-700/70' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', fg: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-200/60 dark:ring-emerald-800/60' },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/40', fg: 'text-indigo-700 dark:text-indigo-300', ring: 'ring-indigo-200/60 dark:ring-indigo-800/60' },
  rose: { bg: 'bg-rose-100 dark:bg-rose-900/40', fg: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-200/60 dark:ring-rose-800/60' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-900/40', fg: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-200/60 dark:ring-violet-800/60' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-900/40', fg: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-200/60 dark:ring-amber-800/60' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-900/40', fg: 'text-teal-700 dark:text-teal-300', ring: 'ring-teal-200/60 dark:ring-teal-800/60' },
  sky: { bg: 'bg-sky-100 dark:bg-sky-900/40', fg: 'text-sky-700 dark:text-sky-300', ring: 'ring-sky-200/60 dark:ring-sky-800/60' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/40', fg: 'text-pink-700 dark:text-pink-300', ring: 'ring-pink-200/60 dark:ring-pink-800/60' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/40', fg: 'text-purple-700 dark:text-purple-300', ring: 'ring-purple-200/60 dark:ring-purple-800/60' },
}

const tone = computed(() => palette[props.accent] ?? palette.slate)
</script>

<template>
  <section class="rounded-xl bg-white dark:bg-slate-900 ring-1 transition" :class="tone.ring">
    <header
      class="flex items-center gap-2.5 px-3.5 py-2.5"
      :class="collapsible ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-t-xl select-none' : ''"
      @click="collapsible && emit('toggle')"
    >
      <span
        class="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
        :class="[tone.bg, tone.fg]"
      >
        <font-awesome-icon :icon="icon" class="w-3.5 h-3.5" />
      </span>
      <h4 class="flex-1 text-sm font-semibold text-app truncate">{{ title }}</h4>
      <span
        v-if="count !== null && count !== ''"
        class="text-xs font-medium px-1.5 h-5 inline-flex items-center rounded-full"
        :class="[tone.bg, tone.fg]"
      >
        {{ count }}
      </span>
      <slot name="actions" />
      <font-awesome-icon
        v-if="collapsible"
        :icon="collapsed ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up'"
        class="w-3 h-3 text-subtle"
      />
    </header>
    <div v-if="!collapsed" class="px-3.5 pb-3.5 pt-1">
      <slot />
    </div>
  </section>
</template>
