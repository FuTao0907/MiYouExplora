// XLSX 读写工具：导出/导入探索进度表格（WPS/Excel 可直接打开编辑）
// 表结构：地区 | 章节 | 分项 | 目标数 | 已搜集 | 参考（主人已搜集）
// - 导出：myProgress=要导出的"我的"数据（主人=云端、游客=本地）；refProgress=参考数据（仅游客模式传云端）
//   数据均为 v3 结构（{ games: { [gameId]: { regions } } }），按 game.id 取对应地区数据
// - 导入：按 地区/章节/分项 名称匹配 games；空单元格不写入（保持原值）；非法行收集进 errors
// - 值语义：-1 表示「无 / 不适用」，表格中写作「无」，导入时「无」/「-1」均还原为 -1
import * as XLSX from 'xlsx'

const COLS = [
  { key: '地区', wch: 10 },
  { key: '章节', wch: 26 },
  { key: '分项', wch: 10 },
  { key: '目标数', wch: 10 },
  { key: '已搜集', wch: 12 },
  { key: '参考（主人已搜集）', wch: 18 }
]

// 从 v3 progress 中取某游戏某地区的 items 快照
function regionsOf(progress, gameId) {
  return progress?.games?.[gameId]?.regions ?? progress?.regions ?? {}
}

// 值 → 表格单元格文本：-1 → 「无」；其余原样
function cellText(val) {
  if (val === -1) return '无'
  return val ?? ''
}

export function exportProgressXlsx(game, myProgress, refProgress = null, fileName = '探索进度.xlsx') {
  const rows = []
  const myRegions = regionsOf(myProgress, game.id)
  const refRegions = regionsOf(refProgress, game.id)
  for (const region of game.regions ?? []) {
    for (const area of region.areas ?? []) {
      for (const item of area.items ?? []) {
        const row = {
          地区: region.name,
          章节: area.name,
          分项: item.name,
          目标数: item.target ?? 0,
          已搜集: cellText(myRegions?.[region.id]?.areas?.[area.id]?.items?.[item.id])
        }
        if (refProgress) {
          row['参考（主人已搜集）'] = cellText(
            refRegions?.[region.id]?.areas?.[area.id]?.items?.[item.id]
          )
        }
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

// 解析 .xlsx → progress 结构（v3，按 game.id 分键）。返回 { progress, errors: [{ row, message }] }
export async function importProgressXlsx(file, game) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  const errors = []
  const progress = { version: 3, updated_at: '', games: {} }
  progress.games[game.id] = { regions: {} }
  const regions = progress.games[game.id].regions

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const regionName = String(row['地区'] ?? '').trim()
    const areaName = String(row['章节'] ?? '').trim()
    const itemName = String(row['分项'] ?? '').trim()
    const raw = row['已搜集']
    // 空单元格：用户未改这一行，不写入（保持原值）
    if (raw === '' || raw === undefined || raw === null) continue
    let n
    if (String(raw).trim() === '无') {
      n = -1
    } else {
      n = Number(raw)
      if (!Number.isFinite(n) || n < 0) {
        errors.push({ row: i + 2, message: `「已搜集」不是有效数字（${raw}），只允许数字或「无」` })
        continue
      }
    }
    const region = game.regions?.find((r) => r.name === regionName)
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
    if (!regions[region.id]) regions[region.id] = { areas: {} }
    if (!regions[region.id].areas[area.id]) regions[region.id].areas[area.id] = { items: {} }
    regions[region.id].areas[area.id].items[item.id] = n === -1 ? -1 : Math.max(0, Math.round(n))
  }
  return { progress, errors }
}
