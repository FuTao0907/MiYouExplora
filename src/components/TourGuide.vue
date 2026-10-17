<script setup>
// Tour 漫游式引导：轻量气泡组件（无第三方依赖）。
// 右下角固定锚定，不遮罩页面、不遮挡任何内容；支持上一步/下一步/跳过。
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { PhCaretLeft, PhCaretRight, PhCheck, PhX } from '@phosphor-icons/vue'

const props = defineProps({
  steps: { type: Array, required: true } // [{ title, body }]
})
const emit = defineEmits(['close', 'done'])

const index = ref(0)
const step = computed(() => props.steps[index.value] ?? null)

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

function next() {
  if (index.value < props.steps.length - 1) {
    index.value += 1
  } else {
    emit('done')
  }
}
function prev() {
  if (index.value > 0) index.value -= 1
}
function skip() {
  emit('close')
}
// 最后一步「开始使用」：与 next 的末尾分支等价，独立成函数供按钮绑定
function done() {
  emit('done')
}
</script>

<template>
  <div
    v-if="step"
    class="tour-bubble"
    role="dialog"
    aria-label="引导"
  >
    <div class="tour-head">
      <span class="tour-step tnum">{{ index + 1 }} / {{ steps.length }}</span>
      <button class="tour-skip" @click="skip" title="跳过新手引导">
        <PhX :size="13" /> 跳过
      </button>
    </div>
    <h3 class="tour-title">{{ step.title }}</h3>
    <p class="tour-body">{{ step.body }}</p>
    <div class="tour-actions">
      <button v-if="index > 0" class="btn btn-ghost btn-sm" @click="prev" title="上一步">
        <PhCaretLeft :size="15" /> 上一步
      </button>
      <button v-if="index < steps.length - 1" class="btn btn-primary btn-sm" @click="next" title="下一步">
        下一步 <PhCaretRight :size="15" />
      </button>
      <button v-else class="btn btn-primary btn-sm" @click="done" title="完成引导，开始使用">
        <PhCheck :size="15" /> 开始使用
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 右下角锚定的引导卡：不遮罩、不遮挡正文（弹层允许阴影） */
.tour-bubble {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 80;
  width: 360px;
  max-width: calc(100vw - 32px);
  padding: var(--sp-4) var(--sp-5);
  background: var(--bg-3);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card); /* 引导浮层阴影（house rule 允许）taste-skill-ignore */
  color: var(--text-1);
}
.tour-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-2);
}
.tour-step {
  font-size: var(--fz-xs);
  color: var(--text-2);
}
.tour-skip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--text-2);
  font-size: var(--fz-xs);
  cursor: pointer;
  transition: var(--t);
}
.tour-skip:hover {
  color: var(--text-1);
}
.tour-title {
  margin: 0 0 var(--sp-2);
  font-size: var(--fz-base);
  font-weight: 700;
  letter-spacing: 0.04em;
}
.tour-body {
  margin: 0 0 var(--sp-4);
  font-size: var(--fz-base);
  color: var(--text-2);
  line-height: 1.7;
}
.tour-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
}

/* 移动端不弹引导卡：避免遮挡卡片数字（桌面首访已覆盖引导场景） */
@media (max-width: 640px) {
  .tour-bubble {
    display: none;
  }
}
</style>
