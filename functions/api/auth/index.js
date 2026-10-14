// POST /api/auth — 校验编辑密码（服务端环境变量 EDIT_PASSWORD）
// 成功返回 200 {ok:true}，失败返回 401
export async function onRequestPost({ request, env }) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'invalid body' }, 400)
  }
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!env.EDIT_PASSWORD || password !== env.EDIT_PASSWORD) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }
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
