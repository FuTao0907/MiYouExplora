// GET/PUT /api/progress — 读写探索进度（EdgeOne Blob 存储）
// GET：任何人可读；Blob 为空时返回 { exists:false }，前端回退种子数据
// PUT：需 x-edit-password 请求头（服务端环境变量 EDIT_PASSWORD）；写前自动备份旧版到 progress.prev
import { getStore } from '@edgeone/pages-blob'

const store = getStore('miyou-exploration')

export async function onRequestGet() {
  const data = await store.get('progress', { type: 'json' })
  if (data == null) {
    return json({ exists: false })
  }
  return json(data)
}

export async function onRequestPut({ request, env }) {
  const password = request.headers.get('x-edit-password') ?? ''
  if (!env.EDIT_PASSWORD || password !== env.EDIT_PASSWORD) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }
  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid body' }, 400)
  }
  if (!body || typeof body !== 'object' || !body.regions || typeof body.regions !== 'object') {
    return json({ ok: false, error: 'invalid payload' }, 400)
  }
  // 写前备份旧版（单份轮换），弥补云端无版本历史的缺陷
  const prev = await store.get('progress', { type: 'json' })
  if (prev != null) {
    await store.setJSON('progress.prev', prev)
  }
  await store.setJSON('progress', body)
  return json({ ok: true, updated_at: typeof body.updated_at === 'string' ? body.updated_at : '' })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store'
    }
  })
}
