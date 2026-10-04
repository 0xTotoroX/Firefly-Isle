/**
 * [INPUT]: 依赖 Capacitor 8 的 CapacitorConfig 类型、Vite production build 输出目录 dist。
 * [OUTPUT]: 对外提供 Firefly-Isle iOS/Android 原生壳配置。
 * [POS]: 仓库根级 Capacitor 配置，约束移动壳只包装现有 Web app，不引入第二套路由或本地医疗数据源。
 * [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
 */
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ghibli1024.fireflyisle',
  appName: '一页萤屿',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
