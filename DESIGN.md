# 设计系统入口

知见 / MyOncode 的 Web 基础采用黑白双主题、八种强调色、系统无衬线文字与明确状态。品牌、排版、控件和长病历章节阅读已获本轮实施授权；A/B 的完整页面布局仍是独立评审项，不能把候选稿当作已确认设计。

- [交互文档板：DS-00 至 DS-05](docs/design/saas-review/index.html)
- [设计规则与组件合同](docs/design/saas-review/DESIGN-SYSTEM.md)
- [设计变量](docs/design/saas-review/tokens.json)
- [图像模型页面方案](docs/design/saas-review/concepts/index.html)
- [命名与域名候选](docs/products/product-naming.md)

文档板以浏览器原生组件展示状态、表单验证、失败重试和弹窗焦点；这是可交接的本地评审稿，尚未写入 Figma，也尚未替换生产组件。

旧 V3 只解释当前正式页面的实现；旧 V4 和品牌候选已停止评估，相关预览路由及专用代码已删除。历史图片/文档保留用于追溯，不再约束新设计。旧 Figma 快照同样不是新方案的定稿。

正式页面继续复用现有组件和业务接口。颜色由 src/index.css 与 src/lib/accent.ts 管理；品牌字标读取 src/lib/brand.ts，登录样式消费同一语义变量。病历正文连续展开、按章节定位，不套大外框或增加内部纵向滚动。总览和指标可使用独立信息块。暂时沿用灯塔素材，候选 M 图标未定稿。

建议以现有长病历连续阅读为主线，借用 B 的信息分组用于总览和指标；这不是选定完整 A/B。下一轮用虚构数据比较桌面、窄屏、空态、加载和失败态，经审核后逐页迁移。Open Design 只作为原型工具；本轮未安装、启动模型或对外发送仓库/患者资料。

## Active Login Entry Contract

- `/login` 是八章纵向滚动叙事：`hero → problem → intake → timeline → views → labs → boundary → cta`；章节内容只描述 `openspec/specs` 已实现能力。
- 首尾“登录” CTA 共享一个认证状态和一个 `AuthOverlay`；登录页不提供 Demo CTA，但 `/demo/*` 路由与能力继续保留。
- 首屏继续使用 `t-route-reveal` / `t-stagger`，后续章节由客户端 `useEffect` 内动态加载的 GSAP + ScrollTrigger 驱动；布局使用 CSS sticky + sibling spacer，不使用 GSAP `pin` 或平滑滚动劫持。
- 登录页只运行一个长生命周期液体折射 WebGL 背景；后续章节不得创建新的 Three.js 上下文，首屏离开可视区后由底层可见性观察暂停渲染，不销毁并重建 renderer。
- `prefers-reduced-motion: reduce` 保留全部八章内容，只取消滚动动画并收缩 spacer。

登录共通视觉按上述 token 适配；参数、生命周期与行为验收合同见 `openspec/changes/add-scroll-story-landing/`。
