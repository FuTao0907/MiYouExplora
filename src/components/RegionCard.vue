<script setup>
import { computed } from 'vue'
import { regionPercent, getStatus } from '../utils/status.js'
import ProgressBar from './ProgressBar.vue'

const props = defineProps({
  region: { type: Object, required: true },
  index: { type: Number, default: 0 },
  progress: { type: Object, required: true }
})
const emit = defineEmits(['edit'])

const status = computed(() => getStatus(props.region, props.progress))
const percent = computed(() => regionPercent(props.region, props.progress))
const hasImage = computed(() => Boolean(props.region.image))
const cardStyle = computed(() =>
  props.region.image ? { '--card-bg': `url('${props.region.image}')` } : {}
)
// 板块目标摘要（权威统计，如「宝箱 755 · 挑战 33 · 仙灵 83」）
const targetSummary = computed(() => {
  const t = props.region.targets ?? {}
  const defs = props.region.areas?.[0]?.items ?? []
  return defs
    .filter((d) => t[d.id])
    .map((d) => `${d.name} ${t[d.id]}`)
    .join(' · ')
})
</script>

<template>
  <button
    type="button"
    class="region-card"
    :class="{ 'has-image': hasImage }"
    :style="cardStyle"
    @click="emit('edit', region.id)"
  >
    <div class="card-top">
      <span class="card-index mono">{{ String(index + 1).padStart(2, '0') }}</span>
      <span class="badge" :class="status">{{ status }}</span>
    </div>
    <div class="card-bottom">
      <div class="card-name">{{ region.name }}</div>
      <div class="card-stat">
        <span class="card-percent mono">{{ percent }}</span>
        <span class="card-unit">%</span>
      </div>
      <ProgressBar :percent="percent" :status="status" />
      <div class="card-targets mono" v-if="targetSummary">{{ targetSummary }}</div>
    </div>
  </button>
</template>

<style scoped>
.region-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 190px;
  padding: var(--sp-5);
  text-align: left;
  color: var(--text-1);
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  background: var(--bg-2);
  overflow: hidden;
  isolation: isolate;
  transition: var(--t);
}
.region-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image: var(--card-bg, none);
  background-size: cover;
  background-position: center;
  transform: scale(1.02);
  transition: transform 0.6s var(--ease);
}
.region-card.has-image::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    180deg,
    rgba(11, 17, 29, 0.55) 0%,
    rgba(11, 17, 29, 0.25) 40%,
    rgba(11, 17, 29, 0.92) 100%
  );
}
.region-card:hover {
  border-color: var(--line-gold);
  box-shadow: var(--shadow-card), var(--shadow-glow);
  transform: translateY(-2px);
}
.region-card:hover::before {
  transform: scale(1.07);
}
.region-card:active {
  transform: translateY(0);
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
}
.card-index {
  font-size: var(--fz-xs);
  color: var(--gold);
  letter-spacing: 0.12em;
  opacity: 0.9;
}
.card-bottom {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.card-name {
  font-size: var(--fz-lg);
  font-weight: 600;
  letter-spacing: 0.06em;
}
.card-stat {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.card-percent {
  font-size: var(--fz-display);
  font-weight: 700;
  color: var(--gold-bright);
  line-height: 1;
}
.card-unit {
  font-size: var(--fz-md);
  color: var(--gold);
}
.card-targets {
  font-size: var(--fz-xs);
  color: var(--text-2);
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
