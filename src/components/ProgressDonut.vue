<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** Percentage 0..100 */
  value: number
  size?: number
  stroke?: number
  /** Optional color override for the filled arc. */
  color?: string
  label?: string
}>()

const size = computed(() => props.size ?? 140)
const stroke = computed(() => props.stroke ?? 12)
const radius = computed(() => (size.value - stroke.value) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const clamped = computed(() => Math.max(0, Math.min(100, props.value)))
const dashOffset = computed(
  () => circumference.value - (clamped.value / 100) * circumference.value,
)
</script>

<template>
  <div class="inline-flex flex-col items-center">
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="overflow-visible"
    >
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        class="stroke-slate-200 dark:stroke-slate-700"
        :stroke-width="stroke"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="color ?? 'var(--color-brand-500, #3b5bff)'"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
        style="transition: stroke-dashoffset 0.3s ease"
      />
      <text
        :x="size / 2"
        :y="size / 2"
        text-anchor="middle"
        dominant-baseline="central"
        class="fill-slate-900 dark:fill-slate-100"
        :style="{ fontSize: `${Math.round(size / 5)}px`, fontWeight: 700 }"
      >
        {{ Math.round(clamped) }}%
      </text>
    </svg>
    <p v-if="label" class="mt-2 text-xs text-muted uppercase tracking-wide font-semibold">
      {{ label }}
    </p>
  </div>
</template>
