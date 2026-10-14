// POST /api/progress/restore — 从云端自动备份（progress.prev）恢复进度
// 需 x-edit-password 请求头；仅当存在备份时生效
import { getStore } from '@edgeone/pages-blob'

const store = getStore('miyou-exploration')

export async function onRequestPost({ request, env }) {
  const password = request.headers.get('x-edit-password') ?? ''
  if (!env.EDIT_PASSWORD || password !== env.EDIT_PASSWORD) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }
  const prev = await store.get('progress.prev', { type: 'json' })
  if (prev == null) {
    return json({ ok: false, error: 'no backup' }, 404)
  }
  await store.setJSON('progress', prev)
  return json({ ok: true })
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
