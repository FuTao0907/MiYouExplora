import { describe, it, expect } from 'vitest'
import { exportGachaJson } from './exportGacha.js'
import { parseGachaJson } from './parseGacha.js'

// 反例表（每个测试对应一个不同错误实现）：
// E1 空 / 无有效记录 → null            错误实现：导出空对象 / 抛错
// E2 genshin → hk4e 段且必填字段齐全     错误实现：段键写错 / 漏 uigf_gacha_type
// E3 starrail → hkrpg 段且带 gacha_id   错误实现：漏 gacha_id（违反 v4 必填）
// E4 多游戏多 UID 正确分组              错误实现：按游戏合并 uid / 丢分组
// E5 往返一致：导出 → 再导入 与源记录相等  错误实现：字段丢失 / 改写 / 顺序错乱丢 id
// E6 id 升序排列                       错误实现：按插入序 / Number 排序丢精度

// —— 构造归一化记录（与 parseGachaJson 输出同构） ——
function rec(over = {}) {
  return {
    id: '10000000000000001',
    game: 'genshin',
    gachaType: '301',
    gachaTypeKey: 'char',
    gachaTypeName: '角色活动祈愿',
    gachaId: '',
    itemId: '10000002',
    name: '琴',
    itemType: '角色',
    rankType: 5,
    time: '2026-01-01 12:00:00',
    uid: '212114083',
    ...over,
  }
}

describe('exportGachaJson 结构', () => {
  it('E1 空数组 / 全为未知游戏记录 → null', () => {
    expect(exportGachaJson([])).toBeNull()
    expect(exportGachaJson([rec({ game: 'unknown' })])).toBeNull()
    expect(exportGachaJson(null)).toBeNull()
  })

  it('E2 原神记录 → hk4e 段，v4.1，uigf_gacha_type/gacha_type/item_id 齐全', () => {
    const json = exportGachaJson([rec()], { exportedAt: 1700000000000, app: 'test' })
    const doc = JSON.parse(json)
    expect(doc.info.version).toBe('v4.1')
    expect(doc.info.export_timestamp).toBe(1700000000)
    expect(doc.info.export_app).toBe('test')
    expect(doc.hk4e).toHaveLength(1)
    const item = doc.hk4e[0].list[0]
    expect(item.uigf_gacha_type).toBe('301')
    expect(item.gacha_type).toBe('301')
    expect(item.item_id).toBe('10000002')
    expect(item.name).toBe('琴')
    expect(item.rank_type).toBe('5')
    expect(item.time).toBe('2026-01-01 12:00:00')
    expect(item.id).toBe('10000000000000001')
    expect(doc.hkrpg).toBeUndefined()
  })

  it('E3 崩铁记录 → hkrpg 段且必填 gacha_id', () => {
    const json = exportGachaJson([rec({ game: 'starrail', uid: '800000001', gachaType: '11', gachaId: 'SP001', itemId: '1001', name: '希儿' })])
    const doc = JSON.parse(json)
    expect(doc.hkrpg).toHaveLength(1)
    const item = doc.hkrpg[0].list[0]
    expect(item.gacha_id).toBe('SP001')
    expect(item.gacha_type).toBe('11')
    expect(item.item_id).toBe('1001')
    expect(doc.hk4e).toBeUndefined()
  })

  it('E4 多游戏多 UID 分组正确', () => {
    const records = [
      rec(),
      rec({ id: '10000000000000002', name: '丽莎', rankType: 4, uid: '212114083' }),
      rec({ game: 'starrail', uid: '800000001', gachaType: '11', gachaId: 'SP1', itemId: '1001', name: '希儿' }),
      rec({ game: 'starrail', uid: '900000002', gachaType: '21', gachaId: 'SP2', itemId: '2001', name: '如泥酣眠' }),
    ]
    const doc = JSON.parse(exportGachaJson(records))
    expect(doc.hk4e).toHaveLength(1)
    expect(doc.hk4e[0].list).toHaveLength(2)
    expect(doc.hkrpg).toHaveLength(2) // 两个 UID 各一组
    expect(doc.hkrpg.map((g) => g.uid)).toEqual(['800000001', '900000002'])
  })
})

describe('exportGachaJson 往返一致性', () => {
  it('E5 导出 → 再导入，归一化记录与源记录一致（不丢字段不重复）', () => {
    const records = [
      rec(),
      rec({ id: '10000000000000002', name: '丽莎', rankType: 4 }),
      rec({ game: 'starrail', uid: '800000001', gachaType: '11', gachaTypeName: '角色活动跃迁', gachaId: 'SP001', itemId: '1001', name: '希儿', rankType: 5 }),
      rec({ game: 'starrail', uid: '800000001', gachaType: '21', gachaTypeKey: 'weapon', gachaTypeName: '光锥活动跃迁', gachaId: 'SP002', itemId: '2001', name: '如泥酣眠', rankType: 4 }),
    ]
    const json = exportGachaJson(records, { exportedAt: 1700000000000 })
    const { records: roundTrip, skipped } = parseGachaJson(json)
    expect(skipped).toEqual([])
    expect(roundTrip).toHaveLength(records.length)

    // 逐条逐字段比对（忽略导入方补充的字段，比对本应保持的契约字段）
    const keys = ['id', 'game', 'gachaType', 'gachaTypeKey', 'gachaTypeName', 'gachaId', 'itemId', 'name', 'itemType', 'rankType', 'time', 'uid']
    for (let i = 0; i < records.length; i++) {
      for (const k of keys) {
        expect(roundTrip[i][k], `字段 ${k} 不一致（第 ${i} 条）`).toBe(records[i][k])
      }
    }
  })

  it('E5b 旧存档缺 gacha_id 的崩铁记录：导出回退为池类型码，再导入不被跳过且可往返', () => {
    // 模拟旧版本解析器导入的存档（无 gachaId 字段）
    const legacy = rec({ game: 'starrail', uid: '800000001', gachaType: '11', gachaTypeName: '角色活动跃迁', gachaId: '', itemId: '1001', name: '希儿', rankType: 5 })
    const json = exportGachaJson([legacy], { exportedAt: 1700000000000 })
    // 导出文件 gacha_id 非空（必填字段不能为空串）
    const doc = JSON.parse(json)
    expect(doc.hkrpg[0].list[0].gacha_id).toBe('11') // 回退到池类型码
    // 再导入：记录保留、不跳过
    const { records, skipped } = parseGachaJson(json)
    expect(skipped).toEqual([])
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      game: 'starrail', uid: '800000001', gachaType: '11', gachaTypeKey: 'char',
      gachaTypeName: '角色活动跃迁', gachaId: '11', name: '希儿', rankType: 5,
    })
  })

  it('E6 段内按 id 升序排列（BigInt 比较，17 位不丢精度）', () => {
    // 乱序 + 17 位 id（超出 Number 安全整数）
    const records = [
      rec({ id: '1729100000000000300', name: 'C' }),
      rec({ id: '1726600000000000100', name: 'A' }),
      rec({ id: '1728400000000000200', name: 'B' }),
    ]
    const doc = JSON.parse(exportGachaJson(records))
    expect(doc.hk4e[0].list.map((x) => x.name)).toEqual(['A', 'B', 'C'])
    expect(doc.hk4e[0].list.map((x) => x.id)).toEqual([
      '1726600000000000100',
      '1728400000000000200',
      '1729100000000000300',
    ])
  })
})
