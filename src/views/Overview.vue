<script setup>
/**
 * 探索度首页（工具首页）
 * 首屏 = 当前游戏总览（进度数字/条） + 数据操作区（导入导出/一键修改/备份） + 地区卡片
 * 数据操作原在全局顶栏 ⋮ 菜单，随 IA 重构下沉到本页（它们操作的是探索度数据）
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhListBullets,
  PhMapTrifold,
  PhPercent,
  PhPencilSimple,
  PhTable,
  PhFileCode,
  PhArchiveBox
} from '@phosphor-icons/vue'
import RegionCard from '../components/RegionCard.vue'
import BatchEditPanel from '../components/BatchEditPanel.vue'
import { useCountUp } from '../composables/useCountUp.js'
import { importProgress } from '../api/data.js'
import { toast } from '../utils/toast.js'

const props = defineProps({
  store: { type: Object, required: true }
})

const route = useRoute()
const router = useRouter()

// 当前游戏（含 image/gallery 字段，供空态景观带使用）
const activeGame = computed(
  () => props.store.games.value.find((g) => g.id === props.store.activeGameId.value) ?? null
)

// 路由驱动游戏：进入 /game/:gameId 时切换到对应游戏
watch(
  () => route.params.gameId,
  (id) => {
    if (typeof id === 'string' && id) props.store.setActiveGame(id)
  },
  { immediate: true }
)

function openRegion(id) {
  router.push(`/game/${props.store.activeGameId.value}/region/${id}`)
}

const overallPercent = computed(() => {
  const { done, total } = props.store.overall.value
  return total ? Math.round((done / total) * 100) : 0
})

// 总探索度数字滚动动效（进入页面时 0 → 目标值）
const overallAnim = useCountUp(() => overallPercent.value, 900)

// 首屏副文：原神保留「提瓦特」表述，其他游戏用通用说法
const overviewSub = computed(() => {
  if (activeGame.value?.id === 'genshin') {
    return '记录提瓦特每一块土地的探索进度。游客直接录入（存本机）；主人解锁后录入，自动保存到云端。'
  }
  const name = activeGame.value?.name ?? '米游'
  return `记录${name}每一块地图的探索进度。游客直接录入（存本机）；主人解锁后录入，自动保存到云端。`
})

// ---- 数据操作（探索度数据：一键修改 / 导入导出 / 备份恢复） ----
const batchOpen = ref(false)
function openBatch() {
  batchOpen.value = true
}

async function doExportXlsx() {
  const { exportProgressXlsx } = await import('../utils/xlsx.js')
  const game = props.store.activeGame.value
  const my = props.store.editable.value
    ? props.store.cloudProgress.value
    : props.store.guestProgress.value
  const ref = props.store.editable.value ? null : props.store.cloudProgress.value
  try {
    exportProgressXlsx(game, my, ref)
    toast('已导出 .xlsx 表格文件', 'success')
  } catch (e) {
    toast('导出失败：' + e.message, 'error')
  }
}
function doExportJson() {
  try {
    props.store.exportMyProgress()
    toast('已导出 .json 完整存档', 'success')
  } catch (e) {
    toast('导出失败：' + e.message, 'error')
  }
}

async function doImportXlsx(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const { importProgressXlsx } = await import('../utils/xlsx.js')
    const { progress, errors } = await importProgressXlsx(file, props.store.activeGame.value)
    if (errors.length) {
      const head = errors
        .slice(0, 5)
        .map((e) => `第 ${e.row} 行：${e.message}`)
        .join('\n')
      const more = errors.length > 5 ? `\n…共 ${errors.length} 行无法识别` : ''
      if (!window.confirm(`有 ${errors.length} 行无法识别：\n${head}${more}\n\n继续导入其余有效行吗？`)) return
    }
    props.store.applyImported(progress)
    toast(
      `导入成功${errors.length ? `（忽略 ${errors.length} 行问题）` : ''}`,
      errors.length ? 'info' : 'success'
    )
  } catch (e) {
    toast('导入失败：' + e.message, 'error')
  }
}

function doImportJson(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  importProgress(file)
    .then((data) => {
      props.store.applyImported(data)
      toast('导入成功', 'success')
    })
    .catch((err) => toast(err.message || '导入失败', 'error'))
}

function tryRestore() {
  const confirmed = window.confirm('将用云端自动备份（上一次保存前的数据）覆盖当前进度，确定恢复？')
  if (!confirmed) return
  props.store.restoreFromBackup()
  toast('已从云端备份恢复', 'success')
}
</script>

<template>
  <!-- 工具首页头：当前游戏 + 总进度 + 数据操作，无全屏展示 hero -->
  <section class="overview-head reveal">
    <div class="overview-info">
      <h1 class="overview-title">{{ activeGame?.name ?? '米游' }}</h1>
      <p class="overview-sub">{{ overviewSub }}</p>
    </div>
    <div class="overview-stat">
      <div class="stat-value">
        <span class="tnum">{{ overallAnim }}</span><span class="stat-unit">%</span>
      </div>
      <div class="stat-meta tnum">{{ store.overall.value.done }} / {{ store.overall.value.total }} 个地区已完成</div>
      <div class="stat-bar">
        <div class="stat-bar-fill" :style="{ width: overallPercent + '%' }"></div>
      </div>
    </div>
  </section>

  <!-- 数据操作区：探索度数据的导入导出 / 一键修改 / 备份恢复 -->
  <section class="toolbar reveal" style="animation-delay: 0.14s">
    <button class="tool-btn" @click="openBatch" title="把所有可修改项聚拢到一个面板里批量编辑">
      <PhPencilSimple :size="15" /> 一键修改
    </button>
    <span class="toolbar-sep" aria-hidden="true"></span>
    <button class="tool-btn" @click="doExportXlsx" title="导出为 WPS/Excel 可直接打开的表格">
      <PhTable :size="15" /> 导出 .xlsx
    </button>
    <button class="tool-btn" @click="doExportJson" title="导出完整数据存档（JSON 文件）">
      <PhFileCode :size="15" /> 导出 .json
    </button>
    <label class="tool-btn" title="导入 WPS 表格（在表格里改「已搜集」列后导回）">
      <PhTable :size="15" /> 导入 .xlsx
      <input type="file" accept=".xlsx" @change="doImportXlsx" />
    </label>
    <label class="tool-btn" title="导入完整数据存档（JSON 文件）">
      <PhFileCode :size="15" /> 导入 .json
      <input type="file" accept="application/json,.json" @change="doImportJson" />
    </label>
    <button v-if="store.editable.value" class="tool-btn" @click="tryRestore" title="用云端自动备份覆盖当前进度">
      <PhArchiveBox :size="15" /> 从备份恢复
    </button>
  </section>

  <section class="list-head reveal" style="animation-delay: 0.2s">
    <span class="list-count tnum">共 {{ store.sortedRegions.value.length }} 个地区</span>
    <div class="sort-switch">
      <button
        class="sort-btn tnum"
        :class="{ active: store.sortMode.value === 'progress' }"
        @click="store.sortMode.value = 'progress'"
        title="按探索度从低到高排序"
      >
        <PhPercent :size="14" /> 按探索度
      </button>
      <button
        class="sort-btn tnum"
        :class="{ active: store.sortMode.value === 'order' }"
        @click="store.sortMode.value = 'order'"
        title="按区域顺序排序"
      >
        <PhListBullets :size="14" /> 按区域顺序
      </button>
    </div>
  </section>

  <main class="region-grid" v-if="store.sortedRegions.value.length">
    <RegionCard
      v-for="(region, i) in store.sortedRegions.value"
      :key="region.id"
      :region="region"
      :progress="store.displayProgress.value"
      class="reveal"
      :style="{ animationDelay: (0.26 + i * 0.08) + 's' }"
      @edit="openRegion"
    />
  </main>

  <div class="empty-regions reveal" style="animation-delay: 0.3s" v-else>
    <PhMapTrifold :size="22" />
    <p>该游戏还没有地区数据。等主人配置好 games.json 并重新部署后，这里就会出现探索进度卡片。</p>
  </div>

  <div class="game-gallery reveal" v-if="!store.sortedRegions.value.length && activeGame?.gallery?.length" style="animation-delay: 0.36s">
    <figure
      v-for="(img, i) in activeGame.gallery"
      :key="i"
      class="game-gallery-card reveal"
      :style="{ '--shot-img': `url('${img}')`, animationDelay: (0.4 + i * 0.08) + 's' }"
    >
      <figcaption>{{ activeGame.name }} · 世界景观 {{ i + 1 }}</figcaption>
    </figure>
  </div>

  <footer class="data-note reveal" style="animation-delay: 0.6s">
    <div class="note-item">
      <p><strong>数据来源</strong>：目标数量（宝箱 / 限时挑战 / 仙灵 / 雷灵 / 幻写灵）以 B 站攻略博主「你的影月月」的全收集攻略为准，截至 7.1 版本。</p>
    </div>
    <div class="note-item">
      <p><strong>账号 UID 212114083</strong>：已搜集进度数据来自该原神账号（游戏内成就「总计」口径）。</p>
    </div>
  </footer>

  <BatchEditPanel v-if="batchOpen" :store="store" @close="batchOpen = false" />
</template>

<style scoped>
/* ---- 工具首页头：左信息 + 右总进度 ---- */
.overview-head {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--sp-7);
  align-items: end;
  padding: var(--sp-6) 0;
  margin-bottom: var(--sp-4);
}
.overview-title {
  margin: 0 0 var(--sp-2);
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
}
.overview-sub {
  margin: 0;
  max-width: 56ch;
  font-size: var(--fz-base);
  color: var(--text-2);
}
.overview-stat {
  min-width: 280px;
  text-align: right;
}
.stat-value {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 4px;
  line-height: 1;
  margin-bottom: var(--sp-2);
}
.stat-value span {
  font-size: clamp(40px, 5.6vw, 72px);
  font-weight: 700;
  color: var(--gold-bright);
  font-variant-numeric: tabular-nums;
}
.stat-unit {
  font-size: var(--fz-xl);
  color: var(--gold);
}
.stat-meta {
  font-size: var(--fz-sm);
  color: var(--text-2);
  margin-bottom: var(--sp-3);
}
.stat-bar {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  overflow: hidden;
}
.stat-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--gold);
  transition: width 0.4s var(--ease);
}

/* ---- 数据操作区：一排克制的小工具按钮 ---- */
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-3);
  margin-bottom: var(--sp-6);
  border-radius: var(--r-md);
  background: var(--bg-2);
}
.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-sm);
  font-size: var(--fz-sm);
  color: var(--text-2);
  transition: var(--t);
  white-space: nowrap;
  cursor: pointer;
}
.tool-btn:hover {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.06);
}
.tool-btn input {
  display: none;
}
.toolbar-sep {
  width: 1px;
  height: 16px;
  margin: 0 var(--sp-1);
  background: rgba(255, 255, 255, 0.1);
}

/* ---- 地区列表 ---- */
.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sp-4);
}
.list-count {
  font-size: var(--fz-sm);
  color: var(--text-3);
  letter-spacing: 0.06em;
}
.sort-switch {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: var(--sp-1) var(--sp-2);
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.06em;
  transition: var(--t);
  border-radius: var(--r-sm);
}
.sort-btn:hover {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.05);
}
.sort-btn.active {
  color: var(--text-1);
}

.region-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--sp-5);
}

.empty-regions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-9) var(--sp-6);
  border-radius: var(--r-lg);
  color: var(--text-2);
  text-align: center;
  font-size: var(--fz-sm);
}
.empty-regions p {
  margin: 0;
  max-width: 360px;
  line-height: 1.7;
}

/* 空态游戏世界景观带（该游戏实景，桌面展示） */
.game-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-3);
  margin-top: var(--sp-6);
}
.game-gallery-card {
  position: relative;
  margin: 0;
  height: 150px;
  border-radius: var(--r-md);
  background-image: var(--shot-img, none);
  background-size: cover;
  background-position: center;
  overflow: hidden;
  transition: transform 0.3s var(--ease);
}
.game-gallery-card:hover {
  transform: scale(1.02);
}
/* 景观卡脚注压字 scrim（house rule 唯一允许的渐变）taste-skill-ignore */
.game-gallery-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 11, 13, 0) 55%, rgba(10, 11, 13, 0.8) 100%); /* taste-skill-ignore */
}
.game-gallery-card figcaption {
  position: absolute;
  left: var(--sp-3);
  bottom: var(--sp-2);
  z-index: 1;
  font-size: var(--fz-xs);
  color: var(--text-2);
}
@media (max-width: 720px) {
  .game-gallery {
    display: none;
  }
}

.data-note {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-top: var(--sp-9);
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-md);
  background: var(--bg-2);
  font-size: var(--fz-base);
  color: var(--text-2);
}
.note-item {
  display: flex;
  align-items: baseline;
  gap: var(--sp-4);
}
.note-item p {
  margin: 0;
  max-width: 70ch;
  line-height: 1.6;
}
.note-item strong {
  color: var(--text-1);
  font-weight: 600;
}

@media (max-width: 720px) {
  .overview-head {
    grid-template-columns: 1fr;
    gap: var(--sp-4);
  }
  .overview-stat {
    text-align: left;
    min-width: 0;
  }
  .stat-value {
    justify-content: flex-start;
  }
  .note-item {
    flex-direction: column;
    gap: var(--sp-1);
  }
}
</style>
