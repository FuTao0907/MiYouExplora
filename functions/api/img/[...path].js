// GET /api/img/* — 图片下载代理（同构路径方案）
// 前端把素材站图片直链的域名去掉，拼成 /api/img + 同构路径（如 /api/img/assets/UI/xxx.png），
// 本函数把请求转回素材站（https://gi.yatta.moe/assets/UI/xxx.png）并附加
// Content-Disposition: attachment，让浏览器直接下载而不是导航。
// 背景：素材站响应不带 CORS 头，浏览器不能跨域 fetch 成 blob；同源代理解决此问题。
// 安全：仅允许代理 /assets/UI/ 前缀（防 SSRF / 任意路径转发）；仅 GET。
// 开发环境：yarn dev 由 vite.config.js 的 /api/img proxy 承担同样职责（本文件不生效）。

const UPSTREAM_BASE = 'https://gi.yatta.moe'
const ALLOWED_PREFIX = '/assets/UI/'

export async function onRequestGet({ request }) {
  const u = new URL(request.url)
  // 取 /api/img/ 之后的路径（EdgeOne 把动态段注入 u.pathname，直接截取前缀即可）
  const rel = u.pathname.startsWith('/api/img/') ? u.pathname.slice('/api/img/'.length) : u.pathname
  if (!rel.startsWith(ALLOWED_PREFIX)) {
    return json({ error: 'path not allowed' }, 403)
  }

  let upstream
  try {
    upstream = await fetch(UPSTREAM_BASE + '/' + rel, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Referer: UPSTREAM_BASE + '/',
      },
    })
  } catch (e) {
    return json({ error: 'upstream fetch failed' }, 502)
  }
  if (!upstream.ok) {
    return json({ error: `upstream ${upstream.status}` }, 502)
  }

  const buf = await upstream.arrayBuffer()
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
  const filename = decodeURIComponent(rel.split('/').pop() || 'image.png')

  return new Response(buf, {
    status: 200,
    headers: {
      'content-type': contentType,
      // 关键：声明附件，浏览器收到后直接下载而不是导航
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'public, max-age=86400',
    },
  })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store',
    },
  })
}
