// 图片下载工具（同源代理方案）
// 素材站图片不带 CORS 头 → 浏览器不能直接跨域 fetch blob；
// 统一走同源代理（生产 = EdgeOne Functions，开发 = Vite dev proxy），
// 代理响应为同源 → fetch 成功 → blob → <a download> 触发真正下载（可精确反馈加载/成功/失败）。

const UPSTREAM_BASE = 'https://gi.yatta.moe'

/**
 * 构造同源代理下载 URL（纯函数，可测）。
 * 素材直链 → /api/img + 同构路径（如 /api/img/assets/UI/xxx.png）。
 * @param {string} url 素材站图片直链
 * @returns {string} 同源代理 URL
 * @throws {Error} 非本项目素材站的来源
 */
export function buildProxyUrl(url) {
  if (typeof url !== 'string' || !url.startsWith(UPSTREAM_BASE)) {
    throw new Error('不支持的图片来源')
  }
  return '/api/img' + url.slice(UPSTREAM_BASE.length)
}

/**
 * 下载图片到本地。
 * @param {string} url      素材站图片直链（如 https://gi.yatta.moe/assets/UI/xxx.png）
 * @param {string} filename 保存文件名（含扩展名）
 * @throws {Error} 代理不可用 / 网络失败 / 上游错误
 */
export async function downloadImage(url, filename) {
  // 同构路径：去掉域名 → /api/img/assets/UI/xxx.png（生产/开发两端行为一致）
  const proxyUrl = buildProxyUrl(url)
  const res = await fetch(proxyUrl)
  if (!res.ok) {
    // 404 通常意味着当前环境没有代理（如本地 yarn preview 纯静态服务），给出可诊断提示
    if (res.status === 404) {
      throw new Error('当前环境未提供图片下载代理（请用 yarn dev 或线上环境）')
    }
    throw new Error(`HTTP ${res.status}`)
  }
  const blob = await res.blob()
  if (!blob || blob.size === 0) {
    throw new Error('图片内容为空')
  }
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 稍后释放 object URL，避免个别浏览器在下载尚未开始时即失效
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
