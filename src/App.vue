<script setup>
import { ref, computed } from 'vue'
import { useProgress } from './composables/useProgress.js'
import Overview from './views/Overview.vue'
import RegionView from './views/RegionView.vue'

const store = useProgress()
store.init()

const view = ref('overview')
const regionId = ref('')

function openRegion(id) {
  regionId.value = id
  view.value = 'region'
}

function backToOverview() {
  view.value = 'overview'
}

// 解锁编辑（默认只读，其他人只能看；生产环境密码校验在服务端）
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

const saveText = computed(() => {
  const s = store.saveState.value
  if (s === 'saving') return '保存中…'
  if (s === 'saved') return '已保存到云端'
  if (s === 'error') return '保存失败'
  return ''
})
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
        <template v-if="store.editable.value">
          <span class="mode-badge editable">编辑模式</span>
          <span v-if="saveText" class="save-state" :class="'save-' + store.saveState.value">
            <template v-if="store.saveState.value === 'error'">{{ saveText }}：{{ store.saveError.value }}</template>
            <template v-else>{{ saveText }}</template>
          </span>
          <button v-if="store.saveState.value === 'error'" class="btn btn-ghost btn-sm" @click="store.doSave">重试保存</button>
          <button class="btn btn-ghost btn-sm" @click="tryRestore">从备份恢复</button>
          <button class="btn btn-ghost btn-sm" @click="lockNow">锁定（只读）</button>
        </template>
        <template v-else>
          <span class="mode-badge readonly">只读模式</span>
          <button class="btn btn-ghost btn-sm" @click="unlockOpen = !unlockOpen">解锁编辑</button>
          <template v-if="unlockOpen">
            <input
              class="pwd-input mono"
              type="password"
              v-model="unlockInput"
              @keyup.enter="tryUnlock"
              placeholder="编辑密码"
              autocomplete="off"
            />
            <button class="btn btn-primary btn-sm" :disabled="unlocking" @click="tryUnlock">{{ unlocking ? '校验中…' : '确认' }}</button>
            <span v-if="unlockError" class="pwd-error">密码错误</span>
          </template>
        </template>
      </div>
      <Overview
        v-if="view === 'overview'"
        :store="store"
        @edit="openRegion"
      />
      <RegionView
        v-else
        :store="store"
        :region-id="regionId"
        @back="backToOverview"
      />
    </template>
  </div>
</template>

<style scoped>
.state-box {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 40px 24px;
  text-align: center;
  color: var(--color-text-secondary);
}
.state-box.error {
  color: #d14343;
}
.state-hint {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.edit-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(16, 24, 40, 0.7);
  backdrop-filter: blur(8px);
  width: fit-content;
}
.mode-badge {
  font-size: var(--fz-xs);
  letter-spacing: 0.1em;
  padding: 2px 10px;
  border-radius: 999px;
}
.mode-badge.readonly {
  color: var(--text-3);
  border: 1px solid var(--line);
}
.mode-badge.editable {
  color: var(--gold);
  border: 1px solid var(--line-gold);
  background: var(--gold-tint);
}
.pwd-input {
  width: 160px;
  padding: 5px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--bg-1);
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
</style>
