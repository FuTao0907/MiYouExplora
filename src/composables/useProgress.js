import { ref, computed } from 'vue'
import {
  loadData,
  exportProgress,
  verifyPassword,
  saveProgress,
  restoreProgress
} from '../api/data.js'
import { getStatus, regionPercent, STATUS } from '../utils/status.js'

export function useProgress() {
  const games = ref([])
  const progress = ref({ version: 2, updated_at: '', regions: {} })
  const loading = ref(true)
  const error = ref('')
  const activeGameId = ref('')
  const sortMode = ref('progress') // progress | order
  const settings = ref({})
  // 编辑权限：默认只读；解锁后 sessionStorage 记忆（同浏览器会话保持）
  const editable = ref(false)
  // 云端保存状态：idle | saving | saved | error
  const saveState = ref('idle')
  const saveError = ref('')

  let saveTimer = null

  function normalizeProgress(data) {
    return {
      version: data.version ?? 2,
      updated_at: data.updated_at ?? '',
      regions: data.regions ?? {}
    }
  }

  async function init() {
    loading.value = true
    error.value = ''
    try {
      const data = await loadData()
      games.value = data.games
      settings.value = data.settings
      progress.value = normalizeProgress(data.progress)
      activeGameId.value = games.value[0]?.id ?? ''
      editable.value = sessionStorage.getItem('miyou_editable') === '1'
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // 解锁：生产环境走服务端校验（POST /api/auth），开发模式比对 VITE_DEV_PASSWORD
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

  // 编辑内容变化后防抖保存到云端（生产）；本地开发模式直接跳过云端
  function scheduleSave() {
    if (!editable.value) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(doSave, 1200)
  }

  async function doSave() {
    const password = sessionStorage.getItem('miyou_password') ?? ''
    if (!password) {
      saveState.value = 'error'
      saveError.value = '密码缺失，请重新解锁'
      return
    }
    saveState.value = 'saving'
    try {
      await saveProgress(progress.value, password)
      saveState.value = 'saved'
      saveError.value = ''
    } catch (e) {
      saveState.value = 'error'
      saveError.value = e.message
    }
  }

  // 从云端自动备份恢复（生产）；成功后刷新页面重新加载
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

  const activeGame = computed(
    () => games.value.find((game) => game.id === activeGameId.value) ?? null
  )

  const regions = computed(() => activeGame.value?.regions ?? [])

  const sortedRegions = computed(() => {
    const list = [...regions.value]
    if (sortMode.value === 'order') {
      return list.sort((a, b) => a.sort - b.sort)
    }
    return list.sort((a, b) => regionPercent(a, progress.value) - regionPercent(b, progress.value))
  })

  const overall = computed(() => {
    const list = regions.value
    if (!list.length) return { done: 0, total: 0 }
    const done = list.filter(
      (region) => getStatus(region, progress.value) === STATUS.COMPLETED
    ).length
    return { done, total: list.length }
  })

  // 保存某个子区域某个分项的已搜集数量（输入即更新内存，防抖写云端）
  function saveAreaItem(regionId, areaId, itemId, value) {
    if (!editable.value) return
    const regions = { ...progress.value.regions }
    const region = { ...(regions[regionId] ?? { areas: {} }) }
    const areas = { ...region.areas }
    const area = { ...(areas[areaId] ?? { items: {} }) }
    const items = { ...(area.items ?? {}) }
    items[itemId] = value
    areas[areaId] = { ...area, items, updated_at: new Date().toISOString().slice(0, 10) }
    regions[regionId] = { ...region, areas }
    progress.value = {
      ...progress.value,
      regions,
      updated_at: new Date().toISOString().slice(0, 10)
    }
    scheduleSave()
  }

  // 保存某子区域的描述文本（展开行）
  function saveAreaNote(regionId, areaId, note) {
    if (!editable.value) return
    const regions = { ...progress.value.regions }
    const region = { ...(regions[regionId] ?? { areas: {} }) }
    const areas = { ...region.areas }
    const area = { ...(areas[areaId] ?? { items: {} }) }
    areas[areaId] = { ...area, note, updated_at: new Date().toISOString().slice(0, 10) }
    regions[regionId] = { ...region, areas }
    progress.value = {
      ...progress.value,
      regions,
      updated_at: new Date().toISOString().slice(0, 10)
    }
    scheduleSave()
  }

  function applyImported(data) {
    progress.value = normalizeProgress(data)
    scheduleSave()
  }

  return {
    games,
    progress,
    loading,
    error,
    activeGameId,
    activeGame,
    regions,
    sortedRegions,
    overall,
    sortMode,
    settings,
    editable,
    saveState,
    saveError,
    init,
    unlock,
    lock,
    doSave,
    restoreFromBackup,
    saveAreaItem,
    saveAreaNote,
    applyImported,
    restoreFromBackup,
    exportProgress
  }
}
