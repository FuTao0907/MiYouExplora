<script setup>
import { computed } from 'vue'
import { regionPercent, getStatus } from '../utils/status.js'
import { useCountUp } from '../composables/useCountUp.js'
import ProgressBar from './ProgressBar.vue'

const props = defineProps({
  region: { type: Object, required: true },
  progress: { type: Object, required: true }
})
const emit = defineEmits(['edit'])

const status = computed(() => getStatus(props.region, props.progress))
const percent = computed(() => regionPercent(props.region, props.progress))
// 探索度数字滚动动效（卡片进入时 0 → 目标值）
const animPercent = useCountUp(() => percent.value, 800)
// 板块目标摘要（权威统计）：拆成 3 组分列 mini 统计（数字 + 标签）
const targetItems = computed(() => {
  const t = props.region.targets ?? {}
  const defs = props.region.areas?.[0]?.items ?? []
  return defs.filter((d) => t[d.id]).map((d) => ({ id: d.id, name: d.name, value: t[d.id] }))
})
// 实景图（games.json 的 image 字段；没有图时回退纯色）
const img = computed(() => props.region.image || '')
</script>

<template>
  <button
    type="button"
    class="region-card"
    :style="img ? { '--region-img': `url(${img})` } : {}"
    :aria-label="`查看${region.name}探索详情`"
    @click="emit('edit', region.id)"
  >
    <div class="card-inner">
      <div class="card-top">
        <span class="card-status" :class="status" v-if="status === '已完成'">{{ status }}</span>
      </div>
      <div class="card-bottom">
        <div class="card-name">{{ region.name }}</div>
        <div class="card-stat">
          <span class="card-percent tnum">{{ animPercent }}</span>
          <span class="card-unit">%</span>
        </div>
        <ProgressBar :percent="percent" :status="status" />
        <div class="card-targets tnum" v-if="targetItems.length">
          <div v-for="it in targetItems" :key="it.id" class="target-item">
            <span class="target-num">{{ it.value }}</span>
            <span class="target-label">{{ it.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </button>
</template>

<style scoped>
.region-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 210px;
  padding: var(--sp-5);
  text-align: left;
  color: var(--text-1);
  border: none;
  border-radius: var(--r-md);
  background: var(--bg-2);
  background-image: var(--region-img, none);
  background-size: cover;
  background-position: center;
  overflow: hidden;
  transition: transform 0.3s var(--ease);
}
/* 图片底部中性压字 scrim（house rule 唯一允许的渐变）taste-skill-ignore */
.region-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--scrim-bottom);
  pointer-events: none;
}
.region-card:hover {
  transform: scale(1.02);
}
.region-card:active {
  transform: scale(0.99);
}
.card-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 20px;
}
.card-status {
  font-size: var(--fz-xs);
  color: var(--green);
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
  font-size: clamp(30px, 3.6vw, 42px);
  font-weight: 700;
  color: var(--gold-bright);
  line-height: 1;
}
.card-unit {
  font-size: var(--fz-md);
  color: var(--gold);
}
.card-targets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-2);
  margin-top: 2px;
}
.target-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.target-num {
  font-size: var(--fz-base);
  font-weight: 600;
  color: var(--text-1);
  line-height: 1.2;
}
.target-label {
  font-size: var(--fz-xs);
  color: var(--text-3);
}
</style>
