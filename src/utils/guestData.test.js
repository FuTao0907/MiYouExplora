import { describe, it, expect } from 'vitest'
import {
  displayValue,
  isGuestOwned,
  isReferenceShown,
  parseItemInput,
  sanitizeInputText
} from './guestData.js'

// 反例表（每个测试对应一个不同错误实现）：
// T1 主人模式 → 云端值      错误实现：返回 guest / 0
// T2 游客+本地有 → 本地值   错误实现：返回 cloud（把借用当成游客数据）
// T3 游客+本地无+参考开 → 云端（错误实现：0，参考丢失）
// T4 游客+本地无+参考关 → 0 （错误实现：cloud，参考泄漏）
// T5-T7 isGuestOwned：主人 false / 游客本地有 true / 游客本地无 false（错误实现：边界判错）
// T8-T11 isReferenceShown：主人 false / 游客参考开本地无 true / 游客参考关 false / 游客本地有 false

describe('displayValue 单格展示值', () => {
  it('T1 主人模式（解锁）→ 云端值', () => {
    expect(displayValue(true, true, 483, 500)).toBe(483)
    expect(displayValue(true, false, 483, 500)).toBe(483)
  })

  it('T2 游客模式且本地有该格 → 本地值（不取云端）', () => {
    expect(displayValue(false, true, 483, 500)).toBe(500)
    expect(displayValue(false, false, 483, 500)).toBe(500)
  })

  it('T3 游客模式本地无 + 参考开 → 借用云端值', () => {
    expect(displayValue(false, true, 483, null)).toBe(483)
  })

  it('T4 游客模式本地无 + 参考关 → 0（不泄漏云端值）', () => {
    expect(displayValue(false, false, 483, null)).toBe(0)
    expect(displayValue(false, false, 483, undefined)).toBe(0)
  })
})

describe('isGuestOwned 归属标记', () => {
  it('T5 主人模式 → 不是游客数据（false）', () => {
    expect(isGuestOwned(true, 500)).toBe(false)
  })

  it('T6 游客模式且本地有该格 → 属于游客（true）', () => {
    expect(isGuestOwned(false, 500)).toBe(true)
    expect(isGuestOwned(false, 0)).toBe(true)
  })

  it('T7 游客模式本地无 → 不属于游客（false）', () => {
    expect(isGuestOwned(false, null)).toBe(false)
    expect(isGuestOwned(false, undefined)).toBe(false)
  })
})

describe('isReferenceShown 参考标记', () => {
  it('T8 主人模式 → 不显示参考（false）', () => {
    expect(isReferenceShown(true, true, null)).toBe(false)
  })

  it('T9 游客 + 参考开 + 本地无 → 显示参考（true）', () => {
    expect(isReferenceShown(false, true, null)).toBe(true)
  })

  it('T10 游客 + 参考关 → 不显示参考（false）', () => {
    expect(isReferenceShown(false, false, null)).toBe(false)
  })

  it('T11 游客 + 本地有 → 不显示参考（false，已是自己的数据）', () => {
    expect(isReferenceShown(false, true, 500)).toBe(false)
  })
})

describe('parseItemInput 录入解析（-1=无，0..max 合法，其余收紧/忽略）', () => {
  it('T12 空串 → 0（未输入按 0）', () => {
    expect(parseItemInput('', 100)).toBe(0)
    expect(parseItemInput('   ', 100)).toBe(0)
  })

  it('T13 -1 保留为「无」', () => {
    expect(parseItemInput('-1', 100)).toBe(-1)
  })

  it('T14 范围 0..max 内整数原样返回', () => {
    expect(parseItemInput('0', 100)).toBe(0)
    expect(parseItemInput('48', 100)).toBe(48)
    expect(parseItemInput('100', 100)).toBe(100)
  })

  it('T15 超过上限 → 收紧到 max', () => {
    expect(parseItemInput('150', 100)).toBe(100)
  })

  it('T16 小于 -1 → 收紧到 -1（不允许 -2、-3 等负数）', () => {
    expect(parseItemInput('-2', 100)).toBe(-1)
    expect(parseItemInput('-99', 100)).toBe(-1)
  })

  it('T17 非整数/非数字文本 → null（忽略该次输入）', () => {
    expect(parseItemInput('12.5', 100)).toBe(null)
    expect(parseItemInput('abc', 100)).toBe(null)
    expect(parseItemInput('1-2', 100)).toBe(null)
  })
})

describe('sanitizeInputText 输入过程过滤', () => {
  it('T18 只保留数字与单个前导负号', () => {
    expect(sanitizeInputText('12ab-3')).toBe('123')
    expect(sanitizeInputText('-1')).toBe('-1')
    expect(sanitizeInputText('4-5')).toBe('45')
    expect(sanitizeInputText('')).toBe('')
  })
})
