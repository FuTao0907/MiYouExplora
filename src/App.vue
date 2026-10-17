<script setup>
import { ref } from 'vue'
import { useProgress } from './composables/useProgress.js'
import {
  PhArrowClockwise,
  PhArchiveBox,
  PhEye,
  PhEyeSlash,
  PhGameController,
  PhLock,
  PhLockOpen,
  PhPlayCircle
} from '@phosphor-icons/vue'
import BatchEditPanel from './components/BatchEditPanel.vue'
import TourGuide from './components/TourGuide.vue'

const store = useProgress()
store.init()

const batchOpen = ref(false)

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
    selector: '.edit-bar',
    title: '直接录入',
    body: '表格里的输入框可以直接修改（数字 0 到目标数之间；输入 -1 表示该分项对你不适用）。游客的改动只保存在这台电脑上；主人的数据（UID 212114083）会作为参考显示，可以随时开关。',
    placement: 'bottom'
  },
  {
    selector: '.btn-batch',
    title: '一键修改',
    body: '不想一个一个改？点「一键修改」，把所有修改项聚拢到一个面板里，一次改完。',
    placement: 'top'
  },
  {
    selector: '.btn-export',
    title: '导入导出',
    body: '支持导出 / 导入 WPS 表格（.xlsx）或 JSON 文件。游客导出的文件只包含自己的数据，不会和主人的数据混淆。',
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
  tourOpen.value = true
}

function openBatch() {
  batchOpen.value = true
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
      <div class="edit-bar reveal">
        <span class="site-brand" title="米游探索度记录">
          <PhGameController :size="18" /> 米游探索度记录
        </span>
        <template v-if="store.editable.value">
          <span class="mode-badge editable">主人模式</span>
          <span v-if="store.saveText.value" class="save-state" :class="'save-' + store.saveState.value">
            <template v-if="store.saveState.value === 'error'">{{ store.saveText.value }}：{{ store.saveError.value }}</template>
            <template v-else>{{ store.saveText.value }}</template>
          </span>
          <button
            v-if="store.saveState.value === 'error'"
            class="btn btn-ghost btn-sm"
            @click="store.doCloudSave"
            title="重新尝试保存到云端"
          >
            <PhArrowClockwise :size="16" /> 重试保存
          </button>
          <button
            class="btn btn-ghost btn-sm"
            @click="tryRestore"
            title="用云端自动备份（上一次保存前的数据）覆盖当前进度"
          >
            <PhArchiveBox :size="16" /> 从备份恢复
          </button>
          <button
            class="btn btn-ghost btn-sm"
            @click="lockNow"
            title="锁定为游客模式：之后的改动只保存到本机"
          >
            <PhLock :size="16" /> 锁定（游客）
          </button>
        </template>
        <template v-else>
          <button
            class="btn btn-ghost btn-sm"
            :class="{ active: store.showReference.value }"
            @click="store.toggleReference"
            :title="store.showReference.value ? '正在显示主人的进度作参考，点击关闭' : '点击显示主人的进度作参考'"
          >
            <component :is="store.showReference.value ? PhEye : PhEyeSlash" :size="16" />
            参考：{{ store.showReference.value ? '开' : '关' }}
          </button>
          <button
            class="btn btn-ghost btn-sm"
            @click="unlockOpen = !unlockOpen"
            title="输入密码进入主人模式，录入保存到云端"
          >
            <PhLockOpen :size="16" /> 解锁编辑
          </button>
          <template v-if="unlockOpen">
            <input
              class="pwd-input mono"
              type="password"
              v-model="unlockInput"
              @keyup.enter="tryUnlock"
              placeholder="编辑密码"
              autocomplete="off"
            />
            <button class="btn btn-primary btn-sm" :disabled="unlocking" @click="tryUnlock" title="校验密码进入主人模式">{{ unlocking ? '校验中…' : '确认' }}</button>
            <span v-if="unlockError" class="pwd-error">密码错误</span>
          </template>
          <span v-if="store.saveText.value" class="save-state" :class="'save-' + store.saveState.value">
            {{ store.saveText.value }}
          </span>
        </template>
      </div>

      <router-view v-slot="{ Component, route }">
        <component
          :is="Component"
          :store="store"
          :region-id="route.params.regionId"
          @batch="openBatch"
        />
      </router-view>

      <BatchEditPanel v-if="batchOpen" :store="store" @close="batchOpen = false" />
      <TourGuide
        v-if="tourOpen"
        :steps="tourSteps"
        @done="tourDone"
        @close="tourClose"
      />

      <footer class="site-foot">
        <button class="foot-link mono" @click="replayTour" title="重新播放新手引导（分步气泡）">
          <PhPlayCircle :size="14" /> 重播引导
        </button>
      </footer>
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

.edit-bar {
  position: sticky;
  top: 12px;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(16, 24, 40, 0.8);
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.28);
  width: fit-content;
  flex-wrap: wrap;
}
.site-brand {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  margin-right: var(--sp-2);
  font-size: var(--fz-base);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--gold);
  white-space: nowrap;
}
.mode-badge {
  font-size: var(--fz-xs);
  letter-spacing: 0.1em;
  padding: 2px 10px;
  border-radius: 999px;
}
.mode-badge.editable {
  color: var(--gold);
  border: 1px solid var(--line-gold);
  background: var(--gold-tint);
}
.btn.active {
  color: var(--gold);
  border-color: var(--line-gold);
  background: var(--gold-tint);
}
.pwd-input {
  width: 160px;
  padding: 5px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--bg);
  color: var(--text-1);
  font-size: var(--fz-sm);
}
.pwd-input:focus {
  outline: none;
  border-color: var(--gold);
  box-shadow: 0 0 0 3px var(--gold-tint);
}
.pwd-error {
  font-size: var(--fz-xs);
  color: #e5484d;
}
.save-state {
  font-size: var(--fz-xs);
  color: var(--text-2);
  letter-spacing: 0.04em;
}
.save-state.save-saving {
  color: var(--gold);
}
.save-state.save-saved {
  color: #6fcf97;
}
.save-state.save-error {
  color: #e5484d;
}

.site-foot {
  margin-top: var(--sp-8);
  display: flex;
  justify-content: center;
}
.foot-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fz-xs);
  color: var(--text-3);
  letter-spacing: 0.08em;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-sm);
  transition: var(--t);
}
.foot-link:hover {
  color: var(--gold);
  background: var(--gold-tint);
}
</style>
