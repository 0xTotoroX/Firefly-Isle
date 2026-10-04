/**
 * [INPUT]: 依赖浏览器 location、navigator.serviceWorker 与 Vite 环境标记。
 * [OUTPUT]: 对外提供 PWA service worker 注册入口、注册条件判断与敏感请求缓存判定 helper。
 * [POS]: src/lib 的 PWA 边界，集中 installed Web app 的外层能力判断，确保 service worker 只在安全生产环境注册且不缓存医疗动态数据。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */

export const FIREFLY_SERVICE_WORKER_PATH = '/sw.js'

const sensitiveSameOriginPrefixes = ['/api/']
const sensitiveRemoteHostSuffixes = ['supabase.ghibli1024.com', '.supabase.co', '.functions.supabase.co']

type ServiceWorkerRegistrationTarget = {
  addEventListener: Window['addEventListener']
  location: Location
  navigator: Navigator
}

export function isSensitivePwaRequestUrl(input: string | URL) {
  const url = typeof input === 'string' ? new URL(input, 'https://firefly.ghibli1024.com') : input

  if (sensitiveRemoteHostSuffixes.some((suffix) => url.hostname.endsWith(suffix))) {
    return true
  }

  return sensitiveSameOriginPrefixes.some((prefix) => url.pathname.startsWith(prefix))
}

function isSecureServiceWorkerContext(location: Location) {
  return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'
}

export function canRegisterFireflyServiceWorker(
  target: Pick<ServiceWorkerRegistrationTarget, 'location' | 'navigator'>,
  enabled = import.meta.env.PROD,
) {
  return Boolean(enabled && 'serviceWorker' in target.navigator && isSecureServiceWorkerContext(target.location))
}

export function registerFireflyServiceWorker(target: ServiceWorkerRegistrationTarget = window, enabled = import.meta.env.PROD) {
  if (!canRegisterFireflyServiceWorker(target, enabled)) {
    return false
  }

  target.addEventListener('load', () => {
    void target.navigator.serviceWorker.register(FIREFLY_SERVICE_WORKER_PATH).catch((error: unknown) => {
      console.info('Firefly Isle service worker registration skipped.', error)
    })
  })

  return true
}
