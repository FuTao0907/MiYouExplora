import { describe, it, expect } from 'vitest'
import { computeGachaStats, REFERENCE_AVG } from './stats.js'

// 反例表（每个测试对应一个不同错误实现）：
// S1 按 (游戏|uid|池) 分组           错误实现：只按池分组（跨 uid 混算保底）
// S2 保底进度（倒序输入仍正确）      错误实现：按输入顺序数 / 未按 id 升序
// S3 无五星池 → pity = 总抽数        错误实现：pity=0 / undefined
// S4 五星就在最新 → pity = 0         错误实现：把五星本身算进保底
// S5 平均五星间隔（含首个五星）      错误实现：不含首个五星 / 用时间戳差
// S6 崩铁 11+12 合并为 char 池       错误实现：11/12 各自独立计算保底
// S7 五星/四星/三星计数              错误实现：计数含非 3/4/5 档
// S8 BigInt 排序（17 位 id 不失序）  错误实现：Number(id) 精度丢失

// —— 公共构造工具：构造归一化记录（id 越大越新；默认倒序传入模拟官方返回） ——
function rec(over = {}) {
  return {
    id: '10000000000000001',
    game: 'genshin',
    gachaType: '301',
    gachaTypeKey: 'char',
    gachaTypeName: '角色活动祈愿',
    itemId: '',
    name: '琴',
    itemType: '角色',
    rankType: 5,
    time: '2026-01-01 12:00:00',
    uid: '212114083',
    ...over,
  }
}
// 生成 n 条按 id 递增的倒序记录（id 越大越新）
function seq(n, startId = 1, over = {}) {
  const list = []
  for (let i = 0; i < n; i++) {
    list.push(
      rec({
        id: String(10000000000000000 + startId + i),
        time: `2026-01-${String((i % 28) + 1).padStart(2, '0')} 12:00:00`,
        ...over,
      })
    )
  }
  return list.reverse() // 官方返回：最新在前
}

describe('computeGachaStats 分组与计数', () => {
  it('S1 按 (游戏|uid|池) 分组，跨账号不混算', () => {
    const records = [
      rec({ id: '10000000000000003', name: 'A', rankType: 5, uid: 'u1' }),
      rec({ id: '10000000000000002', name: 'B', rankType: 4, uid: 'u1' }),
      rec({ id: '10000000000000001', name: 'C', rankType: 4, uid: 'u2' }),
    ]
    const { groups } = computeGachaStats(records)
    expect(groups).toHaveLength(2)
    const u1 = groups.find((g) => g.uid === 'u1')
    const u2 = groups.find((g) => g.uid === 'u2')
    expect(u1.total).toBe(2)
    expect(u2.total).toBe(1)
  })

  it('S7 五星/四星/三星计数正确', () => {
    const records = [
      rec({ id: '10000000000000006', rankType: 5 }),
      rec({ id: '10000000000000005', rankType: 4 }),
      rec({ id: '10000000000000004', rankType: 4 }),
      rec({ id: '10000000000000003', rankType: 3 }),
      rec({ id: '10000000000000002', rankType: 3 }),
    ]
    const { groups } = computeGachaStats(records)
    const g = groups[0]
    expect(g.total).toBe(5)
    expect(g.fiveStarCount).toBe(1)
    expect(g.fourStarCount).toBe(2)
    expect(g.threeStarCount).toBe(2)
  })
})

describe('computeGachaStats 保底进度', () => {
  it('S2 倒序输入（官方返回顺序）按 id 升序后正确计算保底', () => {
    // 共 6 抽：id 3 是五星，其后（更新）还有 id 4/5/6 三抽 → pity 应为 3
    const records = [
      rec({ id: '10000000000000006', rankType: 4 }), // 最新
      rec({ id: '10000000000000005', rankType: 4 }),
      rec({ id: '10000000000000004', rankType: 3 }),
      rec({ id: '10000000000000003', rankType: 5 }), // 最近五星
      rec({ id: '10000000000000002', rankType: 4 }),
      rec({ id: '10000000000000001', rankType: 4 }), // 最旧
    ]
    const { groups } = computeGachaStats(records)
    expect(groups[0].pity).toBe(3)
  })

  it('S3 从未出五星 → pity = 池内总抽数', () => {
    const records = seq(7, 1, { rankType: 4 })
    const { groups } = computeGachaStats(records)
    expect(groups[0].pity).toBe(7)
    expect(groups[0].avgInterval).toBeNull()
    expect(groups[0].firstFiveAt).toBeNull()
  })

  it('S4 最新一抽就是五星 → pity = 0', () => {
    const records = [
      rec({ id: '10000000000000008', rankType: 5 }), // 最新即五星
      rec({ id: '10000000000000007', rankType: 4 }),
      rec({ id: '10000000000000006', rankType: 4 }),
    ]
    const { groups } = computeGachaStats(records)
    expect(groups[0].pity).toBe(0)
  })
})

describe('computeGachaStats 欧非口径（平均五星间隔）', () => {
  it('S5 五星在第 1/64/128 抽 → 间隔 [1,63,64] → 平均 42.7，首个在 1', () => {
    const list = []
    for (let i = 1; i <= 128; i++) {
      // 用 BigInt 构造 id：1e16 超出 Number 安全整数（ulp=2），直接加法会丢精度产生重复 id
      list.push(rec({ id: String(10000000000000000n + BigInt(i)), rankType: i === 1 || i === 64 || i === 128 ? 5 : 4 }))
    }
    const { groups } = computeGachaStats(list.reverse())
    const g = groups[0]
    expect(g.avgInterval).toBe(42.7)
    expect(g.firstFiveAt).toBe(1)
    expect(g.fiveStarCount).toBe(3)
    // 五星按抽取时间升序排列（id 升序）
    expect(g.fiveStars.map((f) => f.rankType)).toEqual([5, 5, 5])
  })

  it('S6 崩铁 11+12 合并为 char 池计算保底', () => {
    const records = [
      rec({ id: '10000000000000005', rankType: 5, game: 'starrail', gachaType: '12', gachaTypeKey: 'char2', gachaTypeName: '角色活动跃迁' }),
      rec({ id: '10000000000000004', rankType: 4, game: 'starrail', gachaType: '11', gachaTypeKey: 'char', gachaTypeName: '角色活动跃迁' }),
      rec({ id: '10000000000000003', rankType: 4, game: 'starrail', gachaType: '11', gachaTypeKey: 'char', gachaTypeName: '角色活动跃迁' }),
    ]
    const { groups } = computeGachaStats(records)
    expect(groups).toHaveLength(1)
    expect(groups[0].poolKey).toBe('char')
    expect(groups[0].pity).toBe(0) // 最新一抽是五星
    expect(groups[0].total).toBe(3)
  })
})

describe('computeGachaStats 极端数据', () => {
  it('S8 17 位 id 排序不失序（Number 精度不足必须用 BigInt）', () => {
    // 构造两个 17 位 id，Number() 下会舍入成相同值
    const a = '90071992547409931' // Number 会丢精度
    const b = '90071992547409932'
    const records = [
      rec({ id: b, rankType: 4 }), // 新
      rec({ id: a, rankType: 5 }), // 旧（五星）
    ]
    const { groups } = computeGachaStats(records)
    // 若按 Number 排序两者相等 → 顺序不稳定；BigInt 排序保证 b 在 a 之后
    expect(groups[0].pity).toBe(1)
    expect(groups[0].fiveStars[0].name).toBe('琴')
  })

  it('空记录 → groups 为空、totalRecords=0', () => {
    const { groups, totalRecords, games } = computeGachaStats([])
    expect(groups).toEqual([])
    expect(totalRecords).toBe(0)
    expect(games).toEqual([])
  })

  it('参考期望值常量存在（原神角色池 62.5 社区口径）', () => {
    expect(REFERENCE_AVG['genshin:char']).toBe(62.5)
    expect(REFERENCE_AVG['genshin:weapon']).toBe(53.3)
  })
})
