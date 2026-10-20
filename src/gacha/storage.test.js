import { describe, it, expect, beforeEach } from 'vitest'
import { loadGachaData, saveGachaData, clearGachaData, hasGachaData } from './storage.js'

// 反例表（每个测试对应一个不同错误实现）：
// T1 保存后能读回（records + meta）    错误实现：只存 records 丢 meta / key 用错
// T2 无存档 → null                     错误实现：返回 {} 或抛错
// T3 损坏数据 → null（不抛错）         错误实现：JSON.parse 异常冒泡
// T4 清除后 → null                     错误实现：removeItem 不生效（key 写错）
// T5 localStorage 不可用 → save false  错误实现：抛错冒泡 / 假报成功
// T6 非 records 数组结构 → null        错误实现：信任任意结构

// localStorage mock（vitest node 环境无原生 localStorage）
function mockStorage() {
  const store = new Map()
  const stub = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
  }
  globalThis.localStorage = stub
  return store
}

describe('gacha 本地存档', () => {
  beforeEach(() => {
    mockStorage()
  })

  it('T1 保存后能读回 records 与 meta', () => {
    const records = [{ id: '1', game: 'genshin', name: '琴' }]
    const meta = { importedAt: 1700000000, version: 'v4.1', games: ['genshin'] }
    expect(saveGachaData(records, meta)).toBe(true)
    const loaded = loadGachaData()
    expect(loaded.records).toEqual(records)
    expect(loaded.meta).toEqual(meta)
    expect(hasGachaData()).toBe(true)
  })

  it('T2 无存档 → null', () => {
    expect(loadGachaData()).toBeNull()
    expect(hasGachaData()).toBe(false)
  })

  it('T3 存档为损坏 JSON → null（不抛错）', () => {
    localStorage.setItem('miyou.gacha.data', '{ broken json')
    expect(loadGachaData()).toBeNull()
    expect(hasGachaData()).toBe(false)
  })

  it('T6 存档不是 { records: [] } 结构 → null', () => {
    localStorage.setItem('miyou.gacha.data', JSON.stringify({ foo: 1 }))
    expect(loadGachaData()).toBeNull()
    localStorage.setItem('miyou.gacha.data', JSON.stringify({ records: 'not-array' }))
    expect(loadGachaData()).toBeNull()
  })

  it('T4 清除后 → null', () => {
    saveGachaData([{ id: '1' }], {})
    clearGachaData()
    expect(loadGachaData()).toBeNull()
    expect(hasGachaData()).toBe(false)
  })

  it('T5 localStorage 不可用 → 保存返回 false、读取返回 null（不抛错）', () => {
    delete globalThis.localStorage
    expect(saveGachaData([{ id: '1' }], {})).toBe(false)
    expect(loadGachaData()).toBeNull()
    expect(clearGachaData()).toBeUndefined() // 不抛错即可
  })
})
