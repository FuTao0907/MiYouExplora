import { describe, it, expect } from 'vitest'
import { buildProxyUrl } from './downloadImage.js'

// 反例表（每个测试对应一个不同错误实现）：
// T1 正常直链 → /api/img + 同构路径       错误实现：保留域名 / 用 query 参数
// T2 非本项目素材站域名 → 抛错             错误实现：直接拼接 / 不校验
// T3 路径含 query/hash 原样透传           错误实现：剥掉 query
// T4 空串 → 抛错                          错误实现：返回 /api/img

describe('buildProxyUrl 同源代理 URL 构造', () => {
  it('T1 素材直链 → /api/img + 同构路径', () => {
    expect(buildProxyUrl('https://gi.yatta.moe/assets/UI/UI_AvatarIcon_Qin.png')).toBe(
      '/api/img/assets/UI/UI_AvatarIcon_Qin.png'
    )
    expect(buildProxyUrl('https://gi.yatta.moe/assets/UI/UI_Gacha_AvatarImg_Qin.png')).toBe(
      '/api/img/assets/UI/UI_Gacha_AvatarImg_Qin.png'
    )
  })

  it('T2 非本项目素材站域名 → 抛错', () => {
    expect(() => buildProxyUrl('https://other.example.com/a.png')).toThrow(/不支持/)
    expect(() => buildProxyUrl('http://gi.yatta.moe/a.png')).toThrow(/不支持/)
  })

  it('T3 路径带 query/hash 时原样透传（不丢失）', () => {
    expect(buildProxyUrl('https://gi.yatta.moe/assets/UI/UI_AvatarIcon_Qin.png?v=2')).toBe(
      '/api/img/assets/UI/UI_AvatarIcon_Qin.png?v=2'
    )
  })

  it('T4 空串/缺失 URL → 抛错', () => {
    expect(() => buildProxyUrl('')).toThrow(/不支持/)
    expect(() => buildProxyUrl(undefined)).toThrow(/不支持/)
  })
})
