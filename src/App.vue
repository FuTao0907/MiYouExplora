<script setup>
/**
 * 应用外壳：两级导航
 *  - 第一行（全局）：品牌 + 游戏切换（一级）
 *  - 第二行（游戏内）：功能 tab（探索度 / 角色图鉴 / 抽卡分析，按 games.json 标记显示）+ 右侧轻量操作
 * 权限（解锁/锁定）与帮助收敛为图标；探索度数据操作（导入导出/一键修改/备份）下沉到探索度页内
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProgress } from './composables/useProgress.js'
import {
  PhGameController,
  PhImageSquare,
  PhChartLine,
  PhLock,
  PhLockOpen,
  PhEye,
  PhEyeSlash,
  PhPlayCircle,
  PhQuestion
} from '@phosphor-icons/vue'
import TourGuide from './components/TourGuide.vue'
import ToastHost from './components/ToastHost.vue'

const store = useProgress()
store.init()
const router = useRouter()
const route = useRoute()

// ---- 顶部阅读进度条（滚动即动，3px 纯色条） ----
const readProgress = ref(0)
function onScroll() {
  const doc = document.documentElement
  const total = doc.scrollHeight - doc.clientHeight
  readProgress.value = total > 0 ? Math.min(100, (doc.scrollTop / total) * 100) : 0
}
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

// ---- Tour 漫游引导：首次访问自动播放（localStorage 标记），可重播 ----
const TOUR_KEY = 'miyou_tour_done'
const tourOpen = ref(!localStorage.getItem(TOUR_KEY))

const tourSteps = [
  {
    selector: '.overview-head',
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
    selector: '.func-nav',
    title: '游戏内功能',
    body: '顶部第二行是当前游戏的功能入口：探索度、角色图鉴、抽卡分析。切换游戏时功能会跟着变化。',
    placement: 'bottom'
  },
  {
    selector: '.topbar-right',
    title: '解锁与帮助',
    body: '右侧可解锁编辑（录入保存到云端）、查看参考进度、重播本引导。',
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
  helpOpen.value = false
  // 延迟一帧再打开，避免与菜单关闭动画冲突
  setTimeout(() => {
    tourOpen.value = true
  }, 50)
}

// ---- 游戏切换：走路由（URL 可直达/分享/刷新不丢状态） ----
function switchGame(id) {
  if (id !== store.activeGameId.value) router.push(`/game/${id}`)
}

// 当前游戏（games.json 配置；characters/gacha 标记控制功能 tab 显示）
const currentGame = computed(() =>
  store.games.value.find((g) => g.id === store.activeGameId.value)
)

// 功能 tab 列表（games.json 标记驱动；探索度恒有）
const featureTabs = computed(() => {
  const tabs = [{ key: 'overview', name: '探索度' }]
  if (currentGame.value?.characters) tabs.push({ key: 'characters', name: '角色图鉴' })
  if (currentGame.value?.gacha) tabs.push({ key: 'gacha', name: '抽卡分析' })
  return tabs
})

// 当前功能（路由名 → 高亮）
const activeFeature = computed(() => {
  const name = route.name
  if (name === 'region') return 'overview'
  if (name === 'characters') return 'characters'
  if (name === 'gacha') return 'gacha'
  return 'overview'
})

function gotoFeature(key) {
  const base = `/game/${store.activeGameId.value}`
  if (key === 'characters') router.push(`${base}/characters`)
  else if (key === 'gacha') router.push(`${base}/gacha`)
  else router.push(base)
}

// 路由驱动游戏：任何 /game/:gameId/... 页面直达时都同步当前游戏
watch(
  () => route.params.gameId,
  (id) => {
    if (typeof id === 'string' && id && !store.loading.value) store.setActiveGame(id)
  },
  { immediate: true }
)
watch(
  () => store.loading.value,
  (loading) => {
    if (!loading && route.params.gameId) store.setActiveGame(route.params.gameId)
  }
)

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

// ---- 帮助菜单（只含轻量帮助类操作；数据操作已下沉到页面内） ----
const helpOpen = ref(false)
</script>

<template>
  <div class="container">
    <div class="page-progress" :style="{ width: readProgress + '%' }" aria-hidden="true"></div>
    <div v-if="store.loading.value" class="state-box">正在加载数据…</div>
    <div v-else-if="store.error.value" class="state-box error">
      <p>数据加载失败：{{ store.error.value }}</p>
      <p class="state-hint">请确认 public/data/games.json 与 progress.json 存在且为合法 JSON。</p>
    </div>
    <template v-else>
      <header class="topbar reveal">
        <!-- 第一行：品牌 + 游戏切换（一级导航） -->
        <div class="topbar-row">
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
        </div>

        <!-- 第二行：游戏内功能 tab + 右侧轻量操作 -->
        <div class="topbar-row topbar-func">
          <nav class="func-nav" aria-label="功能">
            <button
              v-for="tab in featureTabs"
              :key="tab.key"
              class="func-tab"
              :class="{ active: activeFeature === tab.key }"
              @click="gotoFeature(tab.key)"
            >
              <PhImageSquare v-if="tab.key === 'characters'" :size="13" />
              <PhChartLine v-else-if="tab.key === 'gacha'" :size="13" />
              {{ tab.name }}
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
              <button class="icon-btn" @click="lockNow" title="锁定为游客模式：之后的改动只保存到本机">
                <PhLock :size="16" />
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
                {{ store.showReference.value ? '参考开' : '参考关' }}
              </button>
              <button class="icon-btn" @click="unlockOpen = !unlockOpen" title="输入密码进入主人模式，录入保存到云端">
                <PhLockOpen :size="16" />
              </button>
            </template>

            <div class="help-wrap">
              <button
                class="icon-btn"
                :class="{ open: helpOpen }"
                @click="helpOpen = !helpOpen"
                title="帮助：重播新手引导"
                aria-label="帮助"
              >
                <PhQuestion :size="16" />
              </button>
              <div v-if="helpOpen" class="help-menu" @click.stop>
                <button class="menu-item" @click="replayTour" title="重新播放新手引导（分步气泡）">
                  <PhPlayCircle :size="15" /> 重播引导
                </button>
              </div>
            </div>
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
      </header>

      <TourGuide
        v-if="tourOpen"
        :steps="tourSteps"
        @done="tourDone"
        @close="tourClose"
      />

      <router-view v-slot="{ Component, route }">
        <component
          :is="Component"
          :store="store"
          :region-id="route.params.regionId"
        />
      </router-view>

      <ToastHost />
    </template>
  </div>
</template>

<style scoped>
/* 顶部阅读进度条：fixed 3px 金色纯色条，随滚动增长 */
.page-progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  z-index: 120;
  background: var(--gold);
  transition: width 0.1s linear;
  pointer-events: none;
}

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

/* ---- 顶栏（全站导航：第一行游戏 / 第二行功能） ---- */
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
.topbar-row {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  min-height: 44px;
}
.topbar-func {
  min-height: 38px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
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
  margin-left: var(--sp-4);
}
.game-tab {
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-sm);
  font-size: var(--fz-base);
  color: var(--text-3);
  white-space: nowrap;
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

/* ---- 第二行：功能 tab ---- */
.func-nav {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}
.func-tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-sm);
  font-size: var(--fz-sm);
  color: var(--text-3);
  white-space: nowrap;
  transition: var(--t);
}
.func-tab:hover {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.05);
}
.func-tab.active {
  color: var(--gold-bright);
  background: var(--gold-tint);
  font-weight: 600;
}
.func-tab.active svg {
  color: var(--gold);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
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

/* ---- 解锁密码行 ---- */
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

/* ---- 帮助菜单 ---- */
.help-wrap {
  position: relative;
}
.help-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 70;
  min-width: 180px;
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

/* ---- 窄屏：两行各自紧凑换行 ---- */
@media (max-width: 640px) {
  .topbar-row {
    gap: var(--sp-1) var(--sp-3);
    flex-wrap: wrap;
  }
  .game-tab {
    font-size: var(--fz-sm);
    padding: var(--sp-1) var(--sp-2);
  }
  .func-tab {
    font-size: var(--fz-sm);
    padding: var(--sp-1) var(--sp-2);
  }
  .text-link {
    font-size: var(--fz-sm);
  }
}
</style>
