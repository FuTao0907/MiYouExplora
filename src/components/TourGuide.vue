<script setup>
// Tour 漫游式引导：轻量气泡组件（无第三方依赖）。
// 高亮目标元素（selector 定位），气泡定位在目标下方/上方，支持上一步/下一步/跳过。
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { PhCaretLeft, PhCaretRight, PhCheck, PhX } from '@phosphor-icons/vue'

const props = defineProps({
  steps: { type: Array, required: true } // [{ selector, title, body, placement }]
})
const emit = defineEmits(['close', 'done'])

const index = ref(0)
const pos = ref({ top: 80, left: 40 })

const step = computed(() => props.steps[index.value] ?? null)

function place() {
  const s = step.value
  if (!s) return
  const el = s.selector ? document.querySelector(s.selector) : null
  const vw = window.innerWidth
  if (!el) {
    pos.value = { top: 72, left: Math.max(12, Math.min(40, vw - 360)) }
    return
  }
  const r = el.getBoundingClientRect()
  const left = Math.min(Math.max(r.left, 12), Math.max(12, vw - 360))
  if ((s.placement ?? 'bottom') === 'bottom') {
    pos.value = { top: Math.min(r.bottom + 12, window.innerHeight - 180), left }
  } else {
    pos.value = { top: Math.max(12, r.top - 12), left }
  }
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
function onResize() {
  place()
}

onMounted(() => {
  place()
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKey)
})

function next() {
  if (index.value < props.steps.length - 1) {
    index.value += 1
    place()
  } else {
    emit('done')
  }
}
function prev() {
  if (index.value > 0) {
    index.value -= 1
    place()
  }
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
  <div v-if="step" class="tour-mask" @click="skip">
    <div
      class="tour-bubble"
      :style="{ top: pos.top + 'px', left: pos.left + 'px' }"
      @click.stop
      role="dialog"
      aria-label="引导"
    >
      <div class="tour-head">
        <span class="tour-step mono">{{ index + 1 }} / {{ steps.length }}</span>
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
  </div>
</template>

<style scoped>
.tour-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(4, 7, 13, 0.55);
}
.tour-bubble {
  position: fixed;
  width: 340px;
  max-width: calc(100vw - 24px);
  padding: var(--sp-4) var(--sp-5);
  background: var(--bg-2);
  border: 1px solid var(--line-gold);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card), var(--shadow-glow);
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
  color: var(--gold);
  letter-spacing: 0.14em;
}
.tour-skip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--text-3);
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
  font-size: var(--fz-sm);
  color: var(--text-2);
  line-height: 1.7;
}
.tour-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
}
</style>
