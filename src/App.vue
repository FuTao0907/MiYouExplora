<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProgress } from './composables/useProgress.js'
import {
  PhArchiveBox,
  PhDotsThreeVertical,
  PhEye,
  PhEyeSlash,
  PhGameController,
  PhLock,
  PhLockOpen,
  PhPencilSimple,
  PhPlayCircle,
  PhTable,
  PhFileCode,
  PhUploadSimple
} from '@phosphor-icons/vue'
import { importProgress } from './api/data.js'
import BatchEditPanel from './components/BatchEditPanel.vue'
import TourGuide from './components/TourGuide.vue'

const store = useProgress()
store.init()
const router = useRouter()

const batchOpen = ref(false)
const menuOpen = ref(false)

// ---- Tour 漫游引导：首次访问自动播放（localStorage 标记），可重播 ----
const TOUR_KEY = 'miyou_tour_done'
const tourOpen = ref(!localStorage.getItem(TOUR_KEY))

const tourSteps = [
  {
    selector: '.hero',
    title: '欢迎来到米游探索度记录',
    body: '这是一个记录《原神》探索进度的个人网站。你不需要注册：直接就能录入自己的游戏数据，用来整理进度、查漏补缺。',
    placement: 'bottom'
  },
  {
    selector: '.region-card',
    title: '看探索度',
    body: '每张卡片是一个地区，显示探索进度百分比。点击卡片进入表格，可以看到每个章节的宝箱 / 限时挑战 / 仙灵（幻写灵）已搜集数量。',
    placement: 'bottom'
  },
  {
    selector: '.topbar',
    title: '顶部导航',
    body: '顶部左侧切换游戏；右侧「解锁编辑」可进入主人模式（录入保存到云端）；右上角 ⋮ 里集中了导入导出、一键修改等操作。',
    placement: 'bottom'
  },
  {
    selector: '.menu-trigger',
    title: '更多操作',
    body: '「一键修改」把所有修改项聚拢到一个面板一次改完；也支持导出 / 导入 WPS 表格（.xlsx）或 JSON 文件。游客导出的文件只包含自己的数据。',
    placement: 'bottom'
  },
  {
    selector: '.region-table',
    title: '直接录入',
    body: '表格里的输入框可以直接修改（数字 0 到目标数之间；输入 -1 表示该分项对你不适用）。游客的改动只保存在这台电脑上；主人的数据（UID 212114083）会作为参考显示。',
    placement: 'top'
  }
]

function tourDone() {
  localStorage.setItem(TOUR_KEY, '1')
  tourOpen.value = false
}
function tourClose() {
  tourOpen.value = false
}
function replayTour() {
  tourOpen.value = false
  menuOpen.value = false
  // 延迟一帧再打开，避免与菜单关闭动画冲突
  setTimeout(() => {
    tourOpen.value = true
  }, 50)
}

function openBatch() {
  batchOpen.value = true
  menuOpen.value = false
}

// ---- 游戏切换：走路由（URL 可直达/分享/刷新不丢状态） ----
function switchGame(id) {
  if (id !== store.activeGameId.value) router.push(`/game/${id}`)
  menuOpen.value = false
}

// ---- 解锁编辑（默认游客模式；生产环境密码校验在服务端） ----
const unlockOpen = ref(false)
const unlockInput = ref('')
const unlockError = ref(false)
const unlocking = ref(false)

async function tryUnlock() {
  if (unlocking.value) return
  unlocking.value = true
  unlockError.value = false
  const ok = await store.unlock(unlockInput.value)
  unlocking.value = false
  if (ok) {
    unlockOpen.value = false
    unlockInput.value = ''
    unlockError.value = false
  } else {
    unlockError.value = true
  }
}

function lockNow() {
  store.lock()
  unlockInput.value = ''
  unlockError.value = false
}

function tryRestore() {
  const confirmed = window.confirm('将用云端自动备份（上一次保存前的数据）覆盖当前进度，确定恢复？')
  if (!confirmed) return
  store.restoreFromBackup()
  menuOpen.value = false
}

// ---- 导入 / 导出（XLSX 与 JSON 双格式，动态加载 xlsx 库；集中放在顶栏 ⋮ 菜单） ----
async function doExportXlsx() {
  const { exportProgressXlsx } = await import('./utils/xlsx.js')
  const game = store.activeGame.value
  const my = store.editable.value
    ? store.cloudProgress.value
    : store.guestProgress.value
  const ref = store.editable.value ? null : store.cloudProgress.value
  exportProgressXlsx(game, my, ref)
  menuOpen.value = false
}
function doExportJson() {
  store.exportMyProgress()
  menuOpen.value = false
}

async function doImportXlsx(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const { importProgressXlsx } = await import('./utils/xlsx.js')
    const { progress, errors } = await importProgressXlsx(file, store.activeGame.value)
    if (errors.length) {
      const head = errors
        .slice(0, 5)
        .map((e) => `第 ${e.row} 行：${e.message}`)
        .join('\n')
      const more = errors.length > 5 ? `\n…共 ${errors.length} 行无法识别` : ''
      if (!window.confirm(`有 ${errors.length} 行无法识别：\n${head}${more}\n\n继续导入其余有效行吗？`)) return
    }
    store.applyImported(progress)
    alert(`导入成功${errors.length ? `（忽略 ${errors.length} 行问题）` : ''}`)
    menuOpen.value = false
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
      store.applyImported(data)
      alert('导入成功')
      menuOpen.value = false
    })
    .catch((err) => alert(err.message))
}
</script>

<template>
  <div class="container">
    <div v-if="store.loading.value" class="state-box">正在加载数据…</div>
    <div v-else-if="store.error.value" class="state-box error">
      <p>数据加载失败：{{ store.error.value }}</p>
      <p class="state-hint">请确认 public/data/games.json 与 progress.json 存在且为合法 JSON。</p>
    </div>
    <template v-else>
      <header class="topbar reveal">
        <div class="topbar-inner">
          <span class="site-brand" title="米游探索度记录">
            <PhGameController :size="18" /> 米游探索度记录
          </span>

          <nav class="game-nav" v-if="store.games.value.length > 1" aria-label="切换游戏">
            <button
              v-for="game in store.games.value"
              :key="game.id"
              class="game-tab"
              :class="{ active: game.id === store.activeGameId.value }"
              @click="switchGame(game.id)"
            >
              {{ game.name }}
            </button>
          </nav>

          <div class="topbar-right">
            <template v-if="store.editable.value">
              <span class="mode-badge">主人模式</span>
              <span v-if="store.saveText.value" class="save-state" :class="'save-' + store.saveState.value">
                {{ store.saveState.value === 'error' ? store.saveError.value : store.saveText.value }}
              </span>
              <button v-if="store.saveState.value === 'error'" class="text-link" @click="store.doCloudSave" title="重新尝试保存到云端">
                重试保存
              </button>
              <button class="text-link" @click="lockNow" title="锁定为游客模式：之后的改动只保存到本机">
                <PhLock :size="14" /> 锁定
              </button>
            </template>
            <template v-else>
              <button
                class="text-link"
                :class="{ active: store.showReference.value }"
                @click="store.toggleReference"
                :title="store.showReference.value ? '正在显示主人的进度作参考，点击关闭' : '点击显示主人的进度作参考'"
              >
                <component :is="store.showReference.value ? PhEye : PhEyeSlash" :size="14" />
                参考：{{ store.showReference.value ? '开' : '关' }}
              </button>
              <button class="text-link" @click="unlockOpen = !unlockOpen" title="输入密码进入主人模式，录入保存到云端">
                <PhLockOpen :size="14" /> 解锁编辑
              </button>
            </template>

            <button
              class="icon-btn menu-trigger"
              :class="{ open: menuOpen }"
              @click="menuOpen = !menuOpen"
              :title="menuOpen ? '收起操作菜单' : '更多操作：一键修改 / 导入导出 / 引导'"
              aria-label="更多操作"
            >
              <PhDotsThreeVertical :size="18" />
            </button>
          </div>
        </div>

        <div v-if="unlockOpen" class="unlock-row">
          <input
            class="pwd-input mono"
            type="password"
            v-model="unlockInput"
            @keyup.enter="tryUnlock"
            placeholder="编辑密码"
            autocomplete="off"
          />
          <button class="btn btn-primary btn-sm" :disabled="unlocking" @click="tryUnlock" title="校验密码进入主人模式">
            {{ unlocking ? '校验中…' : '确认' }}
          </button>
          <span v-if="unlockError" class="pwd-error">密码错误</span>
        </div>

        <div v-if="menuOpen" class="top-menu" @click.stop>
          <button class="menu-item" @click="openBatch" title="把所有可修改项聚拢到一个面板里批量编辑">
            <PhPencilSimple :size="16" /> 一键修改
          </button>
          <button class="menu-item" @click="doExportXlsx" title="导出为 WPS/Excel 可直接打开的表格">
            <PhTable :size="16" /> 导出 .xlsx（WPS 表格）
          </button>
          <button class="menu-item" @click="doExportJson" title="导出完整数据存档（JSON 文件）">
            <PhFileCode :size="16" /> 导出 .json（完整存档）
          </button>
          <label class="menu-item" title="导入 WPS 表格（在表格里改「已搜集」列后导回）">
            <PhTable :size="16" /> 导入 .xlsx（WPS 表格）
            <input type="file" accept=".xlsx" @change="doImportXlsx" />
          </label>
          <label class="menu-item" title="导入完整数据存档（JSON 文件）">
            <PhFileCode :size="16" /> 导入 .json（完整存档）
            <input type="file" accept="application/json,.json" @change="doImportJson" />
          </label>
          <template v-if="store.editable.value">
            <button class="menu-item" @click="tryRestore" title="用云端自动备份覆盖当前进度">
              <PhArchiveBox :size="16" /> 从备份恢复
            </button>
          </template>
          <button class="menu-item" @click="replayTour" title="重新播放新手引导（分步气泡）">
            <PhPlayCircle :size="16" /> 重播引导
          </button>
          <p class="menu-tip">表格方便在 WPS/Excel 里查看和修改；JSON 是完整数据存档。游客导出的只含你自己的数据。</p>
        </div>
      </header>

      <router-view v-slot="{ Component, route }">
        <component
          :is="Component"
          :store="store"
          :region-id="route.params.regionId"
        />
      </router-view>

      <BatchEditPanel v-if="batchOpen" :store="store" @close="batchOpen = false" />
      <TourGuide
        v-if="tourOpen"
        :steps="tourSteps"
        @done="tourDone"
        @close="tourClose"
      />
    </template>
  </div>
</template>

<style scoped>
.state-box {
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: var(--sp-8) var(--sp-6);
  text-align: center;
  color: var(--text-2);
}
.state-box.error {
  color: #d97a7a;
}
.state-hint {
  font-size: var(--fz-sm);
  color: var(--text-3);
}

/* ---- 顶栏（全站导航） ---- */
.topbar {
  position: sticky;
  top: 0;
  z-index: 60;
  margin-bottom: var(--sp-6);
  margin-inline: calc(-1 * var(--sp-5));
  padding: 0 var(--sp-5);
  background: rgba(10, 11, 13, 0.82);
  backdrop-filter: blur(14px);
}
.topbar-inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2) var(--sp-6);
  min-height: 52px;
  padding: var(--sp-2) 0;
}
.site-brand {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fz-base);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-1);
  white-space: nowrap;
}
.game-nav {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}
.game-tab {
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-sm);
  font-size: var(--fz-base);
  color: var(--text-3);
  transition: var(--t);
}
.game-tab:hover {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.05);
}
.game-tab.active {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.1);
  font-weight: 600;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-left: auto;
}
.text-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: var(--sp-1) var(--sp-2);
  border-radius: var(--r-sm);
  font-size: var(--fz-sm);
  color: var(--text-3);
  transition: var(--t);
}
.text-link:hover {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.05);
}
.text-link.active {
  color: var(--text-1);
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  color: var(--text-3);
  transition: var(--t);
}
.icon-btn:hover,
.icon-btn.open {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.08);
}
.mode-badge {
  font-size: var(--fz-sm);
  padding: 2px 10px;
  border-radius: var(--r-sm);
  color: var(--text-2);
  background: rgba(255, 255, 255, 0.05);
}
.save-state {
  font-size: var(--fz-xs);
  color: var(--text-2);
  letter-spacing: 0.04em;
}
.save-state.save-saving {
  color: var(--text-2);
}
.save-state.save-saved {
  color: #6fcf97;
}
.save-state.save-error {
  color: #e5484d;
}
.unlock-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 0 0 var(--sp-3);
}
.pwd-input {
  width: 160px;
  padding: 5px 12px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-sm);
  background: var(--bg);
  color: var(--text-1);
  font-size: var(--fz-sm);
}
.pwd-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1); /* 输入框 focus ring taste-skill-ignore */
}
.pwd-error {
  font-size: var(--fz-xs);
  color: #e5484d;
}

/* ---- 顶栏操作菜单 ---- */
.top-menu {
  position: absolute;
  right: var(--sp-5);
  top: calc(100% + 6px);
  z-index: 70;
  min-width: 270px;
  padding: var(--sp-2);
  background: var(--bg-3);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-card); /* 浮动菜单阴影（house rule 允许）taste-skill-ignore */
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
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
.menu-item:hover {
  background: rgba(255, 255, 255, 0.07);
}
.menu-item input {
  display: none;
}
.menu-tip {
  margin: var(--sp-1) var(--sp-3) var(--sp-2);
  font-size: var(--fz-xs);
  color: var(--text-3);
  line-height: 1.6;
}

/* ---- 窄屏：导航紧凑换行，保持单项不折行 ---- */
@media (max-width: 640px) {
  .topbar-inner {
    gap: var(--sp-1) var(--sp-4);
  }
  .game-tab {
    font-size: var(--fz-sm);
    padding: var(--sp-1) var(--sp-2);
  }
  .topbar-right {
    gap: var(--sp-2);
  }
  .text-link {
    font-size: var(--fz-sm);
  }
}
</style>
