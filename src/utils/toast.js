// 全局轻提示（toast）：替代浏览器原生 alert/confirm 的粗糙反馈
// 用法：import { toast } from './toast.js'; toast('导入成功', 'success')
// 类型：success（绿） / error（红） / info（中性）；默认 2.6s 自动消失
import { reactive } from 'vue'

export const toastState = reactive({ items: [] })

let seed = 0

export function toast(message, type = 'info', duration = 2600) {
  const id = ++seed
  toastState.items.push({ id, message, type })
  setTimeout(() => {
    const i = toastState.items.findIndex((t) => t.id === id)
    if (i >= 0) toastState.items.splice(i, 1)
  }, duration)
}
