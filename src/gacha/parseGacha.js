// 抽卡记录解析器（一期：抽卡分析的数据层地基）
//
// 支持三种来源格式（字段以 UIGF-org 官方 schema 为准，见 https://uigf.org/en/standards/uigf-legacy-v4.1.html）：
//   1. UIGF v4.x —— 多游戏统一标准。顶层按游戏分段：hk4e（原神）、hkrpg（崩铁）、nap（绝区零）
//   2. UIGF legacy v2.x —— 原神旧版单游戏结构（顶层直接是 list 数组）
//   3. SRGF v1.0 —— 崩铁旧版单游戏结构（顶层直接是 list 数组）
//
// 所有格式统一归一化为内部记录（见 normalizeRecord），供统计与展示使用；
// 单条记录字段非法时跳过并记入 skipped，不中断整份导入（容忍工具导出的坏行）。

// ---------------------------------------------------------------------------
// 卡池类型 → 语义映射
// 原神（hk4e）gacha_type 枚举：100 新手 / 200 常驻 / 301 角色活动 / 302 武器活动 / 400 角色活动Ⅱ(旧) / 500 集录
// 崩铁（hkrpg）gacha_type 枚举：1 始发(新手) / 2 常驻 / 11、12 角色活动 / 21、22 光锥活动
//   —— 崩铁 11/12 与 21/22 是官方 API 按"是否包含当期 UP"拆分的两组，语义上都属角色/光锥活动池；
//      保底计算按语义池合并（角色活动 11+12 视为同一池，光锥活动 21+22 视为同一池）。
// ---------------------------------------------------------------------------
export const GACHA_TYPES = {
  genshin: {
    100: { key: 'beginner', name: '新手祈愿' },
    200: { key: 'standard', name: '常驻祈愿' },
    301: { key: 'char', name: '角色活动祈愿' },
    302: { key: 'weapon', name: '武器活动祈愿' },
    400: { key: 'char2', name: '角色活动祈愿Ⅱ（旧）' },
    500: { key: 'chronicle', name: '集录祈愿' },
  },
  starrail: {
    1: { key: 'beginner', name: '始发跃迁' },
    2: { key: 'standard', name: '常驻跃迁' },
    11: { key: 'char', name: '角色活动跃迁' },
    12: { key: 'char2', name: '角色活动跃迁' },
    21: { key: 'weapon', name: '光锥活动跃迁' },
    22: { key: 'weapon2', name: '光锥活动跃迁' },
  },
}

// 各格式必填字段（缺任一字段即视为坏行，跳过错报）
const REQUIRED = {
  hk4e_v4: ['uigf_gacha_type', 'gacha_type', 'item_id', 'time', 'id'],
  hkrpg_v4: ['gacha_type', 'gacha_id', 'time', 'item_id', 'id'],
  hk4e_legacy: ['uigf_gacha_type', 'gacha_type', 'name', 'time', 'id'],
  hkrpg_legacy: ['gacha_type', 'name', 'time', 'id'],
}

/**
 * 解析抽卡记录 JSON（字符串或已 parse 的对象）。
 * @param {string|object} input 抽卡记录文件内容
 * @returns {{ records: Array, skipped: Array, warnings: Array, version: string|null, games: Array }}
 *   records: 归一化记录；skipped: 被跳过的坏行（含原因）；warnings: 非致命提示（如未知卡池类型）；
 *   version: 识别到的格式版本；games: 识别到的游戏列表（'genshin' | 'starrail' | 'zzz'）。
 * @throws {Error} 输入不是合法 JSON / 无法识别任何已知格式
 */
export function parseGachaJson(input) {
  const obj = typeof input === 'string' ? JSON.parse(input) : input
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('抽卡记录数据格式不正确：应为 JSON 对象')
  }

  const version = obj.info?.version ?? null
  const warnings = []
  const records = []
  const skipped = []
  const games = []

  // 按版本特征分发到对应格式处理器
  if (typeof version === 'string' && /^v[4-9]\./.test(version)) {
    // —— UIGF v4.x：按游戏分段 ——
    const sections = [
      { key: 'hk4e', game: 'genshin', req: REQUIRED.hk4e_v4, hasPoolId: false },
      { key: 'hkrpg', game: 'starrail', req: REQUIRED.hkrpg_v4, hasPoolId: true },
      { key: 'nap', game: 'zzz', req: REQUIRED.hkrpg_v4, hasPoolId: true }, // 绝区零字段与崩铁同构
    ]
    for (const sec of sections) {
      const seg = obj[sec.key]
      if (!Array.isArray(seg) || seg.length === 0) continue
      games.push(sec.game)
      seg.forEach((group) => {
        const uid = String(group.uid ?? '')
        const list = Array.isArray(group.list) ? group.list : []
        list.forEach((item) => {
          const rec = normalizeRecord(item, sec.game, uid, sec.req, sec.hasPoolId, skipped)
          if (rec) records.push(rec)
        })
      })
    }
    if (games.length === 0) {
      throw new Error('UIGF 文件中没有任何可识别的游戏数据段（hk4e / hkrpg / nap）')
    }
  } else if (typeof version === 'string' && /SRGF/i.test(version)) {
    // —— SRGF v1.0：崩铁旧版单游戏结构 ——
    games.push('starrail')
    parseLegacyList(obj, 'starrail', REQUIRED.hkrpg_legacy, true, records, skipped)
  } else if (typeof version === 'string' && /^v[2-3]\./.test(version)) {
    // —— UIGF legacy v2.x / v3.x：原神旧版单游戏结构 ——
    games.push('genshin')
    parseLegacyList(obj, 'genshin', REQUIRED.hk4e_legacy, false, records, skipped)
  } else {
    throw new Error('无法识别的抽卡记录格式（缺少合法的 info.version）')
  }

  return { records, skipped, warnings, version, games }
}

// 处理"顶层就是 list"的旧版单游戏结构
function parseLegacyList(obj, game, req, hasPoolId, records, skipped) {
  const list = Array.isArray(obj.list) ? obj.list : []
  list.forEach((item) => {
    const uid = String(item.uid ?? '')
    const rec = normalizeRecord(item, game, uid, req, hasPoolId, skipped)
    if (rec) records.push(rec)
  })
}

/**
 * 把单条来源记录归一化为内部记录。
 * 内部记录字段（统计/展示统一使用）：
 *   { id, game, gachaType, gachaTypeKey, gachaTypeName, gachaId, itemId, name, itemType, rankType, time, uid }
 *   gachaId：崩铁 v4/SRGF 必填的卡池 id（导出 UIGF v4 时需要还原）；原神格式无此字段，记为空串。
 */
function normalizeRecord(item, game, uid, req, hasPoolId, skipped) {
  if (!item || typeof item !== 'object') {
    skipped.push({ reason: '记录不是对象', raw: item })
    return null
  }
  // 必填校验：缺任一字段视为坏行
  const missing = req.filter((f) => item[f] === undefined || item[f] === null || item[f] === '')
  if (missing.length > 0) {
    skipped.push({ reason: `缺少必填字段: ${missing.join(', ')}`, raw: item })
    return null
  }
  // 卡池类型语义化（未知类型保留原始值并告警，不丢数据）
  const typeStr = String(item.gacha_type)
  const typeInfo = GACHA_TYPES[game]?.[typeStr] ?? null
  if (!typeInfo) {
    skipped.push({ reason: `未知卡池类型 gacha_type=${typeStr}`, raw: item })
    return null
  }
  return {
    id: String(item.id),
    game,
    gachaType: typeStr,
    gachaTypeKey: typeInfo.key,
    gachaTypeName: typeInfo.name,
    gachaId: item.gacha_id != null ? String(item.gacha_id) : '',
    itemId: item.item_id != null ? String(item.item_id) : '',
    name: String(item.name ?? ''),
    itemType: String(item.item_type ?? ''),
    rankType: Number(item.rank_type),
    time: String(item.time ?? ''),
    uid,
  }
}

/** 按游戏取语义池分组用的 gacha_type 键（崩铁 11/12、21/22 合并） */
export function poolKeyOf(rec) {
  if (rec.game === 'starrail') {
    if (rec.gachaTypeKey === 'char2') return 'char'
    if (rec.gachaTypeKey === 'weapon2') return 'weapon'
  }
  return rec.gachaTypeKey
}
