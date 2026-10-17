import { ref, onMounted } from 'vue'

/**
 * 数字滚动动效（count-up）：从 0 滚动到目标值，ease-out cubic。
 * - 目标值通过 getter 传入（数据变化时以最新值为准）
 * - 尊重 prefers-reduced-motion：直接显示终值，不做动画
 * - 挂载时启动一次（进入页面/卡片即触发）
 */
export function useCountUp(getTarget, duration = 900) {
  const value = ref(0)
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function run() {
    const target = Math.max(0, Math.round(Number(getTarget()) || 0))
    if (reduced) {
      value.value = target
      return
    }
    if (duration <= 0) {
      value.value = target
      return
    }
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      // ease-out cubic：快进慢停
      const eased = 1 - Math.pow(1 - p, 3)
      value.value = Math.round(target * eased)
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  onMounted(run)

  return value
}
