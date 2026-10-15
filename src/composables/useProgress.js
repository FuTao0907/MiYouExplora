import { ref, computed } from 'vue'
import {
  loadData,
  exportProgress,
  verifyPassword,
  saveProgress,
  restoreProgress
} from '../api/data.js'
import { getStatus, regionPercent, STATUS } from '../utils/status.js'
import {
  displayValue as pickDisplay,
  isGuestOwned as pickGuestOwned,
  isReferenceShown as pickReferenceShown
} from '../utils/guestData.js'

// 游客本地数据 key / 参考开关 key（localStorage）
const GUEST_KEY = 'miyou_guest_progress_v2'
const REF_KEY = 'miyou_show_reference'

function readStorage(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 存储不可用/已满：忽略（游客本地数据丢失不影响云端主人数据）
  }
}

// v3 数据模型：{ version:3, updated_at, games: { [gameId]: { regions: {...} } } }
// 兼容读取 v2 旧结构（{ regions } 顶层，视为 genshin）：云端/种子/游客旧数据都能直接读
function normalizeProgress(data) {
  const src = data ?? {}
  if (src.games) {
    return { version: 3, updated_at: src.updated_at ?? '', games: src.games }
  }
  return {
    version: 3,
    updated_at: src.updated_at ?? '',
    games: { genshin: { regions: src.regions ?? {} } }
  }
}

export function useProgress() {
  const games = ref([])
  // 主人数据：生产=云端 Blob，开发=种子 progress.json（固定值读取者共享）
  const cloudProgress = ref({ version: 3, updated_at: '', games: {} })
  // 游客数据：localStorage，仅存游客实际改动过的项（增量）
  const guestProgress = ref({ version: 3, updated_at: '', games: {} })
  const loading = ref(true)
  const error = ref('')
  const activeGameId = ref('')
  const sortMode = ref('progress') // progress | order
  const settings = ref({})
  // 编辑权限：解锁=主人模式（写云端）；未解锁=游客模式（写本机 localStorage）
  const editable = ref(false)
  // 参考开关：游客模式下是否显示主人数据作参考（默认开）
  const showReference = ref(readStorage(REF_KEY) !== '0')
  const saveState = ref('idle') // idle | saving | saved | error
  const saveError = ref('')
  const saveText = ref('') // 状态条文案（保存中… / 已保存到云端 / 已保存到本机 / 保存失败）

  let cloudTimer = null
  let guestTimer = null
  let saveStateTimer = null

  const today = () => new Date().toISOString().slice(0, 10)

  async function init() {
    loading.value = true
    error.value = ''
    try {
      const data = await loadData()
      games.value = data.games
      settings.value = data.settings
      cloudProgress.value = normalizeProgress(data.progress)
      guestProgress.value = normalizeProgress(readStorage(GUEST_KEY) ?? {})
      if (!activeGameId.value) activeGameId.value = games.value[0]?.id ?? ''
      editable.value = sessionStorage.getItem('miyou_editable') === '1'
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // 切换游戏（路由/游戏标签驱动）：仅当 id 存在于 games 时生效
  function setActiveGame(id) {
    if (games.value.some((g) => g.id === id)) activeGameId.value = id
  }

  // ---- 取值与展示（借用显示 + 增量存储） ----

  function cloudValueOf(gameId, regionId, areaId, itemId) {
    return (
      cloudProgress.value.games?.[gameId]?.regions?.[regionId]?.areas?.[areaId]?.items?.[itemId] ?? 0
    )
  }
  function guestValueOf(gameId, regionId, areaId, itemId) {
    const v = guestProgress.value.games?.[gameId]?.regions?.[regionId]?.areas?.[areaId]?.items?.[itemId]
    return v ?? null
  }
  // 单格展示值：主人=云端；游客=本地有则本地，否则（参考开关开 ? 云端 : 0）
  function displayValueOf(gameId, regionId, areaId, itemId) {
    return pickDisplay(
      editable.value,
      showReference.value,
      cloudValueOf(gameId, regionId, areaId, itemId),
      guestValueOf(gameId, regionId, areaId, itemId)
    )
  }
  // 该格是否属于游客自己的数据（用于 UI 归属标记）
  function isGuestOwned(gameId, regionId, areaId, itemId) {
    return pickGuestOwned(editable.value, guestValueOf(gameId, regionId, areaId, itemId))
  }
  // 该格当前是否显示为「参考」（游客借用主人值且开关开）
  function isReferenceShown(gameId, regionId, areaId, itemId) {
    return pickReferenceShown(editable.value, showReference.value, guestValueOf(gameId, regionId, areaId, itemId))
  }

  // 展示数据（合并 游客本地 + 主人参考）：扁平 regions 形状（与 status.js/表格读取一致），
  // 仅包含当前游戏；存储（cloudProgress/guestProgress）保持 v3 games 结构
  const displayProgress = computed(() => {
    const game = activeGame.value
    const out = { version: 3, updated_at: '', regions: {} }
    if (!game) return out
    const regions = out.regions
    for (const region of game.regions ?? []) {
      const r = (regions[region.id] = { areas: {} })
      for (const area of region.areas ?? []) {
        const a = (r.areas[area.id] = { items: {} })
        for (const item of area.items ?? []) {
          a.items[item.id] = displayValueOf(game.id, region.id, area.id, item.id)
        }
        // 备注 note：游客本地有则本地，否则（参考开）借用主人备注
        const guestNote =
          guestProgress.value.games?.[game.id]?.regions?.[region.id]?.areas?.[area.id]?.note
        const cloudNote =
          cloudProgress.value.games?.[game.id]?.regions?.[region.id]?.areas?.[area.id]?.note
        if (editable.value) {
          if (cloudNote !== undefined) a.note = cloudNote
        } else if (guestNote !== undefined) {
          a.note = guestNote
        } else if (showReference.value && cloudNote !== undefined) {
          a.note = cloudNote
        }
      }
    }
    return out
  })

  // ---- 解锁 / 锁定 ----

  async function unlock(password) {
    const ok = await verifyPassword(password)
    if (ok) {
      editable.value = true
      sessionStorage.setItem('miyou_editable', '1')
      sessionStorage.setItem('miyou_password', password)
      return true
    }
    return false
  }

  function lock() {
    editable.value = false
    sessionStorage.removeItem('miyou_editable')
    sessionStorage.removeItem('miyou_password')
  }

  // ---- 保存（按模式分流：游客→本机，主人→云端） ----

  // 不可变更新 games[gameId].regions[regionId].areas[areaId]
  function saveAreaItem(gameId, regionId, areaId, itemId, value) {
    const target = editable.value ? cloudProgress.value : guestProgress.value
    const gamesObj = { ...target.games }
    const game = { ...(gamesObj[gameId] ?? { regions: {} }) }
    const regions = { ...game.regions }
    const region = { ...(regions[regionId] ?? { areas: {} }) }
    const areas = { ...region.areas }
    const area = { ...(areas[areaId] ?? { items: {} }) }
    const items = { ...(area.items ?? {}) }
    items[itemId] = value
    areas[areaId] = { ...area, items, updated_at: today() }
    regions[regionId] = { ...region, areas }
    gamesObj[gameId] = { ...game, regions }
    const next = { ...target, games: gamesObj, updated_at: today() }
    if (editable.value) {
      cloudProgress.value = next
      scheduleCloudSave()
    } else {
      guestProgress.value = next
      scheduleGuestSave()
    }
  }

  function saveAreaNote(gameId, regionId, areaId, note) {
    const target = editable.value ? cloudProgress.value : guestProgress.value
    const gamesObj = { ...target.games }
    const game = { ...(gamesObj[gameId] ?? { regions: {} }) }
    const regions = { ...game.regions }
    const region = { ...(regions[regionId] ?? { areas: {} }) }
    const areas = { ...region.areas }
    areas[areaId] = { ...(areas[areaId] ?? { items: {} }), note, updated_at: today() }
    regions[regionId] = { ...region, areas }
    gamesObj[gameId] = { ...game, regions }
    const next = { ...target, games: gamesObj, updated_at: today() }
    if (editable.value) {
      cloudProgress.value = next
      scheduleCloudSave()
    } else {
      guestProgress.value = next
      scheduleGuestSave()
    }
  }

  // 主人：防抖写云端（现状逻辑）
  function scheduleCloudSave() {
    clearTimeout(cloudTimer)
    cloudTimer = setTimeout(doCloudSave, 1200)
  }

  async function doCloudSave() {
    const password = sessionStorage.getItem('miyou_password') ?? ''
    if (!password) {
      saveState.value = 'error'
      saveText.value = '保存失败'
      saveError.value = '密码缺失，请重新解锁'
      return
    }
    saveState.value = 'saving'
    saveText.value = '保存中…'
    try {
      await saveProgress(cloudProgress.value, password)
      flashSaved('已保存到云端')
    } catch (e) {
      saveState.value = 'error'
      saveText.value = '保存失败'
      saveError.value = e.message
    }
  }

  // 游客：防抖写 localStorage（同步，无失败路径）
  function scheduleGuestSave() {
    clearTimeout(guestTimer)
    saveState.value = 'saving'
    saveText.value = '保存中…'
    guestTimer = setTimeout(() => {
      writeStorage(GUEST_KEY, guestProgress.value)
      flashSaved('已保存到本机')
    }, 1200)
  }

  function flashSaved(text) {
    saveState.value = 'saved'
    saveText.value = text
    saveError.value = ''
    clearTimeout(saveStateTimer)
    saveStateTimer = setTimeout(() => {
      saveState.value = 'idle'
      saveText.value = ''
    }, 2000)
  }

  // ---- 参考开关 ----

  function toggleReference() {
    showReference.value = !showReference.value
    localStorage.setItem(REF_KEY, showReference.value ? '1' : '0')
  }

  // ---- 游客数据管理 ----

  function clearGuestData() {
    guestProgress.value = { version: 3, updated_at: '', games: {} }
    localStorage.removeItem(GUEST_KEY)
  }

  // 游客已录入的项数（批量面板/归属提示用）
  const guestItemCount = computed(() => {
    let n = 0
    for (const game of Object.values(guestProgress.value.games ?? {})) {
      for (const region of Object.values(game.regions ?? {})) {
        for (const area of Object.values(region.areas ?? {})) {
          n += Object.keys(area.items ?? {}).length
        }
      }
    }
    return n
  })

  // ---- 云端备份恢复（主人） ----

  async function restoreFromBackup() {
    const password = sessionStorage.getItem('miyou_password') ?? ''
    if (!password) {
      saveState.value = 'error'
      saveError.value = '密码缺失，请重新解锁'
      return false
    }
    try {
      await restoreProgress(password)
      location.reload()
      return true
    } catch (e) {
      saveState.value = 'error'
      saveError.value = e.message
      return false
    }
  }

  // ---- 导入 / 导出（按模式归属：游客只导出自己的数据） ----

  // 导出"我的"数据：主人=云端完整数据，游客=本地数据（不含借用参考值）
  function exportMyProgress() {
    exportProgress(editable.value ? cloudProgress.value : guestProgress.value)
  }

  // 应用导入的数据（JSON / XLSX 解析后）：按当前模式写入
  function applyImported(data) {
    const normalized = normalizeProgress(data)
    if (editable.value) {
      cloudProgress.value = normalized
      scheduleCloudSave()
    } else {
      guestProgress.value = normalized
      writeStorage(GUEST_KEY, normalized)
      flashSaved('已保存到本机')
    }
  }

  const activeGame = computed(
    () => games.value.find((game) => game.id === activeGameId.value) ?? null
  )

  const regions = computed(() => activeGame.value?.regions ?? [])

  const sortedRegions = computed(() => {
    const list = [...regions.value]
    if (sortMode.value === 'order') {
      return list.sort((a, b) => a.sort - b.sort)
    }
    return list.sort(
      (a, b) => regionPercent(a, displayProgress.value) - regionPercent(b, displayProgress.value)
    )
  })

  const overall = computed(() => {
    const list = regions.value
    if (!list.length) return { done: 0, total: 0 }
    const done = list.filter(
      (region) => getStatus(region, displayProgress.value) === STATUS.COMPLETED
    ).length
    return { done, total: list.length }
  })

  return {
    games,
    cloudProgress,
    guestProgress,
    displayProgress,
    loading,
    error,
    activeGameId,
    activeGame,
    setActiveGame,
    regions,
    sortedRegions,
    overall,
    sortMode,
    settings,
    editable,
    showReference,
    toggleReference,
    saveState,
    saveError,
    saveText,
    guestItemCount,
    init,
    unlock,
    lock,
    doCloudSave,
    restoreFromBackup,
    saveAreaItem,
    saveAreaNote,
    applyImported,
    exportMyProgress,
    isGuestOwned,
    isReferenceShown,
    clearGuestData
  }
}
