<script setup>
import { computed, ref } from 'vue'
import RegionCard from '../components/RegionCard.vue'
import { importProgress } from '../api/data.js'
// xlsx 工具动态加载（体积较大，仅用户点击导入/导出时下载，见 doExportXlsx / doImportXlsx）

const props = defineProps({
  store: { type: Object, required: true }
})
const emit = defineEmits(['edit', 'batch'])

const overallPercent = computed(() => {
  const { done, total } = props.store.overall.value
  return total ? Math.round((done / total) * 100) : 0
})

// ---- 导入 / 导出（XLSX 与 JSON 双格式，用户选择并提示） ----
const exportMenuOpen = ref(false)
const importMenuOpen = ref(false)

async function doExportXlsx() {
  const { exportProgressXlsx } = await import('../utils/xlsx.js')
  const game = props.store.activeGame.value
  const my = props.store.editable.value
    ? props.store.cloudProgress.value
    : props.store.guestProgress.value
  const ref = props.store.editable.value ? null : props.store.cloudProgress.value
  exportProgressXlsx(game, my, ref)
  exportMenuOpen.value = false
}
function doExportJson() {
  props.store.exportMyProgress()
  exportMenuOpen.value = false
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
    alert(`导入成功${errors.length ? `（忽略 ${errors.length} 行问题）` : ''}`)
    importMenuOpen.value = false
  } catch (e) {
    alert('导入失败：' + e.message)
  }
}

function doImportJson(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  importProgress(file)
    .then((data) => {
      props.store.applyImported(data)
      alert('导入成功')
      importMenuOpen.value = false
    })
    .catch((err) => alert(err.message))
}
</script>

<template>
  <section class="hero">
    <div class="hero-content reveal">
      <p class="hero-eyebrow mono">GENSHIN IMPACT · PERSONAL TRACKER</p>
      <h1 class="hero-title">米游探索度记录</h1>
      <p class="hero-sub">记录提瓦特每一块土地的探索进度。游客可直接录入自己的进度（保存在本机）；主人解锁后录入，编辑自动保存到云端。</p>
    </div>
    <div class="hero-stat reveal" style="animation-delay: 0.12s">
      <div class="hero-stat-label mono">OVERALL</div>
      <div class="hero-stat-value">
        <span class="mono">{{ overallPercent }}</span><span class="hero-stat-unit">%</span>
      </div>
      <div class="hero-stat-meta mono">{{ store.overall.value.done }}/{{ store.overall.value.total }} 个地区已完成</div>
      <div class="hero-bar">
        <div class="hero-bar-fill" :style="{ width: overallPercent + '%' }"></div>
      </div>
    </div>
  </section>

  <div class="region-toolbar reveal" style="animation-delay: 0.08s">
    <button class="btn btn-batch" @click="emit('batch')">一键修改</button>

    <div class="file-menu-wrap">
      <button class="btn btn-primary btn-export" @click="exportMenuOpen = !exportMenuOpen">导出数据</button>
      <div v-if="exportMenuOpen" class="file-menu" @click.stop>
        <button class="file-menu-item" @click="doExportXlsx">导出 .xlsx（WPS 表格）</button>
        <button class="file-menu-item" @click="doExportJson">导出 .json（完整存档）</button>
        <p class="file-menu-tip">表格方便在 WPS/Excel 里查看和修改；JSON 是完整数据存档。游客导出的只含你自己的数据。</p>
      </div>
    </div>

    <div class="file-menu-wrap">
      <button class="btn btn-ghost" @click="importMenuOpen = !importMenuOpen">导入数据</button>
      <div v-if="importMenuOpen" class="file-menu" @click.stop>
        <label class="file-menu-item">
          导入 .xlsx（WPS 表格）
          <input type="file" accept=".xlsx" @change="doImportXlsx" />
        </label>
        <label class="file-menu-item">
          导入 .json（完整存档）
          <input type="file" accept="application/json,.json" @change="doImportJson" />
        </label>
        <p class="file-menu-tip">表格：在 WPS/Excel 里改「已搜集」列后导回；JSON：完整数据文件。空行不会被修改。</p>
      </div>
    </div>
  </div>

  <section class="game-switch reveal" v-if="store.games.value.length > 1" style="animation-delay: 0.18s">
    <button
      v-for="game in store.games.value"
      :key="game.id"
      class="game-tab"
      :class="{ active: game.id === store.activeGameId.value }"
      @click="store.activeGameId.value = game.id"
    >
      {{ game.name }}
    </button>
  </section>

  <section class="list-head reveal" style="animation-delay: 0.22s">
    <span class="list-count mono">{{ store.sortedRegions.value.length }} REGIONS</span>
    <div class="sort-switch">
      <button
        class="sort-btn mono"
        :class="{ active: store.sortMode.value === 'progress' }"
        @click="store.sortMode.value = 'progress'"
      >按探索度</button>
      <button
        class="sort-btn mono"
        :class="{ active: store.sortMode.value === 'order' }"
        @click="store.sortMode.value = 'order'"
      >按区域顺序</button>
    </div>
  </section>

  <main class="region-grid" v-if="store.sortedRegions.value.length">
    <RegionCard
      v-for="(region, i) in store.sortedRegions.value"
      :key="region.id"
      :region="region"
      :index="i"
      :progress="store.displayProgress.value"
      class="reveal"
      :style="{ animationDelay: (0.26 + i * 0.08) + 's' }"
      @edit="(id) => emit('edit', id)"
    />
  </main>

  <footer class="data-note reveal" style="animation-delay: 0.6s">
    <div class="note-item">
      <span class="mono">DATA SOURCE</span>
      <p>目标数量（宝箱 / 限时挑战 / 仙灵 / 雷灵 / 幻写灵）以 B 站攻略博主「你的影月月」的全收集攻略为准，截至 7.1 版本。</p>
    </div>
    <div class="note-item">
      <span class="mono">PLAYER UID</span>
      <p>已搜集进度数据来自原神账号 <strong>212114083</strong>（游戏内成就「总计」口径）。</p>
    </div>
  </footer>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: var(--sp-7);
  align-items: center;
  padding: var(--sp-8) var(--sp-7);
  margin-bottom: var(--sp-7);
  border-radius: var(--r-lg);
  border: 1px solid var(--line);
  overflow: hidden;
  isolation: isolate;
  background: var(--bg-2);
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: url('/images/hero.jpg');
  background-size: cover;
  background-position: center 60%;
}
.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(
    100deg,
    rgba(11, 17, 29, 0.92) 0%,
    rgba(11, 17, 29, 0.78) 45%,
    rgba(11, 17, 29, 0.55) 100%
  );
}
.hero-eyebrow {
  margin: 0 0 var(--sp-3);
  font-size: var(--fz-xs);
  color: var(--gold);
  letter-spacing: 0.2em;
}
.hero-title {
  margin: 0 0 var(--sp-3);
  font-size: var(--fz-display);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.2;
}
.hero-sub {
  margin: 0 0 var(--sp-6);
  max-width: 500px;
  font-size: var(--fz-base);
  color: var(--text-2);
}
.region-toolbar {
  display: flex;
  gap: var(--sp-3);
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: var(--sp-6);
}
.region-toolbar input {
  display: none;
}
.hero-stat {
  background: rgba(11, 17, 29, 0.55);
  backdrop-filter: blur(10px);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-md);
  padding: var(--sp-6);
}
.hero-stat-label {
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.2em;
  margin-bottom: var(--sp-2);
}
.hero-stat-value {
  display: flex;
  align-items: baseline;
  gap: 2px;
  line-height: 1;
  margin-bottom: var(--sp-1);
}
.hero-stat-value span {
  font-size: var(--fz-display);
  font-weight: 700;
  color: var(--gold-bright);
}
.hero-stat-unit {
  font-size: var(--fz-lg);
  color: var(--gold);
}
.hero-stat-meta {
  font-size: var(--fz-xs);
  color: var(--text-2);
  margin-bottom: var(--sp-4);
}
.hero-bar {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.hero-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--gold);
  transition: width 0.4s var(--ease);
}

.game-switch {
  display: flex;
  gap: var(--sp-2);
  margin-bottom: var(--sp-6);
}
.game-tab {
  padding: var(--sp-2) var(--sp-5);
  border-radius: 999px;
  border: 1px solid var(--line);
  color: var(--text-2);
  font-size: var(--fz-base);
  transition: var(--t);
}
.game-tab:hover {
  color: var(--text-1);
  border-color: var(--line-strong);
}
.game-tab.active {
  color: #1a150a;
  background: var(--gold);
  border-color: var(--gold);
  font-weight: 600;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sp-4);
}
.list-count {
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.2em;
}
.sort-switch {
  display: flex;
  gap: var(--sp-1);
}
.sort-btn {
  padding: var(--sp-1) var(--sp-3);
  border-radius: 999px;
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.06em;
  transition: var(--t);
}
.sort-btn:hover {
  color: var(--text-1);
}
.sort-btn.active {
  color: var(--gold);
  background: var(--gold-tint);
}

.region-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--sp-5);
}

.data-note {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-top: var(--sp-8);
  padding: var(--sp-4) var(--sp-5);
  border-top: 1px solid var(--line);
  font-size: var(--fz-xs);
  color: var(--text-3);
}
.note-item {
  display: flex;
  align-items: baseline;
  gap: var(--sp-4);
}
.note-item .mono {
  color: var(--gold);
  letter-spacing: 0.2em;
  white-space: nowrap;
}
.note-item p {
  margin: 0;
  line-height: 1.6;
}
.note-item strong {
  color: var(--text-2);
  font-weight: 600;
}

.file-menu-wrap {
  position: relative;
}
.file-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  min-width: 260px;
  padding: var(--sp-2);
  background: var(--bg-1);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}
.file-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: none;
  background: transparent;
  color: var(--text-1);
  font-size: var(--fz-sm);
  text-align: left;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: var(--t);
}
.file-menu-item:hover {
  background: var(--gold-tint);
  color: var(--gold);
}
.file-menu-item input {
  display: none;
}
.file-menu-tip {
  margin: var(--sp-1) var(--sp-3) var(--sp-2);
  font-size: var(--fz-xs);
  color: var(--text-3);
  line-height: 1.6;
}

@media (max-width: 720px) {
  .hero {
    grid-template-columns: 1fr;
    padding: var(--sp-6) var(--sp-5);
  }
  .note-item {
    flex-direction: column;
    gap: var(--sp-1);
  }
  .file-menu {
    position: static;
    box-shadow: none;
  }
}
</style>
