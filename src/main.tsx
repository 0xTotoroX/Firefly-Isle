/**
 * [INPUT]: 依赖 react 的 StrictMode、react-dom/client 的 createRoot，依赖 @fontsource 自托管图标与 latin 子集字体 CSS、./App、PWA 注册入口、error-reporting 的 env 门控上报与全局样式。
 * [OUTPUT]: 对外提供前端挂载副作用，将 App 渲染到 #root，在生产安全上下文注册隐私优先 service worker 并安装全局错误上报。
 * [POS]: src 的浏览器入口文件，只负责启动 React 应用、注册外层 PWA shell 与安装可观测性钩子。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/material-symbols-outlined/wght.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import '@fontsource/ibm-plex-mono/latin-600.css'

import App from './App'
import './index.css'
import { initErrorReporting } from './lib/error-reporting'
import { registerFireflyServiceWorker } from './lib/pwa'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

initErrorReporting()

registerFireflyServiceWorker()
