/**
 * [INPUT]: 当前构建的公开资源路径。
 * [OUTPUT]: EdgeOne middleware.js，保留缺失资源/API 的 404，按构建名单区分静态长期缓存与默认再验证。
 * [POS]: config/ 的腾讯云路由保护生成器；不读取或处理账户、JWT 和患者正文。
 * [PROTOCOL]: 路由、接口或产物变化时同步 config/AGENTS.md 与部署手册。
 */
export function edgeoneMiddleware(assetPaths: string[]) {
  return `const assets = new Set(${JSON.stringify(assetPaths)})
const REVALIDATE = 'public, max-age=0, must-revalidate'
const IMMUTABLE = 'public, max-age=31536000, immutable'
function notFound(request) {
  return new Response(request.method === 'HEAD' ? null : 'Not Found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
export function middleware(context) {
  const { request } = context
  let path
  try { path = decodeURIComponent(new URL(request.url).pathname) }
  catch { return notFound(request) }
  const loginPage = path === '/login' || path === '/login/'
  const api = path === '/api' || path.startsWith('/api/')
  const resource = ['/assets/', '/source/', '/licenses/', '/icons/', '/login/'].some(prefix => path.startsWith(prefix))
  if (api || (resource && !loginPage && !assets.has(path))) {
    return notFound(request)
  }
  const staticAsset = assets.has(path) && ['/assets/', '/icons/'].some(prefix => path.startsWith(prefix))
  const readRequest = request.method === 'GET' || request.method === 'HEAD'
  // next() 是同步透传控制响应；保留其标记，由平台合并响应头与最终文件响应。
  const response = context.next()
  response.headers.set('Cache-Control', staticAsset && readRequest ? IMMUTABLE : REVALIDATE)
  return response
}
export const config = {
  matcher: [
    '/:path*',
  ],
}
`
}
