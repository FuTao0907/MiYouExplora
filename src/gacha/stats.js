// 抽卡记录统计（一期：抽卡分析的计算层）
//
// 输入 parseGachaJson 归一化后的 records，按 (游戏, UID, 语义池) 分组统计：
//   - 总抽数 / 五星、四星、三星计数
//   - 五星列表（按抽取时间升序）
//   - 当前保底进度（距最近一次五星的抽取数；该池从未出五星时为池内总抽数）
//   - 平均五星间隔（欧非口径：平均多少抽出一个五星，含首个五星自身的间隔）
//
// 口径说明（产品判断，非官方数值）：
//   - 保底只统计五星（四星保底不展开，避免复杂化）。
//   - 崩铁 11/12（角色活动）与 21/22（光锥活动）在语义上合并为同一池计算保底。
//   - 官方返回的 list 是倒序（最新在前），统计前统一按 id 升序排序，id 用 BigInt 比较（17 位数字超出 Number 安全整数范围）。

import { poolKeyOf } from './parseGacha.js'

// 参考期望值（社区通用口径，可调整；崩铁暂不预设参考值）
// 原神：角色池综合期望约 62.5 抽、武器池约 53.3 抽（含定轨机制）、常驻/集录约 62.5 抽。
export const REFERENCE_AVG = {
  'genshin:char': 62.5,
  'genshin:char2': 62.5,
  'genshin:chronicle': 62.5,
  'genshin:standard': 62.5,
  'genshin:beginner': 62.5,
  'genshin:weapon': 53.3,
}

/**
 * 对归一化记录做分组统计。
 * @param {Array} records parseGachaJson 返回的 records
 * @returns {{ groups: Array, totalRecords: number, games: Array }}
 *   groups: 按 (game|uid|poolKey) 分组的统计结果，见 buildGroup；
 *   totalRecords: 参与统计的记录总数；games: 去重后的游戏列表。
 */
export function computeGachaStats(records) {
  const map = new Map() // key: `${game}|${uid}|${poolKey}` -> 组内记录数组
  for (const rec of records) {
    const key = `${rec.game}|${rec.uid}|${poolKeyOf(rec)}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(rec)
  }

  const groups = []
  for (const [key, list] of map) {
    const [game, uid, poolKey] = key.split('|')
    groups.push(buildGroup(game, uid, poolKey, list))
  }
  // 展示顺序：游戏 → 池类型顺序 → 时间（稳定可预期）
  groups.sort((a, b) => {
    if (a.game !== b.game) return a.game < b.game ? -1 : 1
    if (a.poolKey !== b.poolKey) return poolOrder(a.poolKey) - poolOrder(b.poolKey)
    return a.uid < b.uid ? -1 : 1
  })

  return {
    groups,
    totalRecords: records.length,
    games: [...new Set(records.map((r) => r.game))],
  }
}

// 语义池展示顺序（新手 → 角色 → 武器 → 常驻 → 集录）
function poolOrder(poolKey) {
  const order = { beginner: 0, char: 1, char2: 1, weapon: 2, weapon2: 2, standard: 3, chronicle: 4 }
  return order[poolKey] ?? 9
}

function buildGroup(game, uid, poolKey, list) {
  // 按 id 升序（官方 id 单调递增，即抽取时间顺序）
  const sorted = [...list].sort((a, b) => {
    const ia = BigInt(a.id)
    const ib = BigInt(b.id)
    return ia < ib ? -1 : ia > ib ? 1 : 0
  })

  const fiveStars = sorted.filter((r) => r.rankType === 5)
  const fiveStarCount = fiveStars.length
  const fourStarCount = sorted.filter((r) => r.rankType === 4).length
  const threeStarCount = sorted.filter((r) => r.rankType === 3).length

  // 保底进度：从最新一条往前数，到最近一次五星之间的抽取数（不含五星本身）
  // 无五星时 = 池内总抽数（当前所有抽数都在累积保底）
  let pity = sorted.length
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].rankType === 5) {
      pity = sorted.length - 1 - i
      break
    }
  }

  // 平均五星间隔：相邻五星的序号差；首个五星的间隔 = 其在组内序号 + 1（从第 1 抽算起）
  // 例：五星出现在第 1、64、128 抽 → 间隔 [1, 63, 64] → 平均 42.67
  let avgInterval = null
  let firstFiveAt = null
  if (fiveStarCount > 0) {
    const positions = []
    sorted.forEach((r, idx) => {
      if (r.rankType === 5) positions.push(idx + 1)
    })
    const intervals = positions.map((pos, i) => (i === 0 ? pos : pos - positions[i - 1]))
    avgInterval = Math.round((intervals.reduce((s, v) => s + v, 0) / intervals.length) * 10) / 10
    firstFiveAt = positions[0]
  }

  const poolName = list[0]?.gachaTypeName ?? poolKey
  return {
    key: `${game}|${uid}|${poolKey}`,
    game,
    uid,
    poolKey,
    poolName,
    total: sorted.length,
    fiveStarCount,
    fourStarCount,
    threeStarCount,
    fiveStars: fiveStars.map((r) => ({ name: r.name, time: r.time, rankType: r.rankType })),
    pity,
    avgInterval,
    firstFiveAt,
  }
}
