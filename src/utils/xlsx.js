// XLSX 读写工具：导出/导入探索进度表格（WPS/Excel 可直接打开编辑）
// 表结构：地区 | 章节 | 分项 | 目标数 | 已搜集 | 参考（主人已搜集）
// - 导出：myProgress=要导出的"我的"数据（主人=云端、游客=本地）；refProgress=参考数据（仅游客模式传云端）
// - 导入：按 地区/章节/分项 名称匹配 games；空单元格不写入（保持原值）；非法行收集进 errors
import * as XLSX from 'xlsx'

const COLS = [
  { key: '地区', wch: 10 },
  { key: '章节', wch: 26 },
  { key: '分项', wch: 10 },
  { key: '目标数', wch: 10 },
  { key: '已搜集', wch: 12 },
  { key: '参考（主人已搜集）', wch: 18 }
]

export function exportProgressXlsx(games, myProgress, refProgress = null, fileName = '探索进度.xlsx') {
  const rows = []
  for (const region of games.regions ?? []) {
    for (const area of region.areas ?? []) {
      for (const item of area.items ?? []) {
        const myVal = myProgress?.regions?.[region.id]?.areas?.[area.id]?.items?.[item.id]
        const refVal = refProgress?.regions?.[region.id]?.areas?.[area.id]?.items?.[item.id]
        const row = {
          地区: region.name,
          章节: area.name,
          分项: item.name,
          目标数: item.target ?? 0,
          已搜集: myVal ?? ''
        }
        if (refProgress) row['参考（主人已搜集）'] = refVal ?? ''
        rows.push(row)
      }
    }
  }
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = COLS.filter((c) => refProgress || c.key !== '参考（主人已搜集）').map((c) => ({ wch: c.wch }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '探索进度')
  XLSX.writeFile(wb, fileName)
}

// 解析 .xlsx → progress 结构。返回 { progress, errors: [{ row, message }] }
export async function importProgressXlsx(file, games) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  const errors = []
  const progress = { version: 2, updated_at: '', regions: {} }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const regionName = String(row['地区'] ?? '').trim()
    const areaName = String(row['章节'] ?? '').trim()
    const itemName = String(row['分项'] ?? '').trim()
    const raw = row['已搜集']
    // 空单元格：用户未改这一行，不写入（保持原值）
    if (raw === '' || raw === undefined || raw === null) continue
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) {
      errors.push({ row: i + 2, message: `「已搜集」不是有效数字（${raw}）` })
      continue
    }
    const region = games.regions?.find((r) => r.name === regionName)
    if (!region) {
      errors.push({ row: i + 2, message: `找不到地区「${regionName}」，请勿改动表头与地区名` })
      continue
    }
    const area = region.areas?.find((a) => a.name === areaName)
    if (!area) {
      errors.push({ row: i + 2, message: `章节「${areaName}」不属于「${regionName}」，请勿改动章节名` })
      continue
    }
    const item = area.items?.find((it) => it.name === itemName)
    if (!item) {
      errors.push({ row: i + 2, message: `分项「${itemName}」不属于「${areaName}」` })
      continue
    }
    if (!progress.regions[region.id]) progress.regions[region.id] = { areas: {} }
    if (!progress.regions[region.id].areas[area.id]) progress.regions[region.id].areas[area.id] = { items: {} }
    progress.regions[region.id].areas[area.id].items[item.id] = Math.max(0, Math.round(n))
  }
  return { progress, errors }
}
