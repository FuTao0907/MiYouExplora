// 数据层：games 固定值始终走静态文件；progress 在生产环境（EdgeOne Pages）走 API + Blob，
// 本地开发（yarn dev）默认走静态文件；若在 .env.development 设置 VITE_API_BASE（指向 Java 学习副本），
// 则开发模式也走 API，用于和本地 Java 后端联调。
const IS_PROD = import.meta.env.PROD
// 去掉尾部斜杠，方便拼接（空字符串时 fetch 相对路径 /api/...）
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
const USE_API = IS_PROD || API_BASE !== ''

export async function loadData() {
  const gamesRes = await fetch('/data/games.json')
  if (!gamesRes.ok) throw new Error('固定值数据加载失败（/data/games.json）')
  const gamesData = await gamesRes.json()

  let progress
  if (USE_API) {
    // 走 API：优先读云端（或 Java 副本），为空（首次）时回退种子数据
    try {
      const res = await fetch(`${API_BASE}/api/progress`)
      if (res.ok) {
        const data = await res.json()
        progress = data && data.exists !== false ? data : await loadSeedProgress()
      } else {
        progress = await loadSeedProgress()
      }
    } catch {
      progress = await loadSeedProgress()
    }
  } else {
    progress = await loadSeedProgress()
  }

  return {
    games: gamesData.games,
    settings: gamesData.settings ?? {},
    progress
  }
}

async function loadSeedProgress() {
  const res = await fetch('/data/progress.json')
  if (!res.ok) throw new Error('进度数据加载失败（/data/progress.json）')
  return res.json()
}

// 解锁验证：走 API 时用服务端校验（生产 EdgeOne / 联调 Java 副本），
// 否则（纯本地开发）比对 VITE_DEV_PASSWORD
export async function verifyPassword(password) {
  if (USE_API) {
    try {
      const res = await fetch(`${API_BASE}/api/auth`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await res.json()
      return res.ok && data.ok === true
    } catch {
      return false
    }
  }
  return password === (import.meta.env.VITE_DEV_PASSWORD ?? '')
}

// 保存进度到后端（生产=EdgeOne Blob，联调=Java 副本）；纯本地开发直接返回成功（不落盘，靠导出备份）
export async function saveProgress(progress, password) {
  if (!USE_API) return { ok: true, local: true }
  const res = await fetch(`${API_BASE}/api/progress`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'x-edit-password': password
    },
    body: JSON.stringify(progress)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok !== true) {
    throw new Error(data.error === 'unauthorized' ? '密码已失效，请重新解锁' : '云端保存失败，请重试')
  }
  return { ok: true, updated_at: data.updated_at ?? '' }
}

// 从后端自动备份恢复（生产 / 联调）
export async function restoreProgress(password) {
  const res = await fetch(`${API_BASE}/api/progress/restore`, {
    method: 'POST',
    headers: { 'x-edit-password': password }
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok !== true) {
    throw new Error(data.error === 'no backup' ? '云端没有可恢复的备份' : '恢复失败，请重试')
  }
  return true
}

export function exportProgress(progress) {
  const blob = new Blob([JSON.stringify(progress, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'progress.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function importProgress(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      let data
      try {
        data = JSON.parse(reader.result)
      } catch {
        reject(new Error('文件不是有效的 JSON'))
        return
      }
      if (!data || typeof data !== 'object' || !data.regions || typeof data.regions !== 'object') {
        reject(new Error('文件格式不正确：缺少 regions 字段'))
        return
      }
      resolve(data)
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
