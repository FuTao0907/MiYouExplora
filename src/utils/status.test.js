import { describe, it, expect } from 'vitest'
import { regionPercent, getStatus, STATUS } from './status.js'

// 反例表（每个测试对应一个不同错误实现）：
// T1 空区域 → 0           错误实现：返回非 0 / NaN
// T2 无目标 → 0           错误实现：除零 → NaN / 返回非 0
// T3 单分项比例           错误实现：返回 done / total / 100
// T4 多分项平均           错误实现：只取一项 / 求和 / 取最大
// T5 超出封顶             错误实现：返回 >100 的原始比例
// T6 缺失数据按 0         错误实现：直接访问 progress.regions[..] 抛异常 / NaN
// T7 四舍五入             错误实现：floor / ceil
// T8-T10 状态三分支       错误实现：边界判错（<= / < 混用）

describe('regionPercent 探索度计算', () => {
  it('T1 空区域列表返回 0', () => {
    expect(regionPercent({ id: 'r', areas: [] }, { regions: {} })).toBe(0)
  })

  it('T2 无有效分项目标返回 0（targets 空或全 0）', () => {
    const region = {
      id: 'r',
      targets: {},
      areas: [{ id: 'a', items: [{ id: 'chest', target: 0 }] }]
    }
    expect(regionPercent(region, { regions: {} })).toBe(0)
    const zeroRegion = { ...region, targets: { chest: 0, challenge: 0 } }
    expect(regionPercent(zeroRegion, { regions: {} })).toBe(0)
  })

  it('T3 单分项：done/total 比例（5/10 → 50）', () => {
    const region = {
      id: 'r',
      targets: { chest: 10 },
      areas: [{ id: 'a' }]
    }
    const progress = { regions: { r: { areas: { a: { items: { chest: 5 } } } } } }
    expect(regionPercent(region, progress)).toBe(50)
  })

  it('T4 多分项取各比例的平均（50% + 100% → 75）', () => {
    const region = {
      id: 'r',
      targets: { chest: 10, seelie: 6 },
      areas: [{ id: 'a' }]
    }
    const progress = { regions: { r: { areas: { a: { items: { chest: 5, seelie: 6 } } } } } }
    expect(regionPercent(region, progress)).toBe(75)
  })

  it('T5 单分项完成量超过目标时封顶为 100（20/10 → 100 而非 200）', () => {
    const region = { id: 'r', targets: { chest: 10 }, areas: [{ id: 'a' }] }
    const progress = { regions: { r: { areas: { a: { items: { chest: 20 } } } } } }
    expect(regionPercent(region, progress)).toBe(100)
  })

  it('T6 progress 中缺失该地区/子区域时按 0 计算，不抛异常', () => {
    const region = { id: 'r', targets: { chest: 10 }, areas: [{ id: 'a' }] }
    expect(regionPercent(region, { regions: {} })).toBe(0)
    expect(regionPercent(region, { regions: { r: { areas: {} } } })).toBe(0)
  })

  it('T7 四舍五入到整数（1/3 → 33，2/3 → 67）', () => {
    const region = { id: 'r', targets: { chest: 3 }, areas: [{ id: 'a' }] }
    const one = { regions: { r: { areas: { a: { items: { chest: 1 } } } } } }
    const two = { regions: { r: { areas: { a: { items: { chest: 2 } } } } } }
    expect(regionPercent(region, one)).toBe(33)
    expect(regionPercent(region, two)).toBe(67)
  })

  it('T11 章节标记 -1（无）时：分母扣除该章 target、分子不计（不影响其余章节进度）', () => {
    const region = {
      id: 'r',
      targets: { chest: 10 },
      areas: [
        { id: 'a1', items: [{ id: 'chest', target: 6 }] },
        { id: 'a2', items: [{ id: 'chest', target: 4 }] }
      ]
    }
    const progress = { regions: { r: { areas: { a1: { items: { chest: -1 } }, a2: { items: { chest: 4 } } } } } }
    // effective 分母 = 10 - 6 = 4，done = 4 → 100%
    expect(regionPercent(region, progress)).toBe(100)
  })

  it('T12 全部分项标记 -1 → 该分项被排除（分母为 0），若因此无有效分项则返回 0', () => {
    const region = {
      id: 'r',
      targets: { chest: 10 },
      areas: [{ id: 'a', items: [{ id: 'chest', target: 10 }] }]
    }
    const progress = { regions: { r: { areas: { a: { items: { chest: -1 } } } } } }
    expect(regionPercent(region, progress)).toBe(0)
  })
})

describe('getStatus 状态推导', () => {
  const region = { id: 'r', targets: { chest: 10 }, areas: [{ id: 'a' }] }

  it('T8 探索度 0 → 未开始', () => {
    expect(getStatus(region, { regions: {} })).toBe(STATUS.NOT_STARTED)
  })

  it('T9 探索度 100 → 已完成', () => {
    const progress = { regions: { r: { areas: { a: { items: { chest: 10 } } } } } }
    expect(getStatus(region, progress)).toBe(STATUS.COMPLETED)
  })

  it('T10 探索度 1-99 → 进行中', () => {
    const progress = { regions: { r: { areas: { a: { items: { chest: 5 } } } } } }
    expect(getStatus(region, progress)).toBe(STATUS.IN_PROGRESS)
  })
})
