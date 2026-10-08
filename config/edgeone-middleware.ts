/**
 * [INPUT]: 当前构建的公开资源路径。
 * [OUTPUT]: EdgeOne middleware.js，阻止缺失资源或未实现 API 被平台 SPA fallback 改为 HTML 200。
 * [POS]: config/ 的腾讯云路由保护生成器；不读取或处理账户、JWT 和患者正文。
 * [PROTOCOL]: 路由、接口或产物变化时同步 config/AGENTS.md 与部署手册。
 */
export function edgeoneMiddleware(assetPaths: string[]) {
  return `const assets = new Set(${JSON.stringify(assetPaths)})
export function middleware(context) {
  let path
  try { path = decodeURIComponent(new URL(context.request.url).pathname) }
  catch { return new Response('Not Found', { status: 404 }) }
  if (path === '/login' || path === '/login/') return context.next()
  const api = path === '/api' || path.startsWith('/api/')
  const resource = ['/assets/', '/source/', '/licenses/', '/icons/', '/login/'].some(prefix => path.startsWith(prefix))
  if (api || (resource && !assets.has(path))) {
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
  }
  return context.next()
}
export const config = {
  matcher: ['/api/:path*', '/assets/:path*', '/source/:path*', '/licenses/:path*', '/icons/:path*', '/login/:path*']
}
`
}
