// 抽卡记录导出器（一期收尾：让本机存档可迁移、可备份）
//
// 把 localStorage 里的归一化记录重新组装为 UIGF v4.1 标准 JSON：
//   - 多游戏单文件：原神 → hk4e 段、崩铁 → hkrpg 段、绝区零 → nap 段（与官方 v4.x 结构一致）
//   - 字段按官方 schema 还原（uigf_gacha_type/gacha_type/item_id/gacha_id/time/id 等），
//     导出的文件可被本站再导入，也可被其他 UIGF 生态工具读取
//   - 保证"导出 → 再导入"往返一致（数据不丢失、不重复）
//
// 参考：https://uigf.org/en/standards/uigf-legacy-v4.1.html

// 内部游戏 id → UIGF v4 分段键
const SEGMENT = { genshin: 'hk4e', starrail: 'hkrpg', zzz: 'nap' }

/**
 * 把归一化抽卡记录导出为 UIGF v4.1 JSON 字符串。
 * @param {Array} records parseGachaJson 输出的归一化记录（可含多游戏多 UID）
 * @param {Object} [opts] { exportedAt: 导出时间戳(ms), app: 导出工具名 }
 * @returns {string|null} 无可导出记录（空 / 全是未知游戏）返回 null
 */
export function exportGachaJson(records, opts = {}) {
  if (!Array.isArray(records) || records.length === 0) return null

  // 按（游戏 | UID）分组；未知游戏段直接跳过（内部记录不应出现）
  const groups = new Map()
  for (const r of records) {
    if (!r || typeof r !== 'object') continue
    const seg = SEGMENT[r.game]
    if (!seg) continue
    const key = `${r.game}|${r.uid}`
    if (!groups.has(key)) groups.set(key, { seg, uid: String(r.uid), list: [] })
    groups.get(key).list.push(r)
  }
  if (groups.size === 0) return null

  const doc = {
    info: {
      export_timestamp: Math.floor((opts.exportedAt || Date.now()) / 1000),
      export_app: opts.app || 'MiYouExplorationLevel',
      export_app_version: '1.0.0',
      version: 'v4.1',
    },
  }

  for (const g of groups.values()) {
    if (!Array.isArray(doc[g.seg])) doc[g.seg] = []
    doc[g.seg].push({
      uid: g.uid,
      timezone: 8, // 导出统一用 +8（本站以国服为主；原文件 timezone 未在存档中保留）
      lang: 'zh-cn',
      list: g.list.slice().sort(compareId).map((r) => toV4Item(r)),
    })
  }

  return JSON.stringify(doc, null, 2)
}

// 按记录 id 升序排列（17 位 id 超出 Number 安全整数，必须用 BigInt 比较，与统计侧一致）
function compareId(a, b) {
  try {
    const x = BigInt(a.id)
    const y = BigInt(b.id)
    return x < y ? -1 : x > y ? 1 : 0
  } catch {
    return String(a.id) < String(b.id) ? -1 : 1
  }
}

// 内部记录 → UIGF v4 单条（字段名按官方 schema）
function toV4Item(r) {
  const base = {
    count: '1',
    time: r.time,
    name: r.name,
    item_type: r.itemType,
    // rankType 解析时为 Number；非法值（缺 rank_type 的行）导出空串，避免写入 "NaN"
    rank_type: Number.isFinite(r.rankType) ? String(r.rankType) : '',
    id: r.id,
  }
  if (r.game === 'genshin') {
    // hk4e_v4 必填：uigf_gacha_type / gacha_type / item_id / time / id
    return { uigf_gacha_type: r.gachaType, gacha_type: r.gachaType, item_id: r.itemId, ...base }
  }
  // hkrpg_v4 / nap：必填 gacha_id / gacha_type / time / item_id / id（崩铁与绝区零同构）
  // gacha_id 缺失时（旧版本解析器导入的存档未保留该字段）回退为卡池类型码，
  // 保证导出文件非空、可被本站再导入（站内往返一致）；对 UIGF 生态工具是弱语义占位。
  return { gacha_id: r.gachaId || r.gachaType, gacha_type: r.gachaType, item_id: r.itemId, ...base }
}
