<script setup lang="ts">
import { computed } from 'vue'

interface Segment {
  key: string
  label: string
  count: number
  color: string
}

const props = defineProps<{
  segments: Segment[]
}>()

const total = computed(() => props.segments.reduce((s, seg) => s + seg.count, 0))

const visible = computed(() => props.segments.filter((s) => s.count > 0))
</script>

<template>
  <div>
    <div v-if="total === 0" class="h-3 rounded-full bg-slate-100 dark:bg-slate-800" />
    <div v-else class="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
      <div
        v-for="seg in visible"
        :key="seg.key"
        class="h-full transition-all"
        :style="{ width: `${(seg.count / total) * 100}%`, backgroundColor: seg.color }"
      />
    </div>
    <ul class="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2">
      <li
        v-for="seg in segments"
        :key="seg.key"
        class="flex items-center justify-between text-sm"
      >
        <span class="inline-flex items-center gap-2">
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ backgroundColor: seg.color }"
          />
          <span class="text-app truncate">{{ seg.label }}</span>
        </span>
        <span class="text-muted font-medium">{{ seg.count }}</span>
      </li>
    </ul>
  </div>
</template>
