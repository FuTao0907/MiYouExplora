// 游客/主人数据核心逻辑（纯函数，便于单测）：
// - displayValue：单格展示值。主人=云端；游客=本地有则本地，否则（参考开关开 ? 云端 : 0）
// - isGuestOwned：该格是否属于游客自己的数据（用于 UI 归属标记）
// - isReferenceShown：该格当前是否显示为「参考」（游客借用主人值且开关开）
export function displayValue(editable, showReference, cloudValue, guestValue) {
  if (editable) return cloudValue
  if (guestValue != null) return guestValue
  return showReference ? cloudValue : 0
}

export function isGuestOwned(editable, guestValue) {
  return !editable && guestValue != null
}

export function isReferenceShown(editable, showReference, guestValue) {
  return !editable && showReference && guestValue == null
}

// 解析录入输入（text 输入框 → 合法值）：
// - 合法值：-1（无/不适用）、0..max 的整数
// - 空串 → 0（未输入按 0）
// - 超上限（> max）→ 收紧到 max；小于 -1 → 收紧到 -1
// - 其他（非整数文本）→ null（忽略该次输入）
export function parseItemInput(raw, max) {
  const s = String(raw ?? '').trim()
  if (s === '') return 0
  if (!/^-?\d+$/.test(s)) return null
  const n = Number(s)
  if (n === -1) return -1
  if (n < -1) return -1
  if (n > max) return max
  return Math.floor(n)
}

// 输入过程中只保留可解析前缀字符（数字与单个前导负号），供 @input 过滤
export function sanitizeInputText(raw) {
  return String(raw ?? '').replace(/[^\d-]/g, '').replace(/(?!^)-/g, '')
}
