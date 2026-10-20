<script setup>
/**
 * 抽卡分析页（一期，多游戏框架）
 *
 * 数据流：本地文件（UIGF v4.x / legacy UIGF v2.x / SRGF v1.0）
 *   → parseGachaJson 解析归一化
 *   → storage 存 localStorage（本地档，不上云端）
 *   → computeGachaStats 分组统计（按 游戏|UID|语义池）
 *
 * 一期只做"导入 + 统计展示"；导出存档、历史卡池对比等留待后续迭代。
 * 说明：抽卡数据是个人数据，一期仅存本机；探索度记录的云端存档机制与本模块解耦。
 */
import { ref, computed, onMounted } from 'vue'
import {
  PhDownloadSimple,
  PhWarningCircle,
  PhCaretDown,
  PhChartLine,
  PhTrash,
  PhCoin
} from '@phosphor-icons/vue'
import { parseGachaJson } from '../gacha/parseGacha.js'
import { exportGachaJson } from '../gacha/exportGacha.js'
import { computeGachaStats, REFERENCE_AVG } from '../gacha/stats.js'
import { loadGachaData, saveGachaData, clearGachaData } from '../gacha/storage.js'

const props = defineProps({
  store: { type: Object, required: true },
  gameId: { type: String, default: 'genshin' }
})

// 当前游戏（路由驱动，多游戏框架）
const gameId = computed(() => props.store.activeGameId.value || 'genshin')
const gameName = computed(() => {
  const g = props.store.games.value.find((x) => x.id === gameId.value)
  return g ? g.name : gameId.value
})

// ---- 存档状态 ----
const archive = ref(null) // { records, meta } | null
const lastMeta = ref(null) // 本次导入提示用的元信息

// ---- 导入 ----
const importing = ref(false) // 解析进行中（文件读取）
const importError = ref('')
const importNotice = ref('') // 成功提示（含跳过行数等）
const dragOver = ref(false)

// 支持的格式说明（按游戏给出对应工具，避免空泛）
const FORMAT_NOTES = {
  genshin: '原神祈愿记录导出文件（UIGF v2.2/v2.3/v4.x）',
  starrail: '崩铁跃迁记录导出文件（SRGF v1.0 或 UIGF v4.x）'
}

async function handleFile(file) {
  if (!file || importing.value) return
  importing.value = true
  importError.value = ''
  importNotice.value = ''
  try {
    // 读取文件文本（现代浏览器 File API）
    const text = typeof file.text === 'function' ? await file.text() : await readAsText(file)
    const result = parseGachaJson(text) // 解析失败会抛错
    // 确认当前游戏有数据；没有则提示存档含哪些游戏
    const mine = result.records.filter((r) => r.game === gameId.value)
    if (mine.length === 0) {
      importError.value =
        `这份文件里没有「${gameName.value}」的抽卡记录` +
        (result.games.length > 0 ? `（识别到：${result.games.join('、')}）。` : '。')
      return
    }
    saveGachaData(result.records, {
      importedAt: Date.now(),
      version: result.version,
      games: result.games,
      app: file.name
    })
    archive.value = loadGachaData()
    lastMeta.value = { file: file.name, total: result.records.length, mine: mine.length }
    const skipMsg = result.skipped.length
      ? `，另有 ${result.skipped.length} 条记录无法识别已跳过`
      : ''
    importNotice.value = `已导入 ${mine.length} 条${gameName.value}记录${skipMsg}`
  } catch (e) {
    importError.value = e.message || '文件解析失败'
  } finally {
    importing.value = false
  }
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}

function onFileInput(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // 允许重复选择同一文件
  if (file) handleFile(file)
}
function onDrop(e) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

// ---- 统计 ----
const stats = computed(() => (archive.value ? computeGachaStats(archive.value.records) : null))

// 当前游戏的记录统计（文件可能含多游戏段）
const gameGroups = computed(() => {
  if (!stats.value) return []
  return stats.value.groups.filter((g) => g.game === gameId.value)
})
// 概览（全池合并口径：总抽数 / 五星数 / 平均五星间隔）
const overview = computed(() => {
  const groups = gameGroups.value
  const total = groups.reduce((s, g) => s + g.total, 0)
  const five = groups.reduce((s, g) => s + g.fiveStarCount, 0)
  return { total, five }
})

// 按 uid 分组展示（多账号并存）
const uidGroups = computed(() => {
  const map = new Map()
  for (const g of gameGroups.value) {
    if (!map.has(g.uid)) map.set(g.uid, [])
    map.get(g.uid).push(g)
  }
  return [...map.entries()]
})

// 欧非文案：平均间隔对比社区参考期望（无参考值的池只显示平均间隔）
function luckText(g) {
  if (g.avgInterval == null) return '尚未抽到五星'
  const ref = REFERENCE_AVG[`${g.game}:${g.poolKey}`]
  const base = `平均 ${g.avgInterval} 抽一个五星`
  if (!ref) return base
  const diff = g.avgInterval - ref
  if (diff < -2.5) return `${base}，比期望(${ref})更欧`
  if (diff > 2.5) return `${base}，比期望(${ref})更非`
  return `${base}，与期望(${ref})相当`
}

function pityText(g) {
  if (g.fiveStarCount === 0) return `从未出五星，已累计 ${g.total} 抽`
  if (g.pity === 0) return '最近一抽就是五星'
  return `距上次五星已 ${g.pity} 抽`
}

// ---- 数据管理 ----
function clearData() {
  if (!window.confirm('确定清除本机保存的全部抽卡记录？此操作不可恢复。')) return
  clearGachaData()
  archive.value = null
  importNotice.value = ''
}

// 导出：把本机全部抽卡记录导出为 UIGF v4.1 文件（含所有游戏，可迁移/备份/再导入）
function exportData() {
  if (!archive.value) return
  const json = exportGachaJson(archive.value.records)
  if (!json) return // 无可导出记录（理论上不会走到：有存档必有记录）
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  a.href = url
  a.download =
    `miyou-gacha-export-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  archive.value = loadGachaData()
})
</script>

<template>
  <div class="gacha reveal">
    <!-- 页头 -->
    <header class="gacha-head">
      <h1 class="gacha-title">抽卡分析</h1>
      <p class="gacha-sub">
        {{ gameName }}祈愿记录统计：保底进度、五星分布与欧非分析。数据只保存在这台电脑上，不会上传。
      </p>
    </header>

    <!-- 无数据态：导入引导 -->
    <div v-if="!archive" class="gacha-empty">
      <section class="intro-block">
        <h2 class="intro-title">如何获取抽卡记录</h2>
        <ol class="intro-steps">
          <li>打开{{ gameName }}，进入「祈愿」→「历史记录」（游戏内最多展示最近 6 个月）。</li>
          <li>使用社区导出工具抓取完整记录：原神可用 genshin-gacha-export / Starward，崩铁可用 StarRail Gacha Exporter / Starward。</li>
          <li>工具会生成一份 .json 文件（原神为 UIGF 格式，崩铁为 SRGF 或 UIGF v4 格式），把它导入本页面即可。</li>
        </ol>
        <p class="intro-note">工具按「官方导出的抽卡链接」抓取，不改动游戏数据；导出链接约 24 小时失效，失效后需重新打开一次历史记录。</p>
      </section>

      <!-- 导入区：整块可点击 / 拖放（不用胶囊按钮） -->
      <label
        class="dropzone"
        :class="{ dragging: dragOver }"
        @dragenter.prevent="dragOver = true"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
        :title="'点击选择或拖入抽卡记录文件（' + (FORMAT_NOTES[gameId] || 'JSON 文件') + '）'"
      >
        <input
          type="file"
          accept=".json,application/json"
          @change="onFileInput"
          aria-label="选择抽卡记录文件"
        />
        <PhDownloadSimple :size="26" />
        <span class="dropzone-title">{{ importing ? '正在解析…' : '导入抽卡记录文件' }}</span>
        <span class="dropzone-hint">点击选择或把 .json 文件拖到这里 · {{ FORMAT_NOTES[gameId] || 'JSON 文件' }}</span>
      </label>

      <p v-if="importError" class="gacha-error" role="alert">
        <PhWarningCircle :size="15" /> {{ importError }}
      </p>
    </div>

    <!-- 有数据态 -->
    <template v-else>
      <!-- 导入反馈 + 存档信息（文本行，非按钮） -->
      <p v-if="importNotice" class="gacha-notice" role="status">
        {{ importNotice }}（文件：{{ lastMeta.file }} · {{ lastMeta.total }} 条，含其他游戏 {{ lastMeta.total - lastMeta.mine }} 条）
      </p>
      <p class="gacha-meta">
        上次导入：{{ new Date(archive.meta.importedAt).toLocaleString() }} · 格式 {{ archive.meta.version || '未知' }}
        <button class="clear-link" @click="exportData" title="导出本机全部抽卡记录为 UIGF v4.1 文件（含所有游戏，可迁移、可再导入）">
          <PhDownloadSimple :size="13" /> 导出记录
        </button>
        <button class="clear-link" @click="clearData" title="清除本机保存的全部抽卡记录（不可恢复）">
          <PhTrash :size="13" /> 清除本机数据
        </button>
      </p>

      <!-- 当前游戏无记录（文件是别的游戏） -->
      <div v-if="gameGroups.length === 0" class="gacha-empty-inline">
        <p>存档里没有「{{ gameName }}」的记录。</p>
        <p class="gacha-meta">识别到的游戏：{{ archive.meta.games?.join('、') || '—' }}。切换到对应游戏可查看统计。</p>
      </div>

      <template v-else>
        <!-- 概览：三个大数字 -->
        <section class="overview" aria-label="抽卡概览">
          <div class="ov-item">
            <span class="ov-num tnum">{{ overview.total }}</span>
            <span class="ov-label">总抽数</span>
          </div>
          <div class="ov-item">
            <span class="ov-num tnum">{{ overview.five }}</span>
            <span class="ov-label">五星</span>
          </div>
          <div class="ov-item">
            <span class="ov-num tnum">{{ gameGroups.length }}</span>
            <span class="ov-label">卡池分组</span>
          </div>
        </section>

        <!-- 按 UID → 语义池 分组详情 -->
        <section v-for="[uid, groups] in uidGroups" :key="uid" class="uid-block">
          <h2 class="uid-title">UID {{ uid }}</h2>
          <div class="pool-list">
            <article v-for="g in groups" :key="g.poolKey" class="pool-card">
              <header class="pool-head">
                <h3 class="pool-name">{{ g.poolName }}</h3>
                <span class="pool-count tnum">{{ g.total }} 抽</span>
              </header>

              <dl class="pool-figures">
                <div class="fig">
                  <dt>五星</dt>
                  <dd class="tnum">{{ g.fiveStarCount }}</dd>
                </div>
                <div class="fig">
                  <dt>四星</dt>
                  <dd class="tnum">{{ g.fourStarCount }}</dd>
                </div>
                <div class="fig">
                  <dt>保底</dt>
                  <dd class="tnum">{{ pityText(g) }}</dd>
                </div>
                <div class="fig wide">
                  <dt>欧非</dt>
                  <dd>{{ luckText(g) }}</dd>
                </div>
              </dl>

              <!-- 五星列表：原生折叠，避免按钮堆叠 -->
              <details v-if="g.fiveStarCount > 0" class="five-list">
                <summary :title="'展开' + g.poolName + '全部五星记录'">
                  <PhCaretDown :size="13" /> {{ g.poolName }}五星记录（{{ g.fiveStarCount }}）
                </summary>
                <ul class="five-rows">
                  <li v-for="(f, i) in g.fiveStars" :key="i">
                    <PhCoin :size="13" />
                    <span class="five-name">{{ f.name }}</span>
                    <span class="five-time">{{ f.time }}</span>
                  </li>
                </ul>
              </details>
            </article>
          </div>
        </section>
      </template>

      <!-- 口径说明（纯文本） -->
      <footer class="gacha-foot">
        <p>
          统计口径：保底按（游戏｜UID｜卡池）独立计算，崩铁角色活动 11/12、光锥活动 21/22 合并为同一池；
          欧非参考值为社区通用期望（原神角色池约 62.5、武器池约 53.3），非官方数值。数据由社区工具从官方抽卡接口导出，仅存本机。
        </p>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.gacha {
  display: flex;
  flex-direction: column;
  gap: var(--sp-7);
}

/* ---- 页头 ---- */
.gacha-head {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.gacha-title {
  font-size: var(--fz-xl);
  font-weight: 600;
  letter-spacing: 0.02em;
  margin: 0;
}
.gacha-sub {
  margin: 0;
  max-width: 640px;
  color: var(--text-2);
  font-size: var(--fz-sm);
  line-height: 1.7;
}

/* ---- 无数据态 ---- */
.gacha-empty {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6);
}
.intro-block {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.intro-title {
  font-size: var(--fz-lg);
  font-weight: 600;
  margin: 0;
}
.intro-steps {
  margin: 0;
  padding-left: 1.4em;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  color: var(--text-2);
  font-size: var(--fz-base);
  line-height: 1.7;
}
.intro-note {
  margin: 0;
  color: var(--text-3);
  font-size: var(--fz-sm);
  line-height: 1.7;
}

/* 导入区：整块可点可拖，视觉焦点 */
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-9) var(--sp-6);
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  background: var(--bg-2);
  color: var(--text-3);
  cursor: pointer;
  text-align: center;
  transition: border-color var(--t), background-color var(--t);
}
.dropzone:hover,
.dropzone.dragging {
  border-color: var(--gold);
  background: var(--bg-3);
  color: var(--text-1);
}
.dropzone input {
  display: none;
}
.dropzone-title {
  font-size: var(--fz-lg);
  font-weight: 600;
  color: var(--text-1);
}
.dropzone-hint {
  font-size: var(--fz-sm);
  color: var(--text-3);
  line-height: 1.6;
}
.dropzone:hover .dropzone-hint {
  color: var(--text-2);
}

.gacha-error {
  margin: 0;
  color: #d97a7a;
  font-size: var(--fz-sm);
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
}

/* ---- 有数据态 ---- */
.gacha-notice {
  margin: 0;
  color: #8fbf9b;
  font-size: var(--fz-sm);
}
.gacha-meta {
  margin: 0;
  color: var(--text-3);
  font-size: var(--fz-sm);
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}
.clear-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-3);
  font-size: var(--fz-sm);
  padding: var(--sp-1) var(--sp-2);
  margin-left: auto;
  border-radius: var(--r-sm);
  transition: var(--t);
}
.clear-link:hover {
  color: #d97a7a;
  background: rgba(217, 122, 122, 0.08);
}
.gacha-empty-inline {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-8) var(--sp-6);
  background: var(--bg-2);
  border-radius: var(--r-lg);
  color: var(--text-2);
  text-align: center;
}
.gacha-empty-inline p {
  margin: 0;
}

/* ---- 概览 ---- */
.overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-3);
}
.ov-item {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  padding: var(--sp-5) var(--sp-4);
  background: var(--bg-2);
  border-radius: var(--r-md);
}
.ov-num {
  font-size: var(--fz-xl);
  font-weight: 600;
  color: var(--gold-bright);
}
.ov-label {
  font-size: var(--fz-sm);
  color: var(--text-3);
}

/* ---- UID 分组 ---- */
.uid-block {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
.uid-title {
  font-size: var(--fz-lg);
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
}
.pool-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--sp-3);
}
.pool-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-5);
  background: var(--bg-2);
  border-radius: var(--r-md);
  border: 1px solid transparent;
  transition: border-color var(--t);
}
.pool-card:hover {
  border-color: var(--line-strong);
}
.pool-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
}
.pool-name {
  font-size: var(--fz-base);
  font-weight: 600;
  margin: 0;
}
.pool-count {
  font-size: var(--fz-sm);
  color: var(--text-3);
}

/* 数据行：dl 定义列表（dt/dd 分离，读数不堆按钮） */
.pool-figures {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-3);
}
.fig {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.fig dt {
  font-size: var(--fz-xs);
  color: var(--text-3);
}
.fig dd {
  margin: 0;
  font-size: var(--fz-sm);
  color: var(--text-1);
  line-height: 1.5;
}
.fig.wide {
  grid-column: 1 / -1;
}

/* 五星记录折叠列表 */
.five-list {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: var(--sp-3);
}
.five-list summary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fz-sm);
  color: var(--text-2);
  cursor: pointer;
  list-style: none;
  transition: color var(--t-fast);
}
.five-list summary::-webkit-details-marker {
  display: none;
}
.five-list summary:hover {
  color: var(--gold-bright);
}
.five-list[open] summary svg {
  transform: rotate(180deg);
}
.five-list summary svg {
  transition: transform var(--t);
}
.five-rows {
  margin: var(--sp-3) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  max-height: 240px;
  overflow-y: auto;
}
.five-rows li {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  font-size: var(--fz-sm);
}
.five-rows li svg {
  color: var(--gold);
  flex-shrink: 0;
}
.five-name {
  color: var(--text-1);
}
.five-time {
  margin-left: auto;
  color: var(--text-3);
  font-size: var(--fz-xs);
}

/* ---- 页脚 ---- */
.gacha-foot {
  padding-top: var(--sp-6);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.gacha-foot p {
  margin: 0;
  max-width: 720px;
  font-size: var(--fz-xs);
  color: var(--text-3);
  line-height: 1.7;
}

/* 窄屏 */
@media (max-width: 640px) {
  .overview {
    grid-template-columns: 1fr;
  }
  .pool-list {
    grid-template-columns: 1fr;
  }
  .pool-figures {
    grid-template-columns: repeat(2, 1fr);
  }
  .clear-link {
    margin-left: 0;
    padding-left: 0;
  }
}
</style>
