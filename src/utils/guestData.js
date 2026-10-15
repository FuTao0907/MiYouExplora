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
