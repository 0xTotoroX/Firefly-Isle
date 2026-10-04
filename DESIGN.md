# 设计系统入口

新方向为黑白双主题、八种可切换主题色的 SaaS 设计系统，采用浅侧栏、单一主内容区与按需展开的信息层级。评审稿独立于正式产品，用户确认后再修改前端视觉。

- [交互文档板：DS-00 至 DS-05](docs/design/saas-review/index.html)
- [设计规则与组件合同](docs/design/saas-review/DESIGN-SYSTEM.md)
- [设计变量](docs/design/saas-review/tokens.json)
- [图像模型页面方案](docs/design/saas-review/concepts/index.html)
- [命名与域名候选](docs/products/product-naming.md)

文档板以浏览器原生组件展示状态、表单验证、失败重试和弹窗焦点；这是可交接的本地评审稿，尚未写入 Figma，也尚未替换生产组件。

旧 V3 只解释当前正式页面的实现；旧 V4 和品牌候选已停止评估，相关预览路由及专用代码已删除。历史图片/文档保留用于追溯，不再约束新设计。旧 Figma 快照同样不是新方案的定稿。

正式路由当前保留既有外观；本轮修复的数据保存、权限和状态问题不代表新视觉获批。确认后通过一个前端迁移变更复用现有 Radix/shadcn，先验证输入、病历和统计三个真实场景，再推广全站。

## Active Login Entry Contract

- `/login` 是八章纵向滚动叙事：`hero → problem → intake → timeline → views → labs → boundary → cta`；章节内容只描述 `openspec/specs` 已实现能力。
- 首尾“登录” CTA 共享一个认证状态和一个 `AuthOverlay`；登录页不提供 Demo CTA，但 `/demo/*` 路由与能力继续保留。
- 首屏继续使用 `t-route-reveal` / `t-stagger`，后续章节由客户端 `useEffect` 内动态加载的 GSAP + ScrollTrigger 驱动；布局使用 CSS sticky + sibling spacer，不使用 GSAP `pin` 或平滑滚动劫持。
- 登录页只运行一个长生命周期液体折射 WebGL 背景；后续章节不得创建新的 Three.js 上下文，首屏离开可视区后由底层可见性观察暂停渲染，不销毁并重建 renderer。
- `prefers-reduced-motion: reduce` 保留全部八章内容，只取消滚动动画并收缩 spacer。

登录生产视觉仍见 V3 真源；参数、生命周期与验收合同见 `openspec/changes/add-scroll-story-landing/`。
