<script setup>
defineProps({
  percent: { type: Number, default: 0 },
  status: { type: String, default: '' }
})
</script>

<template>
  <div class="bar">
    <div class="fill" :class="status" :style="{ width: percent + '%' }"></div>
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
  transition: width 0.35s var(--ease);
}
.fill.已完成 {
  background: var(--green);
}
.fill.进行中 {
  background: var(--orange);
}
</style>
