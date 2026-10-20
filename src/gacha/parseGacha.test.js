import { describe, it, expect } from 'vitest'
import { parseGachaJson, GACHA_TYPES } from './parseGacha.js'

// 反例表（每个测试对应一个不同错误实现）：
// P1 UIGF v4 hk4e 段解析         错误实现：只认顶层 list / 不映射池名
// P2 UIGF v4 hkrpg 段解析        错误实现：把 11/12 当未知池 / 字段取错
// P3 legacy UIGF v2.x 原神解析   错误实现：v2 走 v4 分段逻辑（找不到段）
// P4 SRGF v1.0 崩铁解析          错误实现：不识别 SRGF version
// P5 坏行跳过（缺必填）不中断     错误实现：整份抛错 / 坏行混入 records
// P6 未知卡池类型跳过并告警       错误实现：静默吞掉（无 skipped）
// P7 非法 JSON / 无合法 version   错误实现：返回空 records 假装成功
// P8 输入为对象（非字符串）       错误实现：JSON.parse 对象抛错

// —— 公共构造工具 ——
function hk4eGroup(list, uid = '212114083') {
  return { uid, timezone: 8, lang: 'zh-cn', list }
}
function hk4eItem(over = {}) {
  return {
    uigf_gacha_type: '301',
    gacha_type: '301',
    item_id: '10000002',
    count: '1',
    time: '2026-01-01 12:00:00',
    name: '琴',
    item_type: '角色',
    rank_type: '5',
    id: '10000000000000001',
    ...over,
  }
}
function v4Doc(segments) {
  return {
    info: { export_timestamp: 1700000000, export_app: 'test', export_app_version: '1.0.0', version: 'v4.1' },
    ...segments,
  }
}

describe('parseGachaJson UIGF v4.x', () => {
  it('P1 解析 hk4e 段并归一化（池名/字段映射）', () => {
    const doc = v4Doc({
      hk4e: [
        hk4eGroup([
          hk4eItem({ name: '琴', rank_type: '5' }),
          hk4eItem({ id: '10000000000000002', name: '丽莎', rank_type: '4' }),
        ]),
      ],
    })
    const { records, games, version, skipped } = parseGachaJson(doc)
    expect(version).toBe('v4.1')
    expect(games).toEqual(['genshin'])
    expect(skipped).toEqual([])
    expect(records).toHaveLength(2)
    const r0 = records[0]
    expect(r0).toMatchObject({
      game: 'genshin', uid: '212114083', gachaType: '301', gachaTypeKey: 'char',
      gachaTypeName: '角色活动祈愿', name: '琴', rankType: 5, itemId: '10000002',
    })
    expect(records[1].name).toBe('丽莎')
  })

  it('P2 解析 hkrpg 段（11/12 角色活动、21/22 光锥活动）', () => {
    const doc = v4Doc({
      hkrpg: [
        {
          uid: '800000001', timezone: 8, lang: 'zh-cn',
          list: [
            { gacha_id: 'A1', gacha_type: '11', item_id: '1001', count: '1', time: '2026-05-01 10:00:00', name: '希儿', item_type: '角色', rank_type: '5', id: '30000000000000001' },
            { gacha_id: 'A2', gacha_type: '21', item_id: '2001', count: '1', time: '2026-05-02 10:00:00', name: '如泥酣眠', item_type: '光锥', rank_type: '5', id: '30000000000000002' },
          ],
        },
      ],
    })
    const { records, games } = parseGachaJson(doc)
    expect(games).toEqual(['starrail'])
    expect(records.map((r) => r.gachaTypeKey)).toEqual(['char', 'weapon'])
    expect(records[0].gachaTypeName).toBe('角色活动跃迁')
    expect(records[1].gachaTypeName).toBe('光锥活动跃迁')
  })
})

describe('parseGachaJson legacy 旧版格式', () => {
  it('P3 解析 legacy UIGF v2.x（原神顶层 list）', () => {
    const doc = {
      info: { export_timestamp: 1700000000, export_app: 'test', export_app_version: '1.0.0', version: 'v2.3' },
      list: [
        { uigf_gacha_type: '301', gacha_type: '301', name: '迪卢克', item_type: '角色', rank_type: '5', time: '2026-01-01 12:00:00', id: '10000000000000001' },
      ],
    }
    const { records, games, version } = parseGachaJson(doc)
    expect(version).toBe('v2.3')
    expect(games).toEqual(['genshin'])
    expect(records[0]).toMatchObject({ game: 'genshin', gachaTypeKey: 'char', name: '迪卢克', rankType: 5 })
  })

  it('P4 解析 SRGF v1.0（崩铁顶层 list）', () => {
    const doc = {
      info: { uid: '800000001', lang: 'zh-cn', region_time_zone: 8, export_timestamp: 1700000000, export_app: 'test', export_app_version: '1.0.0', version: 'SRGF v1.0' },
      list: [
        { gacha_type: '11', item_id: '1001', count: '1', time: '2026-05-01 10:00:00', name: '布洛妮娅', item_type: '角色', rank_type: '5', id: '30000000000000001' },
      ],
    }
    const { records, games } = parseGachaJson(doc)
    expect(games).toEqual(['starrail'])
    expect(records[0]).toMatchObject({ game: 'starrail', gachaTypeKey: 'char', name: '布洛妮娅' })
  })
})

describe('parseGachaJson 容错与错误', () => {
  it('P5 坏行（缺必填字段）跳过并记入 skipped，不中断整份导入', () => {
    const doc = v4Doc({
      hk4e: [
        hk4eGroup([
          hk4eItem({ name: '琴' }),
          hk4eItem({ id: '10000000000000002', name: '坏行', time: undefined }), // 缺 time
          hk4eItem({ id: '10000000000000003', name: '温迪' }),
        ]),
      ],
    })
    const { records, skipped } = parseGachaJson(doc)
    expect(records).toHaveLength(2)
    expect(skipped).toHaveLength(1)
    expect(skipped[0].reason).toMatch(/time/)
  })

  it('P6 未知卡池类型跳过并说明原因', () => {
    const doc = v4Doc({
      hk4e: [hk4eGroup([hk4eItem({ id: '10000000000000002', gacha_type: '999' })])],
    })
    const { records, skipped } = parseGachaJson(doc)
    expect(records).toHaveLength(0)
    expect(skipped[0].reason).toMatch(/未知卡池类型/)
  })

  it('P7 非法 JSON / 无合法 version 抛错', () => {
    expect(() => parseGachaJson('{ not json')).toThrow()
    expect(() => parseGachaJson({ foo: 1 })).toThrow(/无法识别/)
    expect(() => parseGachaJson('"just a string"')).toThrow(/应为 JSON 对象/)
  })

  it('P8 输入为已 parse 的对象也能处理', () => {
    const doc = v4Doc({ hk4e: [hk4eGroup([hk4eItem()])] })
    const { records } = parseGachaJson(doc)
    expect(records).toHaveLength(1)
    // 字符串输入同样可用
    const fromStr = parseGachaJson(JSON.stringify(doc))
    expect(fromStr.records).toHaveLength(1)
  })
})
