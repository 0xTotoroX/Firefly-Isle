# src/components/system/
> L2 | 父级: /src/components/CLAUDE.md

成员清单
CLAUDE.md: 说明设计系统壳层与 surface 基元目录的边界，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
firefly-mark.tsx: 渲染一页萤屿“岛屿微光灯塔”透明品牌资产，被登录页、展开侧栏与 compact icon-only 侧栏复用，确保生产 mark 与 favicon 同源且不与标题绑定，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
firefly-brand-wordmark.tsx: 统一一页萤屿品牌字标，输出紧凑中英文侧栏 display token、英文登录页 Snell 艺术字、萤字橙色微光、渐隐横线与登录页可选副标题，被侧栏与登录页复用，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
demo-mode-banner.tsx: 公开 Demo 页低干扰 disclosure，消费 locale 并以横向分隔和文字链接输出“公开演示数据、不写个人账号、可回登录页”的统一提示，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
network-status-banner.tsx: PWA 网络状态提示条，消费全局在线状态与 locale，只在离线时固定于安全区内提示需要重新连接，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
surfaces.tsx: 统一 Sidebar、TopBar、Main、Panel、Section 与 Action surface 的 V3 主题化结构基元，固定 1px 边界、8px 主圆角语义与 style passthrough，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
origin-story/: 顶栏生命故事图标触发的创作初衷阅读弹层子模块，收敛公开内容源、V3 token 化 DOM dialog、焦点与滚动交互及展示合同测试，不创建第二套材质或 WebGL 上下文，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
topbar.tsx: dark/light 共享顶部状态条组件，定义边缘钉住的窄屏可用顶栏、可截断页面名、系统就绪、背景音乐开关、创作初衷入口、邮件 hover 联系弹窗、邮箱点击复制、已复制反馈与单一 overlay 互斥状态的同构空间角色，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
masthead.tsx: light 旧版头兼容组件，内部转发到共享顶部状态条，不再定义独立 light 骨架，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
sidebar-nav.tsx: V3 响应式侧栏组件，统一 dark/light 的 220px 桌面默认展开、204px 标签阈值、52px 品牌 mark、50px 主导航行、移动端默认收起、真实病历/统计入口、显式公开 Demo 入口、无自有病历时禁用病历/统计并显示“先提取”可访问提示、仅 `/demo/*` 显示 Demo badge、独立品牌 mark、共享 FireflyBrandWordmark、边线胶囊三态点击、44px 移动恢复热区、左缘渐进拉出、拖拽缩放到隐藏、阈值 icon-only、active 细左标与低强度行面、临床笔记病历图标、匿名 theater_comedy / 非匿名 person 身份图标、主题/语言切换与会话出口，[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

法则: 结构先同构，材质后分化；页面只能组合系统组件，不直接发明壳层语义。
