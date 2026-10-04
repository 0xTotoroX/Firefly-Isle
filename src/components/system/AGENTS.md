# src/components/system/
> L2 | 父级: [AGENTS.md](../AGENTS.md)

成员清单
brand-mark.tsx: 沿用灯塔图标与 favicon 素材，供登录和侧栏复用；新品牌候选图标未确认。
brand-wordmark.tsx: 从 brand.ts 读取中英文名称，渲染登录和侧栏字标，共用可读 UI 字体。
demo-mode-banner.tsx: 所有演示页共用的虚构资料说明、会话重置和明确退出入口。
network-status-banner.tsx: PWA 网络状态提示条，消费全局在线状态与 locale，只在离线时固定于安全区内提示需要重新连接
surfaces.tsx: 统一 Sidebar、TopBar、Main、Panel、Section 与 Action surface 的 V3 主题化结构基元，固定 1px 边界、8px 主圆角语义与 style passthrough
origin-story/: 顶栏生命故事图标触发的创作初衷阅读弹层子模块，收敛公开内容源、V3 token 化 DOM dialog、焦点与滚动交互及展示合同测试，不创建第二套材质或 WebGL 上下文
topbar.tsx: dark/light 共享顶部工具条组件，定义边缘钉住的窄屏可用顶栏、可截断页面名、背景音乐开关、创作初衷入口、邮件 hover 联系弹窗、邮箱点击复制、已复制反馈与单一 overlay 互斥状态的同构空间角色
sidebar-nav.tsx: 响应式侧栏、患者导航、账号出口和偏好控件；支持拖拽/折叠，短视口导航滚动，存储失败保留内存状态，Demo 不读取真实偏好。
sidebar-nav.test.tsx: 存储异常、折叠恢复与 Demo 隔离的交互回归。

法则: 结构先同构，材质后分化；页面只能组合系统组件，不直接发明壳层语义。

[PROTOCOL]: 结构或契约事实变化时更新本文；仅在父级描述受影响时检查父级 AGENTS.md，已加载且未变化的内容不重读。
