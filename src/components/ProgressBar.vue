<script setup>
// 进度条：进入时从 0 展开到目标宽度（transition 承担动画），数据变化实时跟随。
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  percent: { type: Number, default: 0 },
  status: { type: String, default: '' }
})

const width = ref(0)
onMounted(() => {
  // 下一帧再设目标宽度 → 触发 0 → 目标 的 transition
  requestAnimationFrame(() => {
    width.value = props.percent
  })
})
watch(
  () => props.percent,
  (v) => {
    width.value = v
  }
)
</script>

<template>
  <div class="bar">
    <div class="fill" :class="status" :style="{ width: width + '%' }"></div>
  </div>
</template>

<style scoped>
.bar {
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
  overflow: hidden;
}
.fill {
  height: 100%;
  border-radius: 999px;
  background: var(--gold);
  transition: width 0.7s var(--ease);
}
.fill.已完成 {
  background: var(--green);
}
.fill.进行中 {
  background: var(--orange);
}
</style>
