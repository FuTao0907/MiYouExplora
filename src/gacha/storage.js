// 抽卡记录本地存档（一期：游客本地档，无服务端）
//
// 说明：
//   - 抽卡数据是个人敏感数据（包含抽卡历史），一期只存本地（localStorage），不上传云端；
//     与探索度记录的"云端存档"机制解耦，等二期接入账号体系时再迁移。
//   - localStorage 容量约 5MB，一份全历史抽卡记录（数千条）约几百 KB，足够。
//   - 服务端渲染 / 无浏览器环境（如单元测试）下 localStorage 可能不存在，一律 try/catch 兜底。

const STORAGE_KEY = 'miyou.gacha.data'

/**
 * 读取本地抽卡存档。
 * @returns {{ records: Array, meta: Object } | null} 无存档或解析失败返回 null
 */
export function loadGachaData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!Array.isArray(data.records)) return null
    return { records: data.records, meta: data.meta || {} }
  } catch {
    return null // 数据损坏/环境无 localStorage → 视为无存档，不抛错
  }
}

/**
 * 保存抽卡存档（覆盖式写入）。
 * @param {Array} records 归一化抽卡记录（parseGachaJson 输出）
 * @param {Object} [meta] 存档元信息：{ importedAt, app, appVersion, version, games }
 * @returns {boolean} 是否写入成功（localStorage 不可用时返回 false）
 */
export function saveGachaData(records, meta = {}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ records, meta }))
    return true
  } catch {
    return false // 容量超限 / 隐私模式禁用存储等
  }
}

/** 清除本地抽卡存档 */
export function clearGachaData() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 忽略：无环境时清除无意义
  }
}

/** 是否存在本地抽卡存档 */
export function hasGachaData() {
  return loadGachaData() !== null
}
