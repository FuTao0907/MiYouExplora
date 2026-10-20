<script setup>
// 全局 toast 宿主：固定在底部居中，多条纵向堆叠
// 数据来自 utils/toast.js 的响应式 toastState（任意组件 toast() 即触发）
import { toastState } from '../utils/toast.js'
</script>

<template>
  <div class="toast-host" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in toastState.items"
        :key="t.id"
        class="toast"
        :class="'toast-' + t.type"
      >
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: var(--sp-7);
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  pointer-events: none;
}
.toast {
  max-width: min(90vw, 460px);
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--r-sm);
  background: var(--bg-3);
  color: var(--text-1);
  font-size: var(--fz-sm);
  line-height: 1.5;
  box-shadow: var(--shadow-card);
}
.toast-success {
  border-left: 3px solid var(--green);
}
.toast-error {
  border-left: 3px solid #e5484d;
}
.toast-info {
  border-left: 3px solid var(--text-3);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s var(--ease), transform 0.22s var(--ease);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
