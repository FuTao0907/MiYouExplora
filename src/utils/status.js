export const STATUS = {
  NOT_STARTED: '未开始',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成'
}

// 地区探索度 = 各分项完成比例的平均（分项目标取地区板块 targets，忽略 target 为 0 的分项）
export function regionPercent(region, progress) {
  const areas = region.areas ?? []
  if (!areas.length) return 0
  const targets = region.targets ?? {}
  const totals = {}
  for (const [itemId, total] of Object.entries(targets)) {
    if (!total) continue
    let done = 0
    for (const area of areas) {
      const areaRecord = progress?.regions?.[region.id]?.areas?.[area.id]
      done += areaRecord?.items?.[itemId] ?? 0
    }
    totals[itemId] = { total, done }
  }
  const ratios = Object.values(totals).map((t) => Math.min(1, t.done / t.total))
  if (!ratios.length) return 0
  return Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100)
}

export function getStatus(region, progress) {
  const percent = regionPercent(region, progress)
  if (percent <= 0) return STATUS.NOT_STARTED
  if (percent >= 100) return STATUS.COMPLETED
  return STATUS.IN_PROGRESS
}
